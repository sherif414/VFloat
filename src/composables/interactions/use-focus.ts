import type { FloatingContext } from "@/composables"
import { useEventListener } from "@vueuse/core"
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  onUnmounted,
  onWatcherCleanup,
  toValue,
  watchPostEffect,
} from "vue"

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

/**
 * Enables showing/hiding the floating element when focusing the reference element.
 *
 * This composable is responsible for KEYBOARD-ONLY interactions. For a complete user experience,
 * it should be composed with other hooks like `useClick`, `useHover`, and `useDismiss`.
 *
 * @param context - The floating context with open state and change handler.
 * @param options - Configuration options for focus behavior.
 */
export function useFocus(context: FloatingContext, options: UseFocusOptions = {}): UseFocusReturn {
  const {
    open,
    setOpen,
    refs: { floatingEl, anchorEl: _anchorEl },
  } = context

  const { enabled = true, requireFocusVisible = true } = options
  const anchorEl = computed(() => {
    if (!_anchorEl.value) return null
    return _anchorEl.value instanceof HTMLElement ? _anchorEl.value : _anchorEl.value.contextElement
  })

  let isFocusBlocked = false
  let keyboardModality = true // Assume keyboard modality initially.
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

  // 3. Safari `:focus-visible` polyfill. Tracks if the last interaction was
  //    from a keyboard or a pointer to correctly apply focus-visible logic.
  if (isMac() && isSafari()) {
    useEventListener(
      window,
      "keydown",
      () => {
        keyboardModality = true
      },
      { capture: true }
    )
    useEventListener(
      window,
      "pointerdown",
      () => {
        keyboardModality = false
      },
      { capture: true }
    )
  }

  // --- Element Event Handlers ---
  function onFocus(event: FocusEvent): void {
    if (isFocusBlocked) {
      isFocusBlocked = false
      return
    }

    const target = event.target as Element | null
    if (toValue(requireFocusVisible) && target) {
      // Safari fails to match `:focus-visible` if focus was initially outside
      // the document. This is a workaround.
      if (isMac() && isSafari() && !event.relatedTarget) {
        if (!keyboardModality && !isTypeableElement(target)) {
          return // Do not open if interaction was pointer-based on a non-typeable element.
        }
      } else if (!matchesFocusVisible(target)) {
        return // Standard check for other browsers.
      }
    }

    setOpen(true)
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

      // Case 2: Focus has moved to an element within the floating element.
      // This is the primary way we keep it open during keyboard navigation.
      if (floatingEl.value && activeEl && floatingEl.value.contains(activeEl)) {
        return
      }

      // If neither of the above conditions are met, focus has moved elsewhere,
      // so it's safe to close the floating element.
      setOpen(false)
    }, 0)
  }

  // --- Attach Listeners to the Anchor Element ---
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

  // Ensure the timeout is cleared if the component unmounts.
  onScopeDispose(() => {
    clearTimeout(timeoutId)
  })
}

//=======================================================================================
// 📌 Types
//=======================================================================================
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

//=======================================================================================
// 📌 Utilities
//=======================================================================================

/** Checks if the user agent is on a Mac. */
function isMac(): boolean {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0
}

/** Checks if the browser is Safari. */
function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/** Checks if the element is a type of input that should receive focus on click. */
function isTypeableElement(
  element: unknown
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  )
}

/** A simple utility to check if an element matches `:focus-visible`. */
function matchesFocusVisible(element: Element): boolean {
  return element.matches(":focus-visible")
}
