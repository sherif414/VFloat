import { computed, type MaybeRefOrGetter, type Ref, toValue, watch, watchEffect } from "vue";
import { createClientPointState } from "./client-point-state";
import { FollowTracker, StaticTracker } from "./tracking-strategies";
import type { PointerEventData, TrackingMode } from "./types";
import { VirtualElementFactory } from "./virtual-element-factory";
import type { AnchorElement, FloatingContext } from "@/composables/floating-context";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Replaces the anchor element with a virtual element that follows pointer coordinates.
 *
 * This composable listens to pointer interactions on a target element and updates
 * the floating context's anchor reference to a dynamic virtual element.
 *
 * @param context - The minimal floating context required to manage the anchor element ref and open state.
 * @param options - Configuration options for pointer-driven virtual anchor tracking.
 * @returns An object containing the readonly pointer coordinates.
 *
 * @example Basic usage
 * ```vue
 * <script setup lang="ts">
 * import { ref } from "vue";
 * import { useClientPoint, useFloatingContext, usePosition } from "v-float";
 *
 * const trackingAreaEl = ref<HTMLElement | null>(null);
 * const anchorEl = ref<HTMLElement | null>(null);
 * const floatingEl = ref<HTMLElement | null>(null);
 * const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
 * const { styles } = usePosition(context);
 *
 * useClientPoint(context, {
 *   trackingAreaEl,
 * });
 * </script>
 * ```
 */
export function useClientPoint(
  context: UseClientPointContext,
  options: UseClientPointOptions,
): UseClientPointReturn {
  const {
    trackingAreaEl: trackingAreaElOption,
    enabled: enabledOption = true,
    x: xOption = null,
    y: yOption = null,
    trackingMode: trackingModeOption = "follow",
  } = options;

  const { open } = context.state;

  const state = createClientPointState({
    x: xOption,
    y: yOption,
  });
  const trackingStrategy =
    trackingModeOption === "follow" ? new FollowTracker() : new StaticTracker();

  const isEnabled = computed(() => toValue(enabledOption));
  const trackingAreaEl = computed(() => trackingAreaElOption?.value ?? getDefaultTrackingArea());

  //=====================================================================================
  // Session State
  //=====================================================================================

  function clearTrackingSession(): void {
    trackingStrategy.onClose();
    state.resetCoordinates();
    state.clearInitialCoordinates();
  }

  watch(open, (isOpen) => {
    if (state.isControlled.value) return;
    if (!isOpen) {
      clearTrackingSession();
      return;
    }
    if (!isEnabled.value) return;
    state.captureInitialCoordinates(trackingStrategy.getCoordinatesForOpening());
  });

  //=====================================================================================
  // Wiring
  //=====================================================================================

  const virtualElementFactory = new VirtualElementFactory();

  watchEffect(() => {
    if (!isEnabled.value) return;

    context.refs.anchorEl.value = virtualElementFactory.create({
      coordinates: state.coordinates.value,
      trackingTarget: trackingAreaEl.value,
      baselineCoordinates: state.initialCoordinates.value,
    });
  });

  function onPointerTargetEvent(e: PointerEvent, type: PointerEventData["type"]): void {
    const nextCoordinates = trackingStrategy.process(
      {
        type,
        coordinates: { x: e.clientX, y: e.clientY },
        originalEvent: e,
      },
      { isOpen: open.value },
    );

    if (nextCoordinates) {
      state.setCoordinates(nextCoordinates.x, nextCoordinates.y);
    }
  }

  const handlers: Record<PointerEventData["type"], (e: PointerEvent) => void> = {
    pointerdown: (e: PointerEvent) => onPointerTargetEvent(e, "pointerdown"),
    pointerenter: (e: PointerEvent) => onPointerTargetEvent(e, "pointerenter"),
    pointermove: (e: PointerEvent) => onPointerTargetEvent(e, "pointermove"),
  };

  watchEffect((onCleanup) => {
    if (state.isControlled.value || !isEnabled.value) return;

    const target = trackingAreaEl.value;
    if (!target) return;

    const requiredEvents = trackingStrategy.getRequiredEvents();

    for (const eventType of requiredEvents) {
      target.addEventListener(eventType, handlers[eventType]);
    }

    onCleanup(() => {
      for (const eventType of requiredEvents) {
        target.removeEventListener(eventType, handlers[eventType]);
      }
    });
  });

  return {
    coordinates: state.coordinates,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

const getDefaultTrackingArea = (): HTMLElement | null => {
  return typeof document === "undefined" ? null : document.documentElement;
};

//=======================================================================================
// 📌 Types
//=======================================================================================

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
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Optional externally controlled x coordinate.
   */
  x?: MaybeRefOrGetter<number | null>;

  /**
   * Optional externally controlled y coordinate.
   */
  y?: MaybeRefOrGetter<number | null>;

  /**
   * Chooses how the pointer position behaves after the floating element opens.
   */
  trackingMode?: TrackingMode;
}

/**
 * Coordinates returned by `useClientPoint()`.
 */
export interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>;
}

/**
 * Minimal floating context shape required by `useClientPoint()`.
 */
export interface UseClientPointContext {
  refs: {
    anchorEl: Ref<AnchorElement>;
  };
  state: FloatingContext["state"];
}

export type { Coordinates, TrackingMode } from "./types";
