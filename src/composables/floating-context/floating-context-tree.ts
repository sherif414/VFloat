import { type ShallowRef, shallowRef } from "vue";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
import type { FloatingContext, FloatingContextId, FloatingState } from "./use-floating-context";

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
    const node = new FloatingTreeNode(context, parentContext?.id ?? null);
    this.nodes.set(context.id, node);

    if (parentContext) {
      const parentNode = this.nodes.get(parentContext.id);
      parentNode?.addChild(context.id);
    }

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

    const traverse = (currentId: FloatingContextId) => {
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

    const traverse = (ctx: FloatingContext, depth: number) => {
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
   */
  isTargetWithin(context: FloatingContextTarget, target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false;

    const containsTarget = (ctx: FloatingContextTarget): boolean => {
      const anchorEl = ctx.refs.anchorEl.value;
      const anchorDom =
        anchorEl instanceof HTMLElement
          ? anchorEl
          : ((anchorEl?.contextElement as HTMLElement | undefined) ?? null);

      return Boolean(anchorDom?.contains(target) || ctx.refs.floatingEl.value?.contains(target));
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
