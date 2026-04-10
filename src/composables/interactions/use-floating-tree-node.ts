import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";
import {
  type FloatingContext,
  type FloatingTreeNodeBridge,
  getFloatingInternals,
  patchFloatingInternals,
} from "@/composables/positioning/floating-context";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
import {
  type FloatingTree,
  getFloatingTreePrivateActions,
  useCurrentFloatingTree,
  useFloatingTree,
} from "./use-floating-tree";

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
  /**
   * Whether sibling branches should close when this node opens.
   */
  closeSiblingsOnOpen?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * Whether descendants should close when this node closes.
   */
  closeChildrenOnClose?: MaybeRefOrGetter<boolean | undefined>;
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
    closeBranch: (event?: Event) => void;
    closeChildren: (event?: Event) => void;
    closeSiblings: (event?: Event) => void;
    isTargetWithinNode: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (target: EventTarget | null) => boolean;
  };
}

let floatingTreeNodeIdCounter = 0;

function createFloatingTreeNodeId() {
  floatingTreeNodeIdCounter += 1;
  return `floating-node-${floatingTreeNodeIdCounter}`;
}

function warnMissingTree() {
  if (!import.meta.env.DEV) {
    return;
  }

  console.warn(
    "[useFloatingTreeNode] Missing floating tree. Pass `options.tree`, pass a `parent` node, or call `provideFloatingTree(useFloatingTree())` before registering nodes.",
  );
}

function warnCrossTreeParent() {
  if (!import.meta.env.DEV) {
    return;
  }

  console.warn(
    "[useFloatingTreeNode] Ignoring `parent` from a different tree. Parent and child nodes must belong to the same floating tree.",
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

/**
 * Registers a floating context as a node in a floating tree and wires tree-aware state updates.
 */
export function useFloatingTreeNode(
  context: FloatingContext,
  options: UseFloatingTreeNodeOptions = {},
): FloatingTreeNode {
  const parentOption = toValue(options.parent) ?? null;
  const explicitTree = options.tree ?? null;

  let tree = explicitTree ?? parentOption?.tree ?? useCurrentFloatingTree();
  if (!tree) {
    warnMissingTree();
    tree = useFloatingTree();
  }

  let parentNode = parentOption;
  if (parentNode && parentNode.tree !== tree) {
    warnCrossTreeParent();
    parentNode = null;
  }

  const nodeId = ref(toValue(options.id) ?? createFloatingTreeNodeId());
  const parentId = ref<string | null>(parentNode?.id.value ?? null);
  const childIds = ref<string[]>([]);
  const treePrivateActions = getFloatingTreePrivateActions(tree);

  const closeSiblingsOnOpen = computed(() => {
    const explicitValue = toValue(options.closeSiblingsOnOpen);
    if (explicitValue != null) {
      return explicitValue;
    }

    return parentId.value != null;
  });

  const closeChildrenOnClose = computed(() => {
    return toValue(options.closeChildrenOnClose) ?? true;
  });

  let nodeBridge!: FloatingTreeNodeBridge;

  const restoreParentNavigation = (event?: Event) => {
    void event;

    // When a child closes, parent list navigation should jump back to the item that opened it.
    const returnIndex = nodeBridge.listNavigation?.returnIndex.value ?? null;
    if (returnIndex == null || parentId.value == null) {
      return;
    }

    const parentBridge = resolveTreeNodeBridgeById(tree, parentId.value);
    if (!parentBridge?.context.state.open.value) {
      return;
    }

    parentBridge.listNavigation?.onNavigate?.(returnIndex);
  };

  const applyOpenRules = (event?: Event) => {
    if (closeSiblingsOnOpen.value) {
      tree.actions.closeSiblings(nodeId.value, event);
    }

    treePrivateActions?.markOpened(nodeId.value);
  };

  const applyCloseRules = (event?: Event) => {
    // Closing a node should collapse any descendants first, then update tree bookkeeping.
    if (closeChildrenOnClose.value) {
      tree.actions.closeChildren(nodeId.value, event);
    }

    treePrivateActions?.markClosed(nodeId.value);
    restoreParentNavigation(event);
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
      closeBranch: (event?: Event) => {
        tree.actions.closeBranch(nodeId.value, event);
      },
      closeChildren: (event?: Event) => {
        tree.actions.closeChildren(nodeId.value, event);
      },
      closeSiblings: (event?: Event) => {
        tree.actions.closeSiblings(nodeId.value, event);
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
        closeAll: (event?: Event) => tree.actions.closeAll(event),
        closeBranch: (id: string, event?: Event) => tree.actions.closeBranch(id, event),
        closeChildren: (id: string, event?: Event) => tree.actions.closeChildren(id, event),
        closeSiblings: (id: string, event?: Event) => tree.actions.closeSiblings(id, event),
        isTargetWithinTree: (target: EventTarget | null) => tree.actions.isTargetWithinTree(target),
        isTargetWithinBranch: (id: string, target: EventTarget | null) =>
          tree.actions.isTargetWithinBranch(id, target),
      },
    },
    state: node.state,
    actions: {
      close: (event?: Event) => node.actions.close(event),
      closeBranch: (event?: Event) => node.actions.closeBranch(event),
      closeChildren: (event?: Event) => node.actions.closeChildren(event),
      closeSiblings: (event?: Event) => node.actions.closeSiblings(event),
      closeWithReason,
      restoreParentNavigation,
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
