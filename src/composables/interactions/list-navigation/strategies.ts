export type NavigationAction = { type: "navigate"; index: number | null } | { type: "close" };

export interface StrategyContext {
  current: number | null;
  items: Array<HTMLElement | null>;
  isRtl: boolean;
  loop: boolean;
  allowEscape: boolean;
  isVirtual: boolean;
  cols: number;
  nested: boolean;
  isDisabled: (index: number) => boolean;
  findNextEnabled: (start: number, dir: 1 | -1, wrap: boolean) => number | null;
  getFirstEnabledIndex: () => number | null;
  getLastEnabledIndex: () => number | null;
}

export interface NavigationStrategy {
  handleKey(key: string, context: StrategyContext): NavigationAction | null;
}

/**
 * Shared linear movement helper used by multiple navigation strategies.
 */
function resolveLinearMove(
  current: number | null,
  dir: 1 | -1,
  context: StrategyContext,
): NavigationAction | null {
  const {
    items,
    loop,
    allowEscape,
    isVirtual,
    findNextEnabled,
    getFirstEnabledIndex,
    getLastEnabledIndex,
  } = context;
  const itemCount = items.length;
  const start = current == null ? (dir === 1 ? 0 : itemCount - 1) : current + dir;
  let next = findNextEnabled(start, dir, loop);

  if (next == null && loop) {
    if (allowEscape && isVirtual) {
      return { type: "navigate", index: null };
    }

    next = dir === 1 ? getFirstEnabledIndex() : getLastEnabledIndex();
  }

  if (next != null) {
    return { type: "navigate", index: next };
  }

  return null;
}

/**
 * Arrow-key strategy for one-dimensional vertical lists.
 */
export class VerticalNavigationStrategy implements NavigationStrategy {
  handleKey(key: string, context: StrategyContext): NavigationAction | null {
    const { isRtl, nested } = context;

    if (key === "ArrowDown") return resolveLinearMove(context.current, 1, context);
    if (key === "ArrowUp") return resolveLinearMove(context.current, -1, context);

    if (nested) {
      const closeKey = isRtl ? "ArrowRight" : "ArrowLeft";
      if (key === closeKey) return { type: "close" };
    }

    return null;
  }
}

/**
 * Arrow-key strategy for one-dimensional horizontal lists.
 */
export class HorizontalNavigationStrategy implements NavigationStrategy {
  handleKey(key: string, context: StrategyContext): NavigationAction | null {
    const { isRtl, nested } = context;

    if (key === "ArrowRight") return resolveLinearMove(context.current, isRtl ? -1 : 1, context);
    if (key === "ArrowLeft") return resolveLinearMove(context.current, isRtl ? 1 : -1, context);

    if (nested && key === "ArrowUp") {
      return { type: "close" };
    }

    return null;
  }
}

/**
 * Arrow-key strategy for two-dimensional grids.
 */
export class GridNavigationStrategy implements NavigationStrategy {
  constructor(
    private fallbackToLinear: boolean = false,
    private loopDirection: "row" | "next" = "row",
  ) {}

