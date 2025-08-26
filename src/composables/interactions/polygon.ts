import { isHTMLElement } from "@/utils"
import type { FloatingContext, FloatingElement, AnchorElement } from "../use-floating"
import type { TreeNode } from "@/composables/use-tree"
import { computed } from "vue"
import {
  contains,
  getTarget,
  getCurrentTime,
  clearTimeoutIfSet,
} from "./utils"

type Point = [number, number]
type Polygon = Point[]
type Rect = {
  x: number
  y: number
  width: number
  height: number
}
type Side = "top" | "right" | "bottom" | "left"

// Timeout management type
type TimeoutId = number

/**
 * Enhanced tree-aware child detection that checks for open nested children
 */
function hasOpenNestedChildren(treeContext: TreeNode<FloatingContext>): boolean {
  return treeContext.children.value.some(
    (child) => child.data.open.value || hasOpenNestedChildren(child)
  )
}

/**
 * Enhanced isInside function that matches React reference behavior
 */
function isInside(point: Point, rect: Rect): boolean {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  )
}

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

function isInsideRect(point: Point, rect: Rect) {
  return isInside(point, rect)
}

export interface SafePolygonOptions {
  buffer?: number
  blockPointerEvents?: boolean
  requireIntent?: boolean
  onPolygonChange?: (polygon: Polygon) => void
}

export interface CreateSafePolygonHandlerContext {
  x: number
  y: number
  placement: FloatingContext["placement"]["value"]
  elements: {
    domReference: AnchorElement | null
    floating: FloatingElement | null
  }
  buffer: number
  onClose: () => void
  nodeId?: string
  tree?: { nodes: Map<string, TreeNode<FloatingContext>> }
}

/**
 * Generates a safe polygon area that the user can traverse without closing the
 * floating element once leaving the reference element.
 * @see https://floating-ui.com/docs/useHover#safepolygon
 */
export function safePolygon(options: SafePolygonOptions = {}) {
  const { buffer = 0.5, blockPointerEvents = false, requireIntent = true } = options

  let timeoutId: TimeoutId = -1
  let hasLanded = false

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

  const fn = function createSafePolygonHandler(context: CreateSafePolygonHandlerContext) {
    const { x, y, placement, elements, buffer: contextBuffer, onClose, nodeId, tree } = context
    const referenceEl = computed(() => {
      const domReference = elements.domReference
      if (isHTMLElement(domReference)) {
        return domReference
      }
      return (domReference?.contextElement as HTMLElement) ?? null
    })

    // Instance-specific cursor tracking
    let lastX: number | null = null
    let lastY: number | null = null
    let lastCursorTime = getCurrentTime()

    return function onMouseMove(event: MouseEvent) {
      function close() {
        clearTimeoutIfSet(timeoutId)
        timeoutId = -1
        onClose()
      }

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
      const cursorLeaveFromRight = x > (rect?.right ?? 0) - (rect?.width ?? 0) / 2
      const cursorLeaveFromBottom = y > (rect?.bottom ?? 0) - (rect?.height ?? 0) / 2
      const isOverReferenceRect = refRect ? isInside(clientPoint, refRect) : false
      const isFloatingWider = (rect?.width ?? 0) > (refRect?.width ?? 0)
      const isFloatingTaller = (rect?.height ?? 0) > (refRect?.height ?? 0)
      const left = (isFloatingWider ? refRect : rect)?.left ?? 0
      const right = (isFloatingWider ? refRect : rect)?.right ?? 0
      const top = (isFloatingTaller ? refRect : rect)?.top ?? 0
      const bottom = (isFloatingTaller ? refRect : rect)?.bottom ?? 0

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

      // Prevent overlapping floating element from being stuck in an open-close
      // loop: https://github.com/floating-ui/floating-ui/issues/1910
      if (
        isLeave &&
        isHTMLElement(event.relatedTarget) &&
        elements.floating &&
        contains(elements.floating, event.relatedTarget)
      ) {
        return
      }

      // If any nested child is open, abort
      if (tree && nodeId) {
        const currentNode = tree.nodes.get(nodeId)
        if (currentNode && hasOpenNestedChildren(currentNode)) {
          return
        }
      }

      // If the pointer is leaving from the opposite side, the "buffer" logic
      // creates a point where the floating element remains open, but should be
      // ignored.
      // A constant of 1 handles floating point rounding errors.
      if (
        (side === "top" && y >= (refRect?.bottom ?? 0) - 1) ||
        (side === "bottom" && y <= (refRect?.top ?? 0) + 1) ||
        (side === "left" && x >= (refRect?.right ?? 0) - 1) ||
        (side === "right" && x <= (refRect?.left ?? 0) + 1)
      ) {
        return close()
      }

      // Ignore when the cursor is within the rectangular trough between the
      // two elements. Since the triangle is created from the cursor point,
      // which can start beyond the ref element's edge, traversing back and
      // forth from the ref to the floating element can cause it to close. This
      // ensures it always remains open in that case.
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

      function getPolygon([x, y]: Point): Array<Point> {
        const actualBuffer = contextBuffer // Use the contextBuffer passed from useHover
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

      // Always calculate and show the polygon for visualization
      const polygon = getPolygon([x, y])
      options.onPolygonChange?.(polygon)

      // Check if cursor is in the rectangular trough (always safe)
      if (isPointInPolygon(clientPoint, rectPoly)) {
        return
      }

      // Check if cursor is in the safe polygon
      if (isPointInPolygon(clientPoint, polygon)) {
        // We're in the safe polygon - stay open
        // Only apply intent detection for initial entry when not landed
        if (!hasLanded && requireIntent) {
          // If cursor speed is too slow on initial entry, it might be accidental
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

          const cursorSpeedThreshold = 0.1
          if (speedResult.speed !== null && speedResult.speed < cursorSpeedThreshold) {
            timeoutId = window.setTimeout(close, 40)
          }
        }
        return
      }

      // We're outside both safe areas - check additional conditions before closing
      if (hasLanded && !isOverReferenceRect) {
        return close()
      }

      // If we reach here, we're outside the safe areas - close
      close()
    }
  }

  fn.__options = {
    blockPointerEvents,
  }

  return fn
}
