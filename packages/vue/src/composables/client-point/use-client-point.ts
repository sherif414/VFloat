import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch, watchEffect } from "vue";

import type { FloatingNode } from "@/composables/floating-node";
import { isMouseLikePointerType } from "@/shared/dom";
import { getDocument, getWindow } from "@/shared/env";

const FOLLOW_EVENTS = ["pointerdown", "pointermove", "pointerenter"] as const;
const STATIC_EVENTS = ["pointerdown", "pointerenter"] as const;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Replaces the anchor element with a virtual element that follows pointer coordinates.
 *
 * This composable listens to pointer interactions on a target element and updates
 * the floating node's anchor reference to a dynamic virtual element.
 *
 * @param node - The minimal floating node required to manage the anchor element ref and open state.
 * @param options - Configuration options for pointer-driven virtual anchor tracking.
 * @returns An object containing the readonly pointer coordinates.
 *
 * @example Basic usage
 * ```vue
 * <script setup lang="ts">
 * import { ref } from "vue";
 * import { useClientPoint, useFloatingNode, usePosition } from "v-float";
 *
 * const trackingAreaEl = ref<HTMLElement | null>(null);
 * const anchorEl = ref<HTMLElement | null>(null);
 * const floatingEl = ref<HTMLElement | null>(null);
 * const node = useFloatingNode({ anchorEl, floatingEl });
 * const { styles } = usePosition(node);
 *
 * useClientPoint(node, {
 *   trackingAreaEl,
 * });
 * </script>
 * ```
 */
