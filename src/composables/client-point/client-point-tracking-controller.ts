import { watchEffect, type Ref } from "vue";
import { FollowTracker, StaticTracker, TrackingStrategy } from "./tracking-strategies";
import type { PointerEventData, TrackingMode } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Attaches pointer tracking events and forwards accepted coordinates to client-point state.
 */
export function useClientPointTrackingController(
  options: ClientPointTrackingControllerOptions,
): void {
  const { isEnabled, isControlled, open, trackingTargetEl, trackingStrategy, setCoordinates } =
    options;

  function onPointerTargetEvent(e: PointerEvent, type: PointerEventData["type"]): void {
    const nextCoordinates = trackingStrategy.process(
      {
        type,
        coordinates: { x: e.clientX, y: e.clientY },
        originalEvent: e,
      },
      { isOpen: open.value },
    );

    if (nextCoordinates) {
      setCoordinates(nextCoordinates.x, nextCoordinates.y);
    }
  }

  function onPointerTargetDown(e: PointerEvent): void {
    onPointerTargetEvent(e, "pointerdown");
  }

  function onPointerTargetEnter(e: PointerEvent): void {
    onPointerTargetEvent(e, "pointerenter");
  }

  function onPointerTargetMove(e: PointerEvent): void {
    onPointerTargetEvent(e, "pointermove");
  }

  const handlers: Record<PointerEventData["type"], (e: PointerEvent) => void> = {
    pointerdown: onPointerTargetDown,
    pointerenter: onPointerTargetEnter,
    pointermove: onPointerTargetMove,
  };

  watchEffect((onCleanup) => {
    if (isControlled.value || !isEnabled.value) {
      return;
    }

    const target = trackingTargetEl.value;

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
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function createTrackingStrategy(trackingMode: TrackingMode): TrackingStrategy {
  return trackingMode === "follow" ? new FollowTracker() : new StaticTracker();
}

export { createTrackingStrategy };

//=======================================================================================
// 📌 Types
//=======================================================================================

interface ClientPointTrackingControllerOptions {
  isEnabled: Readonly<Ref<boolean>>;
  isControlled: Readonly<Ref<boolean>>;
  open: Readonly<Ref<boolean>>;
  trackingTargetEl: Readonly<Ref<HTMLElement | null>>;
  trackingStrategy: TrackingStrategy;
  setCoordinates: (x: number | null, y: number | null) => void;
}
