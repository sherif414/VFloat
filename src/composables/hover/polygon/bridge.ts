import type { AnchorElement, FloatingElement } from "@/composables/floating-node";
import {
  clearTimeoutIfSet,
  contains,
  getCurrentTime,
  getTarget,
  isHTMLElement,
} from "@/shared/dom";
import {
  buildRectangularTrough,
  buildSafePolygon,
  getCursorSpeed,
  isInside,
  isPointerLeavingOppositeSide,
  isPointInPolygon,
  type Point,
  type Polygon,
  resolveSide,
} from "./geometry";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Builds a pointer-move handler that keeps hover interactions open while the
 * cursor travels through the "safe" area between the anchor and floating panel.
 */
export function safePolygon(options: SafePolygonOptions = {}): SafePolygon {
  const { requireIntent = true, intentTimeout = 40, blockPointerEvents = false } = options;

  let timeoutId = -1;
  let hasLanded = false;

  return function createSafePolygonHandler(node: CreateSafePolygonHandlerContext) {
    const { x, y, elements, buffer: nodeBuffer, onClose } = node;
    const referenceEl = resolveReferenceElement(elements.domReference);

    let overlayEl: HTMLDivElement | null = null;

    if (blockPointerEvents && typeof document !== "undefined") {
      const doc = referenceEl?.ownerDocument ?? document;
      if (doc.body) {
        overlayEl = doc.createElement("div");
        overlayEl.style.position = "fixed";
        overlayEl.style.top = "0";
        overlayEl.style.left = "0";
        overlayEl.style.width = "100vw";
        overlayEl.style.height = "100vh";
        overlayEl.style.zIndex = "2147483647";
        overlayEl.style.opacity = "0";
        overlayEl.style.cursor = "default";
        overlayEl.setAttribute("data-vfloat-safe-polygon-overlay", "");
        doc.body.appendChild(overlayEl);
      }
    }

    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastCursorTime = getCurrentTime();

    let cachedAnchorRect: DOMRect | null = null;
    let cachedFloatingRect: DOMRect | null = null;
    let lastRectTime = 0;

    const cleanupOverlay = () => {
      if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
      }
    };

    const close = () => {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;
      cleanupOverlay();
      onClose();
    };

    const onMouseMove = function onMouseMove(event: MouseEvent) {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;

      if (!elements.domReference || !elements.floating || x == null || y == null) {
        return;
      }

      if (!referenceEl) {
        return;
      }

      const now = getCurrentTime();
      if (!cachedAnchorRect || !cachedFloatingRect || now - lastRectTime > 16) {
        cachedAnchorRect = referenceEl.getBoundingClientRect();
        cachedFloatingRect = elements.floating.getBoundingClientRect();
        lastRectTime = now;
      }

      const anchorRect = cachedAnchorRect;
      const floatingRect = cachedFloatingRect;

      if (!anchorRect || !floatingRect) {
        return;
      }

      const { clientX, clientY } = event;
      const clientPoint: Point = [clientX, clientY];
      const target = getTarget(event) as Element | null;
      const isLeave = event.type === "mouseleave";
      const isOverFloatingEl =
        (elements.floating && contains(elements.floating, target)) ||
        isInside(clientPoint, floatingRect);
      const isOverReferenceEl =
        (referenceEl && contains(referenceEl, target)) || isInside(clientPoint, anchorRect);

      const side = resolveSide(floatingRect, anchorRect);
      const isOverReferenceRect = isInside(clientPoint, anchorRect);

      if (isOverFloatingEl) {
        hasLanded = true;
        cleanupOverlay();

        if (!isLeave) {
          return;
        }
      }

      if (isOverReferenceEl) {
        hasLanded = false;
        cleanupOverlay();
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

      if (isPointerLeavingOppositeSide(side, x, y, anchorRect)) {
        close();
        return;
      }

      const rectPoly = buildRectangularTrough(side, floatingRect, anchorRect);
      const polygon = buildSafePolygon(side, x, y, floatingRect, anchorRect, nodeBuffer);
      options.onPolygonChange?.(polygon);

      // Keep the interaction alive while the cursor is still traveling through
      // the corridor between anchor and floating content.
      if (isPointInPolygon(clientPoint, rectPoly)) {
        return;
      }

      if (isPointInPolygon(clientPoint, polygon)) {
        if (!hasLanded && requireIntent) {
          // Slow cursor movement usually means the user changed direction,
          // so close shortly instead of keeping the surface open indefinitely.
          const speedResult = getCursorSpeed(
            event.clientX,
            event.clientY,
            lastX,
            lastY,
            lastCursorTime,
            now,
          );

          lastX = speedResult.lastX;
          lastY = speedResult.lastY;
          lastCursorTime = speedResult.lastCursorTime;

          if (speedResult.speed !== null && speedResult.speed < 0.1) {
            timeoutId = setTimeout(close, intentTimeout) as unknown as number;
          }
        }

        return;
      }

      if (hasLanded && !isOverReferenceRect) {
        close();
        return;
      }

      // Outside both safe areas: close immediately.
      close();
    };

    onMouseMove.cleanup = cleanupOverlay;

    return onMouseMove;
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Resolves the underlying HTMLElement from an AnchorElement (HTMLElement or VirtualElement).
 */
function resolveReferenceElement(domReference: AnchorElement | null): HTMLElement | null {
  if (isHTMLElement(domReference)) {
    return domReference;
  }

  return (domReference?.contextElement as HTMLElement) ?? null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for tuning the safe-polygon hover corridor.
 */
export interface SafePolygonOptions {
  /**
   * Expands the polygon around the cursor leave point.
   */
  buffer?: number;

  /**
   * Requires the cursor to keep moving toward the floating element before the
   * polygon protection fully applies.
   * @default true
   */
  requireIntent?: boolean;

  /**
   * Delay in milliseconds before closing when cursor decelerates below 0.1 px/ms.
   * @default 40
   */
  intentTimeout?: number;

  /**
   * Blocks background pointer events during corridor traversal.
   * When true, an invisible fixed overlay is created while the corridor is active.
   * @default false
   */
  blockPointerEvents?: boolean;

  /**
   * Optional hook for visualizing the currently active polygon.
   */
  onPolygonChange?: (polygon: Polygon) => void;
}

/**
 * Geometry and callback inputs used to build a safe-polygon handler.
 */
export interface CreateSafePolygonHandlerContext {
  x: number;
  y: number;
  elements: {
    domReference: AnchorElement | null;
    floating: FloatingElement | null;
  };
  buffer: number;
  onClose: () => void;
}

/**
 * Mouse-move handler produced by `safePolygon`.
 */
export type SafePolygonHandler = ((event: MouseEvent) => void) & {
  cleanup?: () => void;
};

/**
 * Factory that produces a pointer-move handler for safe-polygon hover retention.
 */
export type SafePolygon = (node: CreateSafePolygonHandlerContext) => SafePolygonHandler;
