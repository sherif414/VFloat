import type { VirtualElement } from "@/types"
import type {
  AxisConstraint,
  Coordinates,
  VirtualElementFactoryContract,
  VirtualElementFactoryOptions,
} from "./types"

export class VirtualElementFactory implements VirtualElementFactoryContract {
  private static readonly DEFAULT_DIMENSIONS = { width: 100, height: 30 }

  create(options: VirtualElementFactoryOptions): VirtualElement {
    const config = this.buildConfiguration(options)

    return {
      contextElement: config.referenceElement || undefined,
      getBoundingClientRect: () => this.buildBoundingRect(config),
    }
  }

  private buildConfiguration(options: VirtualElementFactoryOptions): {
    coordinates: Coordinates
    referenceElement: HTMLElement | null
    baselineCoordinates: Coordinates | null
    axis: AxisConstraint
  } {
    return {
      coordinates: options.coordinates,
      referenceElement: options.referenceElement ?? null,
      baselineCoordinates: options.baselineCoordinates ?? null,
      axis: options.axis ?? "both",
    }
  }

  private buildBoundingRect(config: {
    coordinates: Coordinates
    referenceElement: HTMLElement | null
    baselineCoordinates: Coordinates | null
    axis: AxisConstraint
  }): DOMRect {
    const referenceRect = this.getReferenceRect(config.referenceElement)
    const position = this.resolvePosition(config, referenceRect)
    const size = this.calculateSize(config.axis, referenceRect)

    return this.buildDOMRect({
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    })
  }

  private getReferenceRect(element: HTMLElement | null): DOMRect {
    if (element) {
      try {
        return element.getBoundingClientRect()
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("VirtualElementFactory: Failed to get element bounds", { element, error })
        }
      }
    }

    return this.buildDOMRect({
      x: 0,
      y: 0,
      width: VirtualElementFactory.DEFAULT_DIMENSIONS.width,
      height: VirtualElementFactory.DEFAULT_DIMENSIONS.height,
    })
  }

  private resolvePosition(
    config: {
      coordinates: Coordinates
      baselineCoordinates: Coordinates | null
      axis: AxisConstraint
    },
    referenceRect: DOMRect
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
    }
  }

  private resolveAxisCoordinate(sources: {
    current: number | null
    baseline: number | null
    fallback: number
    isAxisEnabled: boolean
  }): number {
    const { current, baseline, fallback, isAxisEnabled } = sources

    if (isAxisEnabled && current !== null) {
      return current
    }

    if (baseline !== null) {
      return baseline
    }

    return fallback
  }

  private calculateSize(
    axis: AxisConstraint,
    referenceRect: DOMRect
  ): {
    width: number
    height: number
  } {
    const ensurePositive = (value: number, fallback: number) => Math.max(0, value || fallback)

    switch (axis) {
      case "both":
        return { width: 0, height: 0 }
      case "x":
        return {
          width: ensurePositive(
            referenceRect.width,
            VirtualElementFactory.DEFAULT_DIMENSIONS.width
          ),
          height: 0,
        }
      case "y":
        return {
          width: 0,
          height: ensurePositive(
            referenceRect.height,
            VirtualElementFactory.DEFAULT_DIMENSIONS.height
          ),
        }
    }
  }

  private buildDOMRect(rect: { x: number; y: number; width: number; height: number }): DOMRect {
    const { x, y, width, height } = rect
    const safeWidth = Math.max(0, width)
    const safeHeight = Math.max(0, height)

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
    } as DOMRect
  }
}
