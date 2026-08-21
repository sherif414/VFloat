import type { VirtualElement } from "@/types";
import type { Coordinates, VirtualElementFactoryOptions } from "./types";

const DEFAULT_COORDINATES = { x: 0, y: 0 };

type VirtualElementConfig = {
  coordinates: Coordinates;
  trackingTarget: HTMLElement | null;
  baselineCoordinates: Coordinates | null;
};

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a virtual element from pointer coordinates.
 *
 * Virtual elements position floating components relative to the cursor
 * rather than a static DOM anchor. This function manages coordinate fallback,
 * baseline coordinates, and custom context elements.
 *
 * @example Creating a virtual element
 * ```ts
 * const virtualEl = createVirtualElement({
 *   coordinates: { x: 100, y: 150 },
 *   trackingTarget: triggerEl.value,
 * });
 * ```
 */
export function createVirtualElement(options: VirtualElementFactoryOptions): VirtualElement {
  const config: VirtualElementConfig = {
    coordinates: options.coordinates,
    trackingTarget: options.trackingTarget ?? null,
    baselineCoordinates: options.baselineCoordinates ?? null,
  };

  return {
    contextElement: config.trackingTarget ?? undefined,
    getBoundingClientRect: () => resolveBoundingRect(config),
    getClientRects: () => [resolveBoundingRect(config)],
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function resolveBoundingRect(config: VirtualElementConfig): DOMRect {
  const referenceRect = getReferenceRect(config.trackingTarget);
  const position = resolvePosition(config, referenceRect);

  return createDOMRect({
    x: position.x,
    y: position.y,
    width: 0,
    height: 0,
  });
}

function getReferenceRect(element: HTMLElement | null): DOMRect {
  if (element) {
    try {
      return element.getBoundingClientRect();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("createVirtualElement: Failed to get element bounds", {
          element,
          error,
        });
      }
    }
  }

  return createDOMRect({
    x: DEFAULT_COORDINATES.x,
    y: DEFAULT_COORDINATES.y,
    width: 0,
    height: 0,
  });
}

function resolvePosition(
  config: VirtualElementConfig,
  referenceRect: DOMRect,
): { x: number; y: number } {
  return {
    x: resolveCoordinate({
      current: config.coordinates.x,
      baseline: config.baselineCoordinates?.x ?? null,
      fallback: referenceRect.x,
    }),
    y: resolveCoordinate({
      current: config.coordinates.y,
      baseline: config.baselineCoordinates?.y ?? null,
      fallback: referenceRect.y,
    }),
  };
}

function resolveCoordinate(sources: {
  current: number | null;
  baseline: number | null;
  fallback: number;
}): number {
  const { current, baseline, fallback } = sources;

  if (current !== null) {
    return current;
  }

  if (baseline !== null) {
    return baseline;
  }

  // Fall back to the reference element so missing coordinates still produce a stable rect.
  return fallback;
}

function createDOMRect(rect: { x: number; y: number; width: number; height: number }): DOMRect {
  const { x, y, width, height } = rect;
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);

  return {
    x,
    y,
    width: safeWidth,
    height: safeHeight,
    top: y,
    right: x + safeWidth,
    bottom: y + safeHeight,
    left: x,
    toJSON: () => ({ x, y, width: safeWidth, height: safeHeight }),
  } as DOMRect;
}
