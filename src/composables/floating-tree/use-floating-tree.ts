import { type ShallowRef, shallowRef } from "vue";
import { isTargetWithinElements } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { FloatingNode, FloatingNodeElements, FloatingNodeId } from "./use-floating-node";

const isDev = import.meta.env.DEV;

interface TreeEntry {
  node: FloatingNode;
  parentId: FloatingNodeId | null;
  childIds: ShallowRef<Set<FloatingNodeId>>;
}

interface TreeQueryTarget {
  id?: FloatingNodeId;
  refs: FloatingNodeElements;
}

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates an explicit floating tree that coordinates related floating nodes,
 * such as a menu with nested submenus.
 *
 * Each tree owns its own `Map` of nodes keyed by node id, so multiple trees
 * stay fully isolated from each other. Nodes are created tree-agnostically via
 * `useFloatingNode()` and join a tree through `tree.addNode()`.
 *
 * @returns The floating tree with methods to register nodes and query the family.
 *
 * @example Basic menu with a nested submenu
 * ```ts
 * const tree = useFloatingTree();
 * const rootNode = useFloatingNode({ anchorEl, floatingEl });
 * const subNode = useFloatingNode({ anchorEl: subAnchorEl, floatingEl: subFloatingEl });
 *
 * tree.addNode(rootNode);
 * tree.addNode(subNode, rootNode.id);
 *
 * useDismiss(rootNode, { tree });
 * ```
 */
