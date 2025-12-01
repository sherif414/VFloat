import { useEventListener } from "@vueuse/core"
import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  type Ref,
  ref,
  toValue,
  watch,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { TreeNode } from "@/composables/positioning/use-floating-tree"
import { getContextFromParameter, isTypeableElement } from "@/utils"
import { isUsingKeyboard } from "../utils/is-using-keyboard"
import { useActiveDescendant } from "../utils/use-active-descendant"

// ============================================================================
// Navigation Strategies
// ============================================================================

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

// ============================================================================
// List Navigation Composable
// ============================================================================

/**
 * Options for configuring list-style keyboard/mouse navigation behavior.
 *
 * This interface drives how items in a floating list/grid are navigated,
 * focused, and announced (including support for virtual focus).
 */
export interface UseListNavigationOptions {
  /**
   * Reactive collection of list item elements in DOM order.
   * Null entries are allowed while items mount/unmount.
   */
  listRef: Ref<Array<HTMLElement | null>>

  /**
   * The currently active (navigated) index. Null means no active item.
   */
  activeIndex?: MaybeRefOrGetter<number | null>

  /**
   * Callback invoked when navigation sets a new active index.
   */
  onNavigate?: (index: number | null) => void

  /**
   * Whether navigation behavior is enabled.
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * If true, arrow-key navigation wraps from end-to-start and vice versa.
   */
  loop?: MaybeRefOrGetter<boolean>

  /**
   * Primary navigation orientation.
   * - "vertical": Up/Down to navigate
   * - "horizontal": Left/Right to navigate
   * - "both": Grid navigation (supports cols/itemSizes)
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">

  /**
   * Indices that should be treated as disabled and skipped by navigation.
   * Can be an array of indices or a predicate.
   */
  disabledIndices?: Array<number> | ((index: number) => boolean)

  /**
   * If true, hovering an item moves the active index to that item.
   */
  focusItemOnHover?: MaybeRefOrGetter<boolean>

  /**
   * If true, pressing an arrow key when closed opens and moves focus.
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>

  /**
   * Controls automatic scrolling when the active item changes.
   * true for default "nearest" behavior or a custom ScrollIntoViewOptions.
   */
  scrollItemIntoView?: boolean | ScrollIntoViewOptions

  /**
   * Index to prefer when opening (e.g., currently selected option).
   */
  selectedIndex?: MaybeRefOrGetter<number | null>

  /**
   * Controls focusing an item when the list opens.
   * - true: always focus an item
   * - false: never focus an item
   * - "auto": focus based on input modality/heuristics
   */
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">

  /**
   * Whether this list is nested inside another navigable list.
   * Affects cross-orientation close/open key handling.
   */
  nested?: MaybeRefOrGetter<boolean>

  /**
   * Parent list orientation when nested, for cross-navigation behavior.
   */
  parentOrientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">

  /**
   * Right-to-left layout flag affecting horizontal arrow semantics.
   */
  rtl?: MaybeRefOrGetter<boolean>

  /**
   * Enables virtual focus mode (aria-activedescendant) instead of DOM focus.
   */
  virtual?: MaybeRefOrGetter<boolean>

  /**
   * Receives the HTMLElement corresponding to the virtual active item.
   * Used for aria-activedescendant and screen reader announcement.
   */
  virtualItemRef?: Ref<HTMLElement | null>

  /**
   * Column count for grid navigation when orientation is "both".
   */
  cols?: MaybeRefOrGetter<number>

  /**
   * If true, allows escaping to a null active index via keyboard (e.g., ArrowDown on last).
   */
  allowEscape?: MaybeRefOrGetter<boolean>

  /**
   * Defines the wrapping behavior for grid navigation when moving horizontally past the end of a row.
   * - "row": Wraps to the start of the *same* row (default).
   * - "next": Moves to the start of the *next* row (or previous row if moving left).
   */
  gridLoopDirection?: MaybeRefOrGetter<"row" | "next">
}

export interface UseListNavigationReturn {
  cleanup: () => void
}

