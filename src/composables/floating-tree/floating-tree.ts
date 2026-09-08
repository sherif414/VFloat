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
  FloatingState,
} from "./use-floating-node";

const isDev = import.meta.env.DEV;

//=======================================================================================
// 📌 Node Model
//=======================================================================================

export class FloatingTreeNode {
  readonly id: FloatingNodeId;
  readonly context: FloatingNode;
  readonly parentId: FloatingNodeId | null;
  readonly childIds: ShallowRef<Set<FloatingNodeId>> = shallowRef(new Set());

  constructor(context: FloatingNode, parentId: FloatingNodeId | null = null) {
    this.id = context.id;
    this.context = context;
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
  addNode(
    context: FloatingNode,
    parentContext: FloatingNode | null = null,
  ): FloatingTreeNode {
    // In SSR, avoid populating the process-level tree to prevent memory leaks across concurrent requests
    if (isServer) {
      return new FloatingTreeNode(context, null);
    }

    // Guard against duplicate registration: return existing node to preserve child tree
    const existingNode = this.nodes.get(context.id);
    if (existingNode) {
      if (isDev) {
        console.warn(
          `[FloatingTree] Context "${String(context.id)}" is already registered in the floating tree.`,
        );
      }
      return existingNode;
    }

    // Validate parent linkage to prevent out-of-order registration and cycles
    let resolvedParentId: FloatingNodeId | null = null;
    if (parentContext) {
      if (parentContext.id === context.id) {
        if (isDev) {
          console.warn("[FloatingTree] A context cannot be its own parent.");
        }
      } else {
        const parentNode = this.nodes.get(parentContext.id);
        if (parentNode) {
          resolvedParentId = parentContext.id;
          parentNode.addChild(context.id);
        } else if (isDev) {
          console.warn(
            `[FloatingTree] Cannot register node under parent "${String(parentContext.id)}": parent node is not registered in the floating tree. Ensure parent context is initialized before child context.`,
          );
        }
      }
    }

    const node = new FloatingTreeNode(context, resolvedParentId);
    this.nodes.set(context.id, node);

    tryOnScopeDispose(() => {
      this.removeNode(context.id);
    });

    return node;
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
   * Retrieves a tree node by context ID.
   */
  getNode(id: FloatingNodeId): FloatingTreeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Returns immediate child contexts for a given context or ID.
   */
  getChildren(target: FloatingNode | FloatingNodeId): FloatingNode[] {
    const id = typeof target === "object" ? target.id : target;
    const node = this.nodes.get(id);
    if (!node) return [];

    const children: FloatingNode[] = [];
    for (const childId of node.childIds.value) {
      const childNode = this.nodes.get(childId);
      if (childNode) children.push(childNode.context);
    }
    return children;
  }

  /**
   * Returns all descendant contexts depth-first.
   */
  getDescendants(target: FloatingNode | FloatingNodeId): FloatingNode[] {
    const rootId = typeof target === "object" ? target.id : target;
    const descendants: FloatingNode[] = [];
    const visited = new Set<FloatingNodeId>();

    const traverse = (currentId: FloatingNodeId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const node = this.nodes.get(currentId);
      if (!node) return;

      for (const childId of node.childIds.value) {
        const childNode = this.nodes.get(childId);
        if (childNode) {
          descendants.push(childNode.context);
          traverse(childId);
        }
      }
    };

    traverse(rootId);
    return descendants;
  }

  /**
   * Returns mounted floating DOM elements for the context and all its descendants.
   */
  getFloatingElements(context: FloatingNodeTarget): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const collectEl = (ctx: FloatingNodeTarget) => {
      const el = ctx.refs.floatingEl?.value;
      if (el) elements.push(el);
    };

    collectEl(context);
    const rootId = "id" in context && context.id ? context.id : undefined;
    if (rootId) {
      for (const descendant of this.getDescendants(rootId)) {
        collectEl(descendant);
      }
    }

    return elements;
  }

  /**
   * Finds the deepest currently open descendant context in the subtree.
   */
  getDeepestOpenContext<T extends { state: FloatingState }>(context: T): T | FloatingNode {
    const rootId = "id" in context && context.id ? (context.id as FloatingNodeId) : undefined;
    if (!rootId) return context;

    let deepestContext: T | FloatingNode = context;
    let maxDepth = context.state.open.value ? 0 : -1;
    const visited = new Set<FloatingNodeId>();

    const traverse = (ctx: FloatingNode, depth: number) => {
      if (visited.has(ctx.id)) return;
      visited.add(ctx.id);

      if (ctx.state.open.value && depth > maxDepth) {
        maxDepth = depth;
        deepestContext = ctx;
      }
      for (const child of this.getChildren(ctx.id)) {
        traverse(child, depth + 1);
      }
    };

    const node = this.nodes.get(rootId);
    if (node) {
      traverse(node.context, node.context.state.open.value ? 0 : -1);
    }

    return deepestContext;
  }

  /**
   * Checks whether `target` is inside the context's own elements or any descendant's.
   * Traverses Shadow DOM boundaries via `getDomPath()` to support Web Components.
   */
  isTargetWithin(context: FloatingNodeTarget, target: EventTarget | null): boolean {
    if (!isNode(target)) return false;

    const path = getDomPath(target);
    const containsTarget = (ctx: FloatingNodeTarget): boolean => {
      const anchorEl = ctx.refs.anchorEl?.value;
      const floatingEl = ctx.refs.floatingEl?.value;

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

    if (containsTarget(context)) return true;

    const rootId = "id" in context && context.id ? (context.id as FloatingNodeId) : undefined;
    if (rootId) {
      for (const descendant of this.getDescendants(rootId)) {
        if (containsTarget(descendant)) return true;
      }
    }

    return false;
  }

  /**
   * Closes all descendant contexts from innermost child to nearest parent.
   */
  closeDescendants(
    context: FloatingNodeTarget | { id: FloatingNodeId },
    reason: OpenChangeReason = "programmatic",
    event?: Event,
  ): void {
    const rootId = "id" in context && context.id ? context.id : undefined;
    if (!rootId) return;

    const descendants = this.getDescendants(rootId);
    for (let i = descendants.length - 1; i >= 0; i--) {
      descendants[i].state.setOpen(false, reason, event);
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
  state?: {
    open: Readonly<Ref<boolean>>;
    setOpen?: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
  };
};
