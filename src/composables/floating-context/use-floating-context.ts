import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from "vue";
import { ref, shallowRef } from "vue";
import type { Middleware } from "@floating-ui/dom";
import type { OpenChangeReason, VirtualElement } from "@/types";
import { tryOnScopeDispose } from "@/shared/lifecycle";

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

  registerFloatingParent(context, parentContext ?? null);

  return context;
}

//=======================================================================================
// Internals
//=======================================================================================

const floatingInternals = new WeakMap<object, FloatingInternals>();

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
  context: FloatingContext,
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
  const childContexts = getFloatingInternals(context)?.childContexts?.value;
  let deepest: OpenFloatingContextMatch | null = null;

  if (childContexts) {
    for (const childContext of childContexts) {
      const match = findDeepestOpenFloatingContext(childContext, 1);
      if (match && (!deepest || match.depth >= deepest.depth)) {
        deepest = match;
      }
    }
  }

  return deepest?.context ?? context;
}

/**
 * Returns mounted floating elements for a context and its linked descendants.
 *
 * @internal
 */
export function getFloatingContextFloatingElements(context: FloatingContext): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const floatingEl = context.refs.floatingEl.value;
  if (floatingEl) elements.push(floatingEl);

  const childContexts = getFloatingInternals(context)?.childContexts?.value;
  if (!childContexts) return elements;

  for (const childContext of childContexts) {
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
  internals.parentContext = parentContext;
  internals.childContexts ??= shallowRef(new Set());

  if (!parentContext) return;

  const parentInternals = ensureFloatingInternals(parentContext);
  parentInternals.childContexts ??= shallowRef(new Set());
  parentInternals.childContexts.value = new Set(parentInternals.childContexts.value).add(context);

  tryOnScopeDispose(() => {
    if (parentInternals.childContexts) {
      const nextChildContexts = new Set(parentInternals.childContexts.value);
      nextChildContexts.delete(context);
      parentInternals.childContexts.value = nextChildContexts;
    }
    internals.parentContext = null;
  });
}

function ensureFloatingInternals(target: object): FloatingInternals {
  const internals = floatingInternals.get(target) ?? {};
  floatingInternals.set(target, internals);
  return internals;
}

function getFloatingDescendants(context: FloatingContext): FloatingContext[] {
  const childContexts = getFloatingInternals(context)?.childContexts?.value;
  if (!childContexts) return [];

  const descendants: FloatingContext[] = [];
  for (const childContext of childContexts) {
    descendants.push(childContext, ...getFloatingDescendants(childContext));
  }
  return descendants;
}

function containsFloatingTarget(context: FloatingContext, target: Node): boolean {
  if (containsContextTarget(context, target)) return true;

  const childContexts = getFloatingInternals(context)?.childContexts?.value;
  if (!childContexts) return false;

  for (const childContext of childContexts) {
    if (containsFloatingTarget(childContext, target)) return true;
  }
  return false;
}

function containsContextTarget(context: FloatingContext, target: Node): boolean {
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

  const childContexts = getFloatingInternals(context)?.childContexts?.value;
  if (!childContexts) return deepest;

  for (const childContext of childContexts) {
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
  parentContext?: FloatingContext | null;
  childContexts?: ShallowRef<Set<FloatingContext>>;
  middlewareRegistry?: {
    middlewares: ComputedRef<Middleware[]>;
    register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
  };
  updatePosition?: () => Promise<void>;
}
