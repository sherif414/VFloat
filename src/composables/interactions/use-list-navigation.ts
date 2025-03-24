import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables keyboard navigation for list-based floating elements
 *
 * This composable provides complete keyboard navigation functionality for lists,
 * including arrow key navigation, focus management, and ARIA attributes.
 * Supports vertical, horizontal, and grid layouts with various configuration options.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for list navigation
 * @returns Event handler props for reference, floating, and item elements
 *
 * @example
 * ```ts
 * const { getReferenceProps, getFloatingProps, getItemProps } = useListNavigation({
 *   open: floating.open,
 *   onOpenChange: floating.onOpenChange,
 *   listRef: listRef,
 *   activeIndex: activeIndex,
 *   onNavigate: setActiveIndex
 * })
 * ```
 */
export function useListNavigation(
  context: FloatingContext & {
    open: Ref<boolean>
    onOpenChange: (open: boolean) => void
  },
  options: UseListNavigationOptions
): UseListNavigationReturn {
  const { open, onOpenChange } = context

  const {
    listRef,
    activeIndex,
    onNavigate,
    enabled = true,
    selectedIndex = null,
    loop = false,
    nested = false,
    rtl = false,
    virtual = false,
    focusItemOnOpen = true,
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    disabledIndices = [],
    allowEscape = false,
    cols = 1,
    orientation = "vertical",
    scrollItemIntoView = true,
    itemSizes,
    dense = false,
  } = options

  const isEnabled = computed(() => toValue(enabled))

  // Get all items from the list container
  const listContentRef = computed(() => {
    if (!listRef.value) return []

    return Array.from(listRef.value.querySelectorAll('[role="option"]')) as HTMLElement[]
  })

  const focusItem = (index: number | null) => {
    if (index === null || !listRef.value) return

    const item = listContentRef.value[index]
    if (!item) return

    if (toValue(virtual)) {
      const virtualItem = options.virtualItemRef?.value
      if (virtualItem) {
        virtualItem.focus({ preventScroll: true })
      }
    } else {
      item.focus({ preventScroll: true })
    }
  }

  // Navigate to a specific index
  const navigate = (index: number | null) => {
    if (onNavigate) {
      onNavigate(index)
    }

    if (index === null) return

    /**
     * FIXME: In case of grid navigation, we need to scroll the closest
     * parent with a scrollbar to ensure the item is in view
     */
    if (toValue(scrollItemIntoView) && !toValue(virtual) && toValue(open)) {
      scrollIntoView()
    }
  }

  // Helper to find a non-disabled index
  const findNonDisabledIndex = (
    start: number | null,
    increment = true,
    skipCurrent = false,
    limit = listContentRef.value.length
  ) => {
    const disabledIndicesValue = toValue(disabledIndices)

    if (disabledIndicesValue.length === 0 && start !== null) return start
    if (limit === 0) return null

    // Starting point for the search
    let index = start === null ? (increment ? 0 : listContentRef.value.length - 1) : start

    // Skip current index if needed
    if (skipCurrent) {
      index = increment ? index + 1 : index - 1
    }

    // Loop through the list to find a non-disabled index
    let iterationCount = 0
    while (iterationCount < limit) {
      // Check for out-of-bounds and loop back if needed
      if (index < 0) {
        if (toValue(loop)) {
          index = listContentRef.value.length - 1
        } else {
          return null
        }
      } else if (index >= listContentRef.value.length) {
        if (toValue(loop)) {
          index = 0
        } else {
          return null
        }
      }

      // Make sure we're not in an infinite loop
      iterationCount++

      // Return the index if it's not disabled
      if (!disabledIndicesValue.includes(index)) {
        return index
      }

      // Move to next/previous
      index = increment ? index + 1 : index - 1
    }

    // If we get here, all indices are disabled
    return null
  }

  // Calculate the next index to navigate to
  const getNextIndex = (
    iteration: number,
    current: number | null,
    increment: boolean,
    skipCurrent: boolean
  ): number => {
    // Handle case where we have a starting point
    if (current !== null) {
      const nextIndex = findNonDisabledIndex(current, increment, skipCurrent)
      if (nextIndex !== null) return nextIndex
    }

    // With keyboard navigation, we want to go from the end to the start index,
    // but with right/left we want the opposite
    const wrapped = toValue(orientation) === "vertical" && toValue(loop)
    const firstIndex = findNonDisabledIndex(null, wrapped ? !increment : increment)

    return firstIndex !== null ? firstIndex : current !== null ? current : -1
  }

  // Handlers
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value) return

    const orientationValue = toValue(orientation)
    const rtlValue = toValue(rtl)
    const currentIndex = toValue(activeIndex)
    const nestValue = toValue(nested)
    const colsValue = toValue(cols)

    // Handle arrow keys
    if (event.key.indexOf("Arrow") === 0) {
      // Before handling arrow keys
      if (!toValue(open) && toValue(openOnArrowKeyDown)) {
        event.preventDefault()
        onOpenChange(true)
        return
      }

      // Don't handle nested menus closing
      if (nestValue && rtlValue && event.key === "ArrowLeft") {
        return
      }

      if (nestValue && !rtlValue && event.key === "ArrowRight") {
        return
      }

      // Handle navigation based on the orientation
      if (orientationValue === "vertical" && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        stopEvent(event)
        const increment = event.key === "ArrowDown"

        if (currentIndex === null) {
          navigate(getNextIndex(0, null, increment, false))
        } else {
          navigate(getNextIndex(0, currentIndex, increment, true))
        }
      } else if (
        orientationValue === "horizontal" &&
        ["ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        stopEvent(event)
        const increment = rtlValue ? event.key === "ArrowLeft" : event.key === "ArrowRight"

        if (currentIndex === null) {
          navigate(getNextIndex(0, null, increment, false))
        } else {
          navigate(getNextIndex(0, currentIndex, increment, true))
        }
      } else if (orientationValue === "both") {
        // Handle 2D grid navigation
        stopEvent(event)

        if (currentIndex === null) {
          navigate(
            getNextIndex(0, null, event.key === "ArrowRight" || event.key === "ArrowDown", false)
          )
        } else {
          // Different behavior for each arrow key in a grid
          if (event.key === "ArrowUp") {
            handleVerticalNavigation(event, currentIndex)
          } else if (event.key === "ArrowDown") {
            handleVerticalNavigation(event, currentIndex)
          } else if (event.key === "ArrowLeft") {
            handleHorizontalNavigation(event, currentIndex, rtlValue)
          } else if (event.key === "ArrowRight") {
            handleHorizontalNavigation(event, currentIndex, rtlValue)
          }
        }
      }
    } else if (event.key === "Home") {
      stopEvent(event)
      navigate(findNonDisabledIndex(null, true))
    } else if (event.key === "End") {
      stopEvent(event)
      navigate(findNonDisabledIndex(null, false))
    } else if (event.key === "PageUp") {
      stopEvent(event)
      const nextIndex = findNonDisabledIndex(Math.max(0, (currentIndex ?? 0) - 10), true, false, 10)
      navigate(nextIndex)
    } else if (event.key === "PageDown") {
      stopEvent(event)
      const nextIndex = findNonDisabledIndex(
        Math.min(listContentRef.value.length - 1, (currentIndex ?? 0) + 10),
        false,
        false,
        10
      )
      navigate(nextIndex)
    } else if (event.key === "Escape" && toValue(allowEscape) && currentIndex !== null) {
      stopEvent(event)
      navigate(null)
    }
  }

  // Handle vertical navigation (up/down arrows)
  const handleVerticalNavigation = (event: KeyboardEvent, currentIndex: number) => {
    const colsValue = toValue(cols)
    const increment = event.key === "ArrowDown"
    const candidateIndex = currentIndex + (increment ? colsValue : -colsValue)

    if (candidateIndex < 0 || candidateIndex >= listContentRef.value.length) {
      if (toValue(loop)) {
        // Calculate proper wrapping in a grid
        const numRows = Math.ceil(listContentRef.value.length / colsValue)
        const row = Math.floor(currentIndex / colsValue)
        const col = currentIndex % colsValue

        let nextIndex
        if (increment) {
          // Wrap to the same column on the first row
          nextIndex = col
        } else {
          // Wrap to the same column on the last row (might need to be adjusted)
          const lastRowIndex = Math.min(
            (numRows - 1) * colsValue + col,
            listContentRef.value.length - 1
          )
          nextIndex = lastRowIndex
        }

        navigate(findNonDisabledIndex(nextIndex, increment, false))
      } else if (toValue(allowEscape)) {
        navigate(null)
      }
      return
    }

    navigate(findNonDisabledIndex(candidateIndex, increment, false))
  }

  // Handle horizontal navigation (left/right arrows)
  const handleHorizontalNavigation = (event: KeyboardEvent, currentIndex: number, rtl: boolean) => {
    const colsValue = toValue(cols)
    const increment = rtl ? event.key === "ArrowLeft" : event.key === "ArrowRight"
    let candidateIndex = currentIndex + (increment ? 1 : -1)
    const row = Math.floor(currentIndex / colsValue)
    const nextRow = Math.floor(candidateIndex / colsValue)

    // Edge case: When we're at the beginning or end of a row
    if (row !== nextRow) {
      if (toValue(loop)) {
        // If looping, wrap to the beginning/end of the same row
        candidateIndex = nextRow * colsValue + (increment ? 0 : colsValue - 1)
        candidateIndex = Math.min(candidateIndex, listContentRef.value.length - 1)
        navigate(findNonDisabledIndex(candidateIndex, increment, false))
      } else if (toValue(allowEscape)) {
        navigate(null)
      }
      return
    }

    navigate(findNonDisabledIndex(candidateIndex, increment, false))
  }

  // Scroll the active item into view
  const scrollIntoView = () => {
    const currentIndex = toValue(activeIndex)
    if (currentIndex === null || !listRef.value) return

    const item = listContentRef.value[currentIndex]
    if (!item) return

    // Find the closest scrollable parent
    const scrollParent = getScrollParent(listRef.value) as HTMLElement

    // If no scroll parent is found, return
    if (!scrollParent) return

    // Calculate the item's position relative to the scroll parent
    const scrollRect = scrollParent.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()

    // These values represent the distance from the item's edge to the scroll parent's edge
    const topDistance = itemRect.top - scrollRect.top
    const bottomDistance = scrollRect.bottom - itemRect.bottom
    const leftDistance = itemRect.left - scrollRect.left
    const rightDistance = scrollRect.right - itemRect.right

    // Determine the direction to scroll
    if (topDistance < 0) {
      // Item is above the visible area
      scrollParent.scrollTop += topDistance
    } else if (bottomDistance < 0) {
      // Item is below the visible area
      scrollParent.scrollTop -= bottomDistance
    }

    if (leftDistance < 0) {
      // Item is to the left of the visible area
      scrollParent.scrollLeft += leftDistance
    } else if (rightDistance < 0) {
      // Item is to the right of the visible area
      scrollParent.scrollLeft -= rightDistance
    }
  }

  // Auto-focus first item when opening
  watch(
    () => toValue(open),
    (isOpen) => {
      if (!isOpen || !isEnabled.value) return

      const focusItemOnOpenValue = toValue(focusItemOnOpen)

      if (focusItemOnOpenValue) {
        const selectedIndexValue = toValue(selectedIndex)
        const activeIndexValue = toValue(activeIndex)
        const targetIndex =
          selectedIndexValue ?? activeIndexValue ?? findNonDisabledIndex(null, true)

        // 'auto' means only focus if it's a keyboard-triggered opening
        if (focusItemOnOpenValue === "auto") {
          // For keyboard users, auto-focus
          if (targetIndex !== null && targetIndex !== -1) {
            navigate(targetIndex)
          }
        } else if (targetIndex !== null && targetIndex !== -1) {
          // Always focus for all users
          navigate(targetIndex)
        }
      }
    }
  )

  return {
    getReferenceProps: () => ({
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      "aria-activedescendant":
        toValue(activeIndex) !== null ? `floating-option-${toValue(activeIndex)}` : undefined,
    }),
    getFloatingProps: () => ({
      onKeyDown: handleKeyDown,
      onBlur: () => {
        if (toValue(allowEscape)) {
          navigate(null)
        }
      },
      tabIndex: 0,
    }),
    getItemProps: ({ index, disabled = false }) => {
      const isActive = toValue(activeIndex) === index
      const isSelected = toValue(selectedIndex) === index

      return {
        role: "option",
        tabIndex: isActive ? 0 : -1,
        "aria-selected": isSelected,
        id: `floating-option-${index}`,
        "data-floating-index": index,
        onFocus: () => {
          navigate(index)
        },
        onMouseEnter: () => {
          if (toValue(focusItemOnHover) && !disabled) {
            navigate(index)
          }
        },
        onMouseLeave: () => {
          if (toValue(focusItemOnHover) && toValue(allowEscape)) {
            navigate(null)
          }
        },
        onMouseMove: () => {
          if (toValue(focusItemOnHover) && !disabled && toValue(activeIndex) !== index) {
            navigate(index)
          }
        },
        onKeyDown: handleKeyDown,
        onClick: (event: MouseEvent) => {
          if (toValue(selectedIndex) !== index) {
            stopEvent(event)
          }
          navigate(index)
        },
      }
    },
  }
}

