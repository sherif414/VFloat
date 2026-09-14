import type { Middleware, MiddlewareData, Placement } from "@floating-ui/dom";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  ref,
  type ShallowRef,
  shallowReadonly,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { isTargetWithinElements } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useControllableState } from "@/shared/use-controllable-state";
import type { OpenChangeReason, VirtualElement } from "@/types";
import { registerActiveFloatingNode } from "./active-nodes";

const internalParentMap = new WeakMap<FloatingNode, ShallowRef<FloatingNode | null>>();

/**
 * Internal registry storing non-public capabilities (middleware registries)
 * attached to floating nodes via WeakMap.
 *
 * @internal
 */
export const floatingInternals = new WeakMap<FloatingNodeId, FloatingInternals>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a unified composite floating node used by interaction and positioning composables.
 * Supports standalone surfaces (N = 0) and nested composite hierarchies (N > 0) uniformly
 * via explicit `parent` option.
 *
 * @param options - Configuration options for the floating node.
 * @returns The composite FloatingNode instance.
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

  const parent = shallowRef<FloatingNode | null>(null);
  const children = shallowRef<ReadonlySet<FloatingNode>>(new Set());

  const appendChild = (child: FloatingNode): (() => void) => {
    if (isSameFloatingNode(child, node)) {
      if (import.meta.env.DEV) {
        console.warn("[FloatingNode] A node cannot be its own parent.");
      }
      return () => {};
    }

    // Cycle detection: walk up this node's parent chain to ensure `child` is not an ancestor
    let ancestor: FloatingNode | null = node;
    while (ancestor) {
      if (isSameFloatingNode(ancestor, child)) {
        if (import.meta.env.DEV) {
          console.warn("[FloatingNode] Cannot append child: cycle detected.");
        }
        return () => {};
      }
      ancestor = ancestor.parent.value;
    }

    // If already linked under this parent, return teardown
    if (findChildById(children.value, child) && isSameFloatingNode(child.parent.value, node)) {
      return () => {
        removeChild(child);
      };
    }

    // If child is linked to another parent, detach from that parent first
    if (child.parent.value && !isSameFloatingNode(child.parent.value, node)) {
      child.parent.value.removeChild(child);
    }

    // Update child's parent reference
    const childParentRef =
      internalParentMap.get(child) ?? (child.parent as ShallowRef<FloatingNode | null>);
    if (childParentRef && "value" in childParentRef) {
      try {
        childParentRef.value = node;
      } catch {
        // Fallback for mocked readonly refs in tests
      }
    }

    // Add child to children set (compared by id so re-created wrappers never duplicate)
    const next = new Set(children.value);
    const stale = findChildById(next, child);
    if (stale) next.delete(stale);
    next.add(child);
    children.value = next;

    return () => {
      removeChild(child);
    };
  };

  const removeChild = (child: FloatingNode): void => {
    const stored = findChildById(children.value, child);
    if (!stored) return;

    const next = new Set(children.value);
    next.delete(stored);
    children.value = next;

    if (isSameFloatingNode(child.parent.value, node)) {
      const parent =
        internalParentMap.get(child) ?? (child.parent as ShallowRef<FloatingNode | null>);
      if (parent && "value" in parent) {
        try {
          parent.value = null;
        } catch {
          // Fallback for mocked readonly refs in tests
        }
      }
    }
  };

  const traverse = (
    visitor: (node: FloatingNode, depth: number) => boolean | void,
    options: TraverseOptions = {},
    depth = 0,
  ): void => {
    const order = options.order ?? "top-down";

    if (order === "top-down") {
      if (visitor(node, depth) === false) {
        return;
      }
      for (const child of children.value) {
        child.traverse(visitor, options, depth + 1);
      }
    } else {
      for (const child of children.value) {
        child.traverse(visitor, options, depth + 1);
      }
      visitor(node, depth);
    }
  };

  const contains = (target: EventTarget | null): boolean => {
    if (!target) return false;

    let found = false;

    traverse((current, depth) => {
      if (found || (depth > 0 && !current.open.value)) {
        return false;
      }

      if (
        isTargetWithinElements(current.refs.anchorEl.value, current.refs.floatingEl.value, target)
      ) {
        found = true;
        return false;
      }
    });

    return found;
  };

  const closeDescendants = (reason: OpenChangeReason = "programmatic"): void => {
    traverse(
      (current, depth) => {
        if (depth > 0 && current.open.value) {
          current.setOpen(false, reason);
        }
      },
      { order: "bottom-up" },
    );
  };

  const node: FloatingNode = {
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
    parent: shallowReadonly(parent) as Readonly<ShallowRef<FloatingNode | null>>,
    children: shallowReadonly(children) as Readonly<ShallowRef<ReadonlySet<FloatingNode>>>,
    appendChild,
    removeChild,
    contains,
    traverse,
    closeDescendants,
  };

  internalParentMap.set(node, parent);

  if (typeof window !== "undefined") {
    const unregisterNode = registerActiveFloatingNode(node);
    tryOnScopeDispose(unregisterNode);
  }

  // Declarative parent binding via options.parent
  if (options.parent !== undefined) {
    watch(
      () => toValue(options.parent),
      (parentNode, _oldParent, onCleanup) => {
        if (!parentNode) return;
        const unbind = parentNode.appendChild(node);
        onCleanup(unbind);
      },
      { immediate: true },
    );
  }

  // Teardown on scope disposal
  tryOnScopeDispose(() => {
    // Detach self from parent if still linked
    if (parent.value) {
      parent.value.removeChild(node);
    }
    // Detach all children
    for (const child of Array.from(children.value)) {
      removeChild(child);
    }
  });

  return node;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function createFloatingNodeId(): FloatingNodeId {
  return Symbol("v-float-node");
}

