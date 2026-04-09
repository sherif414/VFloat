import {
  computed,
  hasInjectionContext,
  inject,
  type MaybeRefOrGetter,
  provide,
  type Ref,
  readonly,
  ref,
  toValue,
} from "vue";
import type { OpenChangeReason } from "@/types";
import type { FloatingTreeNode } from "./use-floating-tree-node";

export interface UseFloatingTreeOptions {
  id?: MaybeRefOrGetter<string | undefined>;
}

export interface FloatingTree {
  id: Readonly<Ref<string>>;
  activeId: Readonly<Ref<string | null>>;
  activePath: Readonly<Ref<string[]>>;
  actions: {
    getNode: (id: string) => FloatingTreeNode | null;
    closeAll: (event?: Event) => void;
    closeBranch: (id: string, event?: Event) => void;
    closeChildren: (id: string, event?: Event) => void;
    closeSiblings: (id: string, event?: Event) => void;
    isTargetWithinTree: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (id: string, target: EventTarget | null) => boolean;
  };
}

interface FloatingTreeNodeRegistration {
  node: FloatingTreeNode;
  closeWithReason: (reason: OpenChangeReason, event?: Event) => void;
}

export interface FloatingTreePrivateActions {
  registerNode: (registration: FloatingTreeNodeRegistration) => () => void;
  markOpened: (id: string) => void;
  markClosed: (id: string) => void;
  closeNodeWithReason: (id: string, reason: OpenChangeReason, event?: Event) => void;
}

const FLOATING_TREE_INJECTION_KEY = Symbol("vfloat-floating-tree");
const FLOATING_TREE_PRIVATE_SYMBOL = Symbol("vfloat-floating-tree-private");

type FloatingTreeWithPrivate = FloatingTree & {
  [FLOATING_TREE_PRIVATE_SYMBOL]: FloatingTreePrivateActions;
};

let floatingTreeIdCounter = 0;

function createFloatingTreeId() {
  floatingTreeIdCounter += 1;
  return `floating-tree-${floatingTreeIdCounter}`;
}

function isNodeWithinBranch(
  nodeId: string,
  branchRootId: string,
  resolveNode: (id: string) => FloatingTreeNode | null,
): boolean {
  const visited = new Set<string>();
  let currentNode = resolveNode(nodeId);

  while (currentNode) {
    const currentId = currentNode.id.value;
    if (currentId === branchRootId) {
      return true;
    }

    if (visited.has(currentId)) {
      return false;
    }

    visited.add(currentId);

    const currentParentId = currentNode.parentId.value;
    currentNode = currentParentId ? resolveNode(currentParentId) : null;
  }

  return false;
}

function collectBranchNodeIds(
  branchRootId: string,
  resolveNode: (id: string) => FloatingTreeNode | null,
): string[] {
  const visited = new Set<string>();
  const ids: string[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);

    const node = resolveNode(nodeId);
    if (!node) {
      return;
    }

    for (const childId of node.childIds.value) {
      visit(childId);
    }

    ids.push(nodeId);
  };

  visit(branchRootId);

  return ids;
}

/**
 * Creates a registry that coordinates related floating contexts.
 */