export function useClientPoint(
  node: FloatingNode,
  options: UseClientPointOptions = {},
): UseClientPointReturn {
  // --- Shared Options & Environment --------------------------------------------

  const { trackingAreaEl } = options;

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const targetEl = computed(() => trackingAreaEl?.value ?? getDocument()?.documentElement ?? null);

  const externalX = computed(() => sanitizeCoordinate(toValue(options.x)));
  const externalY = computed(() => sanitizeCoordinate(toValue(options.y)));
  const isControlled = computed(() => externalX.value !== null && externalY.value !== null);

  // --- Pointer Coordinate Tracking ---------------------------------------------

  const { trackingMode = "follow" } = options;

  const internalCoordinates = ref<Coordinates>({ x: null, y: null });
  let triggerCoordinates: Coordinates | null = null;
  let lastKnownCoordinates: Coordinates | null = null;

  const coordinates = computed<Coordinates>(() => {
    if (isControlled.value) {
      return { x: externalX.value, y: externalY.value };
    }
    return internalCoordinates.value;
  });

  function resetTracking(): void {
    triggerCoordinates = null;
    lastKnownCoordinates = null;
    internalCoordinates.value = { x: null, y: null };
  }

  function handlePointer(event: PointerEvent): void {
    if (isControlled.value || !isEnabled.value) return;

    const coords: Coordinates = { x: event.clientX, y: event.clientY };
    lastKnownCoordinates = coords;

    if (trackingMode === "static") {
      if (event.type === "pointerdown") {
        triggerCoordinates = coords;
        if (node.open.value) {
          internalCoordinates.value = coords;
        }
      }
      return;
    }

    if (event.type === "pointermove") {
      if (node.open.value && isMouseLikePointerType(event.pointerType, true)) {
        internalCoordinates.value = coords;
      }
      return;
    }

    internalCoordinates.value = coords;
  }

  watch(
    node.open,
    (isOpen) => {
      if (isControlled.value) return;
      if (!isOpen) {
        resetTracking();
        return;
      }
      if (!isEnabled.value) return;

      if (trackingMode === "static") {
        const initial = triggerCoordinates ?? lastKnownCoordinates;
        if (initial) {
          internalCoordinates.value = { ...initial };
        }
      } else if (lastKnownCoordinates) {
        internalCoordinates.value = { ...lastKnownCoordinates };
      }
    },
    { immediate: true },
  );

  watchEffect((onCleanup) => {
    if (isControlled.value || !isEnabled.value) return;

    const target = targetEl.value;
    if (!target) return;

    const events = trackingMode === "follow" ? FOLLOW_EVENTS : STATIC_EVENTS;

    for (const event of events) {
      target.addEventListener(event, handlePointer);
    }

    onCleanup(() => {
      for (const event of events) {
        target.removeEventListener(event, handlePointer);
      }
    });
  });

  // --- Virtual Anchor Synthesis ------------------------------------------------

  watchEffect(() => {
    if (!isEnabled.value) {
      if (!node.open.value) {
        node.refs.anchorEl.value = null;
      }
      return;
    }

    const target = targetEl.value;
    const rect = resolveBoundingRect(target, coordinates.value);
    node.refs.anchorEl.value = {
      contextElement: target ?? undefined,
      getBoundingClientRect: () => rect,
      getClientRects: () => [rect],
    };
  });

  return {
    coordinates,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function sanitizeCoordinate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveBoundingRect(target: HTMLElement | null, coords: Coordinates): DOMRect {
  let fallbackX = 0;
  let fallbackY = 0;

  if (target) {
    try {
      const rect = target.getBoundingClientRect();
      fallbackX = rect.x;
      fallbackY = rect.y;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("useClientPoint: Failed to get element bounds", { element: target, error });
      }
    }
  }

  const x = coords.x ?? fallbackX;
  const y = coords.y ?? fallbackY;

  const RealmDOMRect =
    getWindow(target)?.DOMRect ?? (typeof DOMRect !== "undefined" ? DOMRect : null);
  if (RealmDOMRect?.fromRect) {
    return RealmDOMRect.fromRect({ x, y, width: 0, height: 0 });
  }

  return {
    x,
    y,
    width: 0,
    height: 0,
    top: y,
    right: x,
    bottom: y,
    left: x,
    toJSON: () => ({ x, y, width: 0, height: 0 }),
  } as DOMRect;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Minimal floating node shape required by `useClientPoint()`.
 */
export type UseClientPointContext = FloatingNode;

/**
 * Coordinates returned by `useClientPoint()`.
 */
export interface UseClientPointReturn {
  coordinates: Readonly<Ref<Coordinates>>;
}

/**
 * Viewport coordinates for a client point.
 */
export interface Coordinates {
  /**
   * Horizontal viewport coordinate.
   */
  x: number | null;

  /**
   * Vertical viewport coordinate.
   */
  y: number | null;
}

/**
 * Defines how the virtual anchor should react after opening.
 */
export type TrackingMode = "follow" | "static";

/**
 * Options for pointer-driven virtual anchor tracking.
 */
export interface UseClientPointOptions {
  /**
   * Element that receives pointer listeners and provides fallback geometry for the virtual anchor.
   *
   * Defaults to `document.documentElement` in browser environments.
   */
  trackingAreaEl?: Ref<HTMLElement | null>;

  /**
   * Enables or disables client-point behavior without removing the composable.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Optional externally controlled x coordinate.
   *
   * When both `x` and `y` resolve to non-null numbers, the composable enters
   * controlled mode: pointer event tracking is disabled and coordinates are
   * driven entirely by these external values. Providing only one axis has no
   * effect — both must be non-null to activate controlled mode.
   */
  x?: MaybeRefOrGetter<number | null>;

  /**
   * Optional externally controlled y coordinate.
   *
   * When both `x` and `y` resolve to non-null numbers, the composable enters
   * controlled mode: pointer event tracking is disabled and coordinates are
   * driven entirely by these external values. Providing only one axis has no
   * effect — both must be non-null to activate controlled mode.
   */
  y?: MaybeRefOrGetter<number | null>;

  /**
   * Chooses how the pointer position behaves after the floating element opens.
   * @default "follow"
   */
  trackingMode?: TrackingMode;
}
