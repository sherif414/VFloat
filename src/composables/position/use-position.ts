import type {
  AutoUpdateOptions,
  FlipOptions,
  Middleware,
  MiddlewareData,
  OffsetOptions,
  Placement,
  ShiftOptions,
  Strategy,
} from "@floating-ui/dom";
import {
  autoUpdate as floatingUIAutoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
  ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { FloatingContext } from "@/composables/floating-context";
import { setFloatingInternals } from "@/composables/floating-context";

//=======================================================================================
// Main
//=======================================================================================

/**
 * Adds JavaScript positioning to a floating context.
 */
export function usePosition(
  context: FloatingContext,
  options: UsePositionOptions = {},
): FloatingPosition {
  const {
    placement: placementOption = "bottom",
    strategy: strategyOption = "absolute",
    transform: transformOption = true,
    middleware: semanticMiddlewareOption,
    middlewares: middlewaresOption = [],
    autoUpdate: autoUpdateOption = true,
    enabled: enabledOption = true,
  } = options;
  const { anchorEl, floatingEl } = context.refs;

  const registrations = ref<
    {
      id: number;
      middleware: MaybeRefOrGetter<Middleware | null | undefined>;
    }[]
  >([]);
  let nextRegistrationId = 0;

  const mergedMiddlewares = computed(() => {
    const base = getMiddleware(toValue(semanticMiddlewareOption), toValue(middlewaresOption) ?? []);
    const merged = [...base];

    for (const registration of registrations.value) {
      const middleware = toValue(registration.middleware);
      if (!middleware) continue;

      const existingIndex = merged.findIndex((item) => item.name === middleware.name);
      if (existingIndex === -1) {
        merged.push(middleware);
      } else {
        merged[existingIndex] = middleware;
      }
    }

    return merged;
  });

  const registerMiddleware: FloatingMiddlewareRegistry["register"] = (middleware) => {
    const registration = { id: nextRegistrationId++, middleware };
    registrations.value = [...registrations.value, registration];

    const unregister = () => {
      registrations.value = registrations.value.filter((item) => item.id !== registration.id);
    };

    tryOnScopeDispose(unregister);
    return unregister;
  };

  const isEnabled = computed(() => toValue(enabledOption));
  const preferredPlacement = computed(() => toValue(placementOption) ?? "bottom");
  const preferredStrategy = computed(() => toValue(strategyOption) ?? "absolute");

  const x = ref(0);
  const y = ref(0);
  const placement = ref<Placement>(preferredPlacement.value);
  const strategy = ref<Strategy>(preferredStrategy.value);
  const middlewareData = shallowRef<MiddlewareData>({});
  const isPositioned = ref(false);

  const update = async () => {
    if (!isEnabled.value || !anchorEl.value || !floatingEl.value) return;

    try {
      const result = await computePosition(anchorEl.value, floatingEl.value, {
        placement: preferredPlacement.value,
        strategy: preferredStrategy.value,
        middleware: mergedMiddlewares.value,
      });

      x.value = result.x;
      y.value = result.y;
      placement.value = result.placement;
      strategy.value = result.strategy;
      middlewareData.value = result.middlewareData;
      isPositioned.value = true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[VFloat] Failed to compute position:", error);
      }
    }
  };

  watch([preferredPlacement, preferredStrategy, mergedMiddlewares, isEnabled], () => {
    if (isEnabled.value) void update();
    else isPositioned.value = false;
  });

  watch(
    [anchorEl, floatingEl, isEnabled],
    ([currAnchor, currFloating, enabled], _, onCleanup) => {
      if (!enabled || !currAnchor || !currFloating) return;

      void update();

      const autoUpdateOptions = toValue(autoUpdateOption);
      if (!autoUpdateOptions) return;

      const cleanup = floatingUIAutoUpdate(
        currAnchor,
        currFloating,
        update,
        typeof autoUpdateOptions === "object" ? autoUpdateOptions : undefined,
      );

      onCleanup(cleanup);
    },
    { immediate: true },
  );

  const styles = computed<FloatingStyles>(() => {
    const el = floatingEl.value;
    const base = {
      position: strategy.value,
      left: "0",
      top: "0",
    } satisfies FloatingStyles;

    if (!el) return base;

    const resolvedTransform = toValue(transformOption) ?? true;
    const roundedX = roundByDPR(el, x.value);
    const roundedY = roundByDPR(el, y.value);

    if (!resolvedTransform) {
      return { ...base, left: `${roundedX}px`, top: `${roundedY}px` };
    }

    return {
      ...base,
      transform: `translate(${roundedX}px, ${roundedY}px)`,
      ...(getDPR(el) >= 1.5 ? { "will-change": "transform" } : {}),
    };
  });

  tryOnScopeDispose(() => {
    isPositioned.value = false;
  });

  const position: FloatingPosition = {
    x,
    y,
    strategy,
    placement,
    middlewareData,
    isPositioned,
    styles,
    update,
  };

  setFloatingInternals(position, {
    middlewareRegistry: {
      middlewares: mergedMiddlewares,
      register: registerMiddleware,
    },
    updatePosition: update,
  });
  setFloatingInternals(context, { updatePosition: update });

  return position;
}

