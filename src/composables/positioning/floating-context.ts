import type {
  Middleware as FloatingMiddleware,
  MiddlewareData,
  Placement,
  Strategy,
} from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import type { OpenChangeReason, VirtualElement } from "@/types";

/**
 * Anchor values accepted by the floating context.
 */
export type AnchorElement = HTMLElement | VirtualElement | null;

/**
 * Floating panel elements are real DOM nodes when mounted.
 */
export type FloatingElement = HTMLElement | null;

/**
 * Inline styles resolved for the floating panel.
 */
export type FloatingStyles = {
  position: Strategy;
  top: string;
  left: string;
  transform?: string;
  "will-change"?: string;
} & {
  [key: `--${string}`]: any;
};

/**
 * Reactive refs owned by the floating context.
 */
export interface FloatingRefsShape {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

/**
 * Open-state controller exposed by the floating context.
 */
export interface FloatingStateShape {
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
}

/**
 * Positioning state shared across the floating composables.
 */
export interface FloatingPositionShape {
  x: Readonly<Ref<number>>;
  y: Readonly<Ref<number>>;
  strategy: Readonly<Ref<Strategy>>;
  placement: Readonly<Ref<Placement>>;
  middlewareData: Readonly<Ref<MiddlewareData>>;
  isPositioned: Readonly<Ref<boolean>>;
  styles: Readonly<Ref<FloatingStyles>>;
  update: () => void;
}

/**
 * Mutable DOM references and setter helpers.
 */
export interface FloatingRefs extends FloatingRefsShape {
  setAnchor: (value: AnchorElement) => void;
  setFloating: (value: FloatingElement) => void;
  setArrow: (value: HTMLElement | null) => void;
}

/**
 * Open-state API exposed to consumers.
 */
export interface FloatingState extends FloatingStateShape {}

/**
 * Positioning API exposed to consumers.
 */
export interface FloatingPosition extends FloatingPositionShape {}

/**
 * Root object returned by `useFloating()`.
 */
export interface FloatingRoot {
  refs: FloatingRefs;
  state: FloatingState;
  position: FloatingPosition;
}

/**
 * Public floating context shared with companion composables.
 */
export interface FloatingContext extends FloatingRoot {}

/**
 * Registry used to merge middleware contributions from multiple composables.
 */
export interface FloatingMiddlewareRegistry {
  middlewares: ComputedRef<FloatingMiddleware[]>;
  register: (middleware: MaybeRefOrGetter<FloatingMiddleware | null | undefined>) => () => void;
}

/**
 * Optional list-navigation bridge stored on the floating context.
 */
export interface FloatingListNavigationBridge {
  onNavigate?: (index: number | null) => void;
  returnIndex: Ref<number | null>;
  openedByTree: Ref<boolean>;
}

/**
 * Tree bridge that coordinates related floating branches.
 */
export interface FloatingTreeBridge {
  activeId: Readonly<Ref<string | null>>;
  actions: {
    getNode: (id: string) => FloatingTreeNodeBridge | null;
    closeBranch: (id: string, event?: Event) => void;
    closeChildren: (id: string, event?: Event) => void;
    closeSiblings: (id: string, event?: Event) => void;
    closeAll: (event?: Event) => void;
    isTargetWithinTree: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (id: string, target: EventTarget | null) => boolean;
  };
}

/**
 * Tree node bridge stored on a floating context that participates in a tree.
 */
export interface FloatingTreeNodeBridge {
  id: Readonly<Ref<string>>;
  parentId: Readonly<Ref<string | null>>;
  childIds: Readonly<Ref<string[]>>;
  context: Pick<FloatingContext, "refs" | "state">;
  tree: FloatingTreeBridge;
  state: {
    isRoot: Readonly<Ref<boolean>>;
    isLeaf: Readonly<Ref<boolean>>;
    isActive: Readonly<Ref<boolean>>;
  };
  listNavigation?: FloatingListNavigationBridge;
  actions: {
    close: (event?: Event) => void;
    closeBranch: (event?: Event) => void;
    closeChildren: (event?: Event) => void;
    closeSiblings: (event?: Event) => void;
    closeWithReason: (reason: OpenChangeReason, event?: Event) => void;
    restoreParentNavigation: (event?: Event) => void;
    isTargetWithinNode: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (target: EventTarget | null) => boolean;
  };
}

/**
 * Internal capabilities attached to the floating context via a WeakMap.
 */
export interface FloatingInternals {
  middlewareRegistry: FloatingMiddlewareRegistry;
  treeNode?: FloatingTreeNodeBridge;
}

const floatingInternals = new WeakMap<object, FloatingInternals>();

/**
 * Attaches internal positioning state to a public floating context object.
 */
export function setFloatingInternals(target: object, internals: FloatingInternals) {
  floatingInternals.set(target, internals);
}

/**
 * Reads the internal state previously attached with `setFloatingInternals()`.
 */
export function getFloatingInternals(target: object) {
  return floatingInternals.get(target);
}

/**
 * Updates a subset of the internal state attached to a floating context.
 */
export function patchFloatingInternals(target: object, patch: Partial<FloatingInternals>) {
  const current = floatingInternals.get(target);

  if (!current) {
    return;
  }

  floatingInternals.set(target, {
    ...current,
    ...patch,
  });
}
