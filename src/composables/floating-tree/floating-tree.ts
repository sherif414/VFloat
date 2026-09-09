import { type Ref, type ShallowRef, shallowRef } from "vue";
import { getDomPath, isElement, isNode } from "@/shared/dom";
import { getDocument, isServer } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
import type {
  AnchorElement,
  FloatingNode,
  FloatingNodeId,
  FloatingElement,
} from "./use-floating-node";

const isDev = import.meta.env.DEV;

//=======================================================================================
// 📌 Node Model
//=======================================================================================

export class FloatingTreeNode {
  readonly id: FloatingNodeId;
  readonly node: FloatingNode;
  readonly parentId: FloatingNodeId | null;
  readonly childIds: ShallowRef<Set<FloatingNodeId>> = shallowRef(new Set());

  constructor(node: FloatingNode, parentId: FloatingNodeId | null = null) {
    this.id = node.id;
    this.node = node;
    this.parentId = parentId;
  }

  addChild(childId: FloatingNodeId): void {
    if (this.childIds.value.has(childId)) return;
    const next = new Set(this.childIds.value);
    next.add(childId);
    this.childIds.value = next;
  }

  removeChild(childId: FloatingNodeId): void {
    if (!this.childIds.value.has(childId)) return;
    const next = new Set(this.childIds.value);
    next.delete(childId);
    this.childIds.value = next;
  }
}

//=======================================================================================
// 📌 Floating Tree Manager
//=======================================================================================

export class FloatingTree {
  private nodes = new Map<FloatingNodeId, FloatingTreeNode>();

  /**
   * Registers a floating node in the tree and links it to its parent.
   * Automatically unregisters when the component effect scope disposes.
   */
  addNode(node: FloatingNode, parentNode: FloatingNode | null = null): FloatingTreeNode {
    // In SSR, avoid populating the process-level tree to prevent memory leaks across concurrent requests
    if (isServer) {
      return new FloatingTreeNode(node, null);
    }

    // Guard against duplicate registration: return existing node to preserve child tree
    const existingNode = this.nodes.get(node.id);
    if (existingNode) {
      if (isDev) {
        console.warn(
          `[FloatingTree] Node "${String(node.id)}" is already registered in the floating tree.`,
        );
      }
      return existingNode;
    }

    // Validate parent linkage to prevent out-of-order registration and cycles
    let resolvedParentId: FloatingNodeId | null = null;
    if (parentNode) {
      if (parentNode.id === node.id) {
        if (isDev) {
          console.warn("[FloatingTree] A node cannot be its own parent.");
        }
      } else {
        const parentTreeNode = this.nodes.get(parentNode.id);
        if (parentTreeNode) {
          resolvedParentId = parentNode.id;
          parentTreeNode.addChild(node.id);
        } else if (isDev) {
          console.warn(
            `[FloatingTree] Cannot register node under parent "${String(parentNode.id)}": parent node is not registered in the floating tree. Ensure parent node is initialized before child node.`,
          );
        }
      }
    }

    const treeNode = new FloatingTreeNode(node, resolvedParentId);
    this.nodes.set(treeNode.id, treeNode);

    tryOnScopeDispose(() => {
      this.removeNode(treeNode.id);
    });

    return treeNode;
  }

  /**
   * Removes a node from the tree and severs its link from its parent.
   */
  removeNode(id: FloatingNodeId): void {
    const node = this.nodes.get(id);
    if (!node) return;

    if (node.parentId) {
      const parentNode = this.nodes.get(node.parentId);
      parentNode?.removeChild(id);
    }

    this.nodes.delete(id);
  }

  /**
   * Retrieves a tree node by node ID.
   */
  getNode(id: FloatingNodeId): FloatingTreeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Returns immediate child nodes for a given node or ID.
   */
  getChildren(target: FloatingNode | FloatingNodeId): FloatingNode[] {
    const id = typeof target === "object" ? target.id : target;
    const treeNode = this.nodes.get(id);
    if (!treeNode) return [];

    const children: FloatingNode[] = [];
    for (const childId of treeNode.childIds.value) {
      const childNode = this.nodes.get(childId);
      if (childNode) children.push(childNode.node);
    }
    return children;
  }

