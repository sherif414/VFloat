import type { PointerType } from "@vueuse/core"
import { useEventListener } from "@vueuse/core"
import { computed, type MaybeRefOrGetter, onScopeDispose, onWatcherCleanup, toValue, watchPostEffect } from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { OpenChangeReason } from "@/types"
import {
  isButtonTarget,
  isClickOnScrollbar,
  isEventTargetWithin,
  isHTMLElement,
  isMouseLikePointerType,
  isSpaceIgnored,
} from "@/utils"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the reference element
 * and optionally when clicking outside both the reference and floating elements.
 *
 * This composable provides unified event handlers for both inside click interactions
 * (to open/toggle floating elements) and outside click interactions (to close them).
 *
 * @param context - The floating context with open state and change handler.
 * @param options - Configuration options for click behavior.
 *
 * @example Basic usage with outside click enabled
 * ```ts
 * const context = useFloating(...)
 * useClick(context, {
 *   toggle: true,
 *   outsideClick: true,
 *   outsideEvent: 'pointerdown'
 * })
 * ```
 *
 * @example Custom outside click handler
 * ```ts
 * useClick(context, {
 *   outsideClick: true,
 *   onOutsideClick: (event) => {
 *     if (confirm("Close dialog?")) {
 *       context.setOpen(false)
 *     }
 *   },
 * })
 * ```
 */
