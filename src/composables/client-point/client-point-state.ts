import { computed, type MaybeRefOrGetter, ref, toValue, type Ref } from "vue";
import type { Coordinates } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

const DEFAULT_COORDINATES = { x: null, y: null };

/**
 * Creates the coordinate state used by client-point virtual anchors.
 */
export function createClientPointState(options: ClientPointStateOptions): ClientPointState {
  const { x: xOption, y: yOption } = options;

  const initialCoordinates = ref<Coordinates | null>(null);
  const internalCoordinates = ref<Coordinates>(DEFAULT_COORDINATES);
  const externalCoordinates = computed(() => ({
    x: sanitizeCoordinate(toValue(xOption)),
    y: sanitizeCoordinate(toValue(yOption)),
  }));

  const isControlled = computed(
    () => externalCoordinates.value.x !== null && externalCoordinates.value.y !== null,
  );

  const coordinates = computed<Coordinates>(() => {
    if (isControlled.value) {
      return externalCoordinates.value;
    }

    return internalCoordinates.value;
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

  function resetCoordinates(): void {
    if (isControlled.value) {
      return;
    }

    internalCoordinates.value = DEFAULT_COORDINATES;
  }

  function captureInitialCoordinates(coordinates: Coordinates | null): void {
    const nextCoordinates = coordinates ?? internalCoordinates.value;

    setCoordinates(nextCoordinates.x, nextCoordinates.y);
    initialCoordinates.value = { ...nextCoordinates };
  }

  function clearInitialCoordinates(): void {
    initialCoordinates.value = null;
  }

  return {
    isControlled,

    coordinates,
    setCoordinates,
    resetCoordinates,

    initialCoordinates,
    captureInitialCoordinates,
    clearInitialCoordinates,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function sanitizeCoordinate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

interface ClientPointStateOptions {
  x: MaybeRefOrGetter<number | null>;
  y: MaybeRefOrGetter<number | null>;
}

export interface ClientPointState {
  coordinates: Readonly<Ref<Coordinates>>;
  isControlled: Readonly<Ref<boolean>>;
  setCoordinates: (x: number | null, y: number | null) => void;
  resetCoordinates: () => void;
  initialCoordinates: Readonly<Ref<Coordinates | null>>;
  captureInitialCoordinates: (coordinates: Coordinates | null) => void;
  clearInitialCoordinates: () => void;
}
