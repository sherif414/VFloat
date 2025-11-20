export type NavigationAction = { type: "navigate"; index: number | null } | { type: "close" }

export interface StrategyContext {
  current: number | null
  items: Array<HTMLElement | null>
  isRtl: boolean
  loop: boolean
  allowEscape: boolean
  isVirtual: boolean
  cols: number
  nested: boolean
  isDisabled: (index: number) => boolean
  findNextEnabled: (start: number, dir: 1 | -1, wrap: boolean) => number | null
  getFirstEnabledIndex: () => number | null
  getLastEnabledIndex: () => number | null
}

export interface NavigationStrategy {
  handleKey(key: string, context: StrategyContext): NavigationAction | null
}

function resolveLinearMove(
  current: number | null,
  dir: 1 | -1,
  context: StrategyContext
): NavigationAction | null {
  const {
    items,
    loop,
    allowEscape,
    isVirtual,
    findNextEnabled,
    getFirstEnabledIndex,
    getLastEnabledIndex,
  } = context
  const itemCount = items.length
  const start = current == null ? (dir === 1 ? 0 : itemCount - 1) : current + dir
  let next = findNextEnabled(start, dir, loop)

  if (next == null && loop) {
    if (allowEscape && isVirtual) {
      return { type: "navigate", index: null }
    }
    next = dir === 1 ? getFirstEnabledIndex() : getLastEnabledIndex()
  }

  if (next != null) {
    return { type: "navigate", index: next }
  }

  return null
}

export class VerticalNavigationStrategy implements NavigationStrategy {
  handleKey(key: string, context: StrategyContext): NavigationAction | null {
    const { isRtl, nested } = context

    if (key === "ArrowDown") return resolveLinearMove(context.current, 1, context)
    if (key === "ArrowUp") return resolveLinearMove(context.current, -1, context)

    if (nested) {
      const closeKey = isRtl ? "ArrowRight" : "ArrowLeft"
      if (key === closeKey) return { type: "close" }
    }

    return null
  }
}

export class HorizontalNavigationStrategy implements NavigationStrategy {
  handleKey(key: string, context: StrategyContext): NavigationAction | null {
    const { isRtl, nested } = context

    if (key === "ArrowRight") return resolveLinearMove(context.current, isRtl ? -1 : 1, context)
    if (key === "ArrowLeft") return resolveLinearMove(context.current, isRtl ? 1 : -1, context)

    if (nested) {
      if (key === "ArrowUp") return { type: "close" }
    }

    return null
  }
}

export class GridNavigationStrategy implements NavigationStrategy {
  constructor(
    private fallbackToLinear: boolean = false,
    private loopDirection: "row" | "next" = "row"
  ) {}

