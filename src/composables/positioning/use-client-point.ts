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
import { getFloatingState } from "@/core/floating-accessors";
import { FollowTracker, StaticTracker, TrackingStrategy } from "./client-point/tracking-strategies";
import type {
  AxisConstraint,
  Coordinates,
  PointerEventData,
  TrackingMode,
} from "./client-point/types";
import { VirtualElementFactory } from "./client-point/virtual-element-factory";
import type { AnchorElement, FloatingContext } from "./use-floating";

const sanitizeCoordinate = (value: number | null | undefined): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export type { AxisConstraint, Coordinates, TrackingMode } from "./client-point/types";
export { FollowTracker, StaticTracker, TrackingStrategy, VirtualElementFactory };

export interface UseClientPointOptions {
  pointerTarget?: Ref<HTMLElement | null>;
  enabled?: MaybeRefOrGetter<boolean>;
  axis?: MaybeRefOrGetter<AxisConstraint>;
  x?: MaybeRefOrGetter<number | null>;
  y?: MaybeRefOrGetter<number | null>;
  trackingMode?: TrackingMode;
}

export interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>;
  updatePosition: (x: number, y: number) => void;
}

export interface UseClientPointContext {
  refs: {
    anchorEl: Ref<AnchorElement>;
  };
  state?: FloatingContext["state"];
  open?: FloatingContext["open"];
  setOpen?: FloatingContext["setOpen"];
  position?: Pick<FloatingContext["position"], "update">;
  update?: () => void;
}

export function useClientPoint(
  context: UseClientPointContext,
  options?: UseClientPointOptions,
): UseClientPointReturn;
export function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: UseClientPointContext,
  options?: Omit<UseClientPointOptions, "pointerTarget">,
): UseClientPointReturn;
export function useClientPoint(
  contextOrPointerTarget: UseClientPointContext | Ref<HTMLElement | null>,
  contextOrOptions: UseClientPointContext | UseClientPointOptions = {},
  maybeOptions: Omit<UseClientPointOptions, "pointerTarget"> = {},
): UseClientPointReturn {
  const normalized = normalizeClientPointArgs(
    contextOrPointerTarget,
    contextOrOptions,
    maybeOptions,
  );
  const { pointerTarget, context, options } = normalized;
  const { open } = getFloatingState(context);
  const refs = context.refs;
  const update =
    "position" in context && context.position ? context.position.update : context.update;

  const virtualElementFactory = new VirtualElementFactory();
  const internalCoordinates = ref<Coordinates>({ x: null, y: null });
  const lockedCoordinates = ref<Coordinates | null>(null);

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
    [constrainedCoordinates, lockedCoordinates, axis, pointerTarget],
    () => {
      refs.anchorEl.value = virtualElementFactory.create({
        coordinates: constrainedCoordinates.value,
        referenceElement: pointerTarget.value,
        baselineCoordinates: lockedCoordinates.value,
        axis: axis.value,
      });

      if (open.value) {
        update?.();
      }
    },
    { immediate: true },
  );

  watch(open, (isOpen) => {
    if (!enabled.value || isExternallyControlled.value) {
      return;
    }

    if (isOpen) {
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

function normalizeClientPointArgs(
  contextOrPointerTarget: UseClientPointContext | Ref<HTMLElement | null>,
  contextOrOptions: UseClientPointContext | UseClientPointOptions,
  maybeOptions: Omit<UseClientPointOptions, "pointerTarget">,
) {
  if (isClientPointContext(contextOrPointerTarget)) {
    const context = contextOrPointerTarget;
    const options = contextOrOptions as UseClientPointOptions;

    if (!options.pointerTarget) {
      throw new Error(
        "[useClientPoint] `options.pointerTarget` is required when calling useClientPoint(context, options).",
      );
    }

    return {
      context,
      pointerTarget: options.pointerTarget,
      options,
    };
  }

  return {
    pointerTarget: contextOrPointerTarget,
    context: contextOrOptions as UseClientPointContext,
    options: maybeOptions as UseClientPointOptions,
  };
}

function isClientPointContext(
  value: UseClientPointContext | Ref<HTMLElement | null>,
): value is UseClientPointContext {
  return typeof value === "object" && value !== null && "refs" in value;
}
