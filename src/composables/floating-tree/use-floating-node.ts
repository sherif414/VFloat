import type { Middleware, MiddlewareData, Placement } from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import { computed, ref } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
import type { OpenChangeReason, VirtualElement } from "@/types";
import type { FloatingTree } from "./use-floating-tree";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a standalone floating node used by interaction and positioning composables.
 * The node has no knowledge of trees; join a tree explicitly via `tree.addNode()`
 * when coordinating related surfaces such as nested menus.
 */
export function useFloatingNode(options: UseFloatingNodeOptions): FloatingNode {
  const id = createFloatingNodeId();
  const open = useControllableState({
    value: options.open,
    initialValue: !!options.defaultOpen,
    onChange: (value) => {
      if (options.open) options.open.value = value;
    },
  });

  const storedReason = ref<OpenChangeReason | null>(null);
  const storedEvent = ref<Event | null>(null);

  const setOpen = (value: boolean, reason: OpenChangeReason = "programmatic", event?: Event) => {
    if (!value) {
      storedReason.value = null;
      storedEvent.value = null;
    } else {
      storedReason.value = reason;
      storedEvent.value = event ?? null;
    }
    if (open.value === value) return;
    open.value = value;
    options.onOpenChange?.(value, reason, event);
  };

  return {
    id,
    refs: {
      anchorEl: options.anchorEl,
      floatingEl: options.floatingEl,
      arrowEl: options.arrowEl ?? ref<HTMLElement | null>(null),
    },
    open,
    setOpen,
    lastOpenReason: computed<OpenChangeReason | null>(() =>
      open.value ? storedReason.value : null,
    ),
    lastOpenEvent: computed<Event | null>(() => (open.value ? storedEvent.value : null)),
    isRoot: true,
    tree: null,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function createFloatingNodeId(): FloatingNodeId {
  return Symbol("v-float-node");
}

//=======================================================================================
// 📌 Internals
//=======================================================================================

/**
 * Internal registry storing non-public capabilities (middleware registries)
 * attached to floating nodes via WeakMap.
 *
 * @internal
 */
export const floatingInternals = new WeakMap<FloatingNodeId, FloatingInternals>();

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Anchor values accepted by the floating node.
 */
export type AnchorElement = HTMLElement | VirtualElement | null;

/**
 * Floating panel elements are real DOM nodes when mounted.
 */
export type FloatingElement = HTMLElement | null;

/**
 * Stable identity for a floating node.
 */
export type FloatingNodeId = symbol;

/**
 * Reactive refs owned by the floating node.
 */
export interface FloatingNodeElements {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

export interface FloatingNode {
  id: FloatingNodeId;
  refs: FloatingNodeElements;
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
  /**
   * The reason for the most recent open state transition or reaffirmation.
   * Null when closed.
   */
  lastOpenReason?: Readonly<Ref<OpenChangeReason | null>>;
  /**
   * The DOM/synthetic event associated with the most recent open state transition or reaffirmation.
   * Null when closed.
   */
  lastOpenEvent?: Readonly<Ref<Event | null>>;
  /**
   * Whether this is a top-level floating node without a parent node.
   * Patched by `tree.addNode()` and `tree.removeNode()`; true for standalone nodes.
   */
  isRoot: boolean;
  /**
   * The tree this node is registered in, or null when standalone.
   * Assigned by `tree.addNode()` and cleared by `tree.removeNode()`.
   */
  tree: FloatingTree | null;
}

/**
 * Options for creating a floating node.
 */
export interface UseFloatingNodeOptions {
  /**
   * Anchor element or virtual element the floating panel is positioned against.
   */
  anchorEl: Ref<AnchorElement>;

  /**
   * Floating panel element.
   */
  floatingEl: Ref<FloatingElement>;

  /**
   * Optional arrow element used by `useArrow()`.
   */
  arrowEl?: Ref<HTMLElement | null>;

  /**
   * Optional controlled open state.
   */
  open?: Ref<boolean>;

  /**
   * Initial open state when `open` is not provided.
   */
  defaultOpen?: boolean;

  /**
   * Called whenever the open state changes through VFloat helpers.
   */
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
}

/**
 * Internal capabilities attached to a position result via a WeakMap.
 *
 * @internal
 */
export interface FloatingInternals {
  middlewareRegistry?: {
    middlewares: ComputedRef<Middleware[]>;
    register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
  };
  placement?: Readonly<Ref<Placement>>;
  middlewareData?: Readonly<Ref<MiddlewareData>>;
}
