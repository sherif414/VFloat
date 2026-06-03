import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from "vue";
import { ref, shallowRef } from "vue";
import type { Middleware } from "@floating-ui/dom";
import type { OpenChangeReason, VirtualElement } from "@/types";
import { tryOnScopeDispose } from "@/shared/lifecycle";

type FloatingContextTarget = Pick<FloatingContext, "refs" | "state">;

//=======================================================================================
// Main
//=======================================================================================

/**
 * Creates the shared floating context used by interaction and positioning composables.
 */
export function useFloatingContext(options: UseFloatingContextOptions): FloatingContext {
  const { refs, state = {}, parentContext } = options;
  const { anchorEl, floatingEl, arrowEl: arrowElOption } = refs;
  const { open: openOption, onOpenChange } = state;
  const id = createFloatingContextId();
  const open = openOption ?? ref(false);
  const arrowEl = arrowElOption ?? ref<HTMLElement | null>(null);

  const setOpen = (value: boolean, reason: OpenChangeReason = "programmatic", event?: Event) => {
    if (open.value === value) {
      if (!value) closeFloatingDescendants(context, reason, event);
      return;
    }
    if (!value) closeFloatingDescendants(context, reason, event);
    open.value = value;
    onOpenChange?.(value, reason, event);
  };

  const context: FloatingContext = {
    id,
    refs: {
      anchorEl,
      floatingEl,
      arrowEl,
    },
    state: {
      open,
      setOpen,
    },
  };

  registerFloatingContext(context);
  registerFloatingParent(context, parentContext ?? null);

  return context;
}

//=======================================================================================
// Internals
//=======================================================================================

const floatingInternals = new WeakMap<object, FloatingInternals>();
const floatingContexts = new Map<FloatingContextId, FloatingContext>();

/**
 * Attaches internal positioning state to a public floating object.
 * @internal
 */
export function setFloatingInternals(target: object, internals: FloatingInternals) {
  patchFloatingInternals(target, internals);
}

/**
 * Reads the internal state previously attached with `setFloatingInternals()`.
 * @internal
 */
export function getFloatingInternals(target: object) {
  return floatingInternals.get(target);
}

/**
 * Updates a subset of the internal state attached to a floating object.
 * @internal
 */
export function patchFloatingInternals(target: object, patch: Partial<FloatingInternals>) {
  const current = floatingInternals.get(target);
  floatingInternals.set(target, { ...current, ...patch });
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

function registerFloatingParent(context: FloatingContext, parentContext: FloatingContext | null) {
  const internals = ensureFloatingInternals(context);
  internals.parentContextId = parentContext?.id ?? null;
  internals.childContextIds ??= shallowRef(new Set());

  if (!parentContext) return;

  const parentInternals = ensureFloatingInternals(parentContext);
  parentInternals.childContextIds ??= shallowRef(new Set());
  parentInternals.childContextIds.value = new Set(parentInternals.childContextIds.value).add(
    context.id,
  );

  tryOnScopeDispose(() => {
    if (parentInternals.childContextIds) {
      const nextChildContextIds = new Set(parentInternals.childContextIds.value);
      nextChildContextIds.delete(context.id);
      parentInternals.childContextIds.value = nextChildContextIds;
    }
    internals.parentContextId = null;
  });
}

function registerFloatingContext(context: FloatingContext) {
  floatingContexts.set(context.id, context);
  tryOnScopeDispose(() => {
    floatingContexts.delete(context.id);
  });
}

function ensureFloatingInternals(target: object): FloatingInternals {
  const internals = floatingInternals.get(target) ?? {};
  floatingInternals.set(target, internals);
  return internals;
}

function createFloatingContextId(): FloatingContextId {
  return Symbol("v-float-context");
}

function getFloatingChildContexts(context: object): FloatingContext[] {
  const childContextIds = getFloatingInternals(context)?.childContextIds?.value;
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

interface OpenFloatingContextMatch {
  context: FloatingContext;
  depth: number;
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

//=======================================================================================
// Types
//=======================================================================================

/**
 * Anchor values accepted by the floating context.
 */
export type AnchorElement = HTMLElement | VirtualElement | null;

/**
 * Floating panel elements are real DOM nodes when mounted.
 */
export type FloatingElement = HTMLElement | null;

/**
 * Stable identity for a floating context.
 */
export type FloatingContextId = symbol;

/**
 * Reactive refs owned by the floating context.
 */
export interface FloatingRefs {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

/**
 * Open-state API exposed to consumers.
 */
export interface FloatingState {
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
}

/**
 * Public floating context shared with companion composables.
 */
export interface FloatingContext {
  id: FloatingContextId;
  refs: FloatingRefs;
  state: FloatingState;
}

/**
 * Element refs owned by the floating context.
 */
export interface UseFloatingContextRefs {
  /**
   * Anchor element or virtual element the floating panel is positioned against.
   */
  anchorEl: Ref<AnchorElement>;

  /**
   * Floating panel element.
   */
  floatingEl: Ref<FloatingElement>;

  /**
   * Optional arrow element used by `useArrow()`.
   */
  arrowEl?: Ref<HTMLElement | null>;
}

/**
 * Options for configuring context-owned state.
 */
export interface UseFloatingContextState {
  /**
   * Optional controlled open state.
   */
  open?: Ref<boolean>;

  /**
   * Called whenever the open state changes through VFloat helpers.
   */
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
}

/**
 * Options for creating a floating context.
 */
export interface UseFloatingContextOptions {
  /**
   * Element refs shared by companion composables.
   */
  refs: UseFloatingContextRefs;

  /**
   * Optional state configuration.
   */
  state?: UseFloatingContextState;

  /**
   * Optional parent floating context used to coordinate related floating surfaces.
   */
  parentContext?: FloatingContext | null;
}

/**
 * Internal capabilities attached to a context or position result via a WeakMap.
 */
export interface FloatingInternals {
  parentContextId?: FloatingContextId | null;
  childContextIds?: ShallowRef<Set<FloatingContextId>>;
  middlewareRegistry?: {
    middlewares: ComputedRef<Middleware[]>;
    register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
  };
  updatePosition?: () => Promise<void>;
}
