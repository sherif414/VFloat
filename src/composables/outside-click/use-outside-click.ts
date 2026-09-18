import { computed, toValue, watch } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { getAnchorElement } from "@/shared/elements";
import { getDocument } from "@/shared/env";
import {
  type OutsideClickEntry,
  type OutsideClickEntryOptions,
  pushOutsideClickEntry,
  removeOutsideClickEntry,
} from "./outside-click-stack";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node when pointer input lands outside its floating family.
 *
 * Supports nested tree hierarchies (leaf-first unwinding or full-tree collapse),
 * scrollbar filtering with RTL support, drag-gesture suppression, iframe blur
 * detection, and configurable event triggers.
 *
 * @param node - The floating node with refs and open state.
 * @param options - Configuration options for outside-click dismissal.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode({ anchorEl, floatingEl });
 * useOutsideClick(node);
 * ```
 *
 * @example Coordinated leaf-first unwinding in cascading menus
 * ```ts
 * useOutsideClick(node, {
 *   bubbles: false,
 * });
 * ```
 *
 * @example Ignore a related external element
 * ```ts
 * useOutsideClick(node, {
 *   ignoreClick: (_event, target) => {
 *     return !!toolbarEl.value?.contains(target);
 *   },
 * });
 * ```
 */
export function useOutsideClick(node: FloatingNode, options: UseOutsideClickOptions = {}): void {
  const { open } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const floatingEl = computed(() => node.refs.floatingEl.value);
  const ownerDocument = computed(
    () =>
      floatingEl.value?.ownerDocument ??
      getAnchorElement(node.refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );

  const entry: OutsideClickEntry = {
    node,
    get options() {
      return options;
    },
  };

  watch(
    () =>
      [
        isEnabled.value,
        open.value,
        ownerDocument.value,
        toValue(options.event ?? "pointerdown"),
        Boolean(toValue(options.capture ?? true)),
      ] as const,
    ([enabled, isOpen, doc], _, onCleanup) => {
      if (!enabled || !isOpen || !doc) return;

      pushOutsideClickEntry(doc, entry);
      onCleanup(() => {
        removeOutsideClickEntry(doc, entry);
      });
    },
    { immediate: true, flush: "sync" },
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring outside-click dismissal.
 */
export interface UseOutsideClickOptions extends OutsideClickEntryOptions {
  /**
   * Whether outside-click events bubble through the floating tree.
   * When `false`, a parent node with open children will not dismiss until
   * its children dismiss first (coordinated leaf-first unwinding).
   * @default true
   */
  bubbles?: boolean;
}

export type { OutsideClickPredicate } from "./outside-click-stack";
