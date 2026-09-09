import { type MaybeRefOrGetter, toValue } from "vue";
import { useComposition } from "@/composables/escape-key/composition-state";
import type { FloatingNode } from "@/composables/floating-tree";
import { getDocument } from "@/shared/env";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * A composable to handle the escape key press with composition event handling.
 *
 * When triggered, it will close the floating element by setting open to false.
 *
 * @param node - The floating node with open state and change handler.
 * @param options - {@link UseEscapeKeyOptions}
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useEscapeKey(node) // Closes the floating element on escape
 * ```
 *
 * @example Custom handler
 * ```ts
 * useEscapeKey(node, {
 *   onEscape: (event) => {
 *     if (hasUnsavedChanges.value) {
 *       showConfirmDialog.value = true
 *     } else {
 *       node.setOpen(false)
 *     }
 *   }
 * })
 * ```
 */
export function useEscapeKey(node: UseEscapeKeyContext, options: UseEscapeKeyOptions = {}): void {
  const {
    enabled = true,
    capture = false,
    preventDefault = false,
    onEscape,
    ignoreEscapeKey,
  } = options;
  const { isComposing } = useComposition();
  const { open } = node;

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

    if (ignoreEscapeKey && ignoreEscapeKey(event)) {
      return;
    }

    if (preventDefault) {
      event.preventDefault();
    }

    // Skip the default close behavior when the caller needs custom escape handling.
    if (onEscape) {
      onEscape(event);
      return;
    }

    const targetNode = node.tree?.getDeepestOpenContext(node) ?? node;
    targetNode.setOpen(false, "escape-key", event);
  };

  // Event listener setup
  useEventListener(() => getDocument(), "keydown", handleEscape, capture);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useEscapeKey`.
 */
export interface UseEscapeKeyContext extends Pick<
  FloatingNode,
  "id" | "open" | "setOpen" | "tree"
> {}

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

  /**
   * Predicate to determine if an escape key press should be ignored (e.g. to let a child handle it).
   * @param event - The keyboard event
   * @returns true if the escape key should be ignored
   */
  ignoreEscapeKey?: (event: KeyboardEvent) => boolean;
}
