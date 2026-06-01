import type { VirtualElement } from "@/types";
import type { AxisConstraint, Coordinates, VirtualElementFactoryOptions } from "./types";

const DEFAULT_DIMENSIONS = { width: 100, height: 30 };

type VirtualElementConfig = {
  coordinates: Coordinates;
  referenceElement: HTMLElement | null;
  baselineCoordinates: Coordinates | null;
  axis: AxisConstraint;
};

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Factory for creating virtual elements from pointer coordinates.
 *
 * Virtual elements are used to position floating components relative to the cursor
 * rather than a static DOM anchor. This factory manages coordinate fallback,
 * axis constraints, baseline coordinates, and custom context elements.
 *
 * @example Creating a virtual element
 * ```ts
 * const factory = new VirtualElementFactory();
 * const virtualEl = factory.create({
 *   coordinates: { x: 100, y: 150 },
 *   referenceElement: triggerEl.value,
 *   axis: "both",
 * });
 * ```
 */
export class VirtualElementFactory {
  create(options: VirtualElementFactoryOptions): VirtualElement {
    const config: VirtualElementConfig = {
      coordinates: options.coordinates,
      referenceElement: options.referenceElement ?? null,
      baselineCoordinates: options.baselineCoordinates ?? null,
      axis: options.axis ?? "both",
    };

    return {
      contextElement: config.referenceElement ?? undefined,
      getBoundingClientRect: () => this.resolveBoundingRect(config),
    };
  }

  private resolveBoundingRect(config: VirtualElementConfig): DOMRect {
    const referenceRect = this.getReferenceRect(config.referenceElement);
    const position = this.resolvePosition(config, referenceRect);
    const size = this.calculateSize(config.axis, referenceRect);

    // Floating UI expects a full DOMRect-like object even for virtual anchors.
    return this.createDOMRect({
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    });
  }

  private getReferenceRect(element: HTMLElement | null): DOMRect {
    if (element) {
      try {
        return element.getBoundingClientRect();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("VirtualElementFactory: Failed to get element bounds", { element, error });
        }
      }
    }

    return this.createDOMRect({
      x: 0,
      y: 0,
      width: DEFAULT_DIMENSIONS.width,
      height: DEFAULT_DIMENSIONS.height,
    });
  }

  private resolvePosition(
    config: VirtualElementConfig,
    referenceRect: DOMRect,
  ): { x: number; y: number } {
    return {
      x: this.resolveAxisCoordinate({
        current: config.coordinates.x,
        baseline: config.baselineCoordinates?.x ?? null,
        fallback: referenceRect.x,
        isAxisEnabled: config.axis === "x" || config.axis === "both",
      }),
      y: this.resolveAxisCoordinate({
        current: config.coordinates.y,
        baseline: config.baselineCoordinates?.y ?? null,
        fallback: referenceRect.y,
        isAxisEnabled: config.axis === "y" || config.axis === "both",
      }),
    };
  }

  private resolveAxisCoordinate(sources: {
    current: number | null;
    baseline: number | null;
    fallback: number;
    isAxisEnabled: boolean;
  }): number {
    const { current, baseline, fallback, isAxisEnabled } = sources;

    if (isAxisEnabled && current !== null) {
      return current;
    }

    if (baseline !== null) {
      return baseline;
    }

    // Fall back to the reference element so partially constrained axes still
    // produce a stable rect.
    return fallback;
  }

  private calculateSize(
    axis: AxisConstraint,
    referenceRect: DOMRect,
  ): {
    width: number;
    height: number;
  } {
    switch (axis) {
      case "both":
        return { width: 0, height: 0 };
      case "x":
        return {
          width: getPositiveSize(referenceRect.width, DEFAULT_DIMENSIONS.width),
          height: 0,
        };
      case "y":
        return {
          width: 0,
          height: getPositiveSize(referenceRect.height, DEFAULT_DIMENSIONS.height),
        };
    }
  }

  private createDOMRect(rect: { x: number; y: number; width: number; height: number }): DOMRect {
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
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function getPositiveSize(value: number, fallback: number): number {
  return Math.max(0, value || fallback);
}
