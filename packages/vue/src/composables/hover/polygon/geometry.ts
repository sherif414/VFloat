export type Point = [number, number];
export type Polygon = Point[];

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Side = "top" | "right" | "bottom" | "left";

/**
 * Resolves which side the floating element is on relative to the anchor.
 *
 * It measures the gap (or overlap) between the facing edges of the anchor
 * and floating element on all four sides:
 *
 * - `bottom`: floating top - anchor bottom (gap below anchor)
 * - `top`: anchor top - floating bottom (gap above anchor)
 * - `right`: floating left - anchor right (gap to the right of anchor)
 * - `left`: anchor left - floating right (gap to the left of anchor)
 *
 * A positive distance indicates a visible gap; a negative distance indicates
 * an overlap. The side with the largest separation (greatest positive gap or
 * smallest overlap/least-negative value) wins.
 *
 * If there is a tie, it compares the centers of both rectangles to determine the
 * dominant direction (horizontal vs. vertical center offset) as a tie-breaker.
 */
export function resolveSide(floatingRect: DOMRect, anchorRect: DOMRect): Side {
  const separations: Array<[Side, number]> = [
    ["bottom", floatingRect.top - anchorRect.bottom],
    ["top", anchorRect.top - floatingRect.bottom],
    ["right", floatingRect.left - anchorRect.right],
    ["left", anchorRect.left - floatingRect.right],
  ];
  const greatestSeparation = Math.max(...separations.map(([, separation]) => separation));
  const candidates = separations
    .filter(([, separation]) => separation === greatestSeparation)
    .map(([side]) => side);

  if (candidates.length === 1) {
    return candidates[0]!;
  }

  const dx = floatingRect.left + floatingRect.width / 2 - (anchorRect.left + anchorRect.width / 2);
  const dy = floatingRect.top + floatingRect.height / 2 - (anchorRect.top + anchorRect.height / 2);
  const centerSide: Side =
    Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "top" : "bottom";

  return candidates.includes(centerSide) ? centerSide : candidates[0]!;
}

/**
 * Checks whether a point falls within a rectangle.
 */
export function isInside(point: Point, rect: Rect): boolean {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  );
}

/**
 * Ray-casting point-in-polygon test used by the safe-polygon bridge.
 */
export function isPointInPolygon(point: Point, polygon: Polygon) {
  const [x, y] = point;
  let isInsidePolygon = false;
  const length = polygon.length;

  for (let i = 0, j = length - 1; i < length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    const intersect = yi >= y !== yj >= y && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      isInsidePolygon = !isInsidePolygon;
    }
  }

  return isInsidePolygon;
}

/**
 * Detects when the pointer exits from the side opposite the floating content.
 *
 * In that case the user is moving away from the floating element, so the safe
 * polygon should not keep the interaction open.
 */
export function isPointerLeavingOppositeSide(
  side: Side,
  leaveX: number,
  leaveY: number,
  refRect: DOMRect | undefined,
): boolean {
  return (
    (side === "top" && leaveY >= (refRect?.bottom ?? 0) - 1) ||
    (side === "bottom" && leaveY <= (refRect?.top ?? 0) + 1) ||
    (side === "left" && leaveX >= (refRect?.right ?? 0) - 1) ||
    (side === "right" && leaveX <= (refRect?.left ?? 0) + 1)
  );
}

/**
 * Builds the travel cone: the convex hull of the leave point (padded by
 * `buffer` on every side) and the floating rect. Any point inside it lies on
 * a straight path from the leave point to some point of the floating element.
 *
 * Unlike a per-side vertex recipe, the hull is exact for every placement and
 * alignment, so the cone never grows wider than the floating element itself.
 */
export function buildCorridor([x, y]: Point, rect: DOMRect, buffer: number): Polygon {
  return convexHull([
    [x - buffer, y - buffer],
    [x + buffer, y - buffer],
    [x + buffer, y + buffer],
    [x - buffer, y + buffer],
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.right, rect.bottom],
    [rect.left, rect.bottom],
  ]);
}

/**
 * Euclidean distance from a point to the nearest edge of a rect (0 inside).
 */
export function distanceToRect([x, y]: Point, rect: DOMRect): number {
  return Math.hypot(
    Math.max(rect.left - x, 0, x - rect.right),
    Math.max(rect.top - y, 0, y - rect.bottom),
  );
}

/**
 * Checks whether a point sits in the gap strictly between the anchor and the
 * floating element, limited to the span where both elements overlap.
 */
export function isInsideGap(
  side: Side,
  [x, y]: Point,
  anchor: DOMRect,
  floating: DOMRect,
): boolean {
  const isVertical = side === "top" || side === "bottom";
  const cross = isVertical ? x : y;
  const crossStart = isVertical
    ? Math.max(anchor.left, floating.left)
    : Math.max(anchor.top, floating.top);
  const crossEnd = isVertical
    ? Math.min(anchor.right, floating.right)
    : Math.min(anchor.bottom, floating.bottom);
  const main = isVertical ? y : x;
  const [mainStart, mainEnd] = {
    bottom: [anchor.bottom, floating.top],
    top: [floating.bottom, anchor.top],
    right: [anchor.right, floating.left],
    left: [floating.right, anchor.left],
  }[side];

  return cross >= crossStart && cross <= crossEnd && main >= mainStart && main <= mainEnd;
}

/**
 * Andrew's monotone chain convex hull.
 */
function convexHull(points: Point[]): Polygon {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (pts: Point[]): Polygon => {
    const hull: Polygon = [];
    for (const p of pts) {
      while (hull.length >= 2 && cross(hull.at(-2)!, hull.at(-1)!, p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  };

  return [...chain(sorted), ...chain(sorted.toReversed())];
}
