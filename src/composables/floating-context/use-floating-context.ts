import type { Middleware, MiddlewareData, Placement } from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import { ref } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
import type { OpenChangeReason, VirtualElement } from "@/types";
import { floatingTree } from "./floating-context-tree";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates the shared floating context used by interaction and positioning composables.
 */
export function useFloatingContext(options: UseFloatingContextOptions): FloatingContext {
  const {
    anchorEl,
    floatingEl,
    arrowEl: arrowElOption,
    open: openOption,
    defaultOpen = false,
    onOpenChange,
    parentContext,
  } = options;
  const id = createFloatingContextId();
  const open = useControllableState({
    value: openOption,
    initialValue: defaultOpen,
    onChange: (value) => {
      if (openOption) openOption.value = value;
    },
  });
  const arrowEl = arrowElOption ?? ref<HTMLElement | null>(null);

  const setOpen = (value: boolean, reason: OpenChangeReason = "programmatic", event?: Event) => {
    if (open.value === value) {
      if (!value) floatingTree.closeDescendants(context, reason, event);
      return;
    }
    if (!value) floatingTree.closeDescendants(context, reason, event);
    open.value = value;
    onOpenChange?.(value, reason, event);
  };

  const isRoot = !parentContext;

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
    isRoot,
  };

  floatingTree.addNode(context, parentContext ?? null);

  return context;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function createFloatingContextId(): FloatingContextId {
  return Symbol("v-float-context");
}

//=======================================================================================
// 📌 Internals
//=======================================================================================

/**
 * Internal registry storing non-public capabilities (middleware registries)
 * attached to floating contexts via WeakMap.
 *
 * @internal
 */
export class FloatingInternalsRegistry {
  private readonly store = new WeakMap<FloatingContextId, FloatingInternals>();

  /**
   * Reads internal state associated with the floating context identifier.
   */
  get(id: FloatingContextId): FloatingInternals | undefined {
    return this.store.get(id);
  }

  /**
   * Attaches internal capabilities onto the floating context identifier.
   */
  set(id: FloatingContextId, internals: FloatingInternals): void {
    this.store.set(id, internals);
  }
}

export const floatingInternals = new FloatingInternalsRegistry();

//=======================================================================================
// 📌 Types
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
  /**
   * Whether this is a top-level floating context without a parentContext.
   */
  isRoot: boolean;
}

/**
 * Options for creating a floating context.
 */
export interface UseFloatingContextOptions {
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

  /**
   * Optional controlled open state.
   */
  open?: Ref<boolean>;

  /**
   * Initial open state when `open` is not provided.
   */
  defaultOpen?: boolean;

  /**
   * Called whenever the open state changes through VFloat helpers.
   */
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;

  /**
   * Optional parent floating context used to coordinate related floating surfaces.
   */
  parentContext?: FloatingContext | null;
}

/**
 * Internal capabilities attached to a position result via a WeakMap.
 *
 * @internal
 */
export interface FloatingInternals {
  middlewareRegistry?: {
    middlewares: ComputedRef<Middleware[]>;
    register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
  };
  placement?: Readonly<Ref<Placement>>;
  middlewareData?: Readonly<Ref<MiddlewareData>>;
}
