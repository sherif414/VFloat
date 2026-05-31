import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import { ref } from "vue";
import type { Middleware } from "@floating-ui/dom";
import type { OpenChangeReason, VirtualElement } from "@/types";

//=======================================================================================
// Main
//=======================================================================================

/**
 * Creates the shared floating context used by interaction and positioning composables.
 */
export function useFloatingContext(options: UseFloatingContextOptions): FloatingContext {
  const { refs, state = {} } = options;
  const { anchorEl, floatingEl, arrowEl: arrowElOption } = refs;
  const { open: openOption, onOpenChange } = state;
  const open = openOption ?? ref(false);
  const arrowEl = arrowElOption ?? ref<HTMLElement | null>(null);

  const setOpen = (value: boolean, reason?: OpenChangeReason, event?: Event) => {
    if (open.value === value) return;
    open.value = value;
    onOpenChange?.(value, reason ?? "programmatic", event);
  };

  return {
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
  floatingInternals.set(target, internals);
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
  if (!current) return;
  floatingInternals.set(target, { ...current, ...patch });
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
}

/**
 * Internal capabilities attached to a context or position result via a WeakMap.
 */
export interface FloatingInternals {
  middlewareRegistry?: {
    middlewares: ComputedRef<Middleware[]>;
    register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
  };
  updatePosition?: () => Promise<void>;
}
