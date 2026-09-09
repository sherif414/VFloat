import type { Middleware, MiddlewareData, Placement } from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import { ref, watch } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
import type { OpenChangeReason, VirtualElement } from "@/types";
import { floatingTree } from "./floating-tree";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates the shared floating node used by interaction and positioning composables.
 */
export function useFloatingNode(options: UseFloatingNodeOptions): FloatingNode {
  const id = createFloatingNodeId();
  const open = useControllableState({
    value: options.open,
    initialValue: !!options.defaultOpen,
    onChange: (value) => {
      if (options.open) options.open.value = value;
    },
  });

  const lastOpenReason = ref<OpenChangeReason | null>(null);
  const lastOpenEvent = ref<Event | null>(null);

  const setOpen = (value: boolean, reason: OpenChangeReason = "programmatic", event?: Event) => {
    if (open.value === value) {
      if (!value) {
        lastOpenReason.value = null;
        lastOpenEvent.value = null;
        // TODO: not sure if this should be handled here
        floatingTree.closeDescendants(node, reason, event);
      } else {
        lastOpenReason.value = reason;
        lastOpenEvent.value = event ?? null;
      }
      return;
    }

    if (!value) {
      lastOpenReason.value = null;
      lastOpenEvent.value = null;
      floatingTree.closeDescendants(node, reason, event);
    } else {
      lastOpenReason.value = reason;
      lastOpenEvent.value = event ?? null;
    }
    open.value = value;
    options.onOpenChange?.(value, reason, event);
  };

  watch(open, (isOpen) => {
    if (!isOpen) {
      lastOpenReason.value = null;
      lastOpenEvent.value = null;
    }
  });

  const isRoot = !options.parentNode;

  const node: FloatingNode = {
    id,
    refs: {
      anchorEl: options.anchorEl,
      floatingEl: options.floatingEl,
      arrowEl: options.arrowEl ?? ref<HTMLElement | null>(null),
    },
    open,
    setOpen,
    lastOpenReason,
    lastOpenEvent,
    isRoot,
  };

  floatingTree.addNode(node, options.parentNode ?? null);
  return node;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function createFloatingNodeId(): FloatingNodeId {
  return Symbol("v-float-node");
}

//=======================================================================================
// 📌 Internals
//=======================================================================================

/**
 * Internal registry storing non-public capabilities (middleware registries)
 * attached to floating nodes via WeakMap.
 *
 * @internal
 */
export class FloatingInternalsRegistry {
  private readonly store = new WeakMap<FloatingNodeId, FloatingInternals>();

  /**
   * Reads internal state associated with the floating node identifier.
   */
  get(id: FloatingNodeId): FloatingInternals | undefined {
    return this.store.get(id);
  }

  /**
   * Attaches internal capabilities onto the floating node identifier.
   */
  set(id: FloatingNodeId, internals: FloatingInternals): void {
    this.store.set(id, internals);
  }
}

export const floatingInternals = new FloatingInternalsRegistry();

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Anchor values accepted by the floating node.
 */
export type AnchorElement = HTMLElement | VirtualElement | null;

/**
 * Floating panel elements are real DOM nodes when mounted.
 */
export type FloatingElement = HTMLElement | null;

/**
 * Stable identity for a floating node.
 */
export type FloatingNodeId = symbol;

/**
 * Reactive refs owned by the floating node.
 */
export interface FloatingNodeElements {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

export interface FloatingNode {
  id: FloatingNodeId;
  refs: FloatingNodeElements;
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
  /**
   * The reason for the most recent open state transition or reaffirmation.
   * Null when closed.
   */
  lastOpenReason?: Readonly<Ref<OpenChangeReason | null>>;
  /**
   * The DOM/synthetic event associated with the most recent open state transition or reaffirmation.
   * Null when closed.
   */
  lastOpenEvent?: Readonly<Ref<Event | null>>;
  /**
   * Whether this is a top-level floating node without a parent node.
   */
  isRoot: boolean;
}

/**
 * Options for creating a floating node.
 */
export interface UseFloatingNodeOptions {
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
   * Optional parent floating node used to coordinate related floating surfaces.
   */
  parentNode?: FloatingNode | null;
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