export function useFloatingTree(): FloatingTree {
  const nodes = new Map<FloatingNodeId, TreeEntry>();

  /**
   * Registers a floating node in the tree and links it under `parentId`.
   * Automatically unregisters when the calling effect scope disposes.
   * The node object itself is never mutated; hierarchy lives in the tree's map.
   * The same node may join multiple trees; pass the relevant tree explicitly
   * to interaction composables via their `tree` option.
   */
  function addNode(child: FloatingNode, parentId: FloatingNodeId | null = null): void {
    const existing = nodes.get(child.id);
    if (existing) {
      if (isDev) {
        console.warn(
          `[FloatingTree] Node "${String(child.id)}" is already registered in the floating tree.`,
        );
      }
      return;
    }

    // Validate parent linkage to prevent out-of-order registration and cycles
    let resolvedParentId: FloatingNodeId | null = null;
    if (parentId != null) {
      if (parentId === child.id) {
        if (isDev) {
          console.warn("[FloatingTree] A node cannot be its own parent.");
        }
      } else {
        const parent = nodes.get(parentId);
        if (parent) {
          resolvedParentId = parentId;
          parent.childIds.value = withAddedId(parent.childIds.value, child.id);
        } else if (isDev) {
          console.warn(
            `[FloatingTree] Cannot register node under parent "${String(parentId)}": parent node is not registered in the floating tree. Ensure parent node is initialized before child node.`,
          );
        }
      }
    }

    nodes.set(child.id, {
      node: child,
      parentId: resolvedParentId,
      childIds: shallowRef(new Set()),
    });

    tryOnScopeDispose(() => {
      removeNode(child.id);
    });
  }

  /**
   * Removes a node from the tree and re-parents its immediate children to the
   * removed node's parent (or to root level).
   * Re-parenting keeps surviving subtrees reachable instead of orphaning them
   * with dangling parent links when a parent scope disposes first.
   */
  function removeNode(id: FloatingNodeId): void {
    const entry = nodes.get(id);
    if (!entry) return;

    const parent = entry.parentId != null ? nodes.get(entry.parentId) : undefined;
    const inheritedParentId = parent ? entry.parentId : null;

    for (const childId of entry.childIds.value) {
      const child = nodes.get(childId);
      if (!child) continue;
      child.parentId = inheritedParentId;
      if (parent && inheritedParentId != null) {
        parent.childIds.value = withAddedId(parent.childIds.value, childId);
      }
    }

    if (parent && entry.parentId != null) {
      parent.childIds.value = withRemovedId(parent.childIds.value, id);
    }

    nodes.delete(id);
  }

  /**
   * Retrieves a registered floating node by id.
   */
  function getNode(id: FloatingNodeId): FloatingNode | undefined {
    return nodes.get(id)?.node;
  }

  /**
   * Returns the parent node for a given id, or undefined for roots and
   * unregistered ids.
   */
  function getParent(id: FloatingNodeId): FloatingNode | undefined {
    const entry = nodes.get(id);
    if (!entry || entry.parentId == null) return undefined;
    return nodes.get(entry.parentId)?.node;
  }

  /**
   * Returns immediate child nodes for a given id.
   */
  function getChildren(id: FloatingNodeId): FloatingNode[] {
    const entry = nodes.get(id);
    if (!entry) return [];

    const children: FloatingNode[] = [];
    for (const childId of entry.childIds.value) {
      const child = nodes.get(childId);
      if (child) children.push(child.node);
    }
    return children;
  }

  /**
   * Returns all descendant nodes depth-first.
   */
  function getDescendants(id: FloatingNodeId): FloatingNode[] {
    const descendants: FloatingNode[] = [];
    const visited = new Set<FloatingNodeId>();

    const traverse = (currentId: FloatingNodeId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const entry = nodes.get(currentId);
      if (!entry) return;

      for (const childId of entry.childIds.value) {
        const child = nodes.get(childId);
        if (child) {
          descendants.push(child.node);
          traverse(childId);
        }
      }
    };

    traverse(id);
    return descendants;
  }

  /**
   * Returns mounted floating DOM elements for the node and all its descendants.
   */
  function getFloatingElements(target: TreeQueryTarget): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const floatingEl = target.refs.floatingEl.value;
    if (floatingEl) elements.push(floatingEl);

    if (target.id != null) {
      for (const descendant of getDescendants(target.id)) {
        const descendantEl = descendant.refs.floatingEl.value;
        if (descendantEl) elements.push(descendantEl);
      }
    }

    return elements;
  }

  /**
   * Finds the deepest currently open node in the subtree, for stacked dismissal.
   */
  function getDeepestOpenContext<T extends Pick<FloatingNode, "id" | "open" | "setOpen">>(
    node: T,
  ): T | FloatingNode {
    let deepestNode: T | FloatingNode = node;
    let maxDepth = node.open.value ? 0 : -1;
    const visited = new Set<FloatingNodeId>();

    const traverse = (current: FloatingNode, depth: number) => {
      if (visited.has(current.id)) return;
      visited.add(current.id);

      if (current.open.value && depth > maxDepth) {
        maxDepth = depth;
        deepestNode = current;
      }
      for (const child of getChildren(current.id)) {
        traverse(child, depth + 1);
      }
    };

    const entry = nodes.get(node.id);
    if (entry) {
      traverse(entry.node, entry.node.open.value ? 0 : -1);
    }

    return deepestNode;
  }

  /**
   * Checks whether `target` is inside the node's own elements or any descendant's.
   */
  function isTargetWithin(node: TreeQueryTarget, target: EventTarget | null): boolean {
    if (isTargetWithinElements(node.refs.anchorEl.value, node.refs.floatingEl.value, target)) {
      return true;
    }

    if (node.id != null) {
      for (const descendant of getDescendants(node.id)) {
        if (
          isTargetWithinElements(
            descendant.refs.anchorEl.value,
            descendant.refs.floatingEl.value,
            target,
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Executes a callback for every node matching the given relationship to `target`.
   * Halts iteration early if the callback explicitly returns `false`.
   */
  function forEach(
    target: FloatingNodeId | Pick<FloatingNode, "id">,
    relationship: RelationshipSelector,
    action: (node: FloatingNode) => boolean | void,
    options?: ForEachOptions,
  ): void {
    const targetId =
      typeof target === "object" && target !== null && "id" in target ? target.id : target;
    const targetEntry = nodes.get(targetId);

    if (typeof relationship === "function") {
      const targetNode =
        targetEntry?.node ??
        (typeof target === "object" && target !== null && "refs" in target
          ? (target as FloatingNode)
          : undefined);
      if (!targetNode) return;

      const matched = Array.from(relationship(targetNode, tree));
      const list = options?.order === "bottom-up" ? matched.reverse() : matched;
      for (const node of list) {
        if (action(node) === false) break;
      }
      return;
    }

    if (!targetEntry) return;

    if (relationship === "parent") {
      if (targetEntry.parentId != null) {
        const parentNode = nodes.get(targetEntry.parentId)?.node;
        if (parentNode) {
          action(parentNode);
        }
      }
      return;
    }

    if (relationship === "children") {
      const children = getChildren(targetId);
      const list = options?.order === "bottom-up" ? children.slice().reverse() : children;
      for (const child of list) {
        if (action(child) === false) break;
      }
      return;
    }

    if (relationship === "siblings") {
      const siblings: FloatingNode[] = [];
      if (targetEntry.parentId != null) {
        const parentEntry = nodes.get(targetEntry.parentId);
        if (parentEntry) {
          for (const childId of parentEntry.childIds.value) {
            if (childId !== targetId) {
              const sibling = nodes.get(childId);
              if (sibling) siblings.push(sibling.node);
            }
          }
        }
      } else {
        for (const entry of nodes.values()) {
          if (entry.parentId == null && entry.node.id !== targetId) {
            siblings.push(entry.node);
          }
        }
      }
      const list = options?.order === "bottom-up" ? siblings.reverse() : siblings;
      for (const sibling of list) {
        if (action(sibling) === false) break;
      }
      return;
    }

    if (relationship === "ancestors") {
      const ancestors: FloatingNode[] = [];
      const visited = new Set<FloatingNodeId>();
      let curr = targetEntry;
      while (curr && curr.parentId != null) {
        if (visited.has(curr.parentId)) break;
        visited.add(curr.parentId);
        const parentEntry = nodes.get(curr.parentId);
        if (!parentEntry) break;
        ancestors.push(parentEntry.node);
        curr = parentEntry;
      }
      const order = options?.order ?? "bottom-up";
      const list = order === "top-down" ? ancestors.reverse() : ancestors;
      for (const ancestor of list) {
        if (action(ancestor) === false) break;
      }
      return;
    }

    if (relationship === "descendants") {
      const order = options?.order ?? "top-down";
      let list: FloatingNode[];
      if (order === "bottom-up") {
        list = [];
        const visited = new Set<FloatingNodeId>();
        const collectBottomUp = (currentId: FloatingNodeId) => {
          if (visited.has(currentId)) return;
          visited.add(currentId);
          const entry = nodes.get(currentId);
          if (!entry) return;
          for (const childId of entry.childIds.value) {
            collectBottomUp(childId);
            const child = nodes.get(childId);
            if (child) list.push(child.node);
          }
        };
        collectBottomUp(targetId);
      } else {
        list = getDescendants(targetId);
      }
      for (const descendant of list) {
        if (action(descendant) === false) break;
      }
      return;
    }

    if (relationship === "root") {
      let curr = targetEntry;
      const visited = new Set<FloatingNodeId>();
      while (curr.parentId != null) {
        if (visited.has(curr.parentId)) break;
        visited.add(curr.parentId);
        const parentEntry = nodes.get(curr.parentId);
        if (!parentEntry) break;
        curr = parentEntry;
      }
      action(curr.node);
      return;
    }
  }

  const tree: FloatingTree = {
    addNode,
    removeNode,
    getNode,
    getParent,
    getChildren,
    getDescendants,
    getFloatingElements,
    getDeepestOpenContext,
    isTargetWithin,
    forEach,
  };

  return tree;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function withAddedId(ids: Set<FloatingNodeId>, id: FloatingNodeId): Set<FloatingNodeId> {
  if (ids.has(id)) return ids;
  const next = new Set(ids);
  next.add(id);
  return next;
}

function withRemovedId(ids: Set<FloatingNodeId>, id: FloatingNodeId): Set<FloatingNodeId> {
  if (!ids.has(id)) return ids;
  const next = new Set(ids);
  next.delete(id);
  return next;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Structural relationships supported in the floating tree.
 */
export type TreeRelationship =
  | "parent"
  | "children"
  | "ancestors"
  | "descendants"
  | "siblings"
  | "root";

/**
 * Target relationship selector for tree traversal in `tree.forEach()`.
 * Either a standard relationship keyword or a custom resolver function.
 */
export type RelationshipSelector =
  | TreeRelationship
  | ((node: FloatingNode, tree: FloatingTree) => FloatingNode[] | Iterable<FloatingNode>);

/**
 * Options controlling traversal order in `tree.forEach()`.
 */
export interface ForEachOptions {
  /**
   * Traversal direction for hierarchical relationships ('descendants' and 'ancestors').
   *
   * Defaults:
   * - `'ancestors'`: `'bottom-up'` (closest parent first, like DOM event bubbling)
   * - `'descendants'`: `'top-down'` (shallow descendants first)
   *
   * For non-hierarchical relationships ('children', 'siblings', or custom functions),
   * `'bottom-up'` reverses the natural order.
   *
   * @default 'top-down' (or 'bottom-up' for 'ancestors')
   */
  order?: "top-down" | "bottom-up";
}

/**
 * Explicit coordination scope for related floating nodes.
 * Created per menu via `useFloatingTree()`; methods operate on node ids
 * with full node objects stored as map values.
 */
export interface FloatingTree {
  /**
   * Registers a node and links it under `parentId` (`null` for roots).
   * Never mutates the node object; hierarchy lives in the tree's map.
   */
  addNode: (child: FloatingNode, parentId?: FloatingNodeId | null) => void;
  /**
   * Removes a node and re-parents its children to the removed node's parent
   * (or to root level).
   */
  removeNode: (id: FloatingNodeId) => void;
  /**
   * Retrieves a registered node by id.
   */
  getNode: (id: FloatingNodeId) => FloatingNode | undefined;
  /**
   * Returns the parent node for a given id, or undefined for roots and
   * unregistered ids.
   */
  getParent: (id: FloatingNodeId) => FloatingNode | undefined;
  /**
   * Returns immediate child nodes for a given id.
   */
  getChildren: (id: FloatingNodeId) => FloatingNode[];
  /**
   * Returns all descendant nodes depth-first.
   */
  getDescendants: (id: FloatingNodeId) => FloatingNode[];
  /**
   * Returns mounted floating DOM elements for the node and all its descendants.
   */
  getFloatingElements: (node: Pick<FloatingNode, "id" | "refs">) => HTMLElement[];
  /**
   * Finds the deepest currently open node in the subtree.
   */
  getDeepestOpenContext: <T extends Pick<FloatingNode, "id" | "open" | "setOpen">>(
    node: T,
  ) => T | FloatingNode;
  /**
   * Checks whether `target` is inside the node's own elements or any descendant's.
   */
  isTargetWithin: (node: Pick<FloatingNode, "id" | "refs">, target: EventTarget | null) => boolean;
  /**
   * Executes a callback for every node matching the given relationship to `target`.
   * Return `false` from the callback to halt iteration early.
   */
  forEach: (
    target: FloatingNodeId | Pick<FloatingNode, "id">,
    relationship: RelationshipSelector,
    action: (node: FloatingNode) => boolean | void,
    options?: ForEachOptions,
  ) => void;
}

/**
 * Return shape for `useFloatingTree`.\n */
export type UseFloatingTreeReturn = FloatingTree;
