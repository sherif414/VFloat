import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import { isUsingKeyboard } from "@/composables/utils/is-using-keyboard"
import { useEventListener } from "@/composables/utils/use-event-listener"
import { getFloatingRefs, getFloatingState } from "@/core/floating-accessors"
import { tryOnScopeDispose } from "@/core/lifecycle"
import {
  isEventTargetWithin,
  isMac,
  isSafari,
  isTypeableElement,
  matchesFocusVisible,
} from "@/utils"

//=======================================================================================
// 📌 Constants
//=======================================================================================

/**
 * Delay in milliseconds for checking active element after blur event.
 * Using 0ms ensures check happens in next event loop tick, which is more
 * reliable than relatedTarget for Shadow DOM and programmatic focus changes.
 */
const BLUR_CHECK_DELAY = 0

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

/**
 * Enables showing/hiding the floating element when the reference element receives or loses focus.
 *
 * Keyboard-only interaction hook. Compose with `useClick`, `useHover`, `useEscapeKey` for a complete UX.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * const ctx = useFloating(...)
 * useFocus(ctx)
 * ```
 */

export function useFocus(context: UseFocusContext, options: UseFocusOptions = {}): UseFocusReturn {
  const { open, setOpen } = getFloatingState(context)
  const { floatingEl, anchorEl: _anchorEl } = getFloatingRefs(context)

  const { enabled = true, requireFocusVisible = true } = options

  /**
   * Computed anchor element that handles both HTMLElement and virtual element references.
   * Virtual elements (from libraries like Floating UI) use a `contextElement` property
   * to reference the actual DOM element for positioning calculations.
   */
  const anchorEl = computed(() => {
    if (!_anchorEl.value) return null
    return _anchorEl.value instanceof HTMLElement ? _anchorEl.value : _anchorEl.value.contextElement
  })

  let isFocusBlocked = false
  const isSafariOnMac = isMac() && isSafari()
  let timeoutId: number

  // --- Window Event Listeners for Edge Cases ---

  // 1. Blocks the floating element from opening when a user switches back to a
  //    tab where the reference element was focused but the popover was closed.
  useEventListener(window, "blur", () => {
    if (!open.value && anchorEl.value && anchorEl.value === document.activeElement) {
      isFocusBlocked = true
    }
  })

  // 2. Resets the block when the window regains focus.
  useEventListener(window, "focus", () => {
    isFocusBlocked = false
  })

  // --- Element Event Handlers ---
  function onFocus(event: FocusEvent): void {
    if (isFocusBlocked) {
      isFocusBlocked = false
      return
    }

    const target = event.target instanceof Element ? event.target : null
    if (toValue(requireFocusVisible) && target) {
      // Safari fails to match `:focus-visible` if focus was initially outside
      // the document. This is a workaround.
      if (isSafariOnMac && !event.relatedTarget) {
        if (!isUsingKeyboard.value && !isTypeableElement(target)) {
          return // Do not open if interaction was pointer-based on a non-typeable element.
        }
      } else if (!matchesFocusVisible(target)) {
        return // Standard check for other browsers.
      }
    }

    try {
      setOpen(true, "focus", event)
    } catch (error) {
      console.error("[useFocus] Error in onFocus handler:", error)
    }
  }

  function onBlur(event: FocusEvent): void {
    // Clear any existing timeout from a previous blur event.
    clearTimeout(timeoutId)

    // Use a timeout to check the activeElement in the next event loop tick.
    // This is more reliable than `event.relatedTarget` for complex cases
    // like Shadow DOM or when focus is programmatically moved.
    timeoutId = window.setTimeout(() => {
      const ownerDocument = anchorEl.value?.ownerDocument ?? document
      const activeEl = ownerDocument.activeElement

      // Case 1: Focus has left the window entirely, but the browser is tricky
      // and hasn't blurred the window yet. If `relatedTarget` is null but focus
      // is still on the anchor, we assume focus is about to leave, so don't close.
      if (!event.relatedTarget && activeEl === anchorEl.value) {
        return
      }

      // Case 2: Check if focus is within the floating element
      if (activeEl && floatingEl.value?.contains(activeEl)) {
        return
      }

      // If neither of the above conditions are met, focus has moved elsewhere.
      try {
        setOpen(false, "blur", event)
      } catch (error) {
        console.error("[useFocus] Error in onBlur handler:", error)
      }
    }, BLUR_CHECK_DELAY)
  }

  // In addition to element-level blur, observe focus changes at the document level
  // to handle cases where focus moves between descendants and outside elements
  // without triggering another blur on the original anchor.
  useEventListener(
    document,
    "focusin",
    (evt: FocusEvent) => {
      if (!toValue(enabled)) return
      const target = evt.target
      if (!(target instanceof Element)) return

      // Ignore focus entering the anchor itself
      if (isEventTargetWithin(evt, anchorEl.value)) return

      if (isEventTargetWithin(evt, floatingEl.value)) return

      try {
        setOpen(false, "blur", evt)
      } catch (error) {
        console.error("[useFocus] Error in document focusin handler:", error)
      }
    },
    { capture: true }
  )

  // --- Attach Listeners to the Anchor Element ---
  const removeWatcher = watchPostEffect(() => {
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

  // Ensure the timeout is cleared if the component unmounts.
  tryOnScopeDispose(() => {
    clearTimeout(timeoutId)
  })

  return {
    /**
     * Cleanup function that removes all event listeners and clears pending timeouts.
     * Useful for manual cleanup in testing scenarios.
     */
    cleanup: () => {
      clearTimeout(timeoutId)
      removeWatcher()
    },
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseFocusContext {
  refs: FloatingContext["refs"]
  state?: FloatingContext["state"]
  open?: FloatingContext["open"]
  setOpen?: FloatingContext["setOpen"]
}

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
export interface UseFocusReturn {
  /**
   * Cleanup function that removes all event listeners and clears pending timeouts.
   * Useful for manual cleanup in testing scenarios.
   */
  cleanup: () => void
}