//=======================================================================================
// 📌 Utilities
//=======================================================================================

/**
 * Stops event propagation and prevents default behavior
 */
function stopEvent(event: Event) {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Gets the closest scrollable parent element
 */
function getScrollParent(element: HTMLElement): Element | null {
  if (!element) return null

  const style = window.getComputedStyle(element)
  const overflowRegex = /(auto|scroll|overlay)/

  if (
    overflowRegex.test(style.overflow) ||
    overflowRegex.test(style.overflowY) ||
    overflowRegex.test(style.overflowX)
  ) {
    return element
  }

  return element.parentElement ? getScrollParent(element.parentElement) : null
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring list navigation
 */
export interface UseListNavigationOptions {
  /**
   * Whether list navigation is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Ref to the list container element
   */
  listRef: Ref<HTMLElement | null>

  /**
   * The active index in the list
   */
  activeIndex: MaybeRefOrGetter<number | null>

  /**
   * Callback for when navigation changes the active index
   */
  onNavigate?: (index: number | null) => void

  /**
   * Currently selected index (if different from active)
   */
  selectedIndex?: MaybeRefOrGetter<number | null>

  /**
   * Whether to loop when reaching the boundaries
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>

  /**
   * Whether this list is nested within another list
   * @default false
   */
  nested?: MaybeRefOrGetter<boolean>

  /**
   * Whether the list is in RTL mode
   * @default false
   */
  rtl?: MaybeRefOrGetter<boolean>

  /**
   * Whether the list is virtual, meaning it uses virtualization with dynamic heights
   * @default false
   */
  virtual?: MaybeRefOrGetter<boolean>

  /**
   * Ref to a virtual item
   */
  virtualItemRef?: Ref<HTMLElement | null>

  /**
   * Whether the list allows tabbing outside of its bounds with keyboard navigation
   * @default false
   */
  allowEscape?: MaybeRefOrGetter<boolean>

  /**
   * The orientation of the list
   * @default 'vertical'
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">

  /**
   * Number of columns for grid lists
   * @default 1
   */
  cols?: MaybeRefOrGetter<number>

  /**
   * Whether to focus an item when the floating element opens
   * @default true
   */
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">

  /**
   * Whether to focus the item when the cursor hovers over it
   * @default true
   */
  focusItemOnHover?: MaybeRefOrGetter<boolean>

  /**
   * Whether to open the floating element when arrow keys are pressed while focused on the reference
   * @default true
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>

  /**
   * Array of indices that should be skipped during keyboard navigation
   */
  disabledIndices?: MaybeRefOrGetter<number[]>

  /**
   * Whether to scroll an item into view when it becomes active
   * @default true
   */
  scrollItemIntoView?: MaybeRefOrGetter<boolean>

  /**
   * Grid item sizes for proper keyboard navigation in complex grid layouts
   */
  itemSizes?: MaybeRefOrGetter<number[]>

  /**
   * Whether the grid is tightly packed with no visual gaps
   * @default false
   */
  dense?: MaybeRefOrGetter<boolean>
}

/**
 * Return value of the useListNavigation composable
 */
export interface UseListNavigationReturn {
  /**
   * Reference element props for list navigation
   */
  getReferenceProps: () => {
    onKeyDown: (event: KeyboardEvent) => void
    tabIndex: number
    "aria-activedescendant"?: string
  }

  /**
   * Floating element props for list navigation
   */
  getFloatingProps: () => {
    onKeyDown: (event: KeyboardEvent) => void
    onBlur: (event: FocusEvent) => void
    tabIndex: number
  }

  /**
   * Get props for a list item
   */
  getItemProps: (options: { index: number; disabled?: boolean }) => {
    role: string
    tabIndex: number
    "aria-selected"?: boolean
    onFocus: (event: FocusEvent) => void
    onMouseEnter: (event: MouseEvent) => void
    onMouseLeave: (event: MouseEvent) => void
    onMouseMove: (event: MouseEvent) => void
    onKeyDown: (event: KeyboardEvent) => void
    onClick: (event: MouseEvent) => void
    id: string
    "data-floating-index": number
  }
}
