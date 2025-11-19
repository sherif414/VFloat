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
  constructor(private fallbackToLinear: boolean = false) {}

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

    // Linear horizontal movement
    if (key === "ArrowRight") return resolveLinearMove(current, 1, context)
    if (key === "ArrowLeft") return resolveLinearMove(current, -1, context)

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
        const boundary = offset > 0 ? getFirstEnabledIndex() : getLastEnabledIndex()
        if (boundary != null) {
          return { type: "navigate", index: boundary }
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
