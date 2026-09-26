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
 * Fast axis-aligned bounding box containment test without allocations.
 */
export function isInsideAxisAlignedRect(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

/**
 * Ray-casting point-in-polygon test used by the safe-polygon bridge.
 */
export function isPointInPolygon(point: Point, polygon: Polygon) {
  const [x, y] = point;
  let isInsidePolygon = false;
  const length = polygon.length;

  for (let i = 0, j = length - 1; i < length; j = i++) {
    const [xi, yi] = polygon[i] || [0, 0];
    const [xj, yj] = polygon[j] || [0, 0];
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
 * Builds the intent polygon that extends from the leave point toward the
 * floating element.
 */
export function buildSafePolygon(
  side: Side,
  leaveX: number,
  leaveY: number,
  rect: DOMRect | undefined,
  refRect: DOMRect | undefined,
  buffer: number,
): Polygon {
  const isFloatingWider = (rect?.width ?? 0) > (refRect?.width ?? 0);
  const isFloatingTaller = (rect?.height ?? 0) > (refRect?.height ?? 0);
  const cursorLeaveFromRight = leaveX > (rect?.right ?? 0) - (rect?.width ?? 0) / 2;
  const cursorLeaveFromBottom = leaveY > (rect?.bottom ?? 0) - (rect?.height ?? 0) / 2;

  switch (side) {
    case "top": {
      const cursorPointOne: Point = [
        isFloatingWider
          ? leaveX + buffer / 2
          : cursorLeaveFromRight
            ? leaveX + buffer * 4
            : leaveX - buffer * 4,
        leaveY + buffer + 1,
      ];
      const cursorPointTwo: Point = [
        isFloatingWider
          ? leaveX - buffer / 2
          : cursorLeaveFromRight
            ? leaveX + buffer * 4
            : leaveX - buffer * 4,
        leaveY + buffer + 1,
      ];
      const commonPoints: [Point, Point] = [
        [
          rect?.left ?? 0,
          cursorLeaveFromRight
            ? (rect?.bottom ?? 0) - buffer
            : isFloatingWider
              ? (rect?.bottom ?? 0) - buffer
              : (rect?.top ?? 0),
        ],
        [
          rect?.right ?? 0,
          cursorLeaveFromRight
            ? isFloatingWider
              ? (rect?.bottom ?? 0) - buffer
              : (rect?.top ?? 0)
            : (rect?.bottom ?? 0) - buffer,
        ],
      ];

      return [cursorPointOne, cursorPointTwo, ...commonPoints];
    }
    case "bottom": {
      const cursorPointOne: Point = [
        isFloatingWider
          ? leaveX + buffer / 2
          : cursorLeaveFromRight
            ? leaveX + buffer * 4
            : leaveX - buffer * 4,
        leaveY - buffer,
      ];
      const cursorPointTwo: Point = [
        isFloatingWider
          ? leaveX - buffer / 2
          : cursorLeaveFromRight
            ? leaveX + buffer * 4
            : leaveX - buffer * 4,
        leaveY - buffer,
      ];
      const commonPoints: [Point, Point] = [
        [
          rect?.left ?? 0,
          cursorLeaveFromRight
            ? (rect?.top ?? 0) + buffer
            : isFloatingWider
              ? (rect?.top ?? 0) + buffer
              : (rect?.bottom ?? 0),
        ],
        [
          rect?.right ?? 0,
          cursorLeaveFromRight
            ? isFloatingWider
              ? (rect?.top ?? 0) + buffer
              : (rect?.bottom ?? 0)
            : (rect?.top ?? 0) + buffer,
        ],
      ];

      return [cursorPointOne, cursorPointTwo, ...commonPoints];
    }
    case "left": {
      const cursorPointOne: Point = [
        leaveX + buffer + 1,
        isFloatingTaller
          ? leaveY + buffer / 2
          : cursorLeaveFromBottom
            ? leaveY + buffer * 4
            : leaveY - buffer * 4,
      ];
      const cursorPointTwo: Point = [
        leaveX + buffer + 1,
        isFloatingTaller
          ? leaveY - buffer / 2
          : cursorLeaveFromBottom
            ? leaveY + buffer * 4
            : leaveY - buffer * 4,
      ];
      const commonPoints: [Point, Point] = [
        [
          cursorLeaveFromBottom
            ? (rect?.right ?? 0) - buffer
            : isFloatingTaller
              ? (rect?.right ?? 0) - buffer
              : (rect?.left ?? 0),
          rect?.top ?? 0,
        ],
        [
          cursorLeaveFromBottom
            ? isFloatingTaller
              ? (rect?.right ?? 0) - buffer
              : (rect?.left ?? 0)
            : (rect?.right ?? 0) - buffer,
          rect?.bottom ?? 0,
        ],
      ];

      return [...commonPoints, cursorPointOne, cursorPointTwo];
    }
    case "right": {
      const cursorPointOne: Point = [
        leaveX - buffer,
        isFloatingTaller
          ? leaveY + buffer / 2
          : cursorLeaveFromBottom
            ? leaveY + buffer * 4
            : leaveY - buffer * 4,
      ];
      const cursorPointTwo: Point = [
        leaveX - buffer,
        isFloatingTaller
          ? leaveY - buffer / 2
          : cursorLeaveFromBottom
            ? leaveY + buffer * 4
            : leaveY - buffer * 4,
      ];
      const commonPoints: [Point, Point] = [
        [
          cursorLeaveFromBottom
            ? (rect?.left ?? 0) + buffer
            : isFloatingTaller
              ? (rect?.left ?? 0) + buffer
              : (rect?.right ?? 0),
          rect?.top ?? 0,
        ],
        [
          cursorLeaveFromBottom
            ? isFloatingTaller
              ? (rect?.left ?? 0) + buffer
              : (rect?.right ?? 0)
            : (rect?.left ?? 0) + buffer,
          rect?.bottom ?? 0,
        ],
      ];

      return [cursorPointOne, cursorPointTwo, ...commonPoints];
    }
  }
}
