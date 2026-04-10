import type {
  FloatingContext,
  FloatingTreeBridge,
  FloatingTreeNodeBridge,
} from "@/composables/positioning/floating-context";
import { getFloatingInternals } from "@/composables/positioning/floating-context";
import type { OpenChangeReason } from "@/types";

interface FloatingContextLike {
  state: FloatingContext["state"];
  refs?: FloatingContext["refs"];
}

export interface FloatingTreeInteraction {
  readonly treeNode: FloatingTreeNodeBridge | null;
  readonly tree: FloatingTreeBridge | null;
  readonly parentNode: FloatingTreeNodeBridge | null;
  readonly activeNode: FloatingTreeNodeBridge | null;
  readonly isTree: boolean;
  readonly isRoot: boolean;
  readonly isLeaf: boolean;
  readonly isActive: boolean;
  isTargetWithinNode: (target: EventTarget | null) => boolean;
  isTargetWithinBranch: (target: EventTarget | null) => boolean;
  isTargetWithinTree: (target: EventTarget | null) => boolean;
  closeCurrent: (reason: OpenChangeReason, event?: Event) => void;
  closeCurrentBranch: (reason: OpenChangeReason, event?: Event) => void;
  closeCurrentChildren: (reason: OpenChangeReason, event?: Event) => void;
  closeCurrentSiblings: (reason: OpenChangeReason, event?: Event) => void;
  closeActive: (reason: OpenChangeReason, event?: Event) => void;
  closeActiveBranch: (reason: OpenChangeReason, event?: Event) => void;
  closeActiveChildren: (reason: OpenChangeReason, event?: Event) => void;
  restoreParentNavigation: (event?: Event) => void;
}

export function resolveTreeNodeBridge(context: FloatingContextLike): FloatingTreeNodeBridge | null {
  return getFloatingInternals(context as object)?.treeNode ?? null;
}

export function resolveTreeInteraction(context: FloatingContextLike): FloatingTreeInteraction {
  // This adapter keeps tree-aware logic in one place so interaction composables stay small.
  const resolveTreeNode = () => resolveTreeNodeBridge(context);
  const resolveTree = () => resolveTreeNode()?.tree ?? null;

  const resolveParentNode = () => {
    const treeNode = resolveTreeNode();
    const tree = resolveTree();
    const parentId = treeNode?.parentId.value ?? null;

    if (!treeNode || !tree || !parentId) {
      return null;
    }

    return tree.actions.getNode(parentId);
  };

  const resolveActiveNode = () => {
    const tree = resolveTree();
    if (!tree) {
      return null;
    }

    const activeId = tree.activeId.value;
    return activeId ? tree.actions.getNode(activeId) : null;
  };

  const closeNodeWithReason = (
    node: FloatingTreeNodeBridge | null,
    reason: OpenChangeReason,
    event?: Event,
  ) => {
    // Fall back to the local context when no tree node bridge is available.
    if (!node) {
      context.state.setOpen(false, reason, event);
    } else {
      node.actions.closeWithReason(reason, event);
    }
  };

  const closeNodeBranch = (
    node: FloatingTreeNodeBridge | null,
    reason: OpenChangeReason,
    event?: Event,
  ) => {
    if (!node) {
      closeNodeWithReason(resolveTreeNode(), reason, event);
      return;
    }

    node.actions.closeBranch(event);
  };

  const closeNodeChildren = (
    node: FloatingTreeNodeBridge | null,
    reason: OpenChangeReason,
    event?: Event,
  ) => {
    void reason;

    if (!node) {
      closeNodeWithReason(resolveTreeNode(), reason, event);
      return;
    }

    node.actions.closeChildren(event);
  };

  const closeNodeSiblings = (
    node: FloatingTreeNodeBridge | null,
    reason: OpenChangeReason,
    event?: Event,
  ) => {
    void reason;

    if (!node) {
      closeNodeWithReason(resolveTreeNode(), reason, event);
      return;
    }

    node.actions.closeSiblings(event);
  };

  const restoreParentNavigation = (event?: Event) => {
    void event;

    // When the active node closes, hand keyboard state back to the parent list item.
    const treeNode = resolveTreeNode();
    const parentNode = resolveParentNode();
    const returnIndex = treeNode?.listNavigation?.returnIndex.value ?? null;

    if (!treeNode || !parentNode || returnIndex == null || !parentNode.context.state.open.value) {
      return;
    }

    parentNode.listNavigation?.onNavigate?.(returnIndex);
  };

  return {
    get treeNode() {
      return resolveTreeNode();
    },
    get tree() {
      return resolveTree();
    },
    get parentNode() {
      return resolveParentNode();
    },
    get activeNode() {
      return resolveActiveNode();
    },
    get isTree() {
      return resolveTreeNode() != null;
    },
    get isRoot() {
      return resolveTreeNode()?.state.isRoot.value ?? false;
    },
    get isLeaf() {
      return resolveTreeNode()?.state.isLeaf.value ?? false;
    },
    get isActive() {
      return resolveTreeNode()?.state.isActive.value ?? false;
    },
    isTargetWithinNode(target: EventTarget | null) {
      return resolveTreeNode()?.actions.isTargetWithinNode(target) ?? false;
    },
    isTargetWithinBranch(target: EventTarget | null) {
      return resolveTreeNode()?.actions.isTargetWithinBranch(target) ?? false;
    },
    isTargetWithinTree(target: EventTarget | null) {
      return resolveTree()?.actions.isTargetWithinTree(target) ?? false;
    },
    closeCurrent(reason: OpenChangeReason, event?: Event) {
      closeNodeWithReason(resolveTreeNode(), reason, event);
    },
    closeCurrentBranch(reason: OpenChangeReason, event?: Event) {
      closeNodeBranch(resolveTreeNode(), reason, event);
    },
    closeCurrentChildren(reason: OpenChangeReason, event?: Event) {
      closeNodeChildren(resolveTreeNode(), reason, event);
    },
    closeCurrentSiblings(reason: OpenChangeReason, event?: Event) {
      closeNodeSiblings(resolveTreeNode(), reason, event);
    },
    closeActive(reason: OpenChangeReason, event?: Event) {
      const activeNode = resolveActiveNode();
      if (activeNode?.context.state.open.value) {
        closeNodeWithReason(activeNode, reason, event);
        return;
      }

      closeNodeWithReason(resolveTreeNode(), reason, event);
    },
    closeActiveBranch(reason: OpenChangeReason, event?: Event) {
      const activeNode = resolveActiveNode();
      if (activeNode?.context.state.open.value) {
        closeNodeBranch(activeNode, reason, event);
        return;
      }

      closeNodeBranch(resolveTreeNode(), reason, event);
    },
    closeActiveChildren(reason: OpenChangeReason, event?: Event) {
      const activeNode = resolveActiveNode();
      if (activeNode?.context.state.open.value) {
        closeNodeChildren(activeNode, reason, event);
        return;
      }

      closeNodeChildren(resolveTreeNode(), reason, event);
    },
    restoreParentNavigation,
  };
}
