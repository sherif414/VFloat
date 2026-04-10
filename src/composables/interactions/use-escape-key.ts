import { type MaybeRefOrGetter, toValue } from "vue";
import { useComposition } from "@/composables/interactions/internal/composition-state";
import { type FloatingContext } from "@/composables/positioning/floating-context";
import { useEventListener } from "@/shared/use-event-listener";
import { resolveTreeInteraction } from "./internal/tree-interaction";

const TREE_ESCAPE_HANDLED = Symbol("vfloat-tree-escape-handled");

type TreeEscapeEvent = KeyboardEvent & {
  [TREE_ESCAPE_HANDLED]?: boolean;
};

// =======================================================================================
// 📌 Types
// =======================================================================================

/**
 * Context required by `useEscapeKey`.
 */
export interface UseEscapeKeyContext {
  /**
   * The floating state that should respond to Escape.
   */
  state: FloatingContext["state"];
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
 *       context.state.setOpen(false)
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
  const { open, setOpen } = context.state;
  const tree = resolveTreeInteraction(context);

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

    if (tree.isTree) {
      const treeEvent = event as TreeEscapeEvent;
      if (treeEvent[TREE_ESCAPE_HANDLED]) {
        return;
      }

      const currentNodeId = tree.treeNode?.id.value ?? null;
      const activeNode = tree.activeNode ?? tree.treeNode;

      if (!activeNode?.context.state.open.value) {
        return;
      }

      if (activeNode.id.value !== currentNodeId) {
        tree.closeActive("escape-key", event);
        treeEvent[TREE_ESCAPE_HANDLED] = true;
        return;
      }

      if (onEscape) {
        onEscape(event);
        treeEvent[TREE_ESCAPE_HANDLED] = true;
        return;
      }

      tree.closeCurrent("escape-key", event);
      treeEvent[TREE_ESCAPE_HANDLED] = true;
      return;
    }

    // Skip the default close behavior when the caller needs custom escape handling.
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
