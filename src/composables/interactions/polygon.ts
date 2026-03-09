import { computed } from "vue"
import { clearTimeoutIfSet, contains, getCurrentTime, getTarget, isHTMLElement } from "@/utils"
import type { AnchorElement, FloatingContext, FloatingElement } from "../positioning/use-floating"

/**
 * @module polygon
 *
 * Provides a **safe polygon** algorithm for hover interactions.
 *
 * When a user moves their pointer from a reference element (e.g. a menu trigger)
 * to a floating element (e.g. a dropdown menu), a naive "mouseleave → close"
 * would dismiss the floating element the instant the pointer leaves the
 * reference. The safe polygon solves this by computing a triangular / trapezoidal
 * region between the two elements that acts as a "safe zone" — as long as the
 * pointer stays inside this zone the floating element remains open.
 *
 * The algorithm:
 * 1. On pointer-leave of the reference element, record the cursor position.
 * 2. Build two protective shapes:
 *    - A **rectangular trough** spanning the gap between reference and floating.
 *    - A **triangular / trapezoidal polygon** that fans out from the cursor
 *      position toward the edges of the floating element.
 * 3. On every subsequent `pointermove`, check whether the cursor is inside
 *    either shape. If yes → keep the floating element open. If no → close.
 * 4. An optional **intent** check measures cursor speed; very slow movement
 *    on initial entry may indicate accidental hovering and schedules a close.
 */

// ─── Geometry Types ──────────────────────────────────────────────────────────

type Point = [number, number]
type Polygon = Point[]

type Rect = {
  x: number
  y: number
  width: number
  height: number
}
type Side = "top" | "right" | "bottom" | "left"

// ─── Geometry Helpers ────────────────────────────────────────────────────────

/**
 * Returns `true` when {@link point} lies inside the axis-aligned {@link rect}
 * (inclusive of edges).
 */
function isInside(point: Point, rect: Rect): boolean {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  )
}

/**
 * Ray-casting point-in-polygon test.
 *
 * Casts a horizontal ray from {@link point} toward +∞ and counts the number of
 * polygon edges it crosses. An odd crossing count means the point is inside.
 *
 * @see https://en.wikipedia.org/wiki/Point_in_polygon#Ray_casting_algorithm
 */
function isPointInPolygon(point: Point, polygon: Polygon) {
  const [x, y] = point
  let isInside = false
  const length = polygon.length
  for (let i = 0, j = length - 1; i < length; j = i++) {
    const [xi, yi] = polygon[i] || [0, 0]
    const [xj, yj] = polygon[j] || [0, 0]
    const intersect = yi >= y !== yj >= y && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) {
      isInside = !isInside
    }
  }
  return isInside
}

/**
 * Computes cursor speed between two consecutive `pointermove` events.
 * Returns `null` speed on the very first invocation (no previous point).
 */
function getCursorSpeed(
  x: number,
  y: number,
  lastX: number | null,
  lastY: number | null,
  lastCursorTime: number
): { speed: number | null; lastX: number; lastY: number; lastCursorTime: number } {
  const currentTime = getCurrentTime()
  const elapsedTime = currentTime - lastCursorTime

  if (lastX === null || lastY === null || elapsedTime === 0) {
    return {
      speed: null,
      lastX: x,
      lastY: y,
      lastCursorTime: currentTime,
    }
  }

  const deltaX = x - lastX
  const deltaY = y - lastY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const speed = distance / elapsedTime // px / ms

  return {
    speed,
    lastX: x,
    lastY: y,
    lastCursorTime: currentTime,
  }
}

// ─── Public Types ────────────────────────────────────────────────────────────

export interface SafePolygonOptions {
  /**
   * Extra padding (in pixels) added around the safe polygon to make the
   * traversal zone more forgiving. Larger values create a wider safe area.
   * @default 1
   */
  buffer?: number

  /**
   * When `true`, the floating element's `pointerEvents` style is set to
   * `none` while the safe polygon is active, preventing the floating element
   * from capturing hover events during traversal.
   * @default false
   */
  blockPointerEvents?: boolean

  /**
   * When `true`, enables cursor-speed based intent detection. If the cursor
   * moves very slowly on initial entry into the polygon, it is treated as
   * "accidental" and a short close timer is scheduled.
   * @default true
   */
  requireIntent?: boolean

  /**
   * Optional callback invoked whenever the safe polygon vertices change.
   * Useful for rendering a debug visualisation overlay.
   */
  onPolygonChange?: (polygon: Polygon) => void
}

