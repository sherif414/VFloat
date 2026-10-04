import type { AnchorElement, FloatingElement } from "@/composables/floating-node";
import { clearTimeoutIfSet, contains, getCurrentTime, getTarget, isElement } from "@/shared/dom";
import { getWindow } from "@/shared/env";
import {
  buildCorridor,
  distanceToRect,
  isInside,
  isInsideGap,
  isPointInPolygon,
  type Point,
  type Polygon,
  resolveSide,
  type Side,
} from "./geometry";

/**
 * Default apex padding in pixels around the leave point.
 */
const DEFAULT_BUFFER = 0.5;

/**
 * Default time in milliseconds the cursor may go without progress toward the
 * floating element before the corridor closes.
 */
const DEFAULT_INTENT_TIMEOUT = 100;

/**
 * Minimum travel in pixels before a move is judged. Smaller moves are hand
 * tremor or sub-pixel noise: they neither close the corridor nor count as
 * progress. Matches the rest-detection threshold in `useHover`.
 */
const MIN_STEP = 4;

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
 * cursor travels from the anchor toward the floating panel.
 *
 * A move keeps the corridor open only when it stays inside the travel cone
 * (leave point → floating rect) AND brings the cursor closer to the floating
 * element. The gap directly between both elements is exempt from the
 * direction check so small corrections there never close the panel.
 */
export function safePolygon(options: SafePolygonOptions = {}): SafePolygon {
  const {
    requireIntent = true,
    intentTimeout = DEFAULT_INTENT_TIMEOUT,
    blockPointerEvents = false,
  } = options;

  return function createSafePolygonHandler(node: CreateSafePolygonHandlerContext) {
    const { x, y, elements, onClose, hasOpenChild, side: contextSide } = node;
    const referenceEl = resolveReferenceElement(elements.domReference);
    const buffer = options.buffer ?? node.buffer ?? DEFAULT_BUFFER;
    const ownerWin = getWindow(referenceEl);
    const leavePoint: Point = [x, y];

    // Traversal state is scoped to a single corridor traversal so a reused
    // `safePolygon()` factory never leaks landing or progress state.
    let hasLanded = false;
    let lastPoint: Point = leavePoint;

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

    const stopWatchdog = (): void => {
      clearTimeoutIfSet(timeoutId);
      timeoutId = -1;
    };

    /**
     * Rearmed only by real progress, so a parked cursor, a crawl below
     * `MIN_STEP` per `intentTimeout`, or a stalled event stream all close.
     */
    const armWatchdog = (): void => {
      stopWatchdog();
      if (requireIntent && ownerWin) {
        timeoutId = ownerWin.setTimeout(closeIfNoOpenChild, intentTimeout);
      }
    };

    const releaseShield = (): void => {
      if (!shieldTargets) return;

      for (const [el, previous] of releaseShieldHolds(shieldTargets)) {
        if (previous) {
          el.style.pointerEvents = previous;
        } else {
          el.style.removeProperty("pointer-events");
        }
      }

      shieldTargets = null;
    };

    const startShield = (): void => {
      const floatingEl = elements.floating;
      if (!blockPointerEvents || !referenceEl || !floatingEl) return;

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

    const dispose = (): void => {
      stopWatchdog();
      releaseShield();
    };

    function closeIfNoOpenChild(): void {
      if (hasOpenChild?.()) return;
      dispose();
      onClose();
    }

    startShield();
    // A cursor that stops right after leaving the anchor dispatches no further
    // events, so the watchdog must already be running.
    armWatchdog();

    const onMouseMove = function onMouseMove(event: MouseEvent) {
      const floatingEl = elements.floating;
      if (hasOpenChild?.() || !referenceEl || !floatingEl) return;

      const now = readTime();
      if (!cachedAnchorRect || !cachedFloatingRect || now - lastRectTime > RECT_CACHE_MS) {
        cachedAnchorRect = referenceEl.getBoundingClientRect();
        cachedFloatingRect = floatingEl.getBoundingClientRect();
        lastRectTime = now;
      }
      const anchorRect = cachedAnchorRect;
      const floatingRect = cachedFloatingRect;

      const point: Point = [event.clientX, event.clientY];
      const target = getTarget(event) as Element | null;

      // The geometric tests back up `contains` because a shielded background
      // element becomes the event target while the cursor sits over an end.
      if (contains(floatingEl, target) || isInside(point, floatingRect)) {
        hasLanded = true;
        stopWatchdog();
        releaseShield();
        return;
      }

      if (contains(referenceEl, target) || isInside(point, anchorRect)) {
        hasLanded = false;
        lastPoint = point;
        stopWatchdog();
        releaseShield();
        return;
      }

      const side = contextSide ?? resolveSide(floatingRect, anchorRect);
      const isInGap = isInsideGap(side, point, anchorRect, floatingRect);

      // Once on the panel, only the gap back to the anchor stays safe.
      if (hasLanded) {
        if (!isInGap) closeIfNoOpenChild();
        return;
      }

      const corridor = buildCorridor(leavePoint, floatingRect, buffer);
      options.onPolygonChange?.(corridor);

      if (!isInGap && !isPointInPolygon(point, corridor)) {
        closeIfNoOpenChild();
        return;
      }

      if (Math.hypot(point[0] - lastPoint[0], point[1] - lastPoint[1]) < MIN_STEP) return;

      if (
        !isInGap &&
        distanceToRect(point, floatingRect) >= distanceToRect(lastPoint, floatingRect)
      ) {
        closeIfNoOpenChild();
        return;
      }

      lastPoint = point;
      armWatchdog();
    };

    onMouseMove.cleanup = dispose;

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
   * Pads the cone apex around the cursor leave point, in pixels.
   * @default 0.5
   */
  buffer?: number;

  /**
   * Closes the corridor when the cursor stops making progress toward the
   * floating element for `intentTimeout` ms. When disabled, a parked cursor
   * holds the floating element open until it moves the wrong way or leaves
   * the corridor.
   * @default true
   */
  requireIntent?: boolean;

  /**
   * Milliseconds the cursor may go without advancing at least 4px toward the
   * floating element before the corridor closes.
   * @default 100
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
   * Cone apex padding. Overridden by `SafePolygonOptions.buffer` when set.
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
