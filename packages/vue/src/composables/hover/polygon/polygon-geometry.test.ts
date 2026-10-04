import { describe, expect, it } from "vitest";
import {
  buildCorridor,
  distanceToRect,
  isInsideGap,
  isPointInPolygon,
  resolveSide,
} from "@/composables/hover/polygon";
import { makeDOMRect } from "@/test-utils";

describe("Feature: Hover corridor polygon geometry", () => {
  describe("Scenario: Relative placement side resolution", () => {
    it.each([
      ["top", makeDOMRect(75, -90, 150, 80)],
      ["right", makeDOMRect(210, 10, 150, 80)],
      ["bottom", makeDOMRect(75, 110, 150, 80)],
      ["left", makeDOMRect(-160, 10, 150, 80)],
    ] as const)(
      "Given floating element placed %s of reference, When resolving side, Then %s is returned",
      (side, floatingRect) => {
        expect(resolveSide(floatingRect, makeDOMRect(50, 0, 100, 100))).toBe(side);
      },
    );

    it("Given diagonal geometry with greater horizontal separation, When resolving side, Then greatest separation edge is returned", () => {
      expect(resolveSide(makeDOMRect(210, 110, 150, 80), makeDOMRect(50, 0, 100, 100))).toBe(
        "right",
      );
    });

    it("Given overlapping rectangles, When resolving side, Then nearest opposing edge is returned", () => {
      expect(resolveSide(makeDOMRect(75, 60, 150, 80), makeDOMRect(50, 0, 100, 100))).toBe(
        "bottom",
      );
    });

    it("Given coincident identical rectangles, When resolving side, Then bottom fallback is returned", () => {
      expect(resolveSide(makeDOMRect(50, 0, 100, 100), makeDOMRect(50, 0, 100, 100))).toBe(
        "bottom",
      );
    });
  });

  describe("Scenario: Travel cone construction", () => {
    it("Given a leave point above a floating rect, When building the cone, Then it is the convex hull of the padded apex and the rect", () => {
      const polygon = buildCorridor([100, 0], makeDOMRect(0, 100, 200, 100), 1);

      expect(polygon).toHaveLength(6);
      expect(polygon).toEqual(
        expect.arrayContaining([
          [99, -1],
          [101, -1],
          [0, 100],
          [0, 200],
          [200, 200],
          [200, 100],
        ]),
      );
      expect(isPointInPolygon([100, 50], polygon)).toBe(true);
      expect(isPointInPolygon([20, 50], polygon)).toBe(false);
    });
  });

  describe("Scenario: Distance to the floating rect", () => {
    it("Given points around a rect, When measuring distance, Then the nearest-edge distance is returned", () => {
      const rect = makeDOMRect(0, 0, 100, 100);

      expect(distanceToRect([50, 50], rect)).toBe(0);
      expect(distanceToRect([50, 130], rect)).toBe(30);
      expect(distanceToRect([130, 140], rect)).toBe(50);
    });
  });

  describe("Scenario: Gap strip between anchor and floating element", () => {
    it("Given a floating rect below the anchor, When testing points, Then only the shared span between both rects counts", () => {
      const anchor = makeDOMRect(0, 0, 100, 40);
      const floating = makeDOMRect(50, 60, 200, 100);

      expect(isInsideGap("bottom", [75, 50], anchor, floating)).toBe(true);
      expect(isInsideGap("bottom", [25, 50], anchor, floating)).toBe(false);
      expect(isInsideGap("bottom", [75, 70], anchor, floating)).toBe(false);
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
});