/**
 * Context object provided to the safe-polygon handler factory.
 *
 * All coordinates are in client (viewport) space.
 */
export interface CreateSafePolygonHandlerContext {
  /** The x position of the cursor when it left the reference element. */
  x: number
  /** The y position of the cursor when it left the reference element. */
  y: number
  /** Current placement side of the floating element relative to its reference. */
  placement: FloatingContext["placement"]["value"]
  /** References to the DOM elements involved. */
  elements: {
    domReference: AnchorElement | null
    floating: FloatingElement | null
  }
  /** Buffer size (px) forwarded from {@link SafePolygonOptions.buffer}. */
  buffer: number
  /** Callback to invoke when the floating element should close. */
  onClose: () => void
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Creates a curried handler for the safe-polygon hover algorithm.
 *
 * **Usage** (typically called internally by `useHover`):
 * ```ts
 * const handler = safePolygon({ buffer: 2 })({
 *   x: cursorX,
 *   y: cursorY,
 *   placement: ctx.placement.value,
 *   elements: { domReference: refEl, floating: floatEl },
 *   buffer: 2,
 *   onClose: () => setOpen(false),
 * })
 *
 * document.addEventListener('pointermove', handler)
 * ```
 *
 * The first call configures options, the second binds a specific floating
 * context, and the returned function is the actual `mousemove` listener.
 *
 * @see https://floating-ui.com/docs/useHover#safepolygon
 */
export function safePolygon(options: SafePolygonOptions = {}) {
  const { blockPointerEvents = false, requireIntent = true } = options

  let timeoutId = -1
  let hasLanded = false


  const fn = function createSafePolygonHandler(context: CreateSafePolygonHandlerContext) {
    const { x, y, placement, elements, buffer: contextBuffer, onClose } = context
    const referenceEl = computed(() => {
      const domReference = elements.domReference
      if (isHTMLElement(domReference)) {
        return domReference
      }
      return (domReference?.contextElement as HTMLElement) ?? null
    })

    // Cursor tracking state for speed / intent detection
    let lastX: number | null = null
    let lastY: number | null = null
    let lastCursorTime = getCurrentTime()

    function close() {
      clearTimeoutIfSet(timeoutId)
      timeoutId = -1
      onClose()
    }
    
    return function onMouseMove(event: MouseEvent) {

      clearTimeoutIfSet(timeoutId)
      timeoutId = -1

      if (
        !elements.domReference ||
        !elements.floating ||
        placement == null ||
        x == null ||
        y == null
      ) {
        return
      }

      const { clientX, clientY } = event
      const clientPoint: Point = [clientX, clientY]
      const target = getTarget(event) as Element | null
      const isLeave = event.type === "mouseleave"
      const isOverFloatingEl = elements.floating && contains(elements.floating, target)
      const isOverReferenceEl = referenceEl.value && contains(referenceEl.value, target)
      const refRect = referenceEl.value?.getBoundingClientRect()
      const rect = elements.floating?.getBoundingClientRect()
      const side = placement.split("-")[0] as Side

      // Determine which quadrant the cursor left from — used to orient the polygon.
      const cursorLeaveFromRight = x > (rect?.right ?? 0) - (rect?.width ?? 0) / 2
      const cursorLeaveFromBottom = y > (rect?.bottom ?? 0) - (rect?.height ?? 0) / 2

      const isOverReferenceRect = refRect ? isInside(clientPoint, refRect) : false

      // When the floating element is wider/taller than the reference, the
      // rectangular trough is anchored to the *reference* rect. Otherwise
      // it is anchored to the *floating* rect. This prevents the trough from
      // extending beyond the narrower element.
      const isFloatingWider = (rect?.width ?? 0) > (refRect?.width ?? 0)
      const isFloatingTaller = (rect?.height ?? 0) > (refRect?.height ?? 0)
      const left = (isFloatingWider ? refRect : rect)?.left ?? 0
      const right = (isFloatingWider ? refRect : rect)?.right ?? 0
      const top = (isFloatingTaller ? refRect : rect)?.top ?? 0
      const bottom = (isFloatingTaller ? refRect : rect)?.bottom ?? 0

      // ── Pointer over floating element ─────────────────────────────────
      if (isOverFloatingEl) {
        hasLanded = true

        if (!isLeave) {
          return
        }
      }

      if (isOverReferenceEl) {
        hasLanded = false
      }

      if (isOverReferenceEl && !isLeave) {
        hasLanded = true
        return
      }

      // Prevent overlapping floating elements from being stuck in an
      // open-close loop when the pointer moves between them.
      // @see https://github.com/floating-ui/floating-ui/issues/1910
      if (
        isLeave &&
        isHTMLElement(event.relatedTarget) &&
        elements.floating &&
        contains(elements.floating, event.relatedTarget)
      ) {
        return
      }

      // ── Opposite-side guard ───────────────────────────────────────────
      // If the pointer is leaving from the side *opposite* to where the
      // floating element lives, there is no meaningful safe zone — close
      // immediately. A constant of 1px accounts for floating-point rounding.
      if (
        (side === "top" && y >= (refRect?.bottom ?? 0) - 1) ||
        (side === "bottom" && y <= (refRect?.top ?? 0) + 1) ||
        (side === "left" && x >= (refRect?.right ?? 0) - 1) ||
        (side === "right" && x <= (refRect?.left ?? 0) + 1)
      ) {
        return close()
      }

      // ── Rectangular trough ────────────────────────────────────────────
      // The trough is the rectangular gap between the reference and
      // floating elements. Moving within this gap is always safe.
      let rectPoly: Point[] = []

      switch (side) {
        case "top":
          rectPoly = [
            [left, (refRect?.top ?? 0) + 1],
            [left, (rect?.bottom ?? 0) - 1],
            [right, (rect?.bottom ?? 0) - 1],
            [right, (refRect?.top ?? 0) + 1],
          ]
          break
        case "bottom":
          rectPoly = [
            [left, (rect?.top ?? 0) + 1],
            [left, (refRect?.bottom ?? 0) - 1],
            [right, (refRect?.bottom ?? 0) - 1],
            [right, (rect?.top ?? 0) + 1],
          ]
          break
        case "left":
          rectPoly = [
            [(rect?.right ?? 0) - 1, bottom],
            [(rect?.right ?? 0) - 1, top],
            [(refRect?.left ?? 0) + 1, top],
            [(refRect?.left ?? 0) + 1, bottom],
          ]
          break
        case "right":
          rectPoly = [
            [(refRect?.right ?? 0) - 1, bottom],
            [(refRect?.right ?? 0) - 1, top],
            [(rect?.left ?? 0) + 1, top],
            [(rect?.left ?? 0) + 1, bottom],
          ]
          break
      }

      // ── Triangular / trapezoidal safe polygon ─────────────────────────
      // Two "cursor points" sit near the leave position (offset by the
      // buffer). Two "common points" sit on the edges of the floating
      // element. Together they form a trapezoid that fans outward from the
      // cursor toward the floating element, giving the user a generous
      // corridor to traverse.
      function getPolygon([x, y]: Point): Array<Point> {
        const actualBuffer = contextBuffer
        switch (side) {
          case "top": {
            const cursorPointOne: Point = [
              isFloatingWider
                ? x + actualBuffer / 2
                : cursorLeaveFromRight
                  ? x + actualBuffer * 4
                  : x - actualBuffer * 4,
              y + actualBuffer + 1,
            ]
            const cursorPointTwo: Point = [
              isFloatingWider
                ? x - actualBuffer / 2
                : cursorLeaveFromRight
                  ? x + actualBuffer * 4
                  : x - actualBuffer * 4,
              y + actualBuffer + 1,
            ]
            const commonPoints: [Point, Point] = [
              [
                rect?.left ?? 0,
                cursorLeaveFromRight
                  ? (rect?.bottom ?? 0) - actualBuffer
                  : isFloatingWider
                    ? (rect?.bottom ?? 0) - actualBuffer
                    : (rect?.top ?? 0),
              ],
              [
                rect?.right ?? 0,
                cursorLeaveFromRight
                  ? isFloatingWider
                    ? (rect?.bottom ?? 0) - actualBuffer
                    : (rect?.top ?? 0)
                  : (rect?.bottom ?? 0) - actualBuffer,
              ],
            ]

            return [cursorPointOne, cursorPointTwo, ...commonPoints]
          }
          case "bottom": {
            const cursorPointOne: Point = [
              isFloatingWider
                ? x + actualBuffer / 2
                : cursorLeaveFromRight
                  ? x + actualBuffer * 4
                  : x - actualBuffer * 4,
              y - actualBuffer,
            ]
            const cursorPointTwo: Point = [
              isFloatingWider
                ? x - actualBuffer / 2
                : cursorLeaveFromRight
                  ? x + actualBuffer * 4
                  : x - actualBuffer * 4,
              y - actualBuffer,
            ]
            const commonPoints: [Point, Point] = [
              [
                rect?.left ?? 0,
                cursorLeaveFromRight
                  ? (rect?.top ?? 0) + actualBuffer
                  : isFloatingWider
                    ? (rect?.top ?? 0) + actualBuffer
                    : (rect?.bottom ?? 0),
              ],
              [
                rect?.right ?? 0,
                cursorLeaveFromRight
                  ? isFloatingWider
                    ? (rect?.top ?? 0) + actualBuffer
                    : (rect?.bottom ?? 0)
                  : (rect?.top ?? 0) + actualBuffer,
              ],
            ]

            return [cursorPointOne, cursorPointTwo, ...commonPoints]
          }
          case "left": {
            const cursorPointOne: Point = [
              x + actualBuffer + 1,
              isFloatingTaller
                ? y + actualBuffer / 2
                : cursorLeaveFromBottom
                  ? y + actualBuffer * 4
                  : y - actualBuffer * 4,
            ]
            const cursorPointTwo: Point = [
              x + actualBuffer + 1,
              isFloatingTaller
                ? y - actualBuffer / 2
                : cursorLeaveFromBottom
                  ? y + actualBuffer * 4
                  : y - actualBuffer * 4,
            ]
            const commonPoints: [Point, Point] = [
              [
                cursorLeaveFromBottom
                  ? (rect?.right ?? 0) - actualBuffer
                  : isFloatingTaller
                    ? (rect?.right ?? 0) - actualBuffer
                    : (rect?.left ?? 0),
                rect?.top ?? 0,
              ],
              [
                cursorLeaveFromBottom
                  ? isFloatingTaller
                    ? (rect?.right ?? 0) - actualBuffer
                    : (rect?.left ?? 0)
                  : (rect?.right ?? 0) - actualBuffer,
                rect?.bottom ?? 0,
              ],
            ]

            return [...commonPoints, cursorPointOne, cursorPointTwo]
          }
          case "right": {
            const cursorPointOne: Point = [
              x - actualBuffer,
              isFloatingTaller
                ? y + actualBuffer / 2
                : cursorLeaveFromBottom
                  ? y + actualBuffer * 4
                  : y - actualBuffer * 4,
            ]
            const cursorPointTwo: Point = [
              x - actualBuffer,
              isFloatingTaller
                ? y - actualBuffer / 2
                : cursorLeaveFromBottom
                  ? y + actualBuffer * 4
                  : y - actualBuffer * 4,
            ]
            const commonPoints: [Point, Point] = [
              [
                cursorLeaveFromBottom
                  ? (rect?.left ?? 0) + actualBuffer
                  : isFloatingTaller
                    ? (rect?.left ?? 0) + actualBuffer
                    : (rect?.right ?? 0),
                rect?.top ?? 0,
              ],
              [
                cursorLeaveFromBottom
                  ? isFloatingTaller
                    ? (rect?.left ?? 0) + actualBuffer
                    : (rect?.right ?? 0)
                  : (rect?.left ?? 0) + actualBuffer,
                rect?.bottom ?? 0,
              ],
            ]

            return [cursorPointOne, cursorPointTwo, ...commonPoints]
          }
        }
      }

      // Notify debug visualisation of the current polygon shape
      const polygon = getPolygon([x, y])
      options.onPolygonChange?.(polygon)

      // ── Hit testing ───────────────────────────────────────────────────
      // Cursor in the rectangular trough → always safe
      if (isPointInPolygon(clientPoint, rectPoly)) {
        return
      }

      // Cursor in the triangular safe polygon
      if (isPointInPolygon(clientPoint, polygon)) {
        // Apply intent detection only on initial entry (before landing)
        if (!hasLanded && requireIntent) {
          const speedResult = getCursorSpeed(
            event.clientX,
            event.clientY,
            lastX,
            lastY,
            lastCursorTime
          )
          lastX = speedResult.lastX
          lastY = speedResult.lastY
          lastCursorTime = speedResult.lastCursorTime

          // Very slow cursor movement may be accidental — schedule close
          const cursorSpeedThreshold = 0.1 // px/ms
          if (speedResult.speed !== null && speedResult.speed < cursorSpeedThreshold) {
            timeoutId = window.setTimeout(close, 40)
          }
        }
        return
      }

      // ── Outside both safe areas ───────────────────────────────────────
      if (hasLanded && !isOverReferenceRect) {
        return close()
      }

      close()
    }
  }

  fn.__options = {
    blockPointerEvents,
  }

  return fn
}
