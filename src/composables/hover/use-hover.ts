import type { Coords } from "@floating-ui/dom";
import { computed, type MaybeRef, onWatcherCleanup, toValue, watchPostEffect } from "vue";
import type { FloatingContext } from "@/composables/floating-context";
import type { FloatingPosition } from "@/composables/position";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { type SafePolygonOptions, safePolygon } from "./polygon";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when hovering the reference element
 * with enhanced behaviors like delayed open/close, rest detection, and custom
 * exit handling.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for hover behavior
 *
 * @example Basic usage
 * ```ts
 * const context = useFloatingContext(...)
 * useHover(context, {
 *   delay: { open: 100, close: 300 },
 *   restMs: 150
 * })
 * ```
 */
export function useHover(context: FloatingContext, options: UseHoverOptions = {}): void {
  const { open, setOpen } = context.state;
  const { anchorEl, floatingEl } = context.refs;
  const {
    enabled: enabledOption = true,
    delay: delayOption = 0,
    restMs: restMsOption = 0,
    mouseOnly: mouseOnlyOption = false,
    safePolygon: safePolygonOption = false,
    position,
    ignorePointerLeave: ignorePointerLeaveOption,
  } = options;

  const enabled = computed(() => toValue(enabledOption));
  const restMs = computed(() => toValue(restMsOption));
  const anchorDomEl = computed(() => {
    const el = anchorEl.value;
    if (!el || el instanceof HTMLElement) return el;
    return (el.contextElement as HTMLElement) ?? null;
  });

  const { hide, show, showDelay, clearTimeouts } = useDelayedOpen(
    (event?: Event) => {
      if (!open.value) {
        setOpen(true, "hover", event);
      }
    },
    (event?: Event) => {
      if (open.value) {
        setOpen(false, "hover", event);
      }
    },
    { delay: delayOption },
  );

  //=====================================================================================
  // Rest Detection
  //=====================================================================================

  let restCoords: Coords | null = null;
  let restTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const isRestMsEnabled = computed<boolean>(() => showDelay.value === 0 && restMs.value > 0);

  function onPointerMove(e: PointerEvent): void {
    if (!enabled.value || !isSupportedPointerType(e) || !isRestMsEnabled.value) return;
    if (!restCoords) return;
    const newCoords = { x: e.clientX, y: e.clientY };

    const dx = Math.abs(newCoords.x - restCoords.x);
    const dy = Math.abs(newCoords.y - restCoords.y);

    if (dx > POINTER_MOVE_THRESHOLD || dy > POINTER_MOVE_THRESHOLD) {
      restCoords = newCoords;
      clearTimeout(restTimeoutId);
      restTimeoutId = setTimeout(() => {
        show(0, e);
      }, restMs.value);
    }
  }

  function onPointerEnter(e: PointerEvent) {
    if (!enabled.value || !isSupportedPointerType(e) || !isRestMsEnabled.value) return;
    restCoords = { x: e.clientX, y: e.clientY };
    restTimeoutId = setTimeout(() => {
      show(0, e);
    }, restMs.value);
  }

  function onPointerLeave() {
    clearTimeout(restTimeoutId);
    restCoords = null;
  }

  watchPostEffect(() => {
    const el = anchorDomEl.value;
    if (!el || !enabled.value || !isRestMsEnabled.value) return;
    el.addEventListener("pointerenter", onPointerEnter);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onPointerEnter);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
    });
  });

  tryOnScopeDispose(() => {
    clearTimeout(restTimeoutId);
  });

  //=====================================================================================
  // General Event Handlers
  //=====================================================================================

  function isSupportedPointerType(e: PointerEvent): boolean {
    if (toValue(mouseOnlyOption)) {
      // When mouseOnly is true, only accept actual mouse events
      return e.pointerType === "mouse";
    }
    // When mouseOnly is false, accept mouse, pen, and touch
    return true;
  }

  function onAnchorPointerEnter(e: PointerEvent): void {
    if (!enabled.value || !isSupportedPointerType(e) || isRestMsEnabled.value) return;
    clearPolygon();
    show(undefined, e);
  }

  function onFloatingPointerEnter(e: PointerEvent): void {
    if (!enabled.value || !isSupportedPointerType(e)) return;
    clearTimeouts();
    clearPolygon();
  }

  let polygonPointerMoveHandler: ((e: MouseEvent) => void) | null = null;

  function clearPolygon() {
    if (polygonPointerMoveHandler) {
      document.removeEventListener("pointermove", polygonPointerMoveHandler);
      polygonPointerMoveHandler = null;
    }
    // Clear the polygon visualization
    const polygonOptions = safePolygonOptions.value;
    if (polygonOptions?.onPolygonChange) {
      polygonOptions.onPolygonChange([]);
    }
  }

  const isSafePolygonEnabled = computed(() => !!toValue(safePolygonOption));
  const safePolygonOptions = computed<SafePolygonOptions | undefined>(() => {
    const val = toValue(safePolygonOption);
    if (typeof val === "object" && val) return val;
    if (val === true) return {};
    return undefined;
  });

  function onPointerLeaveHandler(e: PointerEvent): void {
    if (!enabled.value || !isSupportedPointerType(e)) return;

    const { clientX, clientY } = e;
    const relatedTarget = e.relatedTarget as Node | null;

    if (ignorePointerLeaveOption && ignorePointerLeaveOption(relatedTarget)) {
      return;
    }

    if (isSafePolygonEnabled.value) {
      setTimeout(() => {
        clearPolygon();
        const refEl = anchorDomEl.value;
        const floatEl = floatingEl.value;

        if (!refEl || !floatEl) {
          hide(undefined, e);
          return;
        }

        polygonPointerMoveHandler = safePolygon(safePolygonOptions.value)({
          x: clientX,
          y: clientY,
          placement: position?.placement.value ?? "bottom",
          elements: {
            domReference: refEl,
            floating: floatEl,
          },
          buffer: safePolygonOptions.value?.buffer ?? 1,
          onClose: () => {
            clearPolygon();
            hide(undefined);
          },
        });

        if (polygonPointerMoveHandler) {
          document.addEventListener("pointermove", polygonPointerMoveHandler);
        }
      }, 0);
    } else {
      // Standard logic for standalone usage
      if (floatingEl.value?.contains(relatedTarget)) {
        return; // Pointer moved to floating element - don't hide
      }

      hide(undefined, e);
    }
  }

  //=====================================================================================
  // Wiring
  //=====================================================================================

  watchPostEffect(() => {
    const el = anchorDomEl.value;
    if (!el || !enabled.value) return;

    el.addEventListener("pointerenter", onAnchorPointerEnter);
    el.addEventListener("pointerleave", onPointerLeaveHandler);

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onAnchorPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeaveHandler);
    });
  });

  watchPostEffect(() => {
    const el = floatingEl.value;
    if (!el || !enabled.value) return;

    el.addEventListener("pointerenter", onFloatingPointerEnter);
    el.addEventListener("pointerleave", onPointerLeaveHandler);

    onWatcherCleanup(() => {
      el.removeEventListener("pointerenter", onFloatingPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeaveHandler);
    });
  });

  tryOnScopeDispose(() => {
    clearPolygon();
  });
}
//=======================================================================================
// 📌 Helpers
//=======================================================================================

