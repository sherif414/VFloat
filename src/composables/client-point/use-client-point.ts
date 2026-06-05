import { computed, type MaybeRefOrGetter, type Ref, toValue, watch } from "vue";
import { useClientPointAnchorController } from "./client-point-anchor-controller";
import { createClientPointState } from "./client-point-state";
import {
  createTrackingStrategy,
  useClientPointTrackingController,
} from "./client-point-tracking-controller";
import { FollowTracker, StaticTracker, TrackingStrategy } from "./tracking-strategies";
import type { AxisConstraint, TrackingMode } from "./types";
import { VirtualElementFactory } from "./virtual-element-factory";
import type { AnchorElement, FloatingContext } from "@/composables/floating-context";
import type { FloatingPosition } from "@/composables/position";

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
 * @returns An object containing the readonly pointer coordinates and a manual position updater.
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
 * const position = usePosition(context);
 *
 * useClientPoint(context, {
 *   position,
 *   trackingTarget: trackingAreaEl,
 * });
 * </script>
 * ```
 */
export function useClientPoint(
  context: UseClientPointContext,
  options: UseClientPointOptions,
): UseClientPointReturn {
  const {
    trackingTarget: trackingTargetOption,
    enabled: enabledOption = true,
    axis: axisOption = "both",
    x: xOption = null,
    y: yOption = null,
    trackingMode: trackingModeOption = "follow",
    position: positionOption,
  } = options;

  const { open } = context.state;

  const clientPointState = createClientPointState({
    axis: axisOption,
    x: xOption,
    y: yOption,
  });
  const trackingStrategy = createTrackingStrategy(trackingModeOption);

  const isEnabled = computed(() => toValue(enabledOption));
  const trackingTargetEl = computed(
    () => trackingTargetOption?.value ?? getDefaultTrackingTarget(),
  );

  //=====================================================================================
  // Session State
  //=====================================================================================

  function clearTrackingSession(): void {
    trackingStrategy.onClose();
    clientPointState.resetCoordinates();
    clientPointState.clearOpeningBaselineCoordinates();
  }

  watch(open, (isOpen) => {
    if (clientPointState.isControlled.value) {
      return;
    }

    if (!isEnabled.value && !isOpen) {
      clearTrackingSession();
      return;
    }

    if (isOpen) {
      clientPointState.captureOpeningBaselineCoordinates(
        trackingStrategy.getCoordinatesForOpening(),
      );
      return;
    }

    clearTrackingSession();
  });

  //=====================================================================================
  // Wiring
  //=====================================================================================

  useClientPointAnchorController({
    refs: context.refs,
    isEnabled,
    open,
    coordinates: clientPointState.coordinates,
    openingBaselineCoordinates: clientPointState.openingBaselineCoordinates,
    axis: clientPointState.axis,
    trackingTargetEl,
    update: positionOption?.update,
  });

  useClientPointTrackingController({
    isEnabled,
    isControlled: clientPointState.isControlled,
    open,
    trackingTargetEl,
    trackingStrategy,
    setCoordinates: clientPointState.setCoordinates,
  });

  return {
    coordinates: clientPointState.coordinates,
    updatePosition: clientPointState.updatePosition,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

const getDefaultTrackingTarget = (): HTMLElement | null => {
  return typeof document === "undefined" ? null : document.documentElement;
};

export { FollowTracker, StaticTracker, TrackingStrategy, VirtualElementFactory };

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
  trackingTarget?: Ref<HTMLElement | null>;

  /**
   * Enables or disables client-point behavior without removing the composable.
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Restricts tracking to the x axis, y axis, or both.
   */
  axis?: MaybeRefOrGetter<AxisConstraint>;

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

  /**
   * Optional positioning result to refresh when the virtual anchor changes.
   */
  position?: Pick<FloatingPosition, "update">;
}

/**
 * Coordinates and updater returned by `useClientPoint()`.
 */
export interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>;
  updatePosition: (x: number, y: number) => void;
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

export type { AxisConstraint, Coordinates, TrackingMode } from "./types";
