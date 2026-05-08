import { type Ref, ref } from "vue";
import {
  type FloatingContext,
  type FloatingTreeNodeBridge,
  getFloatingInternals,
  patchFloatingInternals,
} from "@/composables/positioning/floating-context";
import type { FloatingTreeInteraction } from "../internal/tree-interaction";
import type { FloatingTreeNode } from "../use-floating-tree-node";

type TreeNavigationNode = FloatingTreeNode | FloatingTreeNodeBridge;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Coordinates parent–child list-navigation handoff through a floating tree.
 *
 * This adapter concentrates all tree-graph operations that `useListNavigation`
 * needs — return-index tracking, stale-branch closing, and bridge synchronization —
 * so the main composable can stay focused on keyboard strategy and focus management.
 */
export function createTreeCoordinator(
  options: TreeCoordinatorOptions,
): ListNavigationTreeCoordinator {
  const { context, tree, onNavigate, getChildNode } = options;

  const treeNodeReturnIndex = ref<number | null>(null);
  const treeNodeOpenedByTree = ref(false);
  let returnIndexBridge = treeNodeReturnIndex;
  let openedByTreeBridge = treeNodeOpenedByTree;
  let pendingChildOpen: PendingChildOpen | null = null;

  // ---------------------------------------------------------------------------
  // Bridge synchronization
  // ---------------------------------------------------------------------------

  /**
   * Picks up any return-index or opened-by-tree values that a parent instance
   * wrote to this node's bridge, then publishes the consolidated bridge back.
   */
  const syncBridge = (): void => {
    const treeNode = tree.treeNode;
    if (!treeNode) {
      return;
    }

    // Pick up values a parent may have written via ensureChildBridge.
    returnIndexBridge = treeNode.listNavigation?.returnIndex ?? returnIndexBridge;
    openedByTreeBridge = treeNode.listNavigation?.openedByTree ?? openedByTreeBridge;

    treeNode.listNavigation = {
      returnIndex: returnIndexBridge,
      openedByTree: openedByTreeBridge,
      onNavigate: (index: number | null) => onNavigate?.(index),
    };

    patchFloatingInternals(context, { treeNode });
  };

  /**
   * Writes return-index and opened-by-tree markers onto a child node's bridge
   * so the child's coordinator picks them up on its next sync.
   */
  const ensureChildBridge = (
    childNode: FloatingTreeNode | null,
    index: number,
  ): FloatingTreeNodeBridge | null => {
    if (!childNode) {
      return null;
    }

    const childTreeNode = getFloatingInternals(childNode.context as object)?.treeNode;
    if (!childTreeNode) {
      return null;
    }

    // Child lists inherit the index that opened them so Escape / ArrowLeft can return cleanly.
    const returnIndex = childTreeNode.listNavigation?.returnIndex ?? ref<number | null>(null);
    const openedByTree = childTreeNode.listNavigation?.openedByTree ?? ref(false);
    returnIndex.value = index;
    openedByTree.value = true;

    childTreeNode.listNavigation = {
      returnIndex,
      openedByTree,
      onNavigate: childTreeNode.listNavigation?.onNavigate,
    };

    patchFloatingInternals(childNode.context as object, { treeNode: childTreeNode });

    return getFloatingInternals(childNode.context as object)?.treeNode ?? null;
  };

  // ---------------------------------------------------------------------------
  // Tree-graph operations
  // ---------------------------------------------------------------------------

  const isWithinBranch = (
    candidateNode: TreeNavigationNode | null,
    branchRootNode: TreeNavigationNode | null,
  ): boolean => {
    const floatingTree = tree.tree;
    if (!candidateNode || !branchRootNode || !floatingTree) {
      return false;
    }

    const visited = new Set<string>();
    let currentNode: TreeNavigationNode | null = candidateNode;

    while (currentNode) {
      const currentId = currentNode.id.value;
      if (currentId === branchRootNode.id.value) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);

      const parentId: string | null = currentNode.parentId.value;
      currentNode = parentId ? floatingTree.actions.getNode(parentId) : null;
    }

    return false;
  };

  const clearDescendantReturnIndexes = (branchRootNode: TreeNavigationNode): void => {
    const floatingTree = tree.tree;
    if (!floatingTree) {
      return;
    }

    const visited = new Set<string>();

    const visit = (node: TreeNavigationNode) => {
      const nodeId = node.id.value;
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);

      for (const childId of node.childIds.value) {
        const childNode = floatingTree.actions.getNode(childId);
        if (!childNode) {
          continue;
        }

        const returnIndex = childNode.listNavigation?.returnIndex;
        if (returnIndex) {
          returnIndex.value = null;
        }

        visit(childNode);
      }
    };

    visit(branchRootNode);
  };

  /**
   * Closes child branches that are no longer relevant after an index change.
   * Preserves the branch the pointer/keyboard is moving into.
   */
  const closeStaleChildBranches = (nextIndex: number | null, event?: Event): void => {
    const currentNode = tree.treeNode;
    const activeNode = tree.activeNode;

    if (!currentNode || !activeNode || activeNode.id.value === currentNode.id.value) {
      return;
    }

    if (!isWithinBranch(activeNode, currentNode)) {
      return;
    }

    const nextChildNode =
      nextIndex == null ? null : ensureChildBridge(getChildNode?.(nextIndex) ?? null, nextIndex);

    if (nextChildNode && isWithinBranch(activeNode, nextChildNode)) {
      return;
    }

    clearDescendantReturnIndexes(currentNode);
    tree.closeCurrentChildren("programmatic", event);
  };

  // ---------------------------------------------------------------------------
  // Public coordinator interface
  // ---------------------------------------------------------------------------

  return {
    syncBridge,

    navigate(index: number | null, event?: Event): void {
      closeStaleChildBranches(index, event);
      onNavigate?.(index);
    },

    openChild(childNode: FloatingTreeNode, index: number, event?: Event): void {
      ensureChildBridge(childNode, index);
      childNode.context.state.setOpen(true, "keyboard-activate", event);
    },

    setPendingChildOpen(childNode: FloatingTreeNode, index: number): void {
      pendingChildOpen = { childNode, index };
    },

    consumePendingChildOpen(settledIndex: number): FloatingTreeNode | null {
      if (!pendingChildOpen || pendingChildOpen.index !== settledIndex) {
        pendingChildOpen = null;
        return null;
      }

      const childNode = pendingChildOpen.childNode;
      pendingChildOpen = null;

      ensureChildBridge(childNode, settledIndex);
      return childNode;
    },

    clearPendingChildOpen(): void {
      pendingChildOpen = null;
    },

    handleOpen(): TreeCoordinatorOpenResult {
      syncBridge();
      const wasOpenedByTree = openedByTreeBridge.value;
      openedByTreeBridge.value = false;
      return { openedByTree: wasOpenedByTree };
    },

    handleClose(): void {
      // Restore the parent's active index before cleaning up.
      const returnIndex = returnIndexBridge.value;
      const parentNode = tree.parentNode;

      if (returnIndex != null && parentNode?.context.state.open.value) {
        parentNode.listNavigation?.onNavigate?.(returnIndex);
      }

      returnIndexBridge.value = null;
      openedByTreeBridge.value = false;
      pendingChildOpen = null;
    },

    reset(): void {
      returnIndexBridge.value = null;
      openedByTreeBridge.value = false;
      pendingChildOpen = null;
    },

    closeStaleChildBranches,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

interface TreeCoordinatorOptions {
  context: FloatingContext;
  tree: FloatingTreeInteraction;
  onNavigate?: (index: number | null) => void;
  getChildNode?: (index: number) => FloatingTreeNode | null;
}

interface PendingChildOpen {
  childNode: FloatingTreeNode;
  index: number;
}

export interface TreeCoordinatorOpenResult {
  openedByTree: boolean;
}

/**
 * Adapter that concentrates parent–child list-navigation coordination
 * through a floating tree so the main composable stays focused on
 * keyboard strategy and focus management.
 */
export interface ListNavigationTreeCoordinator {
  /** Synchronize the list-navigation bridge with the current tree node. */
  syncBridge(): void;

  /** Navigate to an index, closing stale child branches as needed. */
  navigate(index: number | null, event?: Event): void;

  /** Open a child tree node from the given list index. */
  openChild(childNode: FloatingTreeNode, index: number, event?: Event): void;

  /** Schedule a child node to open after the active index settles. */
  setPendingChildOpen(childNode: FloatingTreeNode, index: number): void;

  /** Consume a pending child open if the settled index matches. */
  consumePendingChildOpen(settledIndex: number): FloatingTreeNode | null;

  /** Clear any pending child open state. */
  clearPendingChildOpen(): void;

  /** Handle the open transition: sync bridge and return tree-opened state. */
  handleOpen(): TreeCoordinatorOpenResult;

  /** Handle the close transition: restore parent navigation and reset state. */
  handleClose(): void;

  /** Reset all tree coordination state. */
  reset(): void;

  /** Close child branches that became stale after an index change. */
  closeStaleChildBranches(nextIndex: number | null, event?: Event): void;
}