//=======================================================================================
// Helpers
//=======================================================================================

function roundByDPR(el: HTMLElement, value: number) {
  const dpr = getDPR(el);
  return Math.round(value * dpr) / dpr;
}

function getDPR(el: HTMLElement) {
  if (typeof window === "undefined") return 1;
  const win = el.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}

function getMiddleware(
  options: UsePositionMiddlewareOptions | undefined,
  middlewares: Middleware[],
) {
  return [...getSemanticMiddleware(options), ...middlewares];
}

function getSemanticMiddleware(options: UsePositionMiddlewareOptions | undefined) {
  if (!options) return [];

  const middlewares: Middleware[] = [];

  if (options.offset !== undefined && options.offset !== false) {
    middlewares.push(offset(options.offset === true ? undefined : options.offset));
  }

  if (options.flip !== undefined && options.flip !== false) {
    middlewares.push(flip(options.flip === true ? undefined : options.flip));
  }

  if (options.shift !== undefined && options.shift !== false) {
    middlewares.push(shift(options.shift === true ? undefined : options.shift));
  }

  if (options.matchWidth) {
    middlewares.push(
      size({
        apply({ rects, elements }) {
          elements.floating.style.width = `${rects.reference.width}px`;
        },
      }),
    );
  }

  middlewares.push(...(toValue(options.custom) ?? []));

  return middlewares;
}

//=======================================================================================
// Types
//=======================================================================================

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
 * Positioning API returned by `usePosition()`.
 */
export interface FloatingPosition {
  x: Readonly<Ref<number>>;
  y: Readonly<Ref<number>>;
  strategy: Readonly<Ref<Strategy>>;
  placement: Readonly<Ref<Placement>>;
  middlewareData: Readonly<Ref<MiddlewareData>>;
  isPositioned: Readonly<Ref<boolean>>;
  styles: Readonly<Ref<FloatingStyles>>;
  update: () => Promise<void>;
}

/**
 * Registry used to merge middleware contributions from multiple composables.
 */
export interface FloatingMiddlewareRegistry {
  middlewares: ComputedRef<Middleware[]>;
  register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
}

/**
 * Declarative middleware options for common positioning behavior.
 */
export interface UsePositionMiddlewareOptions {
  /**
   * Space between the anchor and floating element.
   */
  offset?: true | false | OffsetOptions;

  /**
   * Whether the floating element can flip when the preferred side overflows.
   */
  flip?: true | false | FlipOptions;

  /**
   * Whether the floating element can shift to stay inside the viewport.
   */
  shift?: true | false | ShiftOptions;

  /**
   * Whether the floating element should match the anchor width.
   */
  matchWidth?: boolean;

  /**
   * Raw middleware appended after the built-in semantic middleware.
   */
  custom?: MaybeRefOrGetter<Middleware[] | undefined>;
}

/**
 * Options for configuring the positioning behavior.
 */
export interface UsePositionOptions {
  /**
   * Preferred side/alignment for the floating element.
   * @default `"bottom"`
   */
  placement?: MaybeRefOrGetter<Placement | undefined>;

  /**
   * CSS positioning strategy used for the floating element.
   * @default `"absolute"`
   */
  strategy?: MaybeRefOrGetter<Strategy | undefined>;

  /**
   * Whether computed coordinates should be applied with `transform`
   * instead of `top` and `left`.
   */
  transform?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Declarative middleware configuration for common positioning behavior.
   */
  middleware?: MaybeRefOrGetter<UsePositionMiddlewareOptions | undefined>;

  /**
   * Base middleware list passed to the positioning engine.
   */
  middlewares?: MaybeRefOrGetter<Middleware[]>;

  /**
   * Whether automatic re-positioning while positioning is active.
   * Pass an options object to customize `autoUpdate`.
   */
  autoUpdate?: MaybeRefOrGetter<boolean | AutoUpdateOptions | undefined>;

  /**
   * Whether positioning computation and auto-update wiring is enabled.
   */
  enabled?: MaybeRefOrGetter<boolean>;
}
