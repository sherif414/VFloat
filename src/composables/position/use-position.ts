import type {
  AutoPlacementOptions,
  AutoUpdateOptions,
  FlipOptions,
  HideOptions,
  InlineOptions,
  Middleware,
  MiddlewareData,
  OffsetOptions,
  Padding,
  Placement,
  ShiftOptions,
  SizeOptions,
  Strategy,
} from "@floating-ui/dom";
import {
  autoPlacement,
  computePosition,
  flip,
  autoUpdate as floatingUIAutoUpdate,
  hide,
  inline,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  type Ref,
  ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import type { FloatingNode } from "@/composables/floating-tree";
import { floatingInternals } from "@/composables/floating-tree/use-floating-node";
import { isServer } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { arrow } from "../middlewares";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Computes coordinates and inline styles for a floating element using Floating UI.
 *
 * This composable connects anchor and floating elements exposed by a `FloatingNode`,
 * runs configured middlewares, listens for DOM changes via `autoUpdate`, and computes
 * reactive placement styles. It also registers a middleware registry into node internals
 * so companion composables (such as `useArrow`) can participate in positioning.
 *
 * @param node - The shared floating node providing DOM element refs.
 * @param options - Configuration options for placement, strategy, and middleware.
 * @returns An object containing computed coordinates, placement, styles, and an update method.
 *
 * @example Basic usage in `<script setup>`
 * ```vue
 * <script setup lang="ts">
 * import { ref } from "vue";
 * import { useFloatingNode, usePosition } from "v-float";
 *
 * const anchorEl = ref<HTMLElement | null>(null);
 * const floatingEl = ref<HTMLElement | null>(null);
 *
 * const node = useFloatingNode({ anchorEl, floatingEl });
 * const { styles } = usePosition(node, {
 *   placement: "bottom-start",
 *   middlewares: {
 *     offset: 8,
 *     flip: true,
 *     shift: true,
 *   },
 * });
 * </script>
 *
 * <template>
 *   <button ref="anchorEl">Anchor</button>
 *   <div v-if="node.open" ref="floatingEl" :style="styles">Floating panel</div>
 * </template>
 * ```
 */
export function usePosition(
  node: FloatingNode,
  options: UsePositionOptions = {},
): FloatingPosition {
  const { anchorEl, floatingEl } = node.refs;

  const registrations = ref<
    {
      id: number;
      middleware: MaybeRefOrGetter<Middleware | null | undefined>;
    }[]
  >([]);
  let nextRegistrationId = 0;

  const mergedMiddlewares = computed(() => {
    const rawMiddlewares = toValue(options.middlewares);
    const base = getMiddlewares(rawMiddlewares, node);
    const merged = [...base];

    for (const registration of registrations.value) {
      const mw = toValue(registration.middleware);
      if (mw) merged.push(mw);
    }

    return merged;
  });

  const registerMiddleware = (
    middleware: MaybeRefOrGetter<Middleware | null | undefined>,
  ): (() => void) => {
    const id = nextRegistrationId++;
    registrations.value = [...registrations.value, { id, middleware }];

    const unregister = () => {
      registrations.value = registrations.value.filter((reg) => reg.id !== id);
    };

    tryOnScopeDispose(unregister);
    return unregister;
  };

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const preferredPlacement = computed(() => toValue(options.placement) ?? "bottom");
  const preferredStrategy = computed(() => toValue(options.strategy) ?? "absolute");

  const x = ref(0);
  const y = ref(0);
  const placement = ref<Placement>(preferredPlacement.value);
  const strategy = ref<Strategy>(preferredStrategy.value);
  const middlewareData = shallowRef<MiddlewareData>({});
  const isPositioned = ref(false);

  const update = async () => {
    if (!isEnabled.value) return;

    const reference = anchorEl.value;
    const floating = floatingEl.value;

    if (!reference || !floating) return;

    const computedConfig = {
      placement: preferredPlacement.value,
      strategy: preferredStrategy.value,
      middleware: mergedMiddlewares.value,
    };

    const data = await computePosition(reference, floating, computedConfig);

    x.value = data.x;
    y.value = data.y;
    placement.value = data.placement;
    strategy.value = data.strategy;
    middlewareData.value = data.middlewareData;
    isPositioned.value = true;
  };

  watch(
    [anchorEl, floatingEl, isEnabled, preferredPlacement, preferredStrategy, mergedMiddlewares],
    ([anchor, floating, enabled]) => {
      if (isServer) return;

      if (!anchor || !floating || !enabled) {
        isPositioned.value = false;
        return;
      }

      void update();

      const autoUpdateOptions = toValue(options.autoUpdate ?? true);
      if (!autoUpdateOptions) return;

      const cleanup = floatingUIAutoUpdate(
        anchor,
        floating,
        () => {
          void update();
        },
        typeof autoUpdateOptions === "object" ? autoUpdateOptions : {},
      );

      return cleanup;
    },
    { immediate: true, flush: "post" },
  );

  const styles = computed<FloatingStyles>(() => {
    const base: FloatingStyles = {
      position: strategy.value,
      left: "0",
      top: "0",
    };

    const el = floatingEl.value;

    if (!el) return base;

    const resolvedTransform = toValue(options.transform) ?? true;
    const roundedX = roundByDPR(el, x.value);
    const roundedY = roundByDPR(el, y.value);

    if (!resolvedTransform) {
      return {
        ...base,
        left: `${roundedX}px`,
        top: `${roundedY}px`,
      };
    }

    return {
      ...base,
      transform: `translate(${roundedX}px, ${roundedY}px)`,
      ...(getDPR(el) >= 1.5 ? { "will-change": "transform" } : {}),
    };
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

  const internals = floatingInternals.get(node.id);
  if (internals) {
    internals.middlewareRegistry = {
      middlewares: mergedMiddlewares,
      register: registerMiddleware,
    };
    internals.placement = placement;
    internals.middlewareData = middlewareData;
  } else {
    floatingInternals.set(node.id, {
      middlewareRegistry: {
        middlewares: mergedMiddlewares,
        register: registerMiddleware,
      },
      placement,
      middlewareData,
    });
  }

  return position;
}

//=======================================================================================
// 📌 Internal Logic
//=======================================================================================

function roundByDPR(el: HTMLElement, value: number) {
  const dpr = getDPR(el);
  return Math.round(value * dpr) / dpr;
}

function getDPR(el: HTMLElement) {
  if (isServer) return 1;
  const win = el.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}

function getMiddlewares(
  options: UsePositionMiddlewaresOptions | Middleware[] | undefined,
  node: FloatingNode,
) {
  if (!options) return [];
  if (Array.isArray(options)) return options;

  const middlewares: Middleware[] = [];

  if (options.inline !== undefined && options.inline !== false) {
    middlewares.push(inline(options.inline === true ? undefined : options.inline));
  }

  if (options.offset !== undefined && options.offset !== false) {
    middlewares.push(offset(options.offset === true ? undefined : options.offset));
  }

  if (options.flip !== undefined && options.flip !== false) {
    middlewares.push(flip(options.flip === true ? undefined : options.flip));
  }

  if (options.autoPlacement !== undefined && options.autoPlacement !== false) {
    middlewares.push(
      autoPlacement(options.autoPlacement === true ? undefined : options.autoPlacement),
    );
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

  if (options.size) {
    middlewares.push(size(options.size));
  }

  if (options.hide !== undefined && options.hide !== false) {
    middlewares.push(hide(options.hide === true ? undefined : options.hide));
  }

  if (options.arrow !== undefined && options.arrow !== false) {
    const arrowEl =
      options.arrow === true
        ? node.refs.arrowEl
        : (options.arrow.element ?? node.refs.arrowEl);
    if (arrowEl) {
      middlewares.push(
        arrow({
          element: arrowEl,
          padding: typeof options.arrow === "object" ? options.arrow.padding : undefined,
        }),
      );
    }
  }

  middlewares.push(...(toValue(options.custom) ?? []));

  return middlewares;
}

//=======================================================================================
// 📌 Types
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
 * Configuration options for arrow positioning in `UsePositionMiddlewaresOptions`.
 */
export interface UsePositionArrowOptions {
  /**
   * Arrow element ref to measure and position.
   * Defaults to `node.refs.arrowEl`.
   */
  element?: Ref<HTMLElement | null>;

  /**
   * Padding in pixels between the arrow and floating element edges.
   */
  padding?: Padding;
}

/**
 * Declarative middleware options for common positioning behavior.
 */
export interface UsePositionMiddlewaresOptions {
  /**
   * Whether to position relative to individual client rects for multi-line inline elements.
   */
  inline?: true | false | InlineOptions;

  /**
   * Space between the anchor and floating element.
   */
  offset?: true | false | OffsetOptions;

  /**
   * Whether the floating element can flip when the preferred side overflows.
   */
  flip?: true | false | FlipOptions;

  /**
   * Automatically chooses the placement with the most available space.
   */
  autoPlacement?: true | false | AutoPlacementOptions;

  /**
   * Whether the floating element can shift to stay inside the viewport.
   */
  shift?: true | false | ShiftOptions;

  /**
   * Whether the floating element should match the anchor width.
   */
  matchWidth?: boolean;

  /**
   * Measures available space and resizes the floating element.
   */
  size?: SizeOptions;

  /**
   * Provides data to hide the floating element when the reference is clipped or escaped.
   */
  hide?: true | false | HideOptions;

  /**
   * Positions an arrow element relative to the anchor and floating element.
   * Uses `node.refs.arrowEl` if not explicitly provided.
   */
  arrow?: true | false | UsePositionArrowOptions;

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
   * Middleware configuration for positioning behavior.
   * Accepts either a declarative middlewares options object or an array of middleware instances.
   */
  middlewares?: MaybeRefOrGetter<UsePositionMiddlewaresOptions | Middleware[] | undefined>;

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