  /**
   * Returns all descendant nodes depth-first.
   */
  getDescendants(target: FloatingNode | FloatingNodeId): FloatingNode[] {
    const rootId = typeof target === "object" ? target.id : target;
    const descendants: FloatingNode[] = [];
    const visited = new Set<FloatingNodeId>();

    const traverse = (currentId: FloatingNodeId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const treeNode = this.nodes.get(currentId);
      if (!treeNode) return;

      for (const childId of treeNode.childIds.value) {
        const childNode = this.nodes.get(childId);
        if (childNode) {
          descendants.push(childNode.node);
          traverse(childId);
        }
      }
    };

    traverse(rootId);
    return descendants;
  }

  /**
   * Returns mounted floating DOM elements for the node and all its descendants.
   */
  getFloatingElements(node: FloatingNodeTarget): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const collectEl = (target: FloatingNodeTarget) => {
      const el = target.refs.floatingEl?.value;
      if (el) elements.push(el);
    };

    collectEl(node);
    const rootId = "id" in node && node.id ? node.id : undefined;
    if (rootId) {
      for (const descendant of this.getDescendants(rootId)) {
        collectEl(descendant);
      }
    }

    return elements;
  }

  /**
   * Finds the deepest currently open descendant node in the subtree.
   */
  getDeepestOpenContext<T extends Pick<FloatingNode, "id" | "open">>(
    node: T,
  ): T | FloatingNode {
    const rootId = "id" in node && node.id ? (node.id as FloatingNodeId) : undefined;
    if (!rootId) return node;

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
      for (const child of this.getChildren(current.id)) {
        traverse(child, depth + 1);
      }
    };

    const treeNode = this.nodes.get(rootId);
    if (treeNode) {
      traverse(treeNode.node, treeNode.node.open.value ? 0 : -1);
    }

    return deepestNode;
  }

  /**
   * Checks whether `target` is inside the node's own elements or any descendant's.
   * Traverses Shadow DOM boundaries via `getDomPath()` to support Web Components.
   */
  isTargetWithin(node: FloatingNodeTarget, target: EventTarget | null): boolean {
    if (!isNode(target)) return false;

    const path = getDomPath(target);
    const containsTarget = (candidate: FloatingNodeTarget): boolean => {
      const anchorEl = candidate.refs.anchorEl?.value;
      const floatingEl = candidate.refs.floatingEl?.value;

      if (floatingEl) {
        if (floatingEl.contains(target) || path.includes(floatingEl)) {
          return true;
        }
        if (
          isElement(target) &&
          target.hasAttribute("data-vfloat-focus-guard") &&
          (target.nextElementSibling === floatingEl || target.previousElementSibling === floatingEl)
        ) {
          return true;
        }
      }

      if (anchorEl) {
        if (isElement(anchorEl)) {
          if (anchorEl.contains(target) || path.includes(anchorEl)) return true;
        } else if (
          isElement(anchorEl.contextElement) &&
          anchorEl.contextElement !== getDocument()?.documentElement &&
          anchorEl.contextElement !== getDocument()?.body
        ) {
          if (anchorEl.contextElement.contains(target) || path.includes(anchorEl.contextElement)) {
            return true;
          }
        }
      }

      return false;
    };

    if (containsTarget(node)) return true;

    const rootId = "id" in node && node.id ? (node.id as FloatingNodeId) : undefined;
    if (rootId) {
      for (const descendant of this.getDescendants(rootId)) {
        if (containsTarget(descendant)) return true;
      }
    }

    return false;
  }

  /**
   * Closes all descendant nodes from innermost child to nearest parent.
   */
  closeDescendants(
    node: FloatingNodeTarget | { id: FloatingNodeId },
    reason: OpenChangeReason = "programmatic",
    event?: Event,
  ): void {
    const rootId = "id" in node && node.id ? node.id : undefined;
    if (!rootId) return;

    const descendants = this.getDescendants(rootId);
    for (let i = descendants.length - 1; i >= 0; i--) {
      descendants[i].setOpen(false, reason, event);
    }
  }
}

//=======================================================================================
// 📌 Singleton Instance
//=======================================================================================

export const floatingTree = new FloatingTree();

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Minimal shape of a floating node required for DOM containment and family queries.
 *
 * @internal
 */
export type FloatingNodeTarget = {
  id?: FloatingNodeId;
  refs: {
    floatingEl?: Ref<FloatingElement>;
    anchorEl?: Ref<AnchorElement>;
    arrowEl?: Ref<HTMLElement | null>;
  };
  open?: Readonly<Ref<boolean>>;
  setOpen?: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
};
