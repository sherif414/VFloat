import { type PointerType, useEventListener } from "@vueuse/core"
import {
  type MaybeRefOrGetter,
  computed,
  ref,
  toValue,
  watch,
  onUnmounted,
  onScopeDispose,
  onWatcherCleanup,
} from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the reference element.
 *
 * This composable provides event handlers for click interactions with the reference element
 * to control the visibility of the floating element.
 *
 * @param context - The floating context with open state and change handler.
 * @param options - Configuration options for click behavior.
 *
 * @example
 * ```ts
 * const context = useFloating(...)
 * useClick(context, {
 *   event: "mousedown",
 * })
 * ```
 */
export function useClick(context: FloatingContext, options: UseClickOptions = {}): void {
  const { open, onOpenChange, refs } = context
  const {
    enabled = true,
    event: eventOption = "click",
    toggle = true,
    ignoreMouse = false,
    keyboardHandlers = true,
  } = options

  let pointerType: PointerType | undefined
  let didKeyDown = false
  let stopFunctions: (() => void)[] = [] // Array to hold cleanup functions

  const isEnabled = computed(() => toValue(enabled))
  const eventOpt = computed(() => toValue(eventOption))
  const shouldToggle = computed(() => toValue(toggle))
  const shouldIgnoreMouse = computed(() => toValue(ignoreMouse))
  const handleKeyboard = computed(() => toValue(keyboardHandlers))

  const referenceEl = computed(() =>
    refs.reference.value instanceof HTMLElement ? refs.reference.value : null
  )

  // --- Event Handlers --- //

  function handleOpenChange() {
    if (open.value && shouldToggle.value) {
      onOpenChange(false)
    } else {
      onOpenChange(true)
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    pointerType = e.pointerType as PointerType
  }

  const onMouseDown = (e: MouseEvent) => {
    // Ignore non-primary buttons
    if (e.button !== 0) return
    if (eventOpt.value === "click") return
    if (isMouseLikePointerType(pointerType, true) && shouldIgnoreMouse.value) return

    // Prevent stealing focus from the floating element if it's already open
    // and reference is not the target (e.g. clicking scrollbar).
    const target = e.target as HTMLElement | null
    if (!open.value && target === referenceEl.value) {
      e.preventDefault()
    }

    handleOpenChange()
  }

  const onClick = () => {
    if (eventOpt.value === "mousedown" && pointerType) {
      // If pointerdown exists, reset it and skip click, as mousedown handled it.
      pointerType = undefined
      return
    }

    if (isMouseLikePointerType(pointerType, true) && shouldIgnoreMouse.value) {
      pointerType = undefined
      return
    }

    handleOpenChange()
    pointerType = undefined
  }

  const onKeyDown = (evt: KeyboardEvent) => {
    pointerType = undefined

    if (evt.defaultPrevented || !handleKeyboard.value || isButtonTarget(evt)) {
      return
    }

    const el = referenceEl.value
    if (!el) return

    if (evt.key === " " && !isSpaceIgnored(el)) {
      // Prevent scrolling
      evt.preventDefault()
      didKeyDown = true
    }

    if (evt.key === "Enter") {
      handleOpenChange()
    }
  }

  const onKeyUp = (evt: KeyboardEvent) => {
    const el = referenceEl.value // Get current element inside handler
    if (!el) return

    if (
      evt.defaultPrevented ||
      !handleKeyboard.value ||
      isButtonTarget(evt) ||
      isSpaceIgnored(el)
    ) {
      return
    }

    if (evt.key === " " && didKeyDown) {
      didKeyDown = false
      handleOpenChange()
    }
  }

  // --- Cleanup Logic ---

  const cleanup = () => {
    for (const stop of stopFunctions) {
      stop()
    }
    stopFunctions = []
    pointerType = undefined
    didKeyDown = false
  }

  // --- Watch for changes in enabled state or reference element ---

  watch(
    isEnabled,
    (isEnabled) => {
      if (!isEnabled) return

      stopFunctions.push(useEventListener(referenceEl, "pointerdown", onPointerDown))
      stopFunctions.push(useEventListener(referenceEl, "mousedown", onMouseDown))
      stopFunctions.push(useEventListener(referenceEl, "click", onClick))
      stopFunctions.push(useEventListener(referenceEl, "keydown", onKeyDown))
      stopFunctions.push(useEventListener(referenceEl, "keyup", onKeyUp))

      onWatcherCleanup(cleanup)
    },
    { immediate: true } // Run immediately to attach listeners initially
  )

  // --- Component Unmount Cleanup ---
  onScopeDispose(cleanup)
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Checks if the pointer type is mouse-like (mouse or pen).
 * @param pointerType - The pointer type string.
 * @param strict - If true, only considers "mouse".
 * @returns True if the pointer type is mouse-like.
 */
function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false
  const isMouse = pointerType === "mouse"
  return strict ? isMouse : isMouse || pointerType === "pen"
}

/**
 * Checks if the event target is an HTMLButtonElement.
 * @param event - The KeyboardEvent.
 * @returns True if the target is a button.
 */
function isButtonTarget(event: KeyboardEvent): boolean {
  return event.target instanceof HTMLElement && event.target.tagName === "BUTTON"
}

/**
 * Checks if the element is an input, textarea, or contenteditable element.
 * @param element - The element to check.
 * @returns True if the element is typeable.
 */
function isTypeableElement(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  )
}

/**
 * Checks if the Space key press should be ignored for the given element.
 * @param element - The element to check.
 * @returns True if Space should be ignored.
 */
function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element)
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring the useClick behavior.
 */
export interface UseClickOptions {
  /**
   * Whether the Hook is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * The type of event to use to determine a “click” with mouse input.
   * Keyboard clicks work as normal.
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
   * Whether to add keyboard handlers (Enter and Space key functionality).
   * @default true
   */
  keyboardHandlers?: MaybeRefOrGetter<boolean>
}
