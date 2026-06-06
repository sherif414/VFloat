import type { VirtualElement } from "@/types";
import type { Coordinates, VirtualElementFactoryOptions } from "./types";

const DEFAULT_COORDINATES = { x: 0, y: 0 };

type VirtualElementConfig = {
  coordinates: Coordinates;
  referenceElement: HTMLElement | null;
  baselineCoordinates: Coordinates | null;
};

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Factory for creating virtual elements from pointer coordinates.
 *
 * Virtual elements are used to position floating components relative to the cursor
 * rather than a static DOM anchor. This factory manages coordinate fallback,
 * baseline coordinates, and custom context elements.
 *
 * @example Creating a virtual element
 * ```ts
 * const factory = new VirtualElementFactory();
 * const virtualEl = factory.create({
 *   coordinates: { x: 100, y: 150 },
 *   referenceElement: triggerEl.value,
 * });
 * ```
 */
export class VirtualElementFactory {
  create(options: VirtualElementFactoryOptions): VirtualElement {
    const config: VirtualElementConfig = {
      coordinates: options.coordinates,
      referenceElement: options.referenceElement ?? null,
      baselineCoordinates: options.baselineCoordinates ?? null,
    };

    return {
      contextElement: config.referenceElement ?? undefined,
      getBoundingClientRect: () => this.resolveBoundingRect(config),
    };
  }

  private resolveBoundingRect(config: VirtualElementConfig): DOMRect {
    const referenceRect = this.getReferenceRect(config.referenceElement);
    const position = this.resolvePosition(config, referenceRect);

    return this.createDOMRect({
      x: position.x,
      y: position.y,
      width: 0,
      height: 0,
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
      x: DEFAULT_COORDINATES.x,
      y: DEFAULT_COORDINATES.y,
      width: 0,
      height: 0,
    });
  }

  private resolvePosition(
    config: VirtualElementConfig,
    referenceRect: DOMRect,
  ): { x: number; y: number } {
    return {
      x: this.resolveCoordinate({
        current: config.coordinates.x,
        baseline: config.baselineCoordinates?.x ?? null,
        fallback: referenceRect.x,
      }),
      y: this.resolveCoordinate({
        current: config.coordinates.y,
        baseline: config.baselineCoordinates?.y ?? null,
        fallback: referenceRect.y,
      }),
    };
  }

  private resolveCoordinate(sources: {
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
