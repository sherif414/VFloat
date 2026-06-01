import { isMouseLikePointerType } from "@/shared/dom";
import type { Coordinates, PointerEventData, TrackingContext, TrackingMode } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Base contract for client-point tracking behaviors.
 *
 * Each strategy decides which pointer events it needs and whether incoming
 * coordinates should update the virtual anchor.
 */
export abstract class TrackingStrategy {
  abstract readonly name: TrackingMode;

  protected lastKnownCoordinates: Coordinates | null = null;

  abstract process(e: PointerEventData, context: TrackingContext): Coordinates | null;
  abstract getRequiredEvents(): PointerEventData["type"][];

  getCoordinatesForOpening(): Coordinates | null {
    return this.lastKnownCoordinates;
  }

  onClose(): void {
    this.reset();
  }

  reset(): void {
    this.lastKnownCoordinates = null;
  }
}

/**
 * Keeps following the pointer while the floating element is open.
 */
export class FollowTracker extends TrackingStrategy {
  readonly name = "follow" as const;

  getRequiredEvents(): PointerEventData["type"][] {
    return ["pointerdown", "pointermove", "pointerenter"];
  }

  process(e: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = e.coordinates;
    this.lastKnownCoordinates = coordinates;

    switch (e.type) {
      case "pointerdown":
        return coordinates;
      case "pointermove":
        // Keep following while open, but only for mouse-like pointers. Touch input
        // should not drag the floating element around after the initial trigger.
        if (context.isOpen && isMouseLikePointerType(e.originalEvent.pointerType, true)) {
          return coordinates;
        }

        return null;
      case "pointerenter":
        return coordinates;
      default:
        return null;
    }
  }
}

/**
 * Captures the initial pointer position and holds it steady after open.
 */
export class StaticTracker extends TrackingStrategy {
  readonly name = "static" as const;

  private triggerCoordinates: Coordinates | null = null;

  getRequiredEvents(): PointerEventData["type"][] {
    return ["pointerdown", "pointerenter", "pointermove"];
  }

  process(e: PointerEventData, context: TrackingContext): Coordinates | null {
    const coordinates = e.coordinates;
    this.lastKnownCoordinates = coordinates;

    if (e.type === "pointerdown") {
      // Remember the trigger point so opening can anchor to the original click
      // even if the pointer moves before the floating element becomes visible.
      this.triggerCoordinates = coordinates;
      return context.isOpen ? coordinates : null;
    }

    return null;
  }

  getCoordinatesForOpening(): Coordinates | null {
    if (this.triggerCoordinates) {
      return this.triggerCoordinates;
    }

    return this.lastKnownCoordinates;
  }

  reset(): void {
    super.reset();
    this.triggerCoordinates = null;
  }
}