export function useListNavigation(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseListNavigationOptions
): UseListNavigationReturn {
  const { floatingContext, node } = getContextFromParameter(context)
  const { refs, open, setOpen } = floatingContext

  const {
    listRef,
    activeIndex,
    onNavigate,
    enabled = true,
    loop = false,
    orientation = "vertical",
    disabledIndices,
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    scrollItemIntoView = true,
    selectedIndex = null,
    focusItemOnOpen = "auto",
    nested = false,
    rtl = false,
    virtual = false,
    virtualItemRef,
    cols = 1,
    allowEscape = false,
  } = options

  const derived = {
    isEnabled: computed(() => toValue(enabled)),
    anchorEl: computed(() => {
      const el = refs.anchorEl.value
      if (el instanceof HTMLElement) return el
      if (el && "contextElement" in el && el.contextElement instanceof HTMLElement) {
        return el.contextElement
      }
      return null
    }),
    floatingEl: computed(() => refs.floatingEl.value),
    isVirtual: computed(() => !!toValue(virtual)),
    isRtl: computed(() => !!toValue(rtl)),
    gridCols: computed(() => Math.max(1, Number(toValue(cols) ?? 1))),
  }

  const { isEnabled, anchorEl, floatingEl, isVirtual, isRtl, gridCols } = derived

  const getActiveIndex = () => (activeIndex !== undefined ? toValue(activeIndex) : null)
  const isDisabled = (idx: number) => {
    if (!disabledIndices) return false
    return Array.isArray(disabledIndices) ? disabledIndices.includes(idx) : !!disabledIndices(idx)
  }

  const getFirstEnabledIndex = () => {
    const items = listRef.value
    for (let i = 0; i < items.length; i++) {
      if (items[i] && !isDisabled(i)) return i
    }
    return null
  }

  const cleanupFns: Array<() => void> = []
  const registerCleanup = (fn: () => void) => {
    cleanupFns.push(fn)
    return fn
  }
  const runCleanups = () => {
    while (cleanupFns.length) {
      cleanupFns.pop()?.()
    }
  }

  const getLastEnabledIndex = () => {
    const items = listRef.value
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i] && !isDisabled(i)) return i
    }
    return null
  }

  function doSwitch(
    ori: "vertical" | "horizontal" | "both",
    vertical: boolean,
    horizontal: boolean
  ) {
    switch (ori) {
      case "vertical":
        return vertical
      case "horizontal":
        return horizontal
      default:
        return vertical || horizontal
    }
  }

  function isMainOrientationKey(key: string, ori: "vertical" | "horizontal" | "both") {
    const vertical = key === "ArrowUp" || key === "ArrowDown"
    const horizontal = key === "ArrowLeft" || key === "ArrowRight"
    return doSwitch(ori, vertical, horizontal)
  }

  function isMainOrientationToEndKey(
    key: string,
    ori: "vertical" | "horizontal" | "both",
    rtlFlag: boolean
  ) {
    const vertical = key === "ArrowDown"
    const horizontal = rtlFlag ? key === "ArrowLeft" : key === "ArrowRight"
    return doSwitch(ori, vertical, horizontal) || key === "Enter" || key === " " || key === ""
  }

  const findNextEnabled = (start: number, dir: 1 | -1, wrap: boolean) => {
    const items = listRef.value
    const len = items.length
    let i = start
    for (let step = 0; step < len; step++) {
      if (i < 0 || i >= len) {
        if (!wrap) return null
        i = (i + len) % len
      }
      if (items[i] && !isDisabled(i)) return i
      i += dir
    }
    return null
  }

  const focusItem = (index: number | null, forceScroll = false) => {
    if (index == null) return
    const el = listRef.value[index]
    if (!el) return
    if (isVirtual.value) {
      // In virtual mode, ARIA and virtualItemRef management is handled by useActiveDescendant
      return
    } else {
      el.focus({ preventScroll: true })
      const opts = scrollItemIntoView
      const shouldScroll = !!opts && (forceScroll || isUsingKeyboard.value)
      if (shouldScroll) {
        el.scrollIntoView?.(
          typeof opts === "boolean" ? { block: "nearest", inline: "nearest" } : opts
        )
      }
    }
  }

  let lastKey: string | null = null

  const handleAnchorKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return

    const target = e.target as Element | null
    // Allow navigation if the target is the anchor (e.g. input)
    if (target && isTypeableElement(target) && target !== anchorEl.value) return

    const key = e.key
    const ori = toValue(orientation)
    lastKey = key

    if (open.value && isVirtual.value) {
      handleFloatingKeyDown(e)
      return
    }

    if (!isMainOrientationKey(key, ori)) return
    if (open.value || !toValue(openOnArrowKeyDown)) return

    e.preventDefault()
    setOpen(true, "keyboard-activate", e)
    const sel = selectedIndex !== undefined ? toValue(selectedIndex) : null
    const initial =
      sel ??
      (isMainOrientationToEndKey(key, ori, isRtl.value)
        ? getFirstEnabledIndex()
        : getLastEnabledIndex())
    if (initial != null) onNavigate?.(initial)
  }

  const handleFloatingKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return

    const key = e.key
    const ori = toValue(orientation)
    const items = listRef.value
    if (!items.length) return

    // 1. Handle Home/End
    // In virtual mode (e.g. Command Palette), let the input handle Home/End for text cursor
    if (!isVirtual.value) {
      if (key === "Home") {
        e.preventDefault()
        const idx = getFirstEnabledIndex()
        if (idx != null) onNavigate?.(idx)
        return
      }
      if (key === "End") {
        e.preventDefault()
        const idx = getLastEnabledIndex()
        if (idx != null) onNavigate?.(idx)
        return
      }
    }

    // 2. Determine Strategy
    let strategy: NavigationStrategy
    if (ori === "vertical") {
      strategy = new VerticalNavigationStrategy()
    } else if (ori === "horizontal") {
      strategy =
        gridCols.value > 1
          ? new GridNavigationStrategy(false, toValue(options.gridLoopDirection) ?? "row")
          : new HorizontalNavigationStrategy()
    } else {
      // both
      strategy = new GridNavigationStrategy(true, toValue(options.gridLoopDirection) ?? "row")
    }

    // 3. Execute Strategy
    const context: StrategyContext = {
      current: getActiveIndex(),
      items,
      isRtl: isRtl.value,
      loop: !!toValue(loop),
      allowEscape: !!toValue(allowEscape),
      isVirtual: isVirtual.value,
      cols: gridCols.value,
      nested: !!toValue(nested),
      isDisabled,
      findNextEnabled,
      getFirstEnabledIndex,
      getLastEnabledIndex,
    }

    const result = strategy.handleKey(key, context)

    if (result) {
      if (result.type === "navigate") {
        e.preventDefault()
        onNavigate?.(result.index)
      } else if (result.type === "close") {
        e.preventDefault()
        setOpen(false, "programmatic", e)
        const parent = node?.parent.value
        const parentAnchor = parent?.data.refs.anchorEl.value
        if (parentAnchor instanceof HTMLElement) {
          parentAnchor.focus({ preventScroll: true })
        } else if (
          parentAnchor &&
          "contextElement" in parentAnchor &&
          parentAnchor.contextElement instanceof HTMLElement
        ) {
          parentAnchor.contextElement.focus({ preventScroll: true })
        }
      }
    }
  }

  const stopActiveItemWatch = watch(
    [open, computed(() => getActiveIndex())],
    ([isOpen, idx]) => {
      if (!isEnabled.value) return
      if (!isOpen) return
      if (idx == null) return
      focusItem(idx)
    },
    { flush: "post" }
  )
  registerCleanup(stopActiveItemWatch)

  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? anchorEl.value : null),
      "keydown",
      handleAnchorKeyDown
    )
  )
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? floatingEl.value : null),
      "keydown",
      handleFloatingKeyDown
    )
  )

  const removeItemHoverWatch = watchPostEffect(() => {
    if (!isEnabled.value || !toValue(focusItemOnHover)) return
    const container = floatingEl.value
    if (!container) return

    let lastX: number | null = null
    let lastY: number | null = null

    const onMove = (evt: MouseEvent) => {
      // "State-Driven Hover" pattern:
      // Only update selection if the mouse *actually moved*.
      // This prevents "ghost hovers" where the list scrolls/updates under a stationary mouse,
      // which would otherwise steal selection from the keyboard.
      if (lastX === evt.clientX && lastY === evt.clientY) return
      lastX = evt.clientX
      lastY = evt.clientY

      const target = evt.target as Element | null
      if (!target) return
      const items = listRef.value
      let idx = -1
      for (let i = 0; i < items.length; i++) {
        const el = items[i]
        if (el && (el === target || el.contains(target))) {
          idx = i
          break
        }
      }
      if (idx >= 0) onNavigate?.(idx)
    }
    container.addEventListener("mousemove", onMove)
    onWatcherCleanup(() => {
      container.removeEventListener("mousemove", onMove)
    })
  })
  registerCleanup(removeItemHoverWatch)

  const prevOpen = ref(false)
  const stopOpenWatch = watch(
    () => open.value,
    (isOpen) => {
      if (!isEnabled.value) return
      if (isOpen && !prevOpen.value) {
        const f = toValue(focusItemOnOpen)
        if (f === true || (f === "auto" && lastKey != null)) {
          const sel = selectedIndex !== undefined ? toValue(selectedIndex) : null
          const idx =
            sel ??
            (lastKey && isMainOrientationToEndKey(lastKey, toValue(orientation), isRtl.value)
              ? getFirstEnabledIndex()
              : getLastEnabledIndex())
          if (idx != null) {
            onNavigate?.(idx)
            focusItem(idx, true)
          }
        }
      }
      prevOpen.value = isOpen
    },
    { flush: "post", immediate: true }
  )
  registerCleanup(stopOpenWatch)

  // Manage aria-activedescendant and virtualItemRef via dedicated composable
  const { activeItem } = useActiveDescendant(
    anchorEl,
    listRef,
    computed(() => getActiveIndex()),
    { virtual, open }
  )

  // Sync the activeItem with the user-provided virtualItemRef if it exists
  if (virtualItemRef) {
    const stopActiveItemSync = watch(
      activeItem,
      (item) => {
        virtualItemRef.value = item
      },
      { flush: "post" }
    )
    registerCleanup(stopActiveItemSync)
  }

  return { cleanup: runCleanups }
}
