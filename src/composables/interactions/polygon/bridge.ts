import { computed } from "vue";
import type {
  AnchorElement,
  FloatingContext,
  FloatingElement,
} from "@/composables/positioning/use-floating";
import { clearTimeoutIfSet, contains, getCurrentTime, getTarget, isHTMLElement } from "@/utils";
import {
  buildRectangularTrough,
  buildSafePolygon,
  getCursorSpeed,
  isInside,
  isPointerLeavingOppositeSide,
  isPointInPolygon,
  type Point,
  type Polygon,
  type Side,
} from "./geometry";

export interface SafePolygonOptions {
  buffer?: number;
  requireIntent?: boolean;
  onPolygonChange?: (polygon: Polygon) => void;
}

export type SafePolygon = (context: CreateSafePolygonHandlerContext) => SafePolygonHandler;
export type SafePolygonHandler = (event: MouseEvent) => void;

export interface CreateSafePolygonHandlerContext {
  x: number;
  y: number;
  placement: FloatingContext["placement"]["value"];
  elements: {
    domReference: AnchorElement | null;
    floating: FloatingElement | null;
  };
  buffer: number;
  onClose: () => void;
}

export function safePolygon(options: SafePolygonOptions = {}): SafePolygon {
  const { requireIntent = true } = options;

  let timeoutId = -1;
  let hasLanded = false;

  return function createSafePolygonHandler(context: CreateSafePolygonHandlerContext) {
    const { x, y, placement, elements, buffer: contextBuffer, onClose } = context;
    const referenceEl = computed(() => {
      const domReference = elements.domReference;

      if (isHTMLElement(domReference)) {
        return domReference;
      }

      return (domReference?.contextElement as HTMLElement) ?? null;
    });

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastCursorTime = getCurrentTime();

    const close = () => {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;
      onClose();
    };

    return function onMouseMove(event: MouseEvent) {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;

      if (
        !elements.domReference ||
        !elements.floating ||
        placement == null ||
        x == null ||
        y == null
      ) {
        return;
      }

      const { clientX, clientY } = event;
      const clientPoint: Point = [clientX, clientY];
      const target = getTarget(event) as Element | null;
      const isLeave = event.type === "mouseleave";
      const isOverFloatingEl = elements.floating && contains(elements.floating, target);
      const isOverReferenceEl = referenceEl.value && contains(referenceEl.value, target);
      const refRect = referenceEl.value?.getBoundingClientRect();
      const rect = elements.floating?.getBoundingClientRect();
      const side = placement.split("-")[0] as Side;
      const isOverReferenceRect = refRect ? isInside(clientPoint, refRect) : false;

      if (isOverFloatingEl) {
        hasLanded = true;

        if (!isLeave) {
          return;
        }
      }

      if (isOverReferenceEl) {
        hasLanded = false;
      }

      if (isOverReferenceEl && !isLeave) {
        hasLanded = true;
        return;
      }

      if (
        isLeave &&
        isHTMLElement(event.relatedTarget) &&
        elements.floating &&
        contains(elements.floating, event.relatedTarget)
      ) {
        return;
      }

      if (isPointerLeavingOppositeSide(side, x, y, refRect)) {
        close();
        return;
      }

      const rectPoly = buildRectangularTrough(side, rect, refRect);
      const polygon = buildSafePolygon(side, x, y, rect, refRect, contextBuffer);
      options.onPolygonChange?.(polygon);

      if (isPointInPolygon(clientPoint, rectPoly)) {
        return;
      }

      if (isPointInPolygon(clientPoint, polygon)) {
        if (!hasLanded && requireIntent) {
          const speedResult = getCursorSpeed(
            event.clientX,
            event.clientY,
            lastX,
            lastY,
            lastCursorTime,
            getCurrentTime(),
          );

          lastX = speedResult.lastX;
          lastY = speedResult.lastY;
          lastCursorTime = speedResult.lastCursorTime;

          if (speedResult.speed !== null && speedResult.speed < 0.1) {
            timeoutId = window.setTimeout(close, 40);
          }
        }

        return;
      }

      if (hasLanded && !isOverReferenceRect) {
        close();
        return;
      }

      close();
    };
  };
}
