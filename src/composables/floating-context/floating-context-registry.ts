import { shallowRef, type ShallowRef } from "vue";
import type { OpenChangeReason } from "@/types";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { FloatingContext, FloatingContextId, FloatingState } from "./use-floating-context";

type FloatingContextTarget = Pick<FloatingContext, "refs" | "state">;

interface FloatingContextTreeNode {
  childContextIds: ShallowRef<Set<FloatingContextId>>;
}

interface OpenFloatingContextMatch {
  context: FloatingContext;
  depth: number;
}

const floatingContexts = new Map<FloatingContextId, FloatingContext>();
const floatingContextTreeNodes = new WeakMap<object, FloatingContextTreeNode>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Registers a floating context with the process-wide floating family registry.
 *
 * @internal
 */
export function registerFloatingContext(
  context: FloatingContext,
  parentContext: FloatingContext | null,
) {
  floatingContexts.set(context.id, context);
  ensureFloatingContextTreeNode(context);

  if (parentContext) {
    registerFloatingParent(context, parentContext);
  }

  tryOnScopeDispose(() => {
    floatingContexts.delete(context.id);
  });
}

/**
 * Returns whether `target` is inside the context's own anchor/floating elements
 * or any descendant context's anchor/floating elements.
 *
 * @internal
 */
export function isFloatingContextTargetWithin(
  context: FloatingContextTarget,
  target: EventTarget | null,
) {
  if (!isNodeTarget(target)) return false;
  return containsFloatingTarget(context, target);
}

/**
 * Returns the deepest open descendant for a linked context family, or the
 * original context when no open descendant exists.
 *
 * @internal
 */
export function getDeepestOpenFloatingContext<T extends { state: FloatingState }>(
  context: T,
): T | FloatingContext {
  const childContexts = getFloatingChildContexts(context);
  let deepest: OpenFloatingContextMatch | null = null;

  for (const childContext of childContexts) {
    const match = findDeepestOpenFloatingContext(childContext, 1);
    if (match && (!deepest || match.depth >= deepest.depth)) {
      deepest = match;
    }
  }

  return deepest?.context ?? context;
}

/**
 * Returns mounted floating elements for a context and its linked descendants.
 *
 * @internal
 */
export function getFloatingContextFloatingElements(context: FloatingContextTarget): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const floatingEl = context.refs.floatingEl.value;
  if (floatingEl) elements.push(floatingEl);

  for (const childContext of getFloatingChildContexts(context)) {
    elements.push(...getFloatingContextFloatingElements(childContext));
  }

  return elements;
}

/**
 * Closes all descendant contexts from deepest child to nearest child.
 *
 * @internal
 */
export function closeFloatingDescendants(
  context: FloatingContext,
  reason: OpenChangeReason = "programmatic",
  event?: Event,
) {
  for (const descendant of getFloatingDescendants(context).reverse()) {
    descendant.state.setOpen(false, reason, event);
  }
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function registerFloatingParent(context: FloatingContext, parentContext: FloatingContext) {
  const parentNode = ensureFloatingContextTreeNode(parentContext);
  parentNode.childContextIds.value = new Set(parentNode.childContextIds.value).add(context.id);

  tryOnScopeDispose(() => {
    const nextChildContextIds = new Set(parentNode.childContextIds.value);
    nextChildContextIds.delete(context.id);
    parentNode.childContextIds.value = nextChildContextIds;
  });
}

function ensureFloatingContextTreeNode(context: object): FloatingContextTreeNode {
  const node = floatingContextTreeNodes.get(context) ?? {
    childContextIds: shallowRef(new Set<FloatingContextId>()),
  };

  floatingContextTreeNodes.set(context, node);
  return node;
}

function getFloatingChildContexts(context: object): FloatingContext[] {
  const childContextIds = floatingContextTreeNodes.get(context)?.childContextIds.value;
  if (!childContextIds) return [];

  const childContexts: FloatingContext[] = [];
  for (const childContextId of childContextIds) {
    const childContext = floatingContexts.get(childContextId);
    if (childContext) childContexts.push(childContext);
  }
  return childContexts;
}

function getFloatingDescendants(context: FloatingContext): FloatingContext[] {
  const descendants: FloatingContext[] = [];
  for (const childContext of getFloatingChildContexts(context)) {
    descendants.push(childContext, ...getFloatingDescendants(childContext));
  }
  return descendants;
}

function containsFloatingTarget(context: FloatingContextTarget, target: Node): boolean {
  if (containsContextTarget(context, target)) return true;

  for (const childContext of getFloatingChildContexts(context)) {
    if (containsFloatingTarget(childContext, target)) return true;
  }
  return false;
}

function containsContextTarget(context: FloatingContextTarget, target: Node): boolean {
  const anchorEl = context.refs.anchorEl.value;
  const anchorDomEl =
    anchorEl instanceof HTMLElement
      ? anchorEl
      : ((anchorEl?.contextElement as HTMLElement | undefined) ?? null);

  return !!(anchorDomEl?.contains(target) || context.refs.floatingEl.value?.contains(target));
}

function isNodeTarget(target: EventTarget | null): target is Node {
  return target instanceof Node;
}

function findDeepestOpenFloatingContext(
  context: FloatingContext,
  depth: number,
): OpenFloatingContextMatch | null {
  let deepest: OpenFloatingContextMatch | null = context.state.open.value
    ? { context, depth }
    : null;

  for (const childContext of getFloatingChildContexts(context)) {
    const match = findDeepestOpenFloatingContext(childContext, depth + 1);
    if (match && (!deepest || match.depth >= deepest.depth)) {
      deepest = match;
    }
  }

  return deepest;
}
