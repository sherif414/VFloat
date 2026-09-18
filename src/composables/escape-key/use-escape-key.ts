import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";
import { useComposition } from "./composition-state";
import {
  type EscapeEntry,
  type EscapeEntryOptions,
  pushEscapeEntry,
  removeEscapeEntry,
} from "./escape-stack";
import type { FloatingNode } from "@/composables/floating-node";
import { getAnchorElement } from "@/shared/elements";
import { getDocument } from "@/shared/env";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node when the user presses the Escape key.
 *
 * Coordinates across nested tree hierarchies (leaf-first unwinding), stacked
 * independent overlays (LIFO order), and ignores Escape during IME text composition.
 *
 * @param node - The floating node with open state and element refs.
 * @param options - Configuration options for Escape key dismissal.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode({ anchorEl, floatingEl });
 * useEscapeKey(node);
 * ```
 *
 * @example Custom handler
 * ```ts
 * useEscapeKey(node, {
 *   onEscape: (event) => {
 *     if (hasUnsavedChanges.value) {
 *       showConfirmDialog.value = true;
 *     } else {
 *       node.open.value = false;
 *     }
 *   },
 * });
 * ```
 */
export function useEscapeKey(node: FloatingNode, options: UseEscapeKeyOptions = {}): void {
  // Ensure shared composition tracking is active while this composable is mounted
  useComposition();

  const { open } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const ownerDoc = computed(
    () =>
      node.refs.floatingEl.value?.ownerDocument ??
      getAnchorElement(node.refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );

  const entry: EscapeEntry = {
    node,
    get options() {
      return options;
    },
  };

  watch(
    () => [isEnabled.value, open.value, ownerDoc.value] as const,
    ([enabled, isOpen, doc], _, onCleanup) => {
      if (!enabled || !isOpen || !doc) return;

      pushEscapeEntry(doc, entry);
      onCleanup(() => {
        removeEscapeEntry(doc, entry);
      });
    },
    { immediate: true, flush: "sync" },
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useEscapeKey`.
 */
export type UseEscapeKeyContext = FloatingNode;

/**
 * Options for configuring Escape key dismissal.
 */
export interface UseEscapeKeyOptions extends EscapeEntryOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
}
