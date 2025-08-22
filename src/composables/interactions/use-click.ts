import type { PointerType } from "@vueuse/core"
import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue"
import type { FloatingContext } from "@/composables"

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
  const { open, setOpen, refs } = context
  const {
    enabled = true,
    event: eventOption = "click",
    toggle = true,
    ignoreMouse = false,
    ignoreKeyboard = false,
    ignoreTouch = false,
  } = options

  let pointerType: PointerType | undefined
  let didKeyDown = false

  const isEnabled = computed(() => toValue(enabled))
  const anchorEl = computed(() => {
    const el = refs.anchorEl.value
    if (!el) return null
    if (el instanceof HTMLElement) return el
    if (el.contextElement instanceof HTMLElement) return el.contextElement
    return null
  })

  // --- Event Handlers --- //

  function handleOpenChange() {
    if (open.value) {
      toValue(toggle) && setOpen(false)
    } else {
      setOpen(true)
    }
  }

  function onPointerDown(e: PointerEvent) {
    pointerType = e.pointerType as PointerType
  }

  function onMouseDown(e: MouseEvent) {
    // Ignore non-primary buttons
    if (e.button !== 0) return
    if (toValue(eventOption) === "click") return
    if (isMouseLikePointerType(pointerType, true) && toValue(ignoreMouse)) return
    if (pointerType === "touch" && toValue(ignoreTouch)) return

    // Prevent stealing focus from the floating element if it's already open
    // and reference is not the target (e.g. clicking scrollbar).
    const target = e.target as HTMLElement | null
    if (!open.value && target === anchorEl.value) {
      e.preventDefault()
    }

    handleOpenChange()
  }

  function onClick(): void {
    if (toValue(eventOption) === "mousedown" && pointerType) {
      // If pointerdown exists, reset it and skip click, as mousedown handled it.
      pointerType = undefined
      return
    }

    if (isMouseLikePointerType(pointerType, true) && toValue(ignoreMouse)) {
      pointerType = undefined
      return
    }

    if (pointerType === "touch" && toValue(ignoreTouch)) {
      pointerType = undefined
      return
    }

    handleOpenChange()
    pointerType = undefined
  }

  function onKeyDown(e: KeyboardEvent) {
    pointerType = undefined

    if (e.defaultPrevented || toValue(ignoreKeyboard) || isButtonTarget(e)) {
      return
    }

    const el = anchorEl.value
    if (!el) return

    if (e.key === " " && !isSpaceIgnored(el)) {
      // Prevent scrolling
      e.preventDefault()
      didKeyDown = true
    }

    if (e.key === "Enter") {
      handleOpenChange()
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const el = anchorEl.value // Get current element inside handler
    if (!el) return

    if (
      e.defaultPrevented ||
      toValue(ignoreKeyboard) ||
      isButtonTarget(e) ||
      isSpaceIgnored(el)
    ) {
      return
    }

    if (e.key === " " && didKeyDown) {
      didKeyDown = false
      handleOpenChange()
    }
  }

  // --- Watch for changes in enabled state or reference element ---

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
    })
  })
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
   * The type of event to use to determine a "click" with mouse input.
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
   * Whether to ignore keyboard handlers (Enter and Space key functionality).
   * @default false
   */
  ignoreKeyboard?: MaybeRefOrGetter<boolean>

  /**
   * Whether to ignore touch events.
   * @default false
   */
  ignoreTouch?: MaybeRefOrGetter<boolean>
}
