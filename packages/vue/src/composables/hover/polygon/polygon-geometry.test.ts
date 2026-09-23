import { describe, expect, it } from "vitest";
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

describe("Feature: Hover corridor polygon geometry", () => {
  describe("Scenario: Relative placement side resolution", () => {
    it.each([
      ["top", createRect(75, -90, 150, 80)],
      ["right", createRect(210, 10, 150, 80)],
      ["bottom", createRect(75, 110, 150, 80)],
      ["left", createRect(-160, 10, 150, 80)],
    ] as const)(
      "Given floating element placed %s of reference, When resolving side, Then %s is returned",
      (side, floatingRect) => {
        expect(resolveSide(floatingRect, createRect(50, 0, 100, 100))).toBe(side);
      },
    );

    it("Given diagonal geometry with greater horizontal separation, When resolving side, Then greatest separation edge is returned", () => {
      expect(resolveSide(createRect(210, 110, 150, 80), createRect(50, 0, 100, 100))).toBe("right");
    });

    it("Given overlapping rectangles, When resolving side, Then nearest opposing edge is returned", () => {
      expect(resolveSide(createRect(75, 60, 150, 80), createRect(50, 0, 100, 100))).toBe("bottom");
    });

    it("Given coincident identical rectangles, When resolving side, Then bottom fallback is returned", () => {
      expect(resolveSide(createRect(50, 0, 100, 100), createRect(50, 0, 100, 100))).toBe("bottom");
    });
  });

  describe("Scenario: Rectangular trough construction", () => {
    it("Given reference and floating bounding boxes, When building a trough corridor, Then a 4-point polygon connecting boundaries is constructed", () => {
      const trough = buildRectangularTrough(
        "bottom",
        createRect(75, 110, 150, 80),
        createRect(50, 0, 100, 100),
      );

      expect(trough).toHaveLength(4);
      expect(isPointInPolygon([100, 105], trough)).toBe(true);
      expect(isPointInPolygon([0, 0], trough)).toBe(false);
    });
  });

  describe("Scenario: Safe polygon construction", () => {
    it("Given cursor position and target geometry, When constructing a safe polygon corridor, Then an expanded buffer polygon is built", () => {
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
  });

  describe("Scenario: Polygon raycasting point containment", () => {
    it("Given a 2D bounding polygon, When testing interior and exterior points, Then raycasting accurately determines containment", () => {
      const polygon: Array<[number, number]> = [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ];

      expect(isPointInPolygon([50, 50], polygon)).toBe(true);
      expect(isPointInPolygon([150, 50], polygon)).toBe(false);
      expect(isPointInPolygon([50, 150], polygon)).toBe(false);
      expect(isPointInPolygon([-10, -10], polygon)).toBe(false);
    });
  });

  describe("Scenario: Cursor velocity measurement", () => {
    it("Given successive cursor coordinates with positive elapsed time, When calculating speed, Then pixel velocity per millisecond is computed", () => {
      const speed = getCursorSpeed(20, 10, 10, 10, 1000, 1020);

      expect(speed.speed).toBe(0.5);
      expect(speed.lastX).toBe(20);
      expect(speed.lastCursorTime).toBe(1020);
    });

    it("Given zero elapsed time or missing previous coordinates, When calculating speed, Then null speed is returned", () => {
      const zeroElapsed = getCursorSpeed(20, 10, 10, 10, 1000, 1000);
      expect(zeroElapsed.speed).toBeNull();

      const missingPrevious = getCursorSpeed(20, 10, null, null, 1000, 1020);
      expect(missingPrevious.speed).toBeNull();
    });
  });
});