const POINTER_MOVE_THRESHOLD = 10; // Threshold in pixels for movement detection

function useDelayedOpen(
  show: (event?: Event) => void,
  hide: (event?: Event) => void,
  options: UseDelayedOpenOptions,
) {
  const { delay } = options;

  const showDelay = computed<number>(() => {
    const delayVal = toValue(delay);
    return (typeof delayVal === "number" ? delayVal : delayVal.open) ?? 0;
  });
  const hideDelay = computed<number>(() => {
    const delayVal = toValue(delay);
    return (typeof delayVal === "number" ? delayVal : delayVal.close) ?? 0;
  });

  let showTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let hideTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const clearTimeouts = () => {
    clearTimeout(showTimeoutId);
    clearTimeout(hideTimeoutId);
  };

  tryOnScopeDispose(clearTimeouts);

  return {
    show: (overrideDelay?: number, event?: Event) => {
      clearTimeouts();
      const resolvedDelay = overrideDelay ?? showDelay.value;

      if (resolvedDelay === 0) show(event);
      else showTimeoutId = setTimeout(() => show(event), resolvedDelay);
    },

    hide: (overrideDelay?: number, event?: Event) => {
      clearTimeouts();
      const resolvedDelay = overrideDelay ?? hideDelay.value;

      if (resolvedDelay === 0) hide(event);
      else hideTimeoutId = setTimeout(() => hide(event), resolvedDelay);
    },

    showDelay,
    hideDelay,
    clearTimeouts,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseHoverOptions {
  /**
   * Whether hover event listeners are enabled.
   * @default true
   */
  enabled?: MaybeRef<boolean>;

  /**
   * Delay in milliseconds before showing/hiding the floating element.
   * Can be a single number for both open and close, or an object
   * specifying different delays.
   * @default 0
   */
  delay?: MaybeRef<number | { open?: number; close?: number }>;

  /**
   * Time in milliseconds the pointer must rest within the reference
   * element before opening the floating element.
   * this option is ignored if an open delay is specified.
   * @default 0
   */
  restMs?: MaybeRef<number>;

  /**
   * Whether hover events should only trigger for mouse like pointers (mouse, pen ,stylus ..etc).
   * @default false
   */
  mouseOnly?: MaybeRef<boolean>;

  /**
   * Enable floating-ui style safe polygon algorithm that keeps the
   * floating element open while the pointer traverses the rectangle/triangle
   * region between the reference and floating elements.
   * – `true` → enabled with defaults
   * – `false | undefined` → disabled (current behaviour)
   * – `SafePolygonOptions` → enabled with custom buffer
   */
  safePolygon?: MaybeRef<boolean | SafePolygonOptions>;

  /**
   * Positioning data used by safe-polygon geometry.
   */
  position?: Pick<FloatingPosition, "placement">;

  /**
   * Predicate to determine if a pointer leave should be ignored (e.g. to keep parent open when hovering a child branch).
   * @param target - The event related target (the element the pointer is entering)
   * @returns true if the pointer leave should be ignored
   */
  ignorePointerLeave?: (target: EventTarget | null) => boolean;
}

interface UseDelayedOpenOptions {
  delay: MaybeRef<number | { open?: number; close?: number }>;
}