  handleKey(key: string, context: StrategyContext): NavigationAction | null {
    const {
      current,
      items,
      isRtl,
      isDisabled,
      loop,
      allowEscape,
      isVirtual,
      getFirstEnabledIndex,
      getLastEnabledIndex,
      cols,
    } = context;

    if (key === "ArrowRight" || key === "ArrowLeft") {
      const dir = key === "ArrowRight" ? (isRtl ? -1 : 1) : isRtl ? 1 : -1;

      if (current === null) {
        return resolveLinearMove(current, dir, context);
      }

      const next = current + dir;
      const currentRow = Math.floor(current / cols);
      const nextRow = Math.floor(next / cols);

      if (next >= 0 && next < items.length && currentRow === nextRow && !isDisabled(next)) {
        return { type: "navigate", index: next };
      }

      if (loop) {
        if (allowEscape && isVirtual) {
          const isAtStart = current === 0;
          const isAtEnd = current === items.length - 1;

          if ((dir === -1 && isAtStart) || (dir === 1 && isAtEnd)) {
            return { type: "navigate", index: null };
          }
        }

        let wrapCandidate: number;

        if (this.loopDirection === "next") {
          wrapCandidate = dir === 1 ? current + 1 : current - 1;

          if (wrapCandidate >= items.length) {
            wrapCandidate = 0;
          }

          if (wrapCandidate < 0) {
            wrapCandidate = items.length - 1;
          }
        } else {
          wrapCandidate =
            dir === 1 ? currentRow * cols : Math.min((currentRow + 1) * cols - 1, items.length - 1);
        }

        if (this.loopDirection === "next") {
          // Continue moving in reading order until an enabled cell is found.
          let candidate = wrapCandidate;

          for (let i = 0; i < items.length; i++) {
            if (!isDisabled(candidate)) {
              return { type: "navigate", index: candidate };
            }

            candidate += dir;
            if (candidate >= items.length) candidate = 0;
            if (candidate < 0) candidate = items.length - 1;
            if (candidate === wrapCandidate) break;
          }
        } else {
          const rowStart = currentRow * cols;
          const rowEnd = Math.min((currentRow + 1) * cols - 1, items.length - 1);

          // Stay within the current row when row-based looping is requested.
          while (wrapCandidate >= rowStart && wrapCandidate <= rowEnd) {
            if (!isDisabled(wrapCandidate)) {
              return { type: "navigate", index: wrapCandidate };
            }

            wrapCandidate += dir;

            if (wrapCandidate < rowStart || wrapCandidate > rowEnd) {
              break;
            }
          }
        }
      }

      return resolveLinearMove(current, dir, context);
    }

    if (key === "ArrowDown" || key === "ArrowUp") {
      if (cols <= 1) {
        return null;
      }

      const offset = key === "ArrowDown" ? cols : -cols;
      const step = offset > 0 ? cols : -cols;
      const start = current == null ? (offset > 0 ? -cols : items.length) : current;
      let candidate = start + offset;

      while (candidate >= 0 && candidate < items.length && isDisabled(candidate)) {
        candidate += step;
      }

      if (candidate >= 0 && candidate < items.length) {
        return { type: "navigate", index: candidate };
      }

      if (loop) {
        if (allowEscape && isVirtual) {
          return { type: "navigate", index: null };
        }

        if (current === null) {
          const boundary = offset > 0 ? getFirstEnabledIndex() : getLastEnabledIndex();
          return boundary != null ? { type: "navigate", index: boundary } : null;
        }

        const col = current % cols;
        let wrapCandidate: number;

        if (offset > 0) {
          wrapCandidate = col;
        } else {
          const lastRowStart = (Math.ceil(items.length / cols) - 1) * cols;
          wrapCandidate = lastRowStart + col;

          if (wrapCandidate >= items.length) {
            wrapCandidate -= cols;
          }
        }

        while (wrapCandidate >= 0 && wrapCandidate < items.length && isDisabled(wrapCandidate)) {
          wrapCandidate += step;
        }

        if (wrapCandidate >= 0 && wrapCandidate < items.length) {
          return { type: "navigate", index: wrapCandidate };
        }
      }

      if (this.fallbackToLinear) {
        return resolveLinearMove(current, key === "ArrowDown" ? 1 : -1, context);
      }
    }

    return null;
  }
}

function doSwitch(
  orientation: "vertical" | "horizontal" | "both",
  vertical: boolean,
  horizontal: boolean,
) {
  switch (orientation) {
    case "vertical":
      return vertical;
    case "horizontal":
      return horizontal;
    default:
      return vertical || horizontal;
  }
}

/**
 * Returns whether a key belongs to the active navigation axis.
 */
export function isMainOrientationKey(key: string, orientation: "vertical" | "horizontal" | "both") {
  const vertical = key === "ArrowUp" || key === "ArrowDown";
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  return doSwitch(orientation, vertical, horizontal);
}

/**
 * Returns whether a key should be treated as movement toward the "end" side.
 */
export function isMainOrientationToEndKey(
  key: string,
  orientation: "vertical" | "horizontal" | "both",
  isRtl: boolean,
) {
  const vertical = key === "ArrowDown";
  const horizontal = isRtl ? key === "ArrowLeft" : key === "ArrowRight";
  return (
    doSwitch(orientation, vertical, horizontal) || key === "Enter" || key === " " || key === ""
  );
}

/**
 * Returns whether a key should open a child branch from the current list item.
 */
export function isTreeChildOpenKey(
  key: string,
  orientation: "vertical" | "horizontal" | "both",
  isRtl: boolean,
) {
  if (orientation === "vertical") {
    return isRtl ? key === "ArrowLeft" : key === "ArrowRight";
  }

  if (orientation === "horizontal") {
    return key === "ArrowDown";
  }

  return false;
}

/**
 * Creates the navigation strategy that matches the list orientation/grid shape.
 */
export function createNavigationStrategy(
  orientation: "vertical" | "horizontal" | "both",
  cols: number,
  gridLoopDirection: "row" | "next",
): NavigationStrategy {
  if (orientation === "vertical") {
    return new VerticalNavigationStrategy();
  }

  if (orientation === "horizontal") {
    return cols > 1
      ? new GridNavigationStrategy(false, gridLoopDirection)
      : new HorizontalNavigationStrategy();
  }

  return new GridNavigationStrategy(true, gridLoopDirection);
}
