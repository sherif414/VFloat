import { computed, type MaybeRefOrGetter, ref, toValue, type Ref } from "vue";
import type { AxisConstraint, Coordinates } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates the coordinate state used by client-point virtual anchors.
 */
export function createClientPointState(options: ClientPointStateOptions): ClientPointState {
  const { axis: axisOption, x: xOption, y: yOption } = options;

  const internalCoordinates = ref<Coordinates>(createEmptyCoordinates());
  const openingBaselineCoordinates = ref<Coordinates | null>(null);

  const axis = computed(() => toValue(axisOption));
  const externalX = computed(() => sanitizeCoordinate(toValue(xOption)));
  const externalY = computed(() => sanitizeCoordinate(toValue(yOption)));
  const isControlled = computed(() => externalX.value !== null && externalY.value !== null);

  const sourceCoordinates = computed<Coordinates>(() => {
    if (isControlled.value) {
      return {
        x: externalX.value,
        y: externalY.value,
      };
    }

    return internalCoordinates.value;
  });

  const coordinates = computed<Coordinates>(() => {
    return resolveConstrainedCoordinates(sourceCoordinates.value, axis.value);
  });

  function setCoordinates(x: number | null, y: number | null): void {
    if (isControlled.value) {
      return;
    }

    internalCoordinates.value = {
      x: sanitizeCoordinate(x),
      y: sanitizeCoordinate(y),
    };
  }

  function updatePosition(x: number, y: number): void {
    setCoordinates(x, y);
  }

  function resetCoordinates(): void {
    if (isControlled.value) {
      return;
    }

    internalCoordinates.value = createEmptyCoordinates();
  }

  function captureOpeningBaselineCoordinates(coordinates: Coordinates | null): void {
    const nextCoordinates = coordinates ?? internalCoordinates.value;

    setCoordinates(nextCoordinates.x, nextCoordinates.y);
    openingBaselineCoordinates.value = { ...nextCoordinates };
  }

  function clearOpeningBaselineCoordinates(): void {
    openingBaselineCoordinates.value = null;
  }

  return {
    axis,
    coordinates,
    openingBaselineCoordinates,
    isControlled,
    setCoordinates,
    updatePosition,
    resetCoordinates,
    captureOpeningBaselineCoordinates,
    clearOpeningBaselineCoordinates,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function sanitizeCoordinate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function createEmptyCoordinates(): Coordinates {
  return { x: null, y: null };
}

function resolveConstrainedCoordinates(
  coordinates: Coordinates,
  axis: AxisConstraint,
): Coordinates {
  switch (axis) {
    case "x":
      return { x: coordinates.x, y: null };
    case "y":
      return { x: null, y: coordinates.y };
    case "both":
      return coordinates;
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

interface ClientPointStateOptions {
  axis: MaybeRefOrGetter<AxisConstraint>;
  x: MaybeRefOrGetter<number | null>;
  y: MaybeRefOrGetter<number | null>;
}

export interface ClientPointState {
  axis: Readonly<Ref<AxisConstraint>>;
  coordinates: Readonly<Ref<Coordinates>>;
  openingBaselineCoordinates: Readonly<Ref<Coordinates | null>>;
  isControlled: Readonly<Ref<boolean>>;
  setCoordinates: (x: number | null, y: number | null) => void;
  updatePosition: (x: number, y: number) => void;
  resetCoordinates: () => void;
  captureOpeningBaselineCoordinates: (coordinates: Coordinates | null) => void;
  clearOpeningBaselineCoordinates: () => void;
}
