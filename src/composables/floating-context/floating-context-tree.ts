import { type ShallowRef, shallowRef } from "vue";
import { getDomPath } from "@/shared/dom";
import { isServer } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
import type { FloatingContext, FloatingContextId, FloatingState } from "./use-floating-context";

const isDev = import.meta.env.DEV;

//=======================================================================================
// 📌 Node Model
//=======================================================================================

export class FloatingTreeNode {
  readonly id: FloatingContextId;
  readonly context: FloatingContext;
  readonly parentId: FloatingContextId | null;
  readonly childIds: ShallowRef<Set<FloatingContextId>> = shallowRef(new Set());

  constructor(context: FloatingContext, parentId: FloatingContextId | null = null) {
    this.id = context.id;
    this.context = context;
    this.parentId = parentId;
  }

  addChild(childId: FloatingContextId): void {
    if (this.childIds.value.has(childId)) return;
    const next = new Set(this.childIds.value);
    next.add(childId);
    this.childIds.value = next;
  }

  removeChild(childId: FloatingContextId): void {
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
  private nodes = new Map<FloatingContextId, FloatingTreeNode>();

  /**
   * Registers a floating node in the tree and links it to its parent.
   * Automatically unregisters when the component effect scope disposes.
   */
  addNode(
    context: FloatingContext,
    parentContext: FloatingContext | null = null,
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
    let resolvedParentId: FloatingContextId | null = null;
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
  removeNode(id: FloatingContextId): void {
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
  getNode(id: FloatingContextId): FloatingTreeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Returns immediate child contexts for a given context or ID.
   */
  getChildren(target: FloatingContext | FloatingContextId): FloatingContext[] {
    const id = typeof target === "object" ? target.id : target;
    const node = this.nodes.get(id);
    if (!node) return [];

    const children: FloatingContext[] = [];
    for (const childId of node.childIds.value) {
      const childNode = this.nodes.get(childId);
      if (childNode) children.push(childNode.context);
    }
    return children;
  }

  /**
   * Returns all descendant contexts depth-first.
   */
  getDescendants(target: FloatingContext | FloatingContextId): FloatingContext[] {
    const rootId = typeof target === "object" ? target.id : target;
    const descendants: FloatingContext[] = [];
    const visited = new Set<FloatingContextId>();

    const traverse = (currentId: FloatingContextId) => {
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
  getFloatingElements(context: FloatingContextTarget): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const collectEl = (ctx: FloatingContextTarget) => {
      const el = ctx.refs.floatingEl.value;
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
  getDeepestOpenContext<T extends { state: FloatingState }>(context: T): T | FloatingContext {
    const rootId = "id" in context && context.id ? (context.id as FloatingContextId) : undefined;
    if (!rootId) return context;

    let deepestContext: T | FloatingContext = context;
    let maxDepth = context.state.open.value ? 0 : -1;
    const visited = new Set<FloatingContextId>();

    const traverse = (ctx: FloatingContext, depth: number) => {
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
  isTargetWithin(context: FloatingContextTarget, target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false;

    const path = getDomPath(target);
    const containsTarget = (ctx: FloatingContextTarget): boolean => {
      const anchorEl = ctx.refs.anchorEl.value;
      const floatingEl = ctx.refs.floatingEl.value;

      if (floatingEl && (floatingEl.contains(target) || path.includes(floatingEl))) {
        return true;
      }

      if (anchorEl) {
        if (anchorEl instanceof Element) {
          if (anchorEl.contains(target) || path.includes(anchorEl)) return true;
        } else if (anchorEl.contextElement instanceof Element) {
          if (anchorEl.contextElement.contains(target) || path.includes(anchorEl.contextElement)) {
            return true;
          }
        }
      }

      return false;
    };

    if (containsTarget(context)) return true;

    const rootId = "id" in context && context.id ? (context.id as FloatingContextId) : undefined;
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
    context: FloatingContext,
    reason: OpenChangeReason = "programmatic",
    event?: Event,
  ): void {
    const descendants = this.getDescendants(context.id);
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
 * Minimal shape of a floating context required for DOM containment and family queries.
 *
 * @internal
 */
export type FloatingContextTarget = Pick<FloatingContext, "refs" | "state"> & {
  id?: FloatingContextId;
};
