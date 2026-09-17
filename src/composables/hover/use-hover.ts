import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  toValue,
  watch,
  watchPostEffect,
} from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { getAnchorElement } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { type SafePolygonOptions, safePolygon } from "./polygon";

/**
 * Minimum movement threshold in pixels to reset the rest detection timer.
 */
const POINTER_MOVE_THRESHOLD = 4;

/**
 * Fallback ceiling delay in milliseconds to force open the floating element
 * even if the pointer continues moving within the anchor.
 */
const REST_FALLBACK_MS = 1000;

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
  const showDelay = computed<number>(() => resolveDelay(toValue(options.delay), "open"));
  const hideDelay = computed<number>(() => resolveDelay(toValue(options.delay), "close"));
  const restMs = computed(() => toValue(options.restMs ?? 0));
  const fallbackDelay = computed<number>(() => Math.max(showDelay.value, REST_FALLBACK_MS));
  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));

  // --- Interaction Facts & Transitions ----------------------------------------

  let pointerInsideAnchor = false;
  let pointerInsideFloating = false;
  let restSatisfied = false;
  let safePolygonActive = false;
  let dismissedWhileInside = false;

  let transitionId = 0;

  function canOpen(): boolean {
    return (
      pointerInsideFloating ||
      (pointerInsideAnchor && !dismissedWhileInside && (restMs.value === 0 || restSatisfied))
    );
  }

  function canClose(): boolean {
    return !pointerInsideAnchor && !pointerInsideFloating && !safePolygonActive;
  }

  function scheduleOpen(delay: number): void {
    const id = ++transitionId;
    if (delay === 0) {
      if (!open.value && anchorEl.value?.isConnected) {
        open.value = true;
      }
      return;
    }
    setTimeout(() => {
      if (id !== transitionId) return;
      if (!canOpen()) return;
      if (!open.value && anchorEl.value?.isConnected) {
        open.value = true;
      }
    }, delay);
  }

  function scheduleClose(delay: number): void {
    const id = ++transitionId;
    if (delay === 0) {
      if (open.value) {
        open.value = false;
      }
      return;
    }
    setTimeout(() => {
      if (id !== transitionId) return;
      if (!canClose()) return;
      if (open.value) {
        open.value = false;
      }
    }, delay);
  }

  function reconcile(): void {
    if (!open.value && canOpen()) {
      const delay = restMs.value > 0 ? 0 : showDelay.value;
      scheduleOpen(delay);
    } else if (open.value && canClose()) {
      scheduleClose(hideDelay.value);
    } else if (open.value && !canClose()) {
      // In-flight close cancelled because surface is protected or re-entered
      transitionId++;
    } else if (!open.value && !canOpen()) {
      // In-flight open cancelled because pointer left
      transitionId++;
    }
  }

  // Sync external close (e.g. Escape key / outside click while cursor is on anchor)
  watch(open, (isOpen) => {
    if (!isOpen && pointerInsideAnchor) {
      dismissedWhileInside = true;
      cancelRestDetection();
      transitionId++;
    }
  });

  // --- Rest Detection ---------------------------------------------------------

  let restCoords: PointerCoords | null = null;
  let restTimerId = 0;
  let fallbackTimerId = 0;

  function startRestDetection(e: PointerEvent): void {
    restCoords = { x: e.clientX, y: e.clientY };
    restSatisfied = false;
    const currentRestId = ++restTimerId;
    const currentFallbackId = ++fallbackTimerId;

    setTimeout(() => {
      if (currentRestId !== restTimerId) return;
      if (!pointerInsideAnchor) return;
      restSatisfied = true;
      reconcile();
    }, restMs.value);

    setTimeout(() => {
      if (currentFallbackId !== fallbackTimerId) return;
      if (!pointerInsideAnchor) return;
      restSatisfied = true;
      reconcile();
    }, fallbackDelay.value);
  }

  function cancelRestDetection(): void {
    restTimerId++;
    fallbackTimerId++;
    restCoords = null;
    restSatisfied = false;
  }

  function onRestPointerMove(e: PointerEvent): void {
    if (
      !isEnabled.value ||
      !isSupportedPointer(e) ||
      restMs.value === 0 ||
      !restCoords ||
      restSatisfied ||
      open.value
    ) {
      return;
    }

    const dx = Math.abs(e.clientX - restCoords.x);
    const dy = Math.abs(e.clientY - restCoords.y);

    if (dx > POINTER_MOVE_THRESHOLD || dy > POINTER_MOVE_THRESHOLD) {
      restCoords = { x: e.clientX, y: e.clientY };
      const currentRestId = ++restTimerId;
      setTimeout(() => {
        if (currentRestId !== restTimerId) return;
        if (!pointerInsideAnchor) return;
        restSatisfied = true;
        reconcile();
      }, restMs.value);
    }
  }

  // --- Safe Polygon Corridor --------------------------------------------------

  let polygonPointerMoveHandler: ((e: MouseEvent) => void) | null = null;
  let polygonTimerId = 0;

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
    polygonTimerId++;
    safePolygonActive = false;
    if (polygonPointerMoveHandler) {
      document.removeEventListener("pointermove", polygonPointerMoveHandler);
      polygonPointerMoveHandler = null;
    }
    const polygonOpts = safePolygonOptions.value;
    if (polygonOpts?.onPolygonChange) {
      polygonOpts.onPolygonChange([]);
    }
  }

  function startSafePolygon(e: PointerEvent): void {
    clearPolygon();
    safePolygonActive = true;
    const currentPolyId = ++polygonTimerId;

    const refEl = anchorEl.value;
    const floatEl = refs.floatingEl.value;
    if (!refEl || !floatEl) {
      safePolygonActive = false;
      return;
    }

    const { clientX, clientY } = e;

    setTimeout(() => {
      if (currentPolyId !== polygonTimerId) return;
      if (!safePolygonActive) return;

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
          reconcile();
        },
      });

      if (polygonPointerMoveHandler) {
        document.addEventListener("pointermove", polygonPointerMoveHandler);
      }
    }, 0);
  }

  // --- Pointer Event Listeners ------------------------------------------------

  function isSupportedPointer(e: PointerEvent): boolean {
    if (e.pointerType === "touch") {
      return false;
    }

    if (toValue(options.mouseOnly ?? false)) {
      return e.pointerType === "mouse";
    }
    return true;
  }

  function onAnchorPointerEnter(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e)) return;
    clearPolygon();
    pointerInsideAnchor = true;
    if (restMs.value > 0) {
      startRestDetection(e);
    } else {
      restSatisfied = true;
    }
    reconcile();
  }

  function onAnchorPointerLeave(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e)) return;

    pointerInsideAnchor = false;
    cancelRestDetection();
    dismissedWhileInside = false;

    const relatedTarget = e.relatedTarget as Node | null;
    if (node.contains(relatedTarget)) {
      return;
    }

    if (options.ignorePointerLeave?.(relatedTarget)) {
      return;
    }

    if (open.value && isSafePolygonEnabled.value) {
      startSafePolygon(e);
    }
    reconcile();
  }

  function onFloatingPointerEnter(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e)) return;
    clearPolygon();
    pointerInsideFloating = true;
    reconcile();
  }

  function onFloatingPointerLeave(e: PointerEvent): void {
    if (!isEnabled.value || !isSupportedPointer(e)) return;

    pointerInsideFloating = false;

    const relatedTarget = e.relatedTarget as Node | null;
    if (node.contains(relatedTarget)) {
      return;
    }

    if (options.ignorePointerLeave?.(relatedTarget)) {
      return;
    }

    if (open.value && isSafePolygonEnabled.value) {
      startSafePolygon(e);
    }
    reconcile();
  }

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!el || !isEnabled.value) return;

    el.addEventListener("pointerenter", onAnchorPointerEnter);
    el.addEventListener("pointermove", onRestPointerMove);
    el.addEventListener("pointerleave", onAnchorPointerLeave);
    el.addEventListener("pointercancel", onAnchorPointerLeave);

    onWatcherCleanup(() => {
      cancelRestDetection();
      clearPolygon();
      pointerInsideAnchor = false;
      transitionId++;
      el.removeEventListener("pointerenter", onAnchorPointerEnter);
      el.removeEventListener("pointermove", onRestPointerMove);
      el.removeEventListener("pointerleave", onAnchorPointerLeave);
      el.removeEventListener("pointercancel", onAnchorPointerLeave);
    });
  });

  watchPostEffect(() => {
    const el = refs.floatingEl.value;
    if (!el || !isEnabled.value) return;

    el.addEventListener("pointerenter", onFloatingPointerEnter);
    el.addEventListener("pointerleave", onFloatingPointerLeave);
    el.addEventListener("pointercancel", onFloatingPointerLeave);

    onWatcherCleanup(() => {
      clearPolygon();
      pointerInsideFloating = false;
      el.removeEventListener("pointerenter", onFloatingPointerEnter);
      el.removeEventListener("pointerleave", onFloatingPointerLeave);
      el.removeEventListener("pointercancel", onFloatingPointerLeave);
    });
  });

  tryOnScopeDispose(() => {
    transitionId++;
    cancelRestDetection();
    clearPolygon();
    pointerInsideAnchor = false;
    pointerInsideFloating = false;
    dismissedWhileInside = false;
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
   * @default 0
   */
  restMs?: MaybeRefOrGetter<number>;

  /**
   * Whether hover events should only trigger for physical mouse devices (ignoring pen/stylus).
   * Note: Touch pointers are always ignored regardless of this option.
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
