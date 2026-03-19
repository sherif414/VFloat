import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, ref, toValue } from "vue"
import type { FloatingContext } from "../positioning"

// =======================================================================================
// 📌 Types
// =======================================================================================

export interface UseEscapeKeyContext extends Pick<FloatingContext, "open" | "setOpen"> {}

export interface UseEscapeKeyOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to use capture phase for document event listeners.
   * @default false
   */
  capture?: boolean

  /**
   * Custom callback function to be executed when the escape key is pressed.
   * When provided, overrides default behavior.
   */
  onEscape?: (event: KeyboardEvent) => void
}

// =======================================================================================
// 📌 Composition
// =======================================================================================

/**
 * A composable to handle the escape key press with composition event handling.
 *
 * When triggered, it will close the floating element by setting open to false.
 *
 * @param context - The floating context with open state and change handler.
 * @param options - {@link UseEscapeKeyOptions}
 *
 * @example Basic usage
 * ```ts
 * const context = useFloating(...)
 * useEscapeKey(context) // Closes the floating element on escape
 * ```
 *
 * @example Custom handler
 * ```ts
 * useEscapeKey(context, {
 *   onEscape: (event) => {
 *     if (hasUnsavedChanges.value) {
 *       showConfirmDialog.value = true
 *     } else {
 *       context.setOpen(false)
 *     }
 *   }
 * })
 * ```
 */
export function useEscapeKey(
  context: UseEscapeKeyContext,
  options: UseEscapeKeyOptions = {}
): void {
  const { enabled = true, capture = false, onEscape } = options
  const { isComposing } = useComposition()

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !toValue(enabled) || isComposing()) {
      return
    }

    // Use custom handler if provided
    if (onEscape) {
      onEscape(event)
      return
    }

    // Default behavior: close current context
    context.setOpen(false, "escape-key", event)
  }

  // Event listener setup
  useEventListener(document, "keydown", handleEscape, capture)
}

// =======================================================================================
// 📌 Helper Functions
// =======================================================================================

function useComposition() {
  const isComposing = ref(false)

  useEventListener(document, "compositionstart", () => {
    isComposing.value = true
  })

  useEventListener(document, "compositionend", () => {
    isComposing.value = false
  })

  return {
    isComposing: () => isComposing.value,
  }
}
