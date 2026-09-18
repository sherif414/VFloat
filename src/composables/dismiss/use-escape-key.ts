import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";
import { useComposition } from "./composition-state";
import {
  type DismissEntry,
  pushDismissEntry,
  removeDismissEntry,
  resolveActiveDismissEntry,
} from "./dismiss-stack";
import type { FloatingNode } from "@/composables/floating-node";
import { getAnchorElement } from "@/shared/elements";
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
 * @internal Consumed by `useDismiss`. Use `useDismiss(node, { escapeKey })` instead.
 *
 * @param node - The floating node with open state and change handler.
 * @param options - {@link UseEscapeKeyOptions}
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useDismiss(node) // Closes the floating element on escape
 * ```
 *
 * @example Custom handler
 * ```ts
 * useDismiss(node, {
 *   escapeKey: {
 *     onEscape: (event) => {
 *       if (hasUnsavedChanges.value) {
 *         showConfirmDialog.value = true
 *       } else {
 *         node.open.value = false
 *       }
 *     },
 *   },
 * })
 * ```
 */
export function useEscapeKey(node: FloatingNode, options: UseEscapeKeyOptions = {}): void {
  const { isComposing } = useComposition();
  const { open } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const ownerDoc = computed(
    () =>
      node.refs.floatingEl.value?.ownerDocument ??
      getAnchorElement(node.refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );

  const entry: DismissEntry = { node };

  watch(
    () => [isEnabled.value, open.value],
    ([enabled, isOpen], _, onCleanup) => {
      if (!enabled || !isOpen) return;

      const doc = ownerDoc.value;
      if (!doc) return;

      pushDismissEntry(doc, entry);
      onCleanup(() => {
        removeDismissEntry(doc, entry);
      });
    },
    { immediate: true, flush: "sync" },
  );

  const handleEscape = (event: KeyboardEvent) => {
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      !isEnabled.value ||
      !open.value ||
      isComposing.value
    ) {
      return;
    }

    if (options.ignoreEscapeKey && options.ignoreEscapeKey(event)) {
      return;
    }

    const doc = ownerDoc.value;
    if (!doc) return;

    const activeNode = resolveActiveDismissEntry(doc, event.target);
    if (!activeNode || activeNode.id !== node.id) {
      return;
    }

    if (options.preventDefault) {
      event.preventDefault();
    }

    // Skip the default close behavior when the caller needs custom escape handling.
    if (options.onEscape) {
      options.onEscape(event);
      return;
    }

    event.stopPropagation();
    event.stopImmediatePropagation();
    node.open.value = false;
  };

  useEventListener(ownerDoc, "keydown", handleEscape, options.capture);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

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
