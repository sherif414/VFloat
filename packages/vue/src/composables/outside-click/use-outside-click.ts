import { computed, MaybeRefOrGetter, toValue, watch } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { getAnchorElement } from "@/shared/elements";
import { getDocument } from "@/shared/env";
import {
  type OutsideClickEntry,
  OutsideClickPredicate,
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
 *   leafFirst: true,
 * });
 * ```
 *
 * @example Ignore a related external element
 * ```ts
 * useOutsideClick(node, {
 *   shouldIgnore: (_event, target) => {
 *     return !!toolbarEl.value?.contains(target);
 *   },
 * });
 * ```
 */
export function useOutsideClick(node: FloatingNode, options: UseOutsideClickOptions = {}): void {
  const { open } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const ownerDocument = computed(
    () =>
      node.refs.floatingEl.value?.ownerDocument ??
      getAnchorElement(node.refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );

  // `capture` and `event` are static setup options: snapshot them at registration so the document
  // listener phase and type stay stable while the overlay is open. Changing them takes
  // effect on close/re-open.
  const initialCapture = Boolean(options.capture ?? true);
  const initialEvent = options.event ?? "pointerdown";

  const entry: OutsideClickEntry = {
    node,
    get options() {
      return {
        ...options,
        capture: initialCapture,
        event: initialEvent,
      };
    },
  };

  watch(
    () => [isEnabled.value, open.value, ownerDocument.value] as const,
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
export interface UseOutsideClickOptions {
  /**
   * Whether outside-click detection is enabled.
   * Reactive: can be dynamically toggled (e.g., during form submission or modal states).
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to unwind nested floating trees one level at a time (leaf-first).
   * When `true`, a parent node with open children will not dismiss until
   * its children dismiss first.
   * Reactive: can be bound to component props or dynamic workflow states.
   * @default false
   */
  leafFirst?: MaybeRefOrGetter<boolean>;

  /**
   * Which document event triggers dismissal.
   * Static configuration determined by the component's UX pattern.
   * @default "pointerdown"
   */
  event?: "pointerdown" | "mousedown" | "click";

  /**
   * Which document event phase handles dismissal.
   * Static: read once during listener setup. Changing it mid-open takes
   * effect on close/re-open.
   * @default true
   */
  capture?: boolean;

  /**
   * Whether clicks on scrollbar gutters are ignored.
   * @default true
   */
  ignoreScrollbar?: boolean;

  /**
   * For `event: "click"`, whether to ignore mouseup outside when the drag
   * started inside the floating surface.
   * @default true
   */
  ignoreDrag?: boolean;

  /**
   * Custom predicate to ignore specific outside interactions.
   * Evaluated after the composite node family check.
   */
  shouldIgnore?: OutsideClickPredicate;

  /**
   * Custom callback invoked when an outside interaction occurs.
   * When provided, replaces default `node.open.value = false`.
   */
  onOutsideClick?: (event: MouseEvent) => void;
}

export type { OutsideClickPredicate } from "./outside-click-stack";
