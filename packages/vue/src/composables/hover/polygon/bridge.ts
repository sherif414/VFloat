import type { AnchorElement, FloatingElement } from "@/composables/floating-node";
import { clearTimeoutIfSet, contains, getCurrentTime, getTarget, isElement } from "@/shared/dom";
import { getWindow } from "@/shared/env";
import {
  buildSafePolygon,
  isInside,
  isInsideAxisAlignedRect,
  isPointerLeavingOppositeSide,
  isPointInPolygon,
  type Point,
  type Polygon,
  resolveSide,
  type Side,
} from "./geometry";

/**
 * Default corridor padding in pixels. Mirrors the upstream Floating UI
 * heuristic; larger values make the corridor noticeably more forgiving.
 */
const DEFAULT_BUFFER = 0.5;

/**
 * Cursor speed in px/ms below which the pointer counts as parked rather than
 * actively traversing toward the floating element.
 */
const MIN_INTENT_SPEED = 0.1;

/**
 * Anchor and floating rects are reused for at most one frame so a burst of
 * pointermove events does not force synchronous layout on every event.
 */
const RECT_CACHE_MS = 16;

/**
 * Tracks how many live corridors hold each shielded element, alongside the
 * inline value to restore once the last hold is gone.
 *
 * Reference counting (rather than a single owner per scope) is what makes
 * nested corridors safe: corridors over a shared `body` can finish in any
 * order, and a single-owner registry would leave the first release with no
 * proof of ownership, stranding `pointer-events: none` on the scope forever.
 */
const shieldHolds = new WeakMap<HTMLElement, { count: number; previous: string }>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Builds a pointer-move handler that keeps hover interactions open while the
 * cursor travels through the "safe" area between the anchor and floating panel.
 */