/**
 * Compares two floating nodes by stable id instead of object identity,
 * so re-created wrappers or proxies representing the same node still match.
 */
function isSameFloatingNode(
  a: FloatingNode | null | undefined,
  b: FloatingNode | null | undefined,
): boolean {
  return !!a && !!b && a.id === b.id;
}

/**
 * Finds the stored child instance with the same id as the given child.
 * Set membership must be resolved by id since object identity is unstable.
 */
function findChildById(
  children: ReadonlySet<FloatingNode>,
  child: FloatingNode,
): FloatingNode | undefined {
  for (const existing of children) {
    if (existing.id === child.id) return existing;
  }
  return undefined;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Traversal direction for the floating node tree.
 */
export type TraversalOrder = "top-down" | "bottom-up";

/**
 * Options for configuring node traversal.
 */
export interface TraverseOptions {
  /**
   * Traversal order:
   * - `"top-down"` (default, pre-order): visits the node before visiting its children.
   * - `"bottom-up"` (post-order): visits children before visiting the node.
   */
  order?: TraversalOrder;
}

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
   * Intrinsic parent node in the composite hierarchy. Null for root nodes.
   */
  parent: Readonly<ShallowRef<FloatingNode | null>>;

  /**
   * Immediate child nodes in the composite hierarchy.
   */
  children: Readonly<ShallowRef<ReadonlySet<FloatingNode>>>;

  /**
   * Appends a child floating node under this node, establishing atomic bi-directional hierarchy.
   * Returns a teardown function that unlinks the child.
   */
  appendChild: (child: FloatingNode) => () => void;

  /**
   * Removes a child floating node from this node and unsets the child's parent reference.
   */
  removeChild: (child: FloatingNode) => void;

  /**
   * Checks whether the given target is contained within this node's elements or any of its open descendants.
   */
  contains: (target: EventTarget | null) => boolean;

  /**
   * Recursively traverses this node and its descendants in depth-first order.
   * In `"top-down"` order, returning `false` from the visitor halts traversal into that node's sub-branch.
   *
   * @param visitor - Callback invoked for each node with `(node, depth)`.
   * @param options - Traversal configuration options including order.
   * @param depth - Current recursion depth (used internally).
   */
  traverse: (
    visitor: (node: FloatingNode, depth: number) => boolean | void,
    options?: TraverseOptions,
    depth?: number,
  ) => void;

  /**
   * Closes all active descendant floating nodes bottom-up.
   */
  closeDescendants: (reason?: OpenChangeReason) => void;
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

  /**
   * Explicit parent node reference for nested composite surfaces (submenus, cascades).
   */
  parent?: MaybeRefOrGetter<FloatingNode | null | undefined>;
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
