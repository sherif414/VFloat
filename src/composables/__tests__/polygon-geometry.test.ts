import { describe, expect, it } from "vitest"
import {
  buildRectangularTrough,
  buildSafePolygon,
  getCursorSpeed,
  isPointInPolygon,
} from "@/composables/interactions/polygon"

function createRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect
}

describe("polygon geometry", () => {
  it("builds a rectangular trough between the reference and floating element", () => {
    const trough = buildRectangularTrough(
      "bottom",
      createRect(75, 110, 150, 80),
      createRect(50, 0, 100, 100)
    )

    expect(trough).toHaveLength(4)
    expect(isPointInPolygon([100, 105], trough)).toBe(true)
  })

  it("builds a safe polygon for the active side", () => {
    const polygon = buildSafePolygon(
      "bottom",
      100,
      99,
      createRect(75, 110, 150, 80),
      createRect(50, 0, 100, 100),
      4
    )

    expect(polygon).toHaveLength(4)
    expect(polygon[0]?.[1]).toBe(95)
    expect(polygon[1]?.[1]).toBe(95)
    expect(polygon.some(([x]) => x === 75 || x === 225)).toBe(true)
  })

  it("computes cursor speed from successive points", () => {
    const speed = getCursorSpeed(20, 10, 10, 10, 1000, 1020)

    expect(speed.speed).toBe(0.5)
    expect(speed.lastX).toBe(20)
    expect(speed.lastCursorTime).toBe(1020)
  })
})
