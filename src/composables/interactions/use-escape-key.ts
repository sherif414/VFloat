import { type MaybeRefOrGetter, toValue } from "vue";
import { useEventListener } from "@/composables/utils/use-event-listener";
import { getFloatingState } from "@/core/floating-accessors";
import type { FloatingContext } from "../positioning";
import { useComposition } from "../utils/use-composition";

// =======================================================================================
// 📌 Types
// =======================================================================================

export interface UseEscapeKeyContext {
  state?: FloatingContext["state"];
  open?: FloatingContext["open"];
  setOpen?: FloatingContext["setOpen"];
}

export interface UseEscapeKeyOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to use capture phase for document event listeners.
   * @default false
   */
  capture?: boolean;

  /**
   * Whether to call preventDefault on the escape key event before handling it.
   * @default false
   */
  preventDefault?: boolean;

  /**
   * Custom callback function to be executed when the escape key is pressed.
   * When provided, overrides default behavior.
   */
  onEscape?: (event: KeyboardEvent) => void;
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
  options: UseEscapeKeyOptions = {},
): void {
  const { enabled = true, capture = false, preventDefault = false, onEscape } = options;
  const { isComposing } = useComposition();
  const { open, setOpen } = getFloatingState(context);

  const handleEscape = (event: KeyboardEvent) => {
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      !toValue(enabled) ||
      !open.value ||
      isComposing.value
    ) {
      return;
    }

    if (preventDefault) {
      event.preventDefault();
    }

    // Use custom handler if provided
    if (onEscape) {
      onEscape(event);
      return;
    }

    // Default behavior: close current context
    setOpen(false, "escape-key", event);
  };

  // Event listener setup
  useEventListener(document, "keydown", handleEscape, capture);
}
