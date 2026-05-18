import type {
  AutoUpdateOptions,
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
} from "@floating-ui/dom";
import { computePosition, autoUpdate as floatingUIAutoUpdate } from "@floating-ui/dom";
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
import type { OpenChangeReason, VirtualElement } from "@/types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates the shared floating context used by positioning and interaction composables.
 *
 * This is a "Deep Module" that encapsulates the entire reactive lifecycle of a
 * floating surface, including open state management, middleware merging,
 * coordinate computation, and auto-update synchronization.
 *
 * @param anchorEl - The anchor element that the floating element is positioned relative to.
 * @param floatingEl - The floating element itself.
 * @param options - Configuration options for the floating behavior.
 * @returns The floating context object containing refs, state, and position API.
 *
 * @example
 * ```ts
 * const anchorEl = ref(null);
 * const floatingEl = ref(null);
 * const { refs, state, position } = useFloating(anchorEl, floatingEl, {
 *   placement: 'top',
 *   open: ref(true)
 * });
 * ```
 */
export function useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options: UseFloatingOptions = {},
): FloatingContext {
  const {
    open: openOption,
    placement: placementOption = "bottom",
    strategy: strategyOption = "absolute",
    transform: transformOption = true,
    middlewares: middlewaresOption = [],
    autoUpdate: autoUpdateOption = true,
    onOpenChange,
  } = options;

  //=====================================================================================
  // Open State
  //=====================================================================================

  const open = openOption ?? ref(false);

  const setOpen = (value: boolean, reason?: OpenChangeReason, event?: Event) => {
    if (open.value === value) return;
    open.value = value;
    onOpenChange?.(value, reason ?? "programmatic", event);
  };

  //=====================================================================================
  // Middleware Registry
  //=====================================================================================

  const registrations = ref<
    { id: number; middleware: MaybeRefOrGetter<Middleware | null | undefined> }[]
  >([]);
  let nextRegistrationId = 0;

  const mergedMiddlewares = computed(() => {
    const base = toValue(middlewaresOption) ?? [];
    const merged = [...base];

    for (const registration of registrations.value) {
      const middleware = toValue(registration.middleware);
      if (!middleware) continue;

      const existingIndex = merged.findIndex((m) => m.name === middleware.name);
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
      registrations.value = registrations.value.filter((r) => r.id !== registration.id);
    };

    tryOnScopeDispose(unregister);
    return unregister;
  };

  //=====================================================================================
  // Positioning Engine
  //=====================================================================================

  const preferredPlacement = computed(() => toValue(placementOption) ?? "bottom");
  const preferredStrategy = computed(() => toValue(strategyOption) ?? "absolute");

  const x = ref(0);
  const y = ref(0);
  const placement = ref<Placement>(preferredPlacement.value);
  const strategy = ref<Strategy>(preferredStrategy.value);
  const middlewareData = shallowRef<MiddlewareData>({});
  const isPositioned = ref(false);

  const update = async () => {
    if (!anchorEl.value || !floatingEl.value) return;

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
      isPositioned.value = open.value;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[VFloat] Failed to compute position:", error);
      }
    }
  };

  // Sync position when preferred options or registered middlewares change
  watch([preferredPlacement, preferredStrategy, mergedMiddlewares], () => {
    if (open.value) void update();
  });

  // Handle open state and auto-update wiring
  watch(
    [anchorEl, floatingEl, open],
    ([currAnchor, currFloating, isOpen], _, onCleanup) => {
      if (!isOpen || !currAnchor || !currFloating) return;

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

  watch(open, (isOpen) => {
    if (!isOpen) isPositioned.value = false;
  });

  const styles = computed<FloatingStyles>(() => {
    const el = floatingEl.value;
    const base = { position: strategy.value, left: "0", top: "0" } satisfies FloatingStyles;

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

  //=====================================================================================
  // Context Assembly
  //=====================================================================================

  const arrowEl = ref<HTMLElement | null>(null);

  const refs: FloatingRefs = {
    anchorEl,
    floatingEl,
    arrowEl,
  };

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

  const context: FloatingContext = {
    refs,
    state: { open, setOpen },
    position,
  };

  setFloatingInternals(context, {
    middlewareRegistry: {
      middlewares: mergedMiddlewares,
      register: registerMiddleware,
    },
    updatePosition: update,
  });

  return context;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

const floatingInternals = new WeakMap<object, FloatingInternals>();

/**
 * Attaches internal positioning state to a public floating context object.
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
 * Updates a subset of the internal state attached to a floating context.
 * @internal
 */
export function patchFloatingInternals(target: object, patch: Partial<FloatingInternals>) {
  const current = floatingInternals.get(target);
  if (!current) return;
  floatingInternals.set(target, { ...current, ...patch });
}

function roundByDPR(el: HTMLElement, value: number) {
  const dpr = getDPR(el);
  return Math.round(value * dpr) / dpr;
}

function getDPR(el: HTMLElement) {
  if (typeof window === "undefined") return 1;
  const win = el.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}

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
 * Positioning API exposed to consumers.
 */
export interface FloatingPosition {
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
export type FloatingContext = FloatingRoot;

/**
 * Registry used to merge middleware contributions from multiple composables.
 */
export interface FloatingMiddlewareRegistry {
  middlewares: ComputedRef<Middleware[]>;
  register: (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => () => void;
}

/**
 * Internal capabilities attached to the floating context via a WeakMap.
 */
export interface FloatingInternals {
  middlewareRegistry: FloatingMiddlewareRegistry;
  updatePosition: () => Promise<void>;
}

/**
 * Options for configuring the floating behavior.
 */
export interface UseFloatingOptions {
  /**
   * Preferred side/alignment for the floating element.
   * Falls back to `"bottom"` when omitted.
   */
  placement?: MaybeRefOrGetter<Placement | undefined>;

  /**
   * CSS positioning strategy used for the floating element.
   * Falls back to `"absolute"` when omitted.
   */
  strategy?: MaybeRefOrGetter<Strategy | undefined>;

  /**
   * Whether computed coordinates should be applied with `transform`
   * instead of `top` and `left`.
   */
  transform?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Base middleware list passed to the positioning engine.
   */
  middlewares?: MaybeRefOrGetter<Middleware[]>;

  /**
   * Enables automatic re-positioning while the floating element is open.
   * Pass an options object to customize Floating UI's `autoUpdate`.
   */
  autoUpdate?: MaybeRefOrGetter<boolean | AutoUpdateOptions | undefined>;

  /**
   * Optional controlled open state.
   */
  open?: Ref<boolean>;

  /**
   * Called whenever the open state changes through VFloat helpers.
   */
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
}
