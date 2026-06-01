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
 * const trackingArea = ref<HTMLElement | null>(null);
 * const context = useFloatingContext();
 * const position = usePosition(context);
 *
 * useClientPoint(context, {
 *   position,
 *   pointerTarget: trackingArea,
 * });
 * </script>
 * ```
 */
export function useClientPoint(
  context: UseClientPointContext,
  options: UseClientPointOptions,
): UseClientPointReturn {
  const {
    pointerTarget,
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
  const managedAnchorEl = ref<AnchorElement>(null);
  const preservedAnchorEl = ref<AnchorElement>(refs.anchorEl.value);

  const isEnabled = computed(() => toValue(enabledOption));
  const axis = computed(() => toValue(axisOption));
  const externalX = computed(() => sanitizeCoordinate(toValue(xOption)));
  const externalY = computed(() => sanitizeCoordinate(toValue(yOption)));
  const isExternallyControlled = computed(
    () => externalX.value !== null && externalY.value !== null,
  );

  const coordinates = computed<Coordinates>(() => {
    if (isExternallyControlled.value) {
      return {
        x: externalX.value,
        y: externalY.value,
      };
    }

    return internalCoordinates.value;
  });

  const constrainedCoordinates = computed<Coordinates>(() => {
    const coords = coordinates.value;
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
    if (!isExternallyControlled.value) {
      internalCoordinates.value = { x: null, y: null };
    }
  };

  const onPointerTargetEvent = (e: PointerEvent, type: PointerEventData["type"]) => {
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

  const onPointerTargetDown = (e: PointerEvent) => onPointerTargetEvent(e, "pointerdown");
  const onPointerTargetEnter = (e: PointerEvent) => onPointerTargetEvent(e, "pointerenter");
  const onPointerTargetMove = (e: PointerEvent) => onPointerTargetEvent(e, "pointermove");

  const handlers: Record<PointerEventData["type"], (e: PointerEvent) => void> = {
    pointerdown: onPointerTargetDown,
    pointerenter: onPointerTargetEnter,
    pointermove: onPointerTargetMove,
  };

  watch(
    () => refs.anchorEl.value,
    (anchorEl) => {
      if (anchorEl !== managedAnchorEl.value) {
        preservedAnchorEl.value = anchorEl;
      }
    },
    { immediate: true },
  );

  watch(
    [isEnabled, constrainedCoordinates, lockedCoordinates, axis, pointerTarget, preservedAnchorEl],
    () => {
      if (!isEnabled.value) {
        managedAnchorEl.value = null;
        refs.anchorEl.value = preservedAnchorEl.value;

        if (open.value) {
          void update?.();
        }

        return;
      }

      // Rebuild the virtual anchor whenever its geometry inputs change so
      // `useFloatingContext()` always positions against the latest pointer state.
      const virtualAnchorEl = virtualElementFactory.create({
        coordinates: constrainedCoordinates.value,
        referenceElement: pointerTarget.value,
        baselineCoordinates: lockedCoordinates.value,
        axis: axis.value,
      });
      managedAnchorEl.value = virtualAnchorEl;
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

    const target = pointerTarget.value;

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
    coordinates: readonly(constrainedCoordinates),
    updatePosition: (x: number, y: number) => setCoordinates(x, y),
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

const sanitizeCoordinate = (value: number | null | undefined): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
   * Element that should receive the pointer listeners used to drive the virtual anchor.
   */
  pointerTarget: Ref<HTMLElement | null>;

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
