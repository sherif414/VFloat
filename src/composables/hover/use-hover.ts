import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { getAnchorElement } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { type SafePolygonOptions, safePolygon } from "./polygon";

/**
 * Minimum movement threshold in pixels to reset the rest detection timer.
 */
const POINTER_MOVE_THRESHOLD = 10;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when hovering the reference element
 * with enhanced behaviors like delayed open/close, rest detection, and custom
 * exit handling.
 *
 * @param node - The floating node with open state and refs.
 * @param options - Configuration options for hover behavior.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useHover(node, {
 *   delay: { open: 100, close: 300 },
 *   restMs: 150,
 * });
 * ```
 */
export function useHover(node: FloatingNode, options: UseHoverOptions = {}): void {
  const { open, refs } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const restMs = computed(() => toValue(options.restMs ?? 0));
  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));

  // --- Delayed Open & Close ---------------------------------------------------

  const showDelay = computed<number>(() => resolveDelay(toValue(options.delay), "open"));
  const hideDelay = computed<number>(() => resolveDelay(toValue(options.delay), "close"));

  let showTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let hideTimeoutId: ReturnType<typeof setTimeout> | undefined;

  function clearTimeouts(): void {
    clearTimeout(showTimeoutId);
    showTimeoutId = undefined;
    clearTimeout(hideTimeoutId);
    hideTimeoutId = undefined;
  }

  function show(overrideDelay?: number): void {
    clearTimeouts();
    const resolvedDelay = overrideDelay ?? showDelay.value;

    if (resolvedDelay === 0) {
      if (!open.value && anchorEl.value?.isConnected) {
        open.value = true;
      }
    } else {
      showTimeoutId = setTimeout(() => {
        if (!open.value && anchorEl.value?.isConnected) {
          open.value = true;
        }
      }, resolvedDelay);
    }
  }

  function hide(overrideDelay?: number): void {
    clearTimeouts();
    const resolvedDelay = overrideDelay ?? hideDelay.value;

    if (resolvedDelay === 0) {
      if (open.value) {
        open.value = false;
      }
    } else {
      hideTimeoutId = setTimeout(() => {
        if (open.value) {
          open.value = false;
        }
      }, resolvedDelay);
    }
  }

  tryOnScopeDispose(clearTimeouts);

  // --- Rest Detection ---------------------------------------------------------

  let restCoords: PointerCoords | null = null;
  let restTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const isRestMsEnabled = computed<boolean>(() => showDelay.value === 0 && restMs.value > 0);

  function clearRestTimeout(): void {
    clearTimeout(restTimeoutId);
    restTimeoutId = undefined;
  }

  function onRestPointerMove(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e) || !isRestMsEnabled.value) return;
    if (!restCoords) return;
    const newCoords = { x: e.clientX, y: e.clientY };

    const dx = Math.abs(newCoords.x - restCoords.x);
    const dy = Math.abs(newCoords.y - restCoords.y);

    if (dx > POINTER_MOVE_THRESHOLD || dy > POINTER_MOVE_THRESHOLD) {
      restCoords = newCoords;
      clearRestTimeout();
      restTimeoutId = setTimeout(() => {
        show(0);
      }, restMs.value);
    }
  }

  function onRestPointerEnter(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e) || !isRestMsEnabled.value) return;
    restCoords = { x: e.clientX, y: e.clientY };
    clearRestTimeout();
    restTimeoutId = setTimeout(() => {
      show(0);
    }, restMs.value);
  }

  function onRestPointerLeave(): void {
    clearRestTimeout();
    restCoords = null;
  }

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!el || !isEnabled.value || !isRestMsEnabled.value) return;

    el.addEventListener("pointerenter", onRestPointerEnter);
    el.addEventListener("pointermove", onRestPointerMove);
    el.addEventListener("pointerleave", onRestPointerLeave);

    onWatcherCleanup(() => {
      clearRestTimeout();
      el.removeEventListener("pointerenter", onRestPointerEnter);
      el.removeEventListener("pointermove", onRestPointerMove);
      el.removeEventListener("pointerleave", onRestPointerLeave);
    });
  });

  tryOnScopeDispose(clearRestTimeout);

  // --- Safe Polygon Corridor --------------------------------------------------

  let polygonPointerMoveHandler: ((e: MouseEvent) => void) | null = null;
  let polygonTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const isSafePolygonEnabled = computed<boolean>(() =>
    Boolean(toValue(options.safePolygon ?? false)),
  );
  const safePolygonOptions = computed<SafePolygonOptions | undefined>(() => {
    const val = toValue(options.safePolygon ?? false);
    if (typeof val === "object" && val !== null) return val;
    if (val === true) return {};
    return undefined;
  });

  function clearPolygon(): void {
    if (polygonTimeoutId !== undefined) {
      clearTimeout(polygonTimeoutId);
      polygonTimeoutId = undefined;
    }
    if (polygonPointerMoveHandler) {
      document.removeEventListener("pointermove", polygonPointerMoveHandler);
      polygonPointerMoveHandler = null;
    }
    const polygonOpts = safePolygonOptions.value;
    if (polygonOpts?.onPolygonChange) {
      polygonOpts.onPolygonChange([]);
    }
  }

  tryOnScopeDispose(clearPolygon);

  // --- Pointer Event Listeners ------------------------------------------------

  function isSupportedPointer(e: PointerEvent): boolean {
    if (toValue(options.mouseOnly ?? false)) {
      return e.pointerType === "mouse";
    }
    return true;
  }

  function onAnchorPointerEnter(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e) || isRestMsEnabled.value) return;
    clearPolygon();
    show();
  }

  function onFloatingPointerEnter(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e)) return;
    clearTimeouts();
    clearPolygon();
  }

  function onPointerLeave(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e)) return;

    const { clientX, clientY } = e;
    const relatedTarget = e.relatedTarget as Node | null;

    // Spatial family awareness directly from the unified composite node
    if (node.contains(relatedTarget)) {
      return;
    }

    if (options.ignorePointerLeave?.(relatedTarget)) {
      return;
    }

    if (isSafePolygonEnabled.value) {
      clearPolygon();
      polygonTimeoutId = setTimeout(() => {
        polygonTimeoutId = undefined;
        clearPolygon();
        const refEl = anchorEl.value;
        const floatEl = refs.floatingEl.value;

        if (!refEl || !floatEl) {
          hide();
          return;
        }

        polygonPointerMoveHandler = safePolygon(safePolygonOptions.value)({
          x: clientX,
          y: clientY,
          elements: {
            domReference: refEl,
            floating: floatEl,
          },
          buffer: safePolygonOptions.value?.buffer ?? 1,
          onClose: () => {
            clearPolygon();
            hide();
          },
        });

        if (polygonPointerMoveHandler) {
          document.addEventListener("pointermove", polygonPointerMoveHandler);
        }
      }, 0);
    } else {
      // Standard logic for standalone usage
      hide();
    }
  }

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!el || !isEnabled.value) return;

    el.addEventListener("pointerenter", onAnchorPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);

    onWatcherCleanup(() => {
      clearTimeouts();
      el.removeEventListener("pointerenter", onAnchorPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeave);
    });
  });

  watchPostEffect(() => {
    const el = refs.floatingEl.value;
    if (!el || !isEnabled.value) return;

    el.addEventListener("pointerenter", onFloatingPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onFloatingPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeave);
    });
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Resolves open or close delay from a number or delay object configuration.
 */
function resolveDelay(delay: UseHoverDelay | undefined, type: "open" | "close"): number {
  if (typeof delay === "number") return delay;
  return delay?.[type] ?? 0;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

interface PointerCoords {
  x: number;
  y: number;
}

/**
 * Delay configuration for hover transitions.
 */
export type UseHoverDelay = number | { open?: number; close?: number };

/**
 * Options that configure hover trigger behavior.
 */
export interface UseHoverOptions {
  /**
   * Whether hover event listeners are enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Delay in milliseconds before showing/hiding the floating element.
   * Can be a single number for both open and close, or an object
   * specifying different delays.
   * @default 0
   */
  delay?: MaybeRefOrGetter<UseHoverDelay>;

  /**
   * Time in milliseconds the pointer must rest within the reference
   * element before opening the floating element.
   * This option is ignored if an open delay is specified.
   * @default 0
   */
  restMs?: MaybeRefOrGetter<number>;

  /**
   * Whether hover events should only trigger for mouse-like pointers (mouse, pen, stylus, etc.).
   * @default false
   */
  mouseOnly?: MaybeRefOrGetter<boolean>;

  /**
   * Enable safe polygon algorithm that keeps the
   * floating element open while the pointer traverses the corridor
   * region between the reference and floating elements.
   * - `true`: enabled with defaults
   * - `false | undefined`: disabled
   * - `SafePolygonOptions`: enabled with custom configuration (buffer, intent, change callback)
   * @default false
   */
  safePolygon?: MaybeRefOrGetter<boolean | SafePolygonOptions>;

  /**
   * Predicate to determine if a pointer leave should be ignored (e.g. to keep parent open when hovering a child branch).
   * @param target - The event related target (the element the pointer is entering)
   * @returns `true` if the pointer leave should be ignored
   */
  ignorePointerLeave?: (target: EventTarget | null) => boolean;
}

export type { SafePolygonOptions } from "./polygon";