export function useClick(context: UseClickContext, options: UseClickOptions = {}): void {
  const { open, setOpen, refs } = context
  const {
    enabled = true,
    event: eventOption = "click",
    toggle = true,
    ignoreMouse = false,
    ignoreKeyboard = false,
    ignoreTouch = false,
    // Outside click options
    outsideClick = false,
    outsideEvent = "pointerdown",
    outsideCapture = true,
    onOutsideClick,
    preventScrollbarClick = true,
    handleDragEvents = true,
  } = options

  //=====================================================================================
  // Interaction State
  //=====================================================================================
  // Kept as plain locals (not refs/reactive) because they only coordinate
  // intra-event ordering and short-lived suppression windows.
  const interactionState = {
    pointerType: undefined as PointerType | undefined,
    didKeyDown: false,
    dragStartedInside: false,
    interactionInProgress: false,
  }

  // Timeout used to clear `dragStartedInside` after a `mouseup`.
  // Stored so we can cancel/avoid late updates on unmount/anchor change.
  let dragResetTimeoutId: ReturnType<typeof window.setTimeout> | undefined

  const isEnabled = computed(() => toValue(enabled))
  const isOutsideClickEnabled = computed(() => toValue(outsideClick))

  const anchorEl = computed(() => {
    const el = refs.anchorEl.value
    if (el instanceof HTMLElement) return el
    return null
  })

  const floatingEl = computed(() => refs.floatingEl.value)

  //=====================================================================================
  // Event Handlers (Anchor & Outside)
  //=====================================================================================

  function clearDragResetTimeout() {
    if (dragResetTimeoutId == null) return
    clearTimeout(dragResetTimeoutId)
    dragResetTimeoutId = undefined
  }

  function handleOpenChange(reason: OpenChangeReason, event: Event) {
    interactionState.interactionInProgress = true
    try {
      if (open.value) {
        // When `toggle` is enabled, anchor clicks toggle open/closed.
        toValue(toggle) && setOpen(false, reason, event)
      } else {
        setOpen(true, reason, event)
      }
    } finally {
      // Reset after a micro-task so the same native event can finish bubbling
      // before the document-level outside listener potentially closes the element.
      queueMicrotask(() => {
        interactionState.interactionInProgress = false
      })
    }
  }

  function resetInteractionState() {
    interactionState.pointerType = undefined
    interactionState.didKeyDown = false
    interactionState.dragStartedInside = false
    clearDragResetTimeout()
  }

  function onPointerDown(e: PointerEvent) {
    interactionState.pointerType = e.pointerType as PointerType
  }

  function isSyntheticKeyboardClick(e: MouseEvent): boolean {
    // When keyboard interactions are disabled, browsers may still dispatch a
    // click after Enter/Space activation on some elements.
    return toValue(ignoreKeyboard) && e.detail === 0
  }

  function onMouseDown(e: MouseEvent) {
    // Ignore non-primary buttons
    if (e.button !== 0) return
    if (toValue(eventOption) === "click") return
    if (shouldIgnorePointerType(interactionState.pointerType)) return

    handleOpenChange("anchor-click", e)
  }

  function onClick(e: MouseEvent): void {
    if (isSyntheticKeyboardClick(e)) {
      resetInteractionState()
      return
    }

    if (toValue(eventOption) === "mousedown" && interactionState.pointerType) {
      // If pointerdown exists, reset it and skip click, as mousedown handled it.
      resetInteractionState()
      return
    }

    if (shouldIgnorePointerType(interactionState.pointerType)) {
      resetInteractionState()
      return
    }

    handleOpenChange("anchor-click", e)
    resetInteractionState()
  }

  function onKeyDown(e: KeyboardEvent) {
    interactionState.pointerType = undefined

    if (e.defaultPrevented || toValue(ignoreKeyboard) || isButtonTarget(e)) {
      return
    }

    const el = anchorEl.value
    if (!el) return

    if (e.key === " " && !isSpaceIgnored(el)) {
      // Prevent scrolling
      e.preventDefault()
      interactionState.didKeyDown = true
    }

    if (e.key === "Enter") {
      handleOpenChange("keyboard-activate", e)
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const el = anchorEl.value // Get current element inside handler
    if (!el) return

    if (e.defaultPrevented || toValue(ignoreKeyboard) || isButtonTarget(e) || isSpaceIgnored(el)) {
      return
    }

    if (e.key === " " && interactionState.didKeyDown) {
      interactionState.didKeyDown = false
      handleOpenChange("keyboard-activate", e)
    }
  }

  // --- Outside Click Event Handlers ---

  function onOutsideClickHandler(event: MouseEvent) {
    if (!isEnabled.value || !isOutsideClickEnabled.value || !open.value) {
      return
    }

    // Suppress outside-close for click sequences caused by a drag that started
    // inside the floating content.
    if (suppressOutsideClickForDragSequence()) return

    // Don't process outside clicks during ongoing interactions
    if (interactionState.interactionInProgress) {
      return
    }

    const target = event.target as Node | null
    if (!target) return

    // Clicked on a scrollbar
    if (
      toValue(preventScrollbarClick) &&
      isHTMLElement(target) &&
      floatingEl.value &&
      isClickOnScrollbar(event, target)
    ) {
      return
    }

    if (
      isEventTargetWithin(event, anchorEl.value) ||
      isEventTargetWithin(event, floatingEl.value)
    ) {
      return
    }

    // Use custom handler if provided, otherwise use default behavior
    if (onOutsideClick) {
      onOutsideClick(event)
    } else {
      setOpen(false, "outside-pointer", event)
    }
  }

  function suppressOutsideClickForDragSequence(): boolean {
    if (toValue(outsideEvent) !== "click") return false
    if (!toValue(handleDragEvents)) return false
    if (!interactionState.dragStartedInside) return false

    interactionState.dragStartedInside = false
    return true
  }

  function onFloatingMouseDown() {
    interactionState.dragStartedInside = true
  }

  function onFloatingMouseUp() {
    // Reset drag state after a brief delay to allow click events to process
    clearDragResetTimeout()
    dragResetTimeoutId = window.setTimeout(() => {
      interactionState.dragStartedInside = false
    }, 0)
  }

  //=====================================================================================
  // Helper Functions
  //=====================================================================================

  function shouldIgnorePointerType(type: PointerType | undefined): boolean {
    if (isMouseLikePointerType(type, true) && toValue(ignoreMouse)) {
      return true
    }
    if (type === "touch" && toValue(ignoreTouch)) {
      return true
    }
    return false
  }

  // Ensure the drag suppression timer can't update state after unmount.
  onScopeDispose(() => {
    clearDragResetTimeout()
  })

  //=====================================================================================
  // Wiring: attach handlers to the current anchor element
  //=====================================================================================

  watchPostEffect(() => {
    const el = anchorEl.value
    if (!isEnabled.value || !el) return

    el.addEventListener("pointerdown", onPointerDown)
    el.addEventListener("mousedown", onMouseDown)
    el.addEventListener("click", onClick)
    el.addEventListener("keydown", onKeyDown)
    el.addEventListener("keyup", onKeyUp)

    onWatcherCleanup(() => {
      el.removeEventListener("pointerdown", onPointerDown)
      el.removeEventListener("mousedown", onMouseDown)
      el.removeEventListener("click", onClick)
      el.removeEventListener("keydown", onKeyDown)
      el.removeEventListener("keyup", onKeyUp)
      resetInteractionState()
    })
  })

  //=====================================================================================
  // Wiring: document outside-click listener + drag suppression on floating
  //=====================================================================================

  // Document listener for outside clicks
  useEventListener(
    () => (isEnabled.value && isOutsideClickEnabled.value ? document : null),
    outsideEvent,
    onOutsideClickHandler,
    { capture: toValue(outsideCapture) }
  )

  // Floating element listeners for drag detection
  useEventListener(
    () =>
      isEnabled.value && isOutsideClickEnabled.value && toValue(handleDragEvents)
        ? floatingEl.value
        : null,
    "mousedown",
    onFloatingMouseDown,
    { capture: true }
  )

  useEventListener(
    () =>
      isEnabled.value && isOutsideClickEnabled.value && toValue(handleDragEvents)
        ? floatingEl.value
        : null,
    "mouseup",
    onFloatingMouseUp,
    { capture: true }
  )
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseClickContext extends Pick<FloatingContext, "refs" | "open" | "setOpen"> {}

/**
 * Options for configuring the useClick behavior.
 */
export interface UseClickOptions {
  /**
   * Whether the composable is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * The type of event to use to determine a "click" with mouse input.
   * This option does not effect keyboard interactions.
   * @default 'click'
   */
  event?: MaybeRefOrGetter<"click" | "mousedown">

  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore the logic for mouse input.
   * @default false
   */
  ignoreMouse?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore keyboard handlers (Enter and Space key functionality).
   * @default false
   */
  ignoreKeyboard?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore touch events.
   * @default false
   */
  ignoreTouch?: MaybeRefOrGetter<boolean>

  // --- Outside Click Options ---

  /**
   * Whether to enable outside click detection to close the floating element.
   * @default false
   */
  outsideClick?: MaybeRefOrGetter<boolean>

  /**
   * The event to use for outside click detection.
   * @default 'pointerdown'
   */
  outsideEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">

  /**
   * Whether to use capture phase for document outside click listener.
   * @default true
   */
  outsideCapture?: MaybeRefOrGetter<boolean>

  /**
   * Custom function to handle outside clicks.
   * If provided, this function will be called instead of the default behavior.
   * @param event - The mouse event that triggered the outside click
   */
  onOutsideClick?: (event: MouseEvent) => void

  /**
   * Whether to prevent clicks on scrollbars from triggering outside click.
   * @default true
   */
  preventScrollbarClick?: MaybeRefOrGetter<boolean>

  /**
   * Whether to handle drag events that start inside and end outside.
   * @default true
   */
  handleDragEvents?: MaybeRefOrGetter<boolean>
}
