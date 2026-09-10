import { type ShallowRef, shallowRef } from "vue";
import { isTargetWithinElements } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
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
 * ```
 */
export function useFloatingTree(): FloatingTree {
  const nodes = new Map<FloatingNodeId, TreeEntry>();

  /**
   * Registers a floating node in the tree and links it under `parentId`.
   * Automatically unregisters when the calling effect scope disposes.
   * The node must belong to a single tree; re-registering it elsewhere steals it.
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
    child.tree = tree;
    child.isRoot = resolvedParentId == null;

    tryOnScopeDispose(() => {
      removeNode(child.id);
    });
  }

  /**
   * Removes a node from the tree, re-parents its immediate children to the
   * removed node's parent (or to root level), and returns it to standalone state.
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
      child.node.isRoot = inheritedParentId == null;
      if (parent && inheritedParentId != null) {
        parent.childIds.value = withAddedId(parent.childIds.value, childId);
      }
    }

    if (parent && entry.parentId != null) {
      parent.childIds.value = withRemovedId(parent.childIds.value, id);
    }

    nodes.delete(id);
    entry.node.tree = null;
    entry.node.isRoot = true;
  }

  /**
   * Retrieves a registered floating node by id.
   */
  function getNode(id: FloatingNodeId): FloatingNode | undefined {
    return nodes.get(id)?.node;
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
   * Closes all descendant nodes from innermost child to nearest parent.
   * Call explicitly when parent teardown must cascade; `setOpen` stays
   * tree-agnostic and never cascades on its own.
   */
  function closeDescendants(
    node: Pick<FloatingNode, "id">,
    reason: OpenChangeReason = "programmatic",
    event?: Event,
  ): void {
    const descendants = getDescendants(node.id);
    if (descendants.length === 0) return;
    for (let i = descendants.length - 1; i >= 0; i--) {
      const descendant = descendants[i]!;
      if (!descendant.open.value) continue;
      descendant.setOpen(false, reason, event);
    }
  }

  const tree: FloatingTree = {
    addNode,
    removeNode,
    getNode,
    getChildren,
    getDescendants,
    getFloatingElements,
    getDeepestOpenContext,
    isTargetWithin,
    closeDescendants,
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
 * Explicit coordination scope for related floating nodes.
 * Created per menu via `useFloatingTree()`; methods operate on node ids
 * with full node objects stored as map values.
 */
export interface FloatingTree {
  /**
   * Registers a node and links it under `parentId` (`null` for roots).
   */
  addNode: (child: FloatingNode, parentId?: FloatingNodeId | null) => void;
  /**
   * Removes a node, re-parents its children to the removed node's parent,
   * and returns it to standalone state.
   */
  removeNode: (id: FloatingNodeId) => void;
  /**
   * Retrieves a registered node by id.
   */
  getNode: (id: FloatingNodeId) => FloatingNode | undefined;
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
   * Closes all descendant nodes from innermost child to nearest parent.
   */
  closeDescendants: (
    node: Pick<FloatingNode, "id">,
    reason?: OpenChangeReason,
    event?: Event,
  ) => void;
}

/**
 * Return shape for `useFloatingTree`.
 */
export type UseFloatingTreeReturn = FloatingTree;
