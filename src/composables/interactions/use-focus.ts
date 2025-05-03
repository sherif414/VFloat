import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onWatcherCleanup,
  toValue,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables"

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
 *   visibleOnly: true
 * })
 * ```
 */
export function useFocus(
  context: FloatingContext & {
    open: Ref<boolean>
    onOpenChange: (open: boolean) => void
  },
  options: UseFocusOptions = {}
): UseFocusReturn {
  const {
    onOpenChange,
    refs: { floating, reference },
  } = context

  const { enabled = true, visibleOnly = true } = options

  // --- Event Handlers --- //

  function onFocus(event: FocusEvent): void {
    const target = event.target as Element | null

    // Check if focus should trigger open based on visibleOnly option
    const shouldOpen =
      !toValue(visibleOnly) || (target instanceof Element && target.matches(":focus-visible"))

    if (shouldOpen) {
      onOpenChange(true)
    }
  }

  function onBlur(event: FocusEvent): void {
    // If the floating element doesn't exist or is detached, close immediately.
    if (!floating.value) {
      onOpenChange(false)
      return
    }

    // Don't close if focus moved to the floating element itself or one of its descendants.
    if (
      event.relatedTarget &&
      floating.value &&
      floating.value.contains(event.relatedTarget as Node)
    ) {
      return
    }

    // Otherwise, close the floating element.
    onOpenChange(false)
  }

  watchPostEffect(() => {
    if (toValue(enabled)) return
    const el = reference.value
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
  visibleOnly?: MaybeRefOrGetter<boolean>
}

/**
 * Return value of the useFocus composable
 */
export type UseFocusReturn = undefined
