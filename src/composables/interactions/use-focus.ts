import type { FloatingContext } from "@/composables"
import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when focusing the reference element
 *
 * This composable provides event handlers for focus and blur events to control
 * the visibility of floating elements when using keyboard navigation.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for focus behavior
 * @returns Event handler props for the reference element
 *
 * @example
 * ```ts
 * const { getReferenceProps } = useFocus(floating, {
 *   requireFocusVisible: true
 * })
 * ```
 */
export function useFocus(context: FloatingContext, options: UseFocusOptions = {}): UseFocusReturn {
  const {
    open,
    onOpenChange,
    refs: { floatingEl, anchorEl },
  } = context

  const { enabled = true, requireFocusVisible = true } = options

  // Flag to prevent opening on window refocus after blur
  let isFocusBlocked = false

  // --- Window Event Listeners ---
  useEventListener(window, "blur", () => {
    // If the anchor element is focused when the window blurs, and the floating element is not open,
    // set the block flag. This prevents the floating element from opening automatically
    // when the window regains focus and the browser refocuses the anchor.
    if (anchorEl.value === document.activeElement && !open.value) {
      isFocusBlocked = true
    }
  })

  useEventListener(window, "focus", () => {
    // Reset the block flag when the window gains focus.
    isFocusBlocked = false
  })

  // --- Element Event Handlers ---
  function onFocus(event: FocusEvent): void {
    // If focus is blocked due to window blur/refocus, do nothing and reset the flag.
    if (isFocusBlocked) {
      isFocusBlocked = false
      return
    }

    const target = event.target as Element | null

    // Open if focus visibility is not required OR if the target matches :focus-visible
    if (
      !toValue(requireFocusVisible) ||
      (target instanceof Element && target.matches(":focus-visible"))
    ) {
      onOpenChange(true)
    }
  }

  function onBlur(event: FocusEvent): void {
    // If the floating element doesn't exist, close immediately.
    if (!floatingEl.value) {
      onOpenChange(false)
      return
    }

    // Don't close if focus moved to the floating element itself or one of its descendants.
    if (
      event.relatedTarget &&
      floatingEl.value &&
      floatingEl.value.contains(event.relatedTarget as Node)
    ) {
      return
    }

    // Otherwise, close the floating element.
    onOpenChange(false)
  }

  watchPostEffect(() => {
    if (!toValue(enabled)) return
    const el = anchorEl.value
    if (!el || !(el instanceof HTMLElement)) return

    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)

    onWatcherCleanup(() => {
      el.removeEventListener("focus", onFocus)
      el.removeEventListener("blur", onBlur)
    })
  })
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring focus behavior
 */
export interface UseFocusOptions {
  /**
   * Whether focus event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether the open state only changes if the focus event is considered
   * visible (`:focus-visible` CSS selector).
   * @default true
   */
  requireFocusVisible?: MaybeRefOrGetter<boolean>
}

/**
 * Return value of the useFocus composable
 */
export type UseFocusReturn = undefined
