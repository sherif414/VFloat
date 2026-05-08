import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";
import {
  type FloatingContext,
  type FloatingTreeNodeBridge,
  getFloatingInternals,
  patchFloatingInternals,
} from "@/composables/positioning/floating-context";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
import { type FloatingTree, getFloatingTreePrivateActions } from "./use-floating-tree";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Registers a floating context as a node in a floating tree and wires tree-aware state updates.
 */
export function useFloatingTreeNode(
  context: FloatingContext,
  options: UseFloatingTreeNodeOptions = {},
): FloatingTreeNode {
  const parentOption = toValue(options.parent) ?? null;
  const explicitTree = options.tree ?? null;

  const tree = explicitTree ?? parentOption?.tree ?? null;
  if (!tree) {
    throw createMissingTreeError();
  }

  let parentNode = parentOption;
  if (parentNode && parentNode.tree !== tree) {
    throw createCrossTreeParentError();
  }

  const nodeId = ref(toValue(options.id) ?? createFloatingTreeNodeId());
  const parentId = ref<string | null>(parentNode?.id.value ?? null);
  const childIds = ref<string[]>([]);
  const treePrivateActions = getFloatingTreePrivateActions(tree);

  let nodeBridge!: FloatingTreeNodeBridge;

  const applyOpenRules = (event?: Event) => {
    treePrivateActions?.markOpened(nodeId.value, event);
  };

  const applyCloseRules = (event?: Event) => {
    treePrivateActions?.markClosed(nodeId.value, event);
  };

  const closeWithReason = (reason: OpenChangeReason, event?: Event) => {
    if (!context.state.open.value) {
      applyCloseRules(event);
      restoreNodeFocus(node, reason, event);
      return;
    }

    // Let the normal open-state controller drive the state change, then repair tree focus.
    context.state.setOpen(false, reason, event);
    restoreNodeFocus(node, reason, event);
  };

  const node: FloatingTreeNode = {
    tree,
    id: nodeId,
    parentId,
    childIds,
    context,
    state: {
      isRoot: computed(() => parentId.value == null),
      isLeaf: computed(() => childIds.value.length === 0),
      isActive: computed(() => tree.activeId.value === nodeId.value),
    },
    actions: {
      open: (event?: Event) => {
        if (context.state.open.value) {
          applyOpenRules(event);
          return;
        }

        context.state.setOpen(true, "programmatic", event);
      },
      close: (event?: Event) => {
        closeWithReason("programmatic", event);
      },
      closeBranch: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => {
        const closeArgs = normalizeCloseArgs(reasonOrEvent, event);
        tree.actions.closeBranch(nodeId.value, closeArgs.reason, closeArgs.event);
      },
      closeChildren: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => {
        const closeArgs = normalizeCloseArgs(reasonOrEvent, event);
        tree.actions.closeChildren(nodeId.value, closeArgs.reason, closeArgs.event);
      },
      closeSiblings: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => {
        const closeArgs = normalizeCloseArgs(reasonOrEvent, event);
        tree.actions.closeSiblings(nodeId.value, closeArgs.reason, closeArgs.event);
      },
      isTargetWithinNode: (target: EventTarget | null) => {
        const targetNode = resolveTargetNode(target);
        if (!targetNode) {
          return false;
        }

        if (isTargetWithinAnchor(context.refs.anchorEl.value, targetNode)) {
          return true;
        }

        const floatingEl = context.refs.floatingEl.value;
        if (floatingEl instanceof Element) {
          return floatingEl.contains(targetNode);
        }

        return false;
      },
      isTargetWithinBranch: (target: EventTarget | null) => {
        return tree.actions.isTargetWithinBranch(nodeId.value, target);
      },
    },
  };

  if (parentNode) {
    appendChildId(parentNode, nodeId.value);
  }

  nodeBridge = {
    id: node.id,
    parentId: node.parentId,
    childIds: node.childIds,
    context: {
      refs: node.context.refs,
      state: node.context.state,
    },
    tree: {
      activeId: tree.activeId,
      actions: {
        getNode: (id: string) => resolveTreeNodeBridgeById(tree, id),
        closeAll: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
          tree.actions.closeAll(reasonOrEvent, event),
        closeBranch: (id: string, reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
          tree.actions.closeBranch(id, reasonOrEvent, event),
        closeChildren: (id: string, reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
          tree.actions.closeChildren(id, reasonOrEvent, event),
        closeSiblings: (id: string, reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
          tree.actions.closeSiblings(id, reasonOrEvent, event),
        isTargetWithinTree: (target: EventTarget | null) => tree.actions.isTargetWithinTree(target),
        isTargetWithinBranch: (id: string, target: EventTarget | null) =>
          tree.actions.isTargetWithinBranch(id, target),
      },
    },
    state: node.state,
    actions: {
      close: (event?: Event) => node.actions.close(event),
      closeBranch: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
        node.actions.closeBranch(reasonOrEvent, event),
      closeChildren: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
        node.actions.closeChildren(reasonOrEvent, event),
      closeSiblings: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) =>
        node.actions.closeSiblings(reasonOrEvent, event),
      closeWithReason,
      isTargetWithinNode: (target: EventTarget | null) => node.actions.isTargetWithinNode(target),
      isTargetWithinBranch: (target: EventTarget | null) =>
        node.actions.isTargetWithinBranch(target),
    },
  };

  const unregisterTreeNode = treePrivateActions?.registerNode({
    node,
    closeWithReason,
  });

  watch(
    () => context.state.open.value,
    (isOpen, wasOpen) => {
      // The watcher keeps tree registration in sync with any state change, regardless of source.
      if (wasOpen === undefined) {
        if (isOpen) {
          applyOpenRules();
        }
        return;
      }

      if (isOpen === wasOpen) {
        return;
      }

      if (isOpen) {
        applyOpenRules();
        return;
      }

      applyCloseRules();
    },
    { immediate: true, flush: "sync" },
  );

  patchFloatingInternals(context, {
    treeNode: nodeBridge,
  });

  tryOnScopeDispose(() => {
    unregisterTreeNode?.();

    if (getFloatingInternals(context)?.treeNode === nodeBridge) {
      patchFloatingInternals(context, {
        treeNode: undefined,
      });
    }

    if (parentNode) {
      removeChildId(parentNode, nodeId.value);
    }
  });

  return node;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

let floatingTreeNodeIdCounter = 0;

function createFloatingTreeNodeId() {
  floatingTreeNodeIdCounter += 1;
  return `floating-node-${floatingTreeNodeIdCounter}`;
}

function createMissingTreeError() {
  return new Error(
    "[useFloatingTreeNode] Missing floating tree. Pass `options.tree` for a root node or `options.parent` for a child node.",
  );
}

function createCrossTreeParentError() {
  return new Error(
    "[useFloatingTreeNode] Parent and child nodes must belong to the same floating tree.",
  );
}

function appendChildId(parentNode: FloatingTreeNode, childId: string) {
  const childIdsRef = parentNode.childIds as Ref<string[]>;

  if (childIdsRef.value.includes(childId)) {
    return;
  }

  childIdsRef.value = [...childIdsRef.value, childId];
}

function removeChildId(parentNode: FloatingTreeNode, childId: string) {
  const childIdsRef = parentNode.childIds as Ref<string[]>;

  if (!childIdsRef.value.includes(childId)) {
    return;
  }

  childIdsRef.value = childIdsRef.value.filter((id) => id !== childId);
}

function resolveTargetNode(target: EventTarget | null): Node | null {
  return target instanceof Node ? target : null;
}

function isTargetWithinAnchor(
  anchorEl: FloatingContext["refs"]["anchorEl"]["value"],
  target: Node,
) {
  if (anchorEl instanceof Element) {
    return anchorEl.contains(target);
  }

  const anchorContextEl = anchorEl?.contextElement;
  if (anchorContextEl instanceof Element) {
    return anchorContextEl.contains(target);
  }

  return false;
}

function resolveTreeNodeBridgeById(tree: FloatingTree, id: string): FloatingTreeNodeBridge | null {
  const node = tree.actions.getNode(id);
  if (!node) {
    return null;
  }

  return getFloatingInternals(node.context)?.treeNode ?? null;
}

function normalizeCloseArgs(reasonOrEvent?: OpenChangeReason | Event, event?: Event) {
  if (typeof reasonOrEvent === "string") {
    return {
      reason: reasonOrEvent,
      event,
    };
  }

  return {
    reason: "programmatic" as OpenChangeReason,
    event: reasonOrEvent,
  };
}

function shouldRestoreFocus(node: FloatingTreeNode, reason: OpenChangeReason, event?: Event) {
  if (reason === "outside-pointer") {
    return false;
  }

  if (!event) {
    return true;
  }

  if (event instanceof KeyboardEvent) {
    return true;
  }

  return node.actions.isTargetWithinNode(event.target);
}

function restoreNodeFocus(node: FloatingTreeNode, reason: OpenChangeReason, event?: Event) {
  // Tree-driven closes should hand focus back to the trigger that owns the branch.
  if (!shouldRestoreFocus(node, reason, event)) {
    return;
  }

  const anchorEl = node.context.refs.anchorEl.value;
  if (!(anchorEl instanceof HTMLElement)) {
    return;
  }

  setTimeout(() => {
    if (!anchorEl.isConnected) {
      return;
    }

    anchorEl.focus({ preventScroll: true });
  }, 0);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for attaching a floating context to a tree node.
 */
export interface UseFloatingTreeNodeOptions {
  /**
   * The tree to register this node with.
   */
  tree?: FloatingTree | null;
  /**
   * The node id to reuse instead of generating one.
   */
  id?: MaybeRefOrGetter<string | undefined>;
  /**
   * The parent node to attach this node beneath.
   */
  parent?: MaybeRefOrGetter<FloatingTreeNode | null | undefined>;
}

/**
 * A registered floating node that participates in tree-aware open/close coordination.
 */
export interface FloatingTreeNode {
  tree: FloatingTree;
  id: Readonly<Ref<string>>;
  parentId: Readonly<Ref<string | null>>;
  childIds: Readonly<Ref<string[]>>;
  context: FloatingContext;
  state: {
    isRoot: Readonly<Ref<boolean>>;
    isLeaf: Readonly<Ref<boolean>>;
    isActive: Readonly<Ref<boolean>>;
  };
  actions: {
    open: (event?: Event) => void;
    close: (event?: Event) => void;
    closeBranch: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeChildren: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeSiblings: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    isTargetWithinNode: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (target: EventTarget | null) => boolean;
  };
}
