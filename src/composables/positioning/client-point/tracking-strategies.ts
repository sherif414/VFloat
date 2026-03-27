import { isMouseLikePointerType } from "@/utils"
import type { Coordinates, PointerEventData, TrackingContext, TrackingMode } from "./types"

export abstract class TrackingStrategy {
  abstract readonly name: TrackingMode

  protected lastKnownCoordinates: Coordinates | null = null

  abstract process(event: PointerEventData, context: TrackingContext): Coordinates | null
  abstract getRequiredEvents(): PointerEventData["type"][]

  getCoordinatesForOpening(): Coordinates | null {
    return this.lastKnownCoordinates
  }

  onClose(): void {
    this.lastKnownCoordinates = null
  }

  reset(): void {
    this.lastKnownCoordinates = null
  }
}

export class FollowTracker extends TrackingStrategy {
  readonly name = "follow" as const

  getRequiredEvents(): PointerEventData["type"][] {
    return ["pointerdown", "pointermove", "pointerenter"]
  }

  process(event: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = event.coordinates
    this.lastKnownCoordinates = coordinates

    switch (event.type) {
      case "pointerdown":
        return coordinates
      case "pointermove":
        if (context.isOpen && isMouseLikePointerType(event.originalEvent.pointerType, true)) {
          return coordinates
        }

        return null
      case "pointerenter":
        return coordinates
      default:
        return null
    }
  }
}

export class StaticTracker extends TrackingStrategy {
  readonly name = "static" as const

  private triggerCoordinates: Coordinates | null = null

  getRequiredEvents(): PointerEventData["type"][] {
    return ["pointerdown", "pointermove"]
  }

  process(event: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = event.coordinates
    this.lastKnownCoordinates = coordinates

    if (event.type === "pointerdown") {
      this.triggerCoordinates = coordinates
      return context.isOpen ? coordinates : null
    }

    return null
  }

  getCoordinatesForOpening(): Coordinates | null {
    if (this.triggerCoordinates) {
      return this.triggerCoordinates
    }

    return this.lastKnownCoordinates
  }

  reset(): void {
    super.reset()
    this.triggerCoordinates = null
  }

  onClose(): void {
    this.triggerCoordinates = null
  }
}
