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
  open?: FloatingStateShape["open"];
  setOpen?: FloatingStateShape["setOpen"];
};

type FloatingPositionLike = {
  position?: FloatingPositionShape;
  x?: FloatingPositionShape["x"];
  y?: FloatingPositionShape["y"];
  strategy?: FloatingPositionShape["strategy"];
  placement?: FloatingPositionShape["placement"];
  middlewareData?: FloatingPositionShape["middlewareData"];
  isPositioned?: FloatingPositionShape["isPositioned"];
  floatingStyles?: FloatingPositionShape["styles"];
  update?: FloatingPositionShape["update"];
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

  if (context.open && context.setOpen) {
    return {
      open: context.open,
      setOpen: context.setOpen,
    };
  }

  throw new Error("[VFloat] Floating state is missing from the provided context.");
}

export function getFloatingPosition(context: FloatingPositionLike): FloatingPositionShape {
  if (context.position) {
    return context.position;
  }

  if (
    context.x &&
    context.y &&
    context.strategy &&
    context.placement &&
    context.middlewareData &&
    context.isPositioned &&
    context.floatingStyles &&
    context.update
  ) {
    return {
      x: context.x,
      y: context.y,
      strategy: context.strategy,
      placement: context.placement,
      middlewareData: context.middlewareData,
      isPositioned: context.isPositioned,
      styles: context.floatingStyles,
      update: context.update,
    };
  }

  throw new Error("[VFloat] Floating position data is missing from the provided context.");
}
