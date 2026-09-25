import type { Middleware, MiddlewareData, Placement } from "@floating-ui/dom";
import {
  type ComputedRef,
  getCurrentInstance,
  hasInjectionContext,
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  provide,
  type Ref,
  ref,
  type ShallowRef,
  shallowRef,
} from "vue";
import { isTargetWithinElements } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { VirtualElement } from "@/types";

const FLOATING_NODE_KEY: InjectionKey<FloatingNode> = Symbol("v-float-node-context");

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
 * Supports standalone surfaces ($N = 0$) and nested composite hierarchies ($N > 0$) uniformly.
 *
 * Parenting resolution follows three tiers:
 * - **Standalone (Default / Omitted / `parent: undefined` / `parent: null`)**: Isolates the node with no parent, bypassing DI.
 * - **Opt-In DI (`parent: "auto"`)**: Discovers and attaches to the nearest ancestor `FloatingNode`
 *   from the Vue component context via Dependency Injection.
 * - **Explicit Parent (`parent: node`)**: Explicitly links to the provided node, bypassing DI.
 *
 * @param options - Configuration options for the floating node.
 * @returns The composite FloatingNode instance.
 */
export function useFloatingNode(options: UseFloatingNodeOptions): FloatingNode {
  const id = createFloatingNodeId();
  const open = options.open ?? ref(false);

  const parent = shallowRef<FloatingNode | null>(null);
  const children = shallowRef<ReadonlySet<FloatingNode>>(new Set());

  const appendChild = (child: FloatingNode): (() => void) => {
    // Cycle detection: walk up this node's parent chain to ensure `child` is not an ancestor
    let ancestor: FloatingNode | null = node;
    while (ancestor) {
      if (isSameFloatingNode(ancestor, child)) {
        if (import.meta.env.DEV) {
          console.warn(
            ancestor === node
              ? "[FloatingNode] A node cannot be its own parent."
              : "[FloatingNode] Cannot append child: cycle detected.",
          );
        }
        return () => {};
      }
      ancestor = ancestor.parent.value;
    }

    // If already linked under this parent, return teardown
    if (findChildById(children.value, child) && isSameFloatingNode(child.parent.value, node)) {
      return () => removeChild(child);
    }

    // If child is linked to another parent, detach from that parent first
    if (child.parent.value && !isSameFloatingNode(child.parent.value, node)) {
      child.parent.value.removeChild(child);
    }

    // Update child's parent reference
    (child.parent as ShallowRef<FloatingNode | null>).value = node;

    // Add child to children set (compared by id so re-created wrappers never duplicate)
    const next = new Set(children.value);
    const stale = findChildById(next, child);
    if (stale) next.delete(stale);
    next.add(child);
    children.value = next;

    return () => removeChild(child);
  };

  const removeChild = (child: FloatingNode): void => {
    const stored = findChildById(children.value, child);
    if (!stored) return;

    const next = new Set(children.value);
    next.delete(stored);
    children.value = next;

    if (isSameFloatingNode(child.parent.value, node)) {
      (child.parent as ShallowRef<FloatingNode | null>).value = null;
    }
  };

  const traverse = (
    visitor: (node: FloatingNode, depth: number) => TraverseAction,
    options: TraverseOptions = {},
    depth = 0,
  ): boolean => {
    const visitChildren = (): boolean => {
      for (const child of children.value) {
        if (!child.traverse(visitor, options, depth + 1)) return false;
      }
      return true;
    };

    if (options.order === "bottom-up") {
      return visitChildren() && visitor(node, depth) !== "stop";
    }

    const action = visitor(node, depth);
    return action !== "stop" && (action === "skip" || visitChildren());
  };

  const contains = (target: EventTarget | null): boolean =>
    Boolean(
      target &&
      !traverse((current, depth) => {
        if (depth > 0 && !current.open.value) return "skip";
        if (
          isTargetWithinElements(current.refs.anchorEl.value, current.refs.floatingEl.value, target)
        ) {
          return "stop";
        }
      }),
    );

  const getDepth = (): number => (parent.value ? 1 + parent.value.getDepth() : 0);

  const hasOpenChild = (): boolean => children.value.values().some((child) => child.open.value);

  const isTargetWithinAncestorElements = (target: EventTarget | null): boolean => {
    let current = parent.value;
    while (current) {
      if (
        isTargetWithinElements(current.refs.anchorEl.value, current.refs.floatingEl.value, target)
      )
        return true;
      current = current.parent.value;
    }
    return false;
  };

  const node: FloatingNode = {
    id,
    refs: {
      anchorEl: options.anchorEl,
      floatingEl: options.floatingEl,
      arrowEl: options.arrowEl ?? ref<HTMLElement | null>(null),
    },
    open,
    parent: parent as Readonly<ShallowRef<FloatingNode | null>>,
    children: children as Readonly<ShallowRef<ReadonlySet<FloatingNode>>>,
    appendChild,
    removeChild,
    contains,
    getDepth,
    hasOpenChild,
    isTargetWithinAncestorElements,
    traverse,
  };

  if (getCurrentInstance() && options.provide !== false) {
    provide(FLOATING_NODE_KEY, node);
  }

  // Declarative parent binding via options.parent
  let targetParent: FloatingNode | null = null;
  if (options.parent === "auto") {
    targetParent = hasInjectionContext() ? inject(FLOATING_NODE_KEY, null) : null;
    if (import.meta.env.DEV && !targetParent) {
      console.warn(
        "[FloatingNode] parent: 'auto' was specified, but no ancestor FloatingNode was found in the Vue component hierarchy. The node will remain standalone.",
      );
    }
  } else if (options.parent) {
    targetParent = options.parent;
  }

  if (targetParent) {
    targetParent.appendChild(node);
  }

  // Teardown on scope disposal: severs bi-directional links (both upstream parent
  // and downstream children) as a fail-safe for independent lifecycles or imperative usage.
  tryOnScopeDispose(() => {
    parent.value?.removeChild(node);
    for (const child of children.value) {
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
function isSameFloatingNode(a?: FloatingNode | null, b?: FloatingNode | null): boolean {
  return Boolean(a && b && a.id === b.id);
}

/**
 * Finds the stored child instance with the same id as the given child.
 * Set membership must be resolved by id since object identity is unstable.
 */
function findChildById(
  children: ReadonlySet<FloatingNode>,
  child: FloatingNode,
): FloatingNode | undefined {
  return children.values().find((existing) => existing.id === child.id);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Return action from a tree visitor to control traversal flow:
 * - `"stop"`: Immediately terminates the entire traversal across all nodes and branches.
 * - `"skip"`: In `"top-down"` order, skips descending into the current node's children while continuing sibling traversal.
 * - `void` / `undefined`: Continues traversal normally.
 */
export type TraverseAction = void | "skip" | "stop";

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
  open: Ref<boolean>;

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
   * Returns this node's number of ancestors.
   */
  getDepth: () => number;

  /**
   * Returns whether any immediate child is open.
   */
  hasOpenChild: () => boolean;

  /**
   * Returns whether the target is directly inside an ancestor's anchor or floating element.
   */
  isTargetWithinAncestorElements: (target: EventTarget | null) => boolean;

  /**
   * Recursively traverses this node and its descendants in depth-first order.
   * - Returning `"skip"` in `"top-down"` order skips descending into that node's children.
   * - Returning `"stop"` immediately halts the entire traversal across the tree.
   *
   * @param visitor - Callback invoked for each node with `(node, depth)`.
   * @param options - Traversal configuration options including order.
   * @param depth - Current recursion depth (used internally).
   * @returns `false` if traversal was terminated early via `"stop"`, `true` if completed.
   */
  traverse: (
    visitor: (node: FloatingNode, depth: number) => TraverseAction,
    options?: TraverseOptions,
    depth?: number,
  ) => boolean;
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
   * Optional open state ref. When omitted, an internal `ref(false)` is created.
   * If an initial open state of `true` is desired, pass `open: ref(true)`.
   */
  open?: Ref<boolean>;

  /**
   * Parent node reference for establishing composite hierarchies (submenus, cascades).
   *
   * - **Omitted / `undefined` (default)**: Standalone surface with no parent, bypassing DI.
   * - **`"auto"`**: Injects the nearest ancestor `FloatingNode` from the Vue component hierarchy via DI.
   * - **`null`**: Explicitly marks the node as standalone, bypassing DI.
   * - **`FloatingNode`**: Explicitly links to the given parent node, bypassing DI.
   */
  parent?: FloatingNode | "auto" | null;

  /**
   * Whether to provide this node to descendant components via Vue's Dependency Injection (`provide`).
   * When `true` (default), descendant components passing `parent: "auto"` can discover and attach to this node.
   * Set to `false` to prevent this node from acting as a DI parent to any descendant nodes.
   *
   * @default false
   */
  provide?: boolean;
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
