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
import { FollowTracker, StaticTracker, TrackingStrategy } from "./client-point/tracking-strategies";
import type {
  AxisConstraint,
  Coordinates,
  PointerEventData,
  TrackingMode,
} from "./client-point/types";
import { VirtualElementFactory } from "./client-point/virtual-element-factory";
import type { AnchorElement, FloatingContext } from "./floating-context";

const sanitizeCoordinate = (value: number | null | undefined): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export type { AxisConstraint, Coordinates, TrackingMode } from "./client-point/types";
export { FollowTracker, StaticTracker, TrackingStrategy, VirtualElementFactory };

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
  position?: Pick<FloatingContext["position"], "update">;
}

/**
 * Replaces the anchor element with a virtual element that follows pointer coordinates.
 */
export function useClientPoint(
  context: UseClientPointContext,
  options: UseClientPointOptions,
): UseClientPointReturn {
  const { pointerTarget } = options;
  const { open } = context.state;
  const refs = context.refs;
  const update = context.position?.update;

  const virtualElementFactory = new VirtualElementFactory();
  const internalCoordinates = ref<Coordinates>({ x: null, y: null });
  const lockedCoordinates = ref<Coordinates | null>(null);
  const managedAnchorEl = ref<AnchorElement>(null);
  const preservedAnchorEl = ref<AnchorElement>(refs.anchorEl.value);

  const axis = computed(() => toValue(options.axis ?? "both"));
  const enabled = computed(() => toValue(options.enabled ?? true));
  const externalX = computed(() => sanitizeCoordinate(toValue(options.x ?? null)));
  const externalY = computed(() => sanitizeCoordinate(toValue(options.y ?? null)));
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

  const trackingStrategy = createTrackingStrategy(options.trackingMode ?? "follow");

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

  const processPointerEvent = (event: PointerEvent, type: PointerEventData["type"]) => {
    const nextCoordinates = trackingStrategy.process(
      {
        type,
        coordinates: { x: event.clientX, y: event.clientY },
        originalEvent: event,
      },
      { isOpen: open.value },
    );

    if (nextCoordinates) {
      setCoordinates(nextCoordinates.x, nextCoordinates.y);
    }
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
    [enabled, constrainedCoordinates, lockedCoordinates, axis, pointerTarget, preservedAnchorEl],
    () => {
      if (!enabled.value) {
        managedAnchorEl.value = null;
        refs.anchorEl.value = preservedAnchorEl.value;

        if (open.value) {
          update?.();
        }

        return;
      }

      // Rebuild the virtual anchor whenever its geometry inputs change so
      // `useFloating()` always positions against the latest pointer state.
      const virtualAnchorEl = virtualElementFactory.create({
        coordinates: constrainedCoordinates.value,
        referenceElement: pointerTarget.value,
        baselineCoordinates: lockedCoordinates.value,
        axis: axis.value,
      });
      managedAnchorEl.value = virtualAnchorEl;
      refs.anchorEl.value = virtualAnchorEl;

      if (open.value) {
        update?.();
      }
    },
    { immediate: true },
  );

  watch(open, (isOpen) => {
    if (isExternallyControlled.value) {
      return;
    }

    if (!enabled.value) {
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

  const handlers: Record<PointerEventData["type"], (event: PointerEvent) => void> = {
    pointerdown: (event) => processPointerEvent(event, "pointerdown"),
    pointerenter: (event) => processPointerEvent(event, "pointerenter"),
    pointermove: (event) => processPointerEvent(event, "pointermove"),
  };

  watchEffect((onCleanup) => {
    if (isExternallyControlled.value || !enabled.value) {
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

function createTrackingStrategy(trackingMode: TrackingMode): TrackingStrategy {
  return trackingMode === "follow" ? new FollowTracker() : new StaticTracker();
}
