import { describe, expect, it } from "vite-plus/test";
import {
  buildRectangularTrough,
  buildSafePolygon,
  getCursorSpeed,
  isPointInPolygon,
  resolveSide,
} from "@/composables/hover/polygon";

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
  } as DOMRect;
}

describe("polygon geometry", () => {
  it.each([
    ["top", createRect(75, -90, 150, 80)],
    ["right", createRect(210, 10, 150, 80)],
    ["bottom", createRect(75, 110, 150, 80)],
    ["left", createRect(-160, 10, 150, 80)],
  ] as const)("resolves the %s side from element geometry", (side, floatingRect) => {
    expect(resolveSide(floatingRect, createRect(50, 0, 100, 100))).toBe(side);
  });

  it("uses the greatest edge separation for diagonal geometry", () => {
    expect(resolveSide(createRect(210, 110, 150, 80), createRect(50, 0, 100, 100))).toBe("right");
  });

  it("resolves overlapping rectangles from their nearest opposing edges", () => {
    expect(resolveSide(createRect(75, 60, 150, 80), createRect(50, 0, 100, 100))).toBe("bottom");
  });

  it("falls back to bottom for coincident rectangles", () => {
    expect(resolveSide(createRect(50, 0, 100, 100), createRect(50, 0, 100, 100))).toBe("bottom");
  });

  it("builds a rectangular trough between the reference and floating element", () => {
    const trough = buildRectangularTrough(
      "bottom",
      createRect(75, 110, 150, 80),
      createRect(50, 0, 100, 100),
    );

    expect(trough).toHaveLength(4);
    expect(isPointInPolygon([100, 105], trough)).toBe(true);
  });

  it("builds a safe polygon for the active side", () => {
    const polygon = buildSafePolygon(
      "bottom",
      100,
      99,
      createRect(75, 110, 150, 80),
      createRect(50, 0, 100, 100),
      4,
    );

    expect(polygon).toHaveLength(4);
    expect(polygon[0]?.[1]).toBe(95);
    expect(polygon[1]?.[1]).toBe(95);
    expect(polygon.some(([x]) => x === 75 || x === 225)).toBe(true);
  });

  it("computes cursor speed from successive points", () => {
    const speed = getCursorSpeed(20, 10, 10, 10, 1000, 1020);

    expect(speed.speed).toBe(0.5);
    expect(speed.lastX).toBe(20);
    expect(speed.lastCursorTime).toBe(1020);
  });
});