  handleKey(key: string, context: StrategyContext): NavigationAction | null {
    const {
      current,
      items,
      isDisabled,
      loop,
      allowEscape,
      isVirtual,
      getFirstEnabledIndex,
      getLastEnabledIndex,
      cols,
    } = context

    // Grid horizontal movement (Row Wrapping)
    if (key === "ArrowRight" || key === "ArrowLeft") {
      const dir = key === "ArrowRight" ? 1 : -1

      // If not in grid yet, use linear entry
      if (current === null) {
        return resolveLinearMove(current, dir, context)
      }

      const next = current + dir
      const currentRow = Math.floor(current / cols)
      const nextRow = Math.floor(next / cols)

      // Check if we are still in the same row and valid
      if (next >= 0 && next < items.length && currentRow === nextRow && !isDisabled(next)) {
        return { type: "navigate", index: next }
      }

      // If we moved to a different row (or out of bounds), handle wrapping
      if (loop) {
        if (allowEscape && isVirtual) {
          // Only escape if we are truly at the start/end of the list, not just the row
          const isAtStart = current === 0
          const isAtEnd = current === items.length - 1
          if ((dir === -1 && isAtStart) || (dir === 1 && isAtEnd)) {
            return { type: "navigate", index: null }
          }
        }

        let wrapCandidate: number
        if (this.loopDirection === "next") {
          // "Next" item wrapping: move to next/prev row
          if (dir === 1) {
            // Moving right at end of row -> start of next row
            wrapCandidate = current + 1
            if (wrapCandidate >= items.length) {
              wrapCandidate = 0 // Loop to very start
            }
          } else {
            // Moving left at start of row -> end of prev row
            wrapCandidate = current - 1
            if (wrapCandidate < 0) {
              wrapCandidate = items.length - 1 // Loop to very end
            }
          }
        } else {
          // "Row" wrapping: stay in same row
          if (dir === 1) {
            // Wrap to start of current row
            wrapCandidate = currentRow * cols
          } else {
            // Wrap to end of current row
            wrapCandidate = Math.min((currentRow + 1) * cols - 1, items.length - 1)
          }
        }

        // Find first enabled item in the direction of movement
        // For "next" wrapping, we scan linearly from the wrap candidate
        // For "row" wrapping, we scan within the row

        if (this.loopDirection === "next") {
          let candidate = wrapCandidate
          // Scan for a full loop to find an enabled item
          for (let i = 0; i < items.length; i++) {
            if (!isDisabled(candidate)) {
              return { type: "navigate", index: candidate }
            }
            candidate += dir
            // Handle wrapping during scan
            if (candidate >= items.length) candidate = 0
            if (candidate < 0) candidate = items.length - 1

            // If we looped back to start, stop (all disabled)
            if (candidate === wrapCandidate) break
          }
        } else {
          // Existing row scanning logic
          const scanStep = dir
          const rowStart = currentRow * cols
          const rowEnd = Math.min((currentRow + 1) * cols - 1, items.length - 1)

          while (wrapCandidate >= rowStart && wrapCandidate <= rowEnd) {
            if (!isDisabled(wrapCandidate)) {
              return { type: "navigate", index: wrapCandidate }
            }
            wrapCandidate += scanStep
            // If we scan past the row boundaries, we stop (all items in row might be disabled)
            if (wrapCandidate < rowStart || wrapCandidate > rowEnd) break
          }
        }
      }

      // Fallback to linear if no row wrap happened (e.g. loop=false)
      return resolveLinearMove(current, dir, context)
    }

    // Grid vertical movement
    if (key === "ArrowDown" || key === "ArrowUp") {
      if (cols <= 1) return null
      const offset = key === "ArrowDown" ? cols : -cols
      const step = offset > 0 ? cols : -cols
      const start = current == null ? (offset > 0 ? -cols : items.length) : current
      let candidate = start + offset

      while (candidate >= 0 && candidate < items.length && isDisabled(candidate)) {
        candidate += step
      }

      if (candidate >= 0 && candidate < items.length) {
        return { type: "navigate", index: candidate }
      }

      // Handle wrap/escape for grid
      if (loop) {
        if (allowEscape && isVirtual) {
          return { type: "navigate", index: null }
        }

        // If entering the grid (current == null), fall back to standard entry
        if (current === null) {
          const boundary = offset > 0 ? getFirstEnabledIndex() : getLastEnabledIndex()
          if (boundary != null) {
            return { type: "navigate", index: boundary }
          }
          return null
        }

        // Column wrapping
        const col = current % cols
        let wrapCandidate: number

        if (offset > 0) {
          // Wrap to top
          wrapCandidate = col
        } else {
          // Wrap to bottom
          const lastRowStart = (Math.ceil(items.length / cols) - 1) * cols
          wrapCandidate = lastRowStart + col
          if (wrapCandidate >= items.length) {
            wrapCandidate -= cols
          }
        }

        // Find first enabled item in the column in the direction of movement
        while (wrapCandidate >= 0 && wrapCandidate < items.length && isDisabled(wrapCandidate)) {
          wrapCandidate += step
        }

        if (wrapCandidate >= 0 && wrapCandidate < items.length) {
          return { type: "navigate", index: wrapCandidate }
        }
      }

      // Fallback to linear if configured (for 'both' orientation)
      if (this.fallbackToLinear) {
        return resolveLinearMove(current, key === "ArrowDown" ? 1 : -1, context)
      }
    }

    return null
  }
}
