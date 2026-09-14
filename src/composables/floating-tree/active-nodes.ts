import type { FloatingNode } from "./use-floating-node";

const activeFloatingNodes = new Map<FloatingNode, number>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Registers an active floating node in the runtime registry.
 * Uses reference counting so multiple registrations of the same node
 * (e.g. from both useFloatingNode and useEscapeKey) are safely balanced.
 *
 * @internal
 */
export function registerActiveFloatingNode(node: FloatingNode): () => void {
  const count = activeFloatingNodes.get(node) ?? 0;
  activeFloatingNodes.set(node, count + 1);

  return () => {
    const current = activeFloatingNodes.get(node);
    if (current === undefined) return;
    if (current <= 1) {
      activeFloatingNodes.delete(node);
    } else {
      activeFloatingNodes.set(node, current - 1);
    }
  };
}

/**
 * Checks whether the given target element is contained within an open floating node
 * that belongs to a different composite hierarchy than `node`.
 *
 * @internal
 */
export function isTargetInOtherActiveHierarchy(
  node: FloatingNode,
  target: EventTarget | null,
): boolean {
  if (!target) return false;

  let currentRoot: FloatingNode = node;
  while (currentRoot.parent?.value) {
    currentRoot = currentRoot.parent.value;
  }

  for (const activeNode of activeFloatingNodes.keys()) {
    if (!activeNode.open?.value) continue;

    // Find the root of activeNode
    let otherRoot: FloatingNode = activeNode;
    while (otherRoot.parent?.value) {
      otherRoot = otherRoot.parent.value;
    }

    // Skip if activeNode belongs to the same composite hierarchy as node
    if (otherRoot === currentRoot || otherRoot.id === currentRoot.id) {
      continue;
    }

    // Check if target is inside this other open hierarchy
    if (typeof activeNode.contains === "function" && activeNode.contains(target)) {
      return true;
    }
  }

  return false;
}

/**
 * Clears all registered active nodes. Used during test teardown.
 *
 * @internal
 */
export function clearActiveFloatingNodes(): void {
  activeFloatingNodes.clear();
}
