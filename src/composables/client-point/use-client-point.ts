import {
  computed,
  type MaybeRefOrGetter,
  type Ref,
  readonly,
  ref,
  toValue,
  watch,
  watchEffect,
} from "vue";
import { FollowTracker, StaticTracker, TrackingStrategy } from "./tracking-strategies";
import type { AxisConstraint, Coordinates, PointerEventData, TrackingMode } from "./types";
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
  const refs = context.refs;
  const update = positionOption?.update;

  const virtualElementFactory = new VirtualElementFactory();
  const internalCoordinates = ref<Coordinates>({ x: null, y: null });
  const lockedCoordinates = ref<Coordinates | null>(null);

  const isEnabled = computed(() => toValue(enabledOption));
  const axis = computed(() => toValue(axisOption));
  const externalX = computed(() => sanitizeCoordinate(toValue(xOption)));
  const externalY = computed(() => sanitizeCoordinate(toValue(yOption)));
  const trackingTargetEl = computed(
    () => trackingTargetOption?.value ?? getDefaultTrackingTarget(),
  );
  const isExternallyControlled = computed(
    () => externalX.value !== null && externalY.value !== null,
  );

  const coordinates = computed<Coordinates>(() => {
    const coords = isExternallyControlled.value
      ? {
          x: externalX.value,
          y: externalY.value,
        }
      : internalCoordinates.value;

    const currentAxis = axis.value;

    switch (currentAxis) {
      case "x":
        return { x: coords.x, y: null };
      case "y":
        return { x: null, y: coords.y };
      case "both":
        return coords;
    }
  });

  const trackingStrategy = createTrackingStrategy(trackingModeOption);

  const setCoordinates = (x: number | null, y: number | null) => {
    if (isExternallyControlled.value) {
      return;
    }

    internalCoordinates.value = {
      x: sanitizeCoordinate(x),
      y: sanitizeCoordinate(y),
    };
  };

  const resetCoordinates = () => {
    setCoordinates(null, null);
  };

  const updateCoordinates = (e: PointerEvent, type: PointerEventData["type"]) => {
    const nextCoordinates = trackingStrategy.process(
      {
        type,
        coordinates: { x: e.clientX, y: e.clientY },
        originalEvent: e,
      },
      { isOpen: open.value },
    );

    if (nextCoordinates) {
      setCoordinates(nextCoordinates.x, nextCoordinates.y);
    }
  };

  const onPointerTargetDown = (e: PointerEvent) => updateCoordinates(e, "pointerdown");
  const onPointerTargetEnter = (e: PointerEvent) => updateCoordinates(e, "pointerenter");
  const onPointerTargetMove = (e: PointerEvent) => updateCoordinates(e, "pointermove");

  const handlers = {
    pointerdown: onPointerTargetDown,
    pointerenter: onPointerTargetEnter,
    pointermove: onPointerTargetMove,
  };

  watch(
    [isEnabled, coordinates, lockedCoordinates, axis, trackingTargetEl],
    () => {
      if (!isEnabled.value) {
        refs.anchorEl.value = null;
        return;
      }

      const virtualAnchorEl = virtualElementFactory.create({
        coordinates: coordinates.value,
        trackingTarget: trackingTargetEl.value,
        baselineCoordinates: lockedCoordinates.value,
        axis: axis.value,
      });
      refs.anchorEl.value = virtualAnchorEl;

      if (open.value) {
        void update?.();
      }
    },
    { immediate: true },
  );

  watch(open, (isOpen) => {
    if (isExternallyControlled.value) {
      return;
    }

    if (!isEnabled.value) {
      if (!isOpen) {
        trackingStrategy.onClose();
        resetCoordinates();
        lockedCoordinates.value = null;
      }

      return;
    }

    if (isOpen) {
      // Some tracking modes want the opening position to "lock in" so the
      // floating element does not jump as later pointer events arrive.
      const openingCoordinates = trackingStrategy.getCoordinatesForOpening();

      if (openingCoordinates) {
        setCoordinates(openingCoordinates.x, openingCoordinates.y);
        lockedCoordinates.value = { ...openingCoordinates };
      } else {
        lockedCoordinates.value = { ...internalCoordinates.value };
      }

      return;
    }

    trackingStrategy.onClose();
    resetCoordinates();
    lockedCoordinates.value = null;
  });

  watchEffect((onCleanup) => {
    if (isExternallyControlled.value || !isEnabled.value) {
      return;
    }

    const target = trackingTargetEl.value;

    if (!target) {
      return;
    }

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
    coordinates: readonly(coordinates),
    updatePosition: (x: number, y: number) => setCoordinates(x, y),
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

const sanitizeCoordinate = (value: number | null | undefined): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getDefaultTrackingTarget = (): HTMLElement | null => {
  return typeof document === "undefined" ? null : document.documentElement;
};

function createTrackingStrategy(trackingMode: TrackingMode): TrackingStrategy {
  return trackingMode === "follow" ? new FollowTracker() : new StaticTracker();
}

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
