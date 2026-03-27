import type { MiddlewareData, Placement, Strategy } from "@floating-ui/dom";
import type { Ref } from "vue";
import type {
  AnchorElement,
  FloatingElement,
  FloatingStyles,
} from "@/composables/positioning/use-floating";
import type { OpenChangeReason } from "@/types";

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

type FloatingStateLike = {
  state?: FloatingStateShape;
};

type FloatingPositionLike = {
  position?: FloatingPositionShape;
};

export function getFloatingRefs<R>(context: { refs?: R }): R {
  if (context.refs) {
    return context.refs;
  }

  throw new Error("[VFloat] Floating refs are missing from the provided context.");
}

export function getFloatingState(context: FloatingStateLike): FloatingStateShape {
  if (context.state) {
    return context.state;
  }

  throw new Error("[VFloat] Floating state is missing from the provided context.");
}

export function getFloatingPosition(context: FloatingPositionLike): FloatingPositionShape {
  if (context.position) {
    return context.position;
  }

  throw new Error("[VFloat] Floating position data is missing from the provided context.");
}