export function safePolygon(options: SafePolygonOptions = {}): SafePolygon {
  const { requireIntent = true, intentTimeout = 40, blockPointerEvents = false } = options;

  return function createSafePolygonHandler(node: CreateSafePolygonHandlerContext) {
    const { x, y, elements, onClose, hasOpenChild, side: contextSide } = node;
    const referenceEl = resolveReferenceElement(elements.domReference);
    const buffer = options.buffer ?? node.buffer ?? DEFAULT_BUFFER;
    const ownerWin = getWindow(referenceEl);

    // Traversal state is scoped to a single corridor traversal. Hoisting it into
    // the `safePolygon()` closure would leak `hasLanded` into the next
    // traversal, which would then close immediately instead of entering the
    // corridor and skip the intent watchdog entirely.
    let hasLanded = false;
    let lastSampleX: number | null = null;
    let lastSampleY: number | null = null;
    let lastSampleTime = 0;

    let timeoutId = -1;
    let cachedAnchorRect: DOMRect | null = null;
    let cachedFloatingRect: DOMRect | null = null;
    let lastRectTime = 0;
    let shieldTargets: HTMLElement[] | null = null;

    /**
     * Prefers the anchor's own realm clock so timing stays correct inside
     * same-origin iframes, and degrades to the shared helper off-DOM.
     */
    const readTime = (): number => ownerWin?.performance?.now() ?? getCurrentTime();

    /**
     * Detects a pointer that has effectively stopped between two samples.
     *
     * Distance is compared against elapsed time rather than a fixed pixel
     * delta, so a continuous crawl below `MIN_INTENT_SPEED` is rejected the
     * same way a full stop is. Without this, such a crawl would rearm the
     * intent watchdog on every event and hold the panel open indefinitely.
     */
    const isCursorMovingSlowly = (nextX: number, nextY: number): boolean => {
      const currentTime = readTime();
      const elapsedTime = currentTime - lastSampleTime;

      if (lastSampleX === null || lastSampleY === null || elapsedTime === 0) {
        lastSampleX = nextX;
        lastSampleY = nextY;
        lastSampleTime = currentTime;
        return false;
      }

      const deltaX = nextX - lastSampleX;
      const deltaY = nextY - lastSampleY;
      const threshold = elapsedTime * MIN_INTENT_SPEED;
      const isSlow = deltaX * deltaX + deltaY * deltaY < threshold * threshold;

      lastSampleX = nextX;
      lastSampleY = nextY;
      lastSampleTime = currentTime;

      return isSlow;
    };

    const restoreInlinePointerEvents = (el: HTMLElement, value: string): void => {
      if (value) {
        el.style.pointerEvents = value;
      } else {
        el.style.removeProperty("pointer-events");
      }
    };

    const releaseShield = (): void => {
      if (!shieldTargets) return;

      for (const [el, previous] of releaseShieldHolds(shieldTargets)) {
        restoreInlinePointerEvents(el, previous);
      }

      shieldTargets = null;
    };

    const startShield = (): void => {
      const floatingEl = elements.floating;
      if (shieldTargets || !blockPointerEvents || !referenceEl || !floatingEl) return;

      const scope = options.getScope?.() ?? referenceEl.ownerDocument.body;
      const targets = [scope, referenceEl, floatingEl];

      retainShieldHolds(targets);

      // Shield the scope while re-enabling both ends of the corridor. This is
      // preferred over an intercepting overlay: an overlay would compete with
      // the floating panel for stacking order and could cover it, whereas
      // `pointer-events` leaves paint order untouched.
      scope.style.pointerEvents = "none";
      referenceEl.style.pointerEvents = "auto";
      floatingEl.style.pointerEvents = "auto";
      shieldTargets = targets;
    };

    const close = () => {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;
      releaseShield();
      onClose();
    };

    const closeIfNoOpenChild = () => {
      if (hasOpenChild?.()) return;
      close();
    };

    startShield();

    const onMouseMove = function onMouseMove(event: MouseEvent) {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;

      if (hasOpenChild?.()) {
        return;
      }

      if (!elements.domReference || !elements.floating || x == null || y == null) {
        return;
      }

      if (!referenceEl) {
        return;
      }

      const now = readTime();
      if (!cachedAnchorRect || !cachedFloatingRect || now - lastRectTime > RECT_CACHE_MS) {
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
      // The geometric test backs up `contains` because a shielded background
      // element becomes the event target while the cursor sits over the anchor.
      const isOverFloatingEl =
        (elements.floating && contains(elements.floating, target)) ||
        isInside(clientPoint, floatingRect);
      const isOverReferenceEl =
        (referenceEl && contains(referenceEl, target)) || isInside(clientPoint, anchorRect);

      const side = contextSide ?? resolveSide(floatingRect, anchorRect);
      const isOverReferenceRect = isInside(clientPoint, anchorRect);

      if (isOverFloatingEl) {
        hasLanded = true;
        releaseShield();

        if (!isLeave) {
          return;
        }
      }

      if (isOverReferenceEl) {
        hasLanded = false;
        releaseShield();
      }

      if (isOverReferenceEl && !isLeave) {
        return;
      }

      if (
        isLeave &&
        isElement(event.relatedTarget) &&
        elements.floating &&
        contains(elements.floating, event.relatedTarget)
      ) {
        return;
      }

      if (isPointerLeavingOppositeSide(side, x, y, anchorRect)) {
        closeIfNoOpenChild();
        return;
      }

      // Safe polygon corridor vertices notification
      const polygon = buildSafePolygon(side, x, y, floatingRect, anchorRect, buffer);
      options.onPolygonChange?.(polygon);

      // 1. Trough check: rectangular corridor between anchor and floating element
      if (isInsideTrough(side, clientX, clientY, floatingRect, anchorRect)) {
        return;
      }

      // 2. Landing check: once landed on floating element, leaving it should close unless returning to reference
      if (hasLanded && !isOverReferenceRect) {
        closeIfNoOpenChild();
        return;
      }

      // 3. Intent check: a decelerating cursor is not heading for the floating
      //    element, so the corridor no longer applies.
      if (!isLeave && requireIntent && isCursorMovingSlowly(clientX, clientY)) {
        closeIfNoOpenChild();
        return;
      }

      // 4. Safe polygon corridor check with intent detection
      if (isPointInPolygon(clientPoint, polygon)) {
        if (!hasLanded && requireIntent) {
          // Watchdog: each move clears and resets the timer. If the cursor
          // stops inside the polygon (no further pointermove events), the
          // timeout fires and closes the floating element.
          if (ownerWin) {
            timeoutId = ownerWin.setTimeout(closeIfNoOpenChild, intentTimeout);
          }
        }
        return;
      }

      // Outside both safe areas: close immediately.
      closeIfNoOpenChild();
    };

    onMouseMove.cleanup = releaseShield;

    return onMouseMove;
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Fast axis-aligned trough containment test between anchor and floating elements.
 */
function isInsideTrough(
  side: Side,
  clientX: number,
  clientY: number,
  floatingRect: DOMRect,
  anchorRect: DOMRect,
): boolean {
  const isFloatingWider = floatingRect.width > anchorRect.width;
  const isFloatingTaller = floatingRect.height > anchorRect.height;
  const left = (isFloatingWider ? anchorRect : floatingRect).left;
  const right = (isFloatingWider ? anchorRect : floatingRect).right;
  const top = (isFloatingTaller ? anchorRect : floatingRect).top;
  const bottom = (isFloatingTaller ? anchorRect : floatingRect).bottom;

  switch (side) {
    case "top":
      return isInsideAxisAlignedRect(
        clientX,
        clientY,
        left,
        anchorRect.top + 1,
        right,
        floatingRect.bottom - 1,
      );
    case "bottom":
      return isInsideAxisAlignedRect(
        clientX,
        clientY,
        left,
        floatingRect.top + 1,
        right,
        anchorRect.bottom - 1,
      );
    case "left":
      return isInsideAxisAlignedRect(
        clientX,
        clientY,
        floatingRect.right - 1,
        bottom,
        anchorRect.left + 1,
        top,
      );
    case "right":
      return isInsideAxisAlignedRect(
        clientX,
        clientY,
        anchorRect.right - 1,
        bottom,
        floatingRect.left + 1,
        top,
      );
  }
}

/**
 * Resolves the underlying HTMLElement from an AnchorElement (HTMLElement or VirtualElement).
 */
function resolveReferenceElement(domReference: AnchorElement | null): HTMLElement | null {
  if (isElement(domReference)) {
    return domReference as HTMLElement;
  }

  return (domReference?.contextElement as HTMLElement) ?? null;
}

/**
 * Records one hold per target, capturing each element's current inline value
 * the first time it is shielded so it can be restored verbatim later.
 */
function retainShieldHolds(targets: HTMLElement[]): void {
  for (const el of targets) {
    const hold = shieldHolds.get(el);

    if (hold) {
      hold.count += 1;
    } else {
      shieldHolds.set(el, { count: 1, previous: el.style.pointerEvents });
    }
  }
}

/**
 * Drops one hold per target and returns only the elements whose last hold just
 * cleared, paired with the inline value to restore.
 */
function releaseShieldHolds(targets: HTMLElement[]): Array<[HTMLElement, string]> {
  const released: Array<[HTMLElement, string]> = [];

  for (const el of targets) {
    const hold = shieldHolds.get(el);
    if (!hold) continue;

    hold.count -= 1;
    if (hold.count === 0) {
      shieldHolds.delete(el);
      released.push([el, hold.previous]);
    }
  }

  return released;
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
   * @default 0.5
   */
  buffer?: number;

  /**
   * Requires the cursor to keep moving toward the floating element before the
   * polygon protection fully applies. When disabled, a parked cursor holds the
   * floating element open until it leaves the corridor.
   * @default true
   */
  requireIntent?: boolean;

  /**
   * Delay in milliseconds before closing when the cursor stops dispatching
   * pointermove events inside the corridor.
   * @default 40
   */
  intentTimeout?: number;

  /**
   * Blocks background pointer events during corridor traversal by disabling
   * `pointer-events` on the scope while re-enabling the anchor and floating
   * element. When true, an invisible shield is active while the corridor runs.
   * @default false
   */
  blockPointerEvents?: boolean;

  /**
   * Resolves the element subtree to shield when `blockPointerEvents` is
   * enabled. Defaults to the anchor's `document.body`. Narrow this to a
   * container (a submenu list, for example) to keep the rest of the page
   * interactive during traversal.
   */
  getScope?: () => HTMLElement | null;

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
  /**
   * Corridor padding. Overridden by `SafePolygonOptions.buffer` when set.
   * @default 0.5
   */
  buffer?: number;
  onClose: () => void;
  hasOpenChild?: () => boolean;
  side?: Side;
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