export function useFloatingTree(options: UseFloatingTreeOptions = {}): FloatingTree {
  const treeId = ref(toValue(options.id) ?? createFloatingTreeId());
  const activeId = ref<string | null>(null);
  const nodeRegistrations = new Map<string, FloatingTreeNodeRegistration>();
  const activationOrderById = new Map<string, number>();
  let activationOrderCursor = 0;

  const resolveNode = (id: string): FloatingTreeNode | null => {
    return nodeRegistrations.get(id)?.node ?? null;
  };

  const findMostRecentlyOpenedNodeId = (excludeBranchId?: string): string | null => {
    let nextActiveId: string | null = null;
    let maxActivationOrder = -1;

    for (const registration of nodeRegistrations.values()) {
      const nodeId = registration.node.id.value;

      if (excludeBranchId && isNodeWithinBranch(nodeId, excludeBranchId, resolveNode)) {
        continue;
      }

      if (!registration.node.context.state.open.value) {
        continue;
      }

      const activationOrder = activationOrderById.get(nodeId) ?? 0;
      if (activationOrder > maxActivationOrder) {
        maxActivationOrder = activationOrder;
        nextActiveId = nodeId;
      }
    }

    return nextActiveId;
  };

  const closeNodeWithReason = (id: string, reason: OpenChangeReason, event?: Event) => {
    nodeRegistrations.get(id)?.closeWithReason(reason, event);
  };

  const closeBranchWithReason = (id: string, reason: OpenChangeReason, event?: Event) => {
    const branchNodeIds = collectBranchNodeIds(id, resolveNode);
    for (const branchNodeId of branchNodeIds) {
      closeNodeWithReason(branchNodeId, reason, event);
    }
  };

  const markOpened = (id: string) => {
    activationOrderCursor += 1;
    activationOrderById.set(id, activationOrderCursor);
    activeId.value = id;
  };

  const markClosed = (id: string) => {
    const currentActiveId = activeId.value;
    if (!currentActiveId) {
      return;
    }

    if (!isNodeWithinBranch(currentActiveId, id, resolveNode)) {
      return;
    }

    let ancestorId = resolveNode(id)?.parentId.value ?? null;

    while (ancestorId) {
      const ancestorNode = resolveNode(ancestorId);
      if (!ancestorNode) {
        break;
      }

      if (ancestorNode.context.state.open.value) {
        activeId.value = ancestorId;
        return;
      }

      ancestorId = ancestorNode.parentId.value;
    }

    activeId.value = findMostRecentlyOpenedNodeId(id);
  };

  const registerNode = (registration: FloatingTreeNodeRegistration) => {
    const nodeId = registration.node.id.value;

    if (nodeRegistrations.has(nodeId) && import.meta.env.DEV) {
      console.warn(
        `[useFloatingTree] Duplicate node id "${nodeId}" registered. Keeping the latest registration.`,
      );
    }

    nodeRegistrations.set(nodeId, registration);

    if (registration.node.context.state.open.value) {
      markOpened(nodeId);
    }

    return () => {
      const currentActiveId = activeId.value;
      const activeIdBelongsToNodeBranch =
        currentActiveId != null && isNodeWithinBranch(currentActiveId, nodeId, resolveNode);

      nodeRegistrations.delete(nodeId);
      activationOrderById.delete(nodeId);

      if (activeIdBelongsToNodeBranch) {
        activeId.value = findMostRecentlyOpenedNodeId(nodeId);
      }
    };
  };

  const activePath = computed(() => {
    const currentActiveId = activeId.value;

    if (!currentActiveId) {
      return [];
    }

    const ids: string[] = [];
    const visited = new Set<string>();
    let currentNode = resolveNode(currentActiveId);

    while (currentNode) {
      const currentId = currentNode.id.value;
      if (visited.has(currentId)) {
        break;
      }

      visited.add(currentId);
      ids.unshift(currentId);

      const currentParentId = currentNode.parentId.value;
      currentNode = currentParentId ? resolveNode(currentParentId) : null;
    }

    return ids;
  });

  const tree: FloatingTree = {
    id: readonly(treeId),
    activeId: readonly(activeId),
    activePath,
    actions: {
      getNode: resolveNode,
      closeAll: (event?: Event) => {
        const rootIds = [...nodeRegistrations.values()]
          .filter((registration) => registration.node.parentId.value == null)
          .map((registration) => registration.node.id.value);

        const targetIds = rootIds.length > 0 ? rootIds : [...nodeRegistrations.keys()];
        for (const targetId of targetIds) {
          closeBranchWithReason(targetId, "programmatic", event);
        }
      },
      closeBranch: (id: string, event?: Event) => {
        closeBranchWithReason(id, "programmatic", event);
      },
      closeChildren: (id: string, event?: Event) => {
        const node = resolveNode(id);
        if (!node) {
          return;
        }

        for (const childId of node.childIds.value) {
          closeBranchWithReason(childId, "programmatic", event);
        }
      },
      closeSiblings: (id: string, event?: Event) => {
        const node = resolveNode(id);
        if (!node) {
          return;
        }

        const nodeParentId = node.parentId.value;
        const siblingIds = [...nodeRegistrations.values()]
          .map((registration) => registration.node)
          .filter(
            (candidateNode) =>
              candidateNode.id.value !== id && candidateNode.parentId.value === nodeParentId,
          )
          .map((candidateNode) => candidateNode.id.value);

        for (const siblingId of siblingIds) {
          closeBranchWithReason(siblingId, "programmatic", event);
        }
      },
      isTargetWithinTree: (target: EventTarget | null) => {
        return [...nodeRegistrations.values()].some((registration) =>
          registration.node.actions.isTargetWithinNode(target),
        );
      },
      isTargetWithinBranch: (id: string, target: EventTarget | null) => {
        const branchNodeIds = collectBranchNodeIds(id, resolveNode);
        return branchNodeIds.some((branchNodeId) =>
          resolveNode(branchNodeId)?.actions.isTargetWithinNode(target),
        );
      },
    },
  };

  const privateActions: FloatingTreePrivateActions = {
    registerNode,
    markOpened,
    markClosed,
    closeNodeWithReason,
  };

  (tree as FloatingTreeWithPrivate)[FLOATING_TREE_PRIVATE_SYMBOL] = privateActions;

  return tree;
}

/**
 * Provides a floating tree through Vue dependency injection.
 */
export function provideFloatingTree(tree: FloatingTree): FloatingTree {
  if (hasInjectionContext()) {
    provide(FLOATING_TREE_INJECTION_KEY, tree);
    return tree;
  }

  if (import.meta.env.DEV) {
    console.warn(
      "[provideFloatingTree] Called without an active injection context. Descendants cannot inject this tree automatically.",
    );
  }

  return tree;
}

/**
 * Returns the current floating tree from Vue dependency injection when available.
 */
export function useCurrentFloatingTree(): FloatingTree | null {
  if (!hasInjectionContext()) {
    return null;
  }

  return inject(FLOATING_TREE_INJECTION_KEY, null);
}

export function getFloatingTreePrivateActions(
  tree: FloatingTree,
): FloatingTreePrivateActions | null {
  const privateActions = (tree as FloatingTreeWithPrivate)[FLOATING_TREE_PRIVATE_SYMBOL];
  return privateActions ?? null;
}
