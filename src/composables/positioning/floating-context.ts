import type {
  Middleware as FloatingMiddleware,
  MiddlewareData,
  Placement,
  Strategy,
} from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";
import type { OpenChangeReason, VirtualElement } from "@/types";

export type AnchorElement = HTMLElement | VirtualElement | null;
export type FloatingElement = HTMLElement | null;

export type FloatingStyles = {
  position: Strategy;
  top: string;
  left: string;
  transform?: string;
  "will-change"?: string;
} & {
  [key: `--${string}`]: any;
};

export interface FloatingRefsShape {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

export interface FloatingStateShape {
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
}

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

export interface FloatingRefs extends FloatingRefsShape {
  setAnchor: (value: AnchorElement) => void;
  setFloating: (value: FloatingElement) => void;
  setArrow: (value: HTMLElement | null) => void;
}

export interface FloatingState extends FloatingStateShape {}

export interface FloatingPosition extends FloatingPositionShape {}

export interface FloatingRoot {
  refs: FloatingRefs;
  state: FloatingState;
  position: FloatingPosition;
}

export interface FloatingContext extends FloatingRoot {}

export interface FloatingMiddlewareRegistry {
  middlewares: ComputedRef<FloatingMiddleware[]>;
  register: (middleware: MaybeRefOrGetter<FloatingMiddleware | null | undefined>) => () => void;
}

export interface FloatingListNavigationBridge {
  onNavigate?: (index: number | null) => void;
  returnIndex: Ref<number | null>;
  openedByTree: Ref<boolean>;
}

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

export interface FloatingInternals {
  middlewareRegistry: FloatingMiddlewareRegistry;
  treeNode?: FloatingTreeNodeBridge;
}

const floatingInternals = new WeakMap<object, FloatingInternals>();

export function setFloatingInternals(target: object, internals: FloatingInternals) {
  floatingInternals.set(target, internals);
}

export function getFloatingInternals(target: object) {
  return floatingInternals.get(target);
}

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
