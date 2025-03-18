import {
  MaybeRefOrGetter,
  Ref,
  computed,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue";
import type { UseFloatingReturn } from "../use-floating";

export interface UseListNavigationOptions {
  /**
   * Whether list navigation is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Ref to the list container element
   */
  listRef: Ref<HTMLElement | null>;

  /**
   * The active index in the list
   */
  activeIndex: MaybeRefOrGetter<number | null>;

  /**
   * Callback for when navigation changes the active index
   */
  onNavigate?: (index: number | null) => void;

  /**
   * Currently selected index (if different from active)
   */
  selectedIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Whether to loop when reaching the boundaries
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Whether this list is nested within another list
   * @default false
   */
  nested?: MaybeRefOrGetter<boolean>;

  /**
   * Whether the list is in RTL mode
   * @default false
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Whether the list is virtual, meaning it uses virtualization with dynamic heights
   * @default false
   */
  virtual?: MaybeRefOrGetter<boolean>;

  /**
   * Ref to a virtual item
   */
  virtualItemRef?: Ref<HTMLElement | null>;

  /**
   * Whether the list allows tabbing outside of its bounds with keyboard navigation
   * @default false
   */
  allowEscape?: MaybeRefOrGetter<boolean>;

  /**
   * The orientation of the list
   * @default 'vertical'
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;

  /**
   * Number of columns for grid lists
   * @default 1
   */
  cols?: MaybeRefOrGetter<number>;

  /**
   * Whether to focus an item when the floating element opens
   * @default true
   */
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">;

  /**
   * Whether to focus the item when the cursor hovers over it
   * @default true
   */
  focusItemOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to open the floating element when arrow keys are pressed while focused on the reference
   * @default true
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>;

  /**
   * Array of indices that should be skipped during keyboard navigation
   */
  disabledIndices?: MaybeRefOrGetter<number[]>;

  /**
   * Whether to scroll an item into view when it becomes active
   * @default true
   */
  scrollItemIntoView?: MaybeRefOrGetter<boolean>;

  /**
   * Grid item sizes for proper keyboard navigation in complex grid layouts
   */
  itemSizes?: MaybeRefOrGetter<number[]>;

  /**
   * Whether the grid is tightly packed with no visual gaps
   * @default false
   */
  dense?: MaybeRefOrGetter<boolean>;
}

export interface UseListNavigationReturn {
  /**
   * Reference element props for list navigation
   */
  getReferenceProps: () => {
    onKeyDown: (event: KeyboardEvent) => void;
    tabIndex: number;
    "aria-activedescendant"?: string;
  };

  /**
   * Floating element props for list navigation
   */
  getFloatingProps: () => {
    onKeyDown: (event: KeyboardEvent) => void;
    onBlur: (event: FocusEvent) => void;
    tabIndex: number;
  };

  /**
   * Get props for a list item
   */
  getItemProps: (options: { index: number; disabled?: boolean }) => {
    role: string;
    tabIndex: number;
    "aria-selected"?: boolean;
    onFocus: (event: FocusEvent) => void;
    onMouseEnter: (event: MouseEvent) => void;
    onMouseLeave: (event: MouseEvent) => void;
    onMouseMove: (event: MouseEvent) => void;
    onKeyDown: (event: KeyboardEvent) => void;
    onClick: (event: MouseEvent) => void;
    id: string;
    "data-floating-index": number;
  };
}

/**
 * Enables keyboard navigation in a list of items
 */
export function useListNavigation(
  context: UseFloatingReturn & {
    open: Ref<boolean>;
    onOpenChange: (open: boolean) => void;
  },
  options: UseListNavigationOptions
): UseListNavigationReturn {
  const {
    open,
    onOpenChange,
    refs,
    elements: { floating, reference },
  } = context;

  const {
    listRef,
    activeIndex,
    onNavigate,
    selectedIndex = null,
    loop = false,
    nested = false,
    rtl = false,
    virtual = false,
    virtualItemRef,
    allowEscape = false,
    orientation = "vertical",
    cols = 1,
    focusItemOnOpen = true,
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    disabledIndices = [],
    scrollItemIntoView = true,
    itemSizes,
    dense = false,
    enabled = true,
  } = options;

  // Internal state
  const listContentRef = ref<Array<HTMLElement | null>>([]);
  const focusItemOnOpenRef = ref(false);
  const latestOpenRef = ref(false);
  const indexRef = ref<number | null>(null);
  const keyRef = ref<string | null>(null);
  const previousOnNavigateRef = ref(onNavigate);
  const isEnabled = computed(() => toValue(enabled));

  let rafId: number | null = null;
  let blurTimeoutId: number | null = null;
  let listItemsMap = new WeakMap<HTMLElement, number>();

  // Clear any timeouts on unmount
  onScopeDispose(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
    }
  });

  // Handle onNavigate changes
  watch(
    () => onNavigate,
    (newValue) => {
      previousOnNavigateRef.value = newValue;
    }
  );

  // Handle open state changes
  watch(open, (isOpen) => {
    latestOpenRef.value = isOpen;

    if (!isOpen) {
      indexRef.value = null;
      keyRef.value = null;
      focusItemOnOpenRef.value = true;
    }
  });

  // Handle direct activeIndex changes
  watch(
    () => toValue(activeIndex),
    (newIndex, prevIndex) => {
      if (
        toValue(enabled) &&
        open.value &&
        newIndex != null &&
        newIndex !== prevIndex
      ) {
        indexRef.value = newIndex;
      }
    },
    { immediate: true }
  );

  // Navigate to a specific index
  const navigate = (index: number | null) => {
    if (onNavigate) {
      onNavigate(index);
    } else {
      indexRef.value = index;
    }
  };

  // Get the next non-disabled index
  const findNonDisabledIndex = (
    start: number | null,
    increment = true,
    skipCurrent = false,
    limit = listContentRef.value.length
  ) => {
    for (let i = 0; i < limit; i++) {
      const nextIndex = getNextIndex(i, start, increment, skipCurrent);

      if (nextIndex === -1) {
        return start;
      }

      if (
        !toValue(disabledIndices).includes(nextIndex) &&
        listContentRef.value[nextIndex] !== null
      ) {
        return nextIndex;
      }
    }

    return start;
  };

  // Get the next index based on current and direction
  const getNextIndex = (
    iteration: number,
    current: number | null,
    increment: boolean,
    skipCurrent: boolean
  ): number => {
    if (current === null) {
      return -1;
    }

    const total = listContentRef.value.length;
    const isLooping = toValue(loop);

    // First iteration and skipping current
    if (iteration === 0 && skipCurrent) {
      return current;
    }

    // Calculate the next index
    const nextIndex =
      current +
      (skipCurrent ? iteration + 1 : iteration) * (increment ? 1 : -1);

    if (nextIndex < 0) {
      return isLooping ? total - 1 : 0;
    }

    if (nextIndex >= total) {
      return isLooping ? 0 : total - 1;
    }

    return nextIndex;
  };

  // Focus an item by index
  const focusItem = (index: number | null) => {
    // Don't focus during touch interactions
    if (keyRef.value === null) return;

    if (index === null) {
      if (floating && open.value) {
        floating.focus();
      }

      return;
    }

    const item = listContentRef.value[index];
    if (item) {
      rafId = requestAnimationFrame(() => {
        item.focus();
      });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value) return;

    const currentIndex =
      indexRef.value != null ? indexRef.value : toValue(selectedIndex) ?? -1;

    const currentOrientation = toValue(orientation);
    const currentRTL = toValue(rtl);
    const currentCols = toValue(cols);

    const usingGrid = currentCols > 1;

    keyRef.value = event.key;

    if (
      nested &&
      event.key === (currentRTL ? "ArrowLeft" : "ArrowRight") &&
      event.target === floating
    ) {
      stopEvent(event);
      onOpenChange(false);

      if (reference) {
        reference.focus();
      }

      return;
    }

    // Handle opening on arrow keys
    if (
      !open.value &&
      currentIndex === -1 &&
      toValue(openOnArrowKeyDown) &&
      (event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        (usingGrid &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")))
    ) {
      stopEvent(event);
      onOpenChange(true);
      return;
    }

    // Navigation handling based on orientation and layout
    if (usingGrid) {
      handleGridNavigation(event, currentIndex, currentRTL, currentCols);
    } else if (currentOrientation === "vertical") {
      handleVerticalNavigation(event, currentIndex);
    } else if (currentOrientation === "horizontal") {
      handleHorizontalNavigation(event, currentIndex, currentRTL);
    } else {
      // Both orientations
      handleVerticalNavigation(event, currentIndex);
      handleHorizontalNavigation(event, currentIndex, currentRTL);
    }
  };

  // Handle vertical navigation
  const handleVerticalNavigation = (
    event: KeyboardEvent,
    currentIndex: number
  ) => {
    if (event.key === "ArrowUp") {
      stopEvent(event);

      if (currentIndex === -1) {
        navigate(
          findNonDisabledIndex(listContentRef.value.length - 1, false, false)
        );
      } else {
        navigate(findNonDisabledIndex(currentIndex, false));
      }
    } else if (event.key === "ArrowDown") {
      stopEvent(event);

      if (currentIndex === -1) {
        navigate(findNonDisabledIndex(0, true, false));
      } else {
        navigate(findNonDisabledIndex(currentIndex, true));
      }
    } else if (event.key === "Home") {
      stopEvent(event);
      navigate(findNonDisabledIndex(0, true, false));
    } else if (event.key === "End") {
      stopEvent(event);
      navigate(
        findNonDisabledIndex(listContentRef.value.length - 1, false, false)
      );
    }
  };

  // Handle horizontal navigation
  const handleHorizontalNavigation = (
    event: KeyboardEvent,
    currentIndex: number,
    rtl: boolean
  ) => {
    if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) {
      stopEvent(event);

      if (currentIndex === -1) {
        navigate(
          findNonDisabledIndex(listContentRef.value.length - 1, false, false)
        );
      } else {
        navigate(findNonDisabledIndex(currentIndex, false));
      }
    } else if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) {
      stopEvent(event);

      if (currentIndex === -1) {
        navigate(findNonDisabledIndex(0, true, false));
      } else {
        navigate(findNonDisabledIndex(currentIndex, true));
      }
    }
  };

  // Handle grid navigation with multiple columns
  const handleGridNavigation = (
    event: KeyboardEvent,
    currentIndex: number,
    rtl: boolean,
    cols: number
  ) => {
    const totalItems = listContentRef.value.length;

    if (event.key === "ArrowUp") {
      stopEvent(event);

      if (currentIndex - cols >= 0) {
        navigate(findNonDisabledIndex(currentIndex - cols, false, false));
      } else if (toValue(loop)) {
        const lastRowIndex = totalItems - 1 - ((totalItems - 1) % cols);
        const offset = currentIndex % cols;
        const lastRowCol = Math.min(lastRowIndex + offset, totalItems - 1);

        navigate(findNonDisabledIndex(lastRowCol, false, false));
      }
    } else if (event.key === "ArrowDown") {
      stopEvent(event);

      if (currentIndex + cols <= totalItems - 1) {
        navigate(findNonDisabledIndex(currentIndex + cols, true, false));
      } else if (toValue(loop)) {
        const offset = currentIndex % cols;

        navigate(findNonDisabledIndex(offset, true, false));
      }
    } else if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) {
      stopEvent(event);

      if (currentIndex % cols > 0) {
        navigate(findNonDisabledIndex(currentIndex - 1, false, false));
      } else if (toValue(loop)) {
        navigate(findNonDisabledIndex(currentIndex + cols - 1, false, false));
      }
    } else if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) {
      stopEvent(event);

      if (currentIndex % cols < cols - 1 && currentIndex < totalItems - 1) {
        navigate(findNonDisabledIndex(currentIndex + 1, true, false));
      } else if (toValue(loop)) {
        navigate(
          findNonDisabledIndex(
            currentIndex - (currentIndex % cols),
            true,
            false
          )
        );
      }
    } else if (event.key === "Home") {
      stopEvent(event);
      navigate(findNonDisabledIndex(0, true, false));
    } else if (event.key === "End") {
      stopEvent(event);
      navigate(findNonDisabledIndex(totalItems - 1, false, false));
    }
  };

  // Scroll active item into view
  const scrollIntoView = () => {
    if (!toValue(scrollItemIntoView) || !open.value || indexRef.value === null)
      return;

    const activeItem = listContentRef.value[indexRef.value];
    if (activeItem && listRef.value) {
      const listRect = listRef.value.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      const isAbove = itemRect.top < listRect.top;
      const isBelow = itemRect.bottom > listRect.bottom;

      if (isAbove || isBelow) {
        // Perform scrolling based on orientation
        if (toValue(orientation) === "horizontal") {
          listRef.value.scrollLeft = isAbove
            ? activeItem.offsetLeft
            : activeItem.offsetLeft + itemRect.width - listRect.width;
        } else {
          activeItem.scrollIntoView({
            block: isAbove ? "start" : "end",
          });
        }
      }
    }
  };

  // Update listContentRef with the actual list items
  onMounted(() => {
    if (listRef.value && open.value) {
      const items = Array.from(
        listRef.value.querySelectorAll("[data-floating-index]")
      ) as HTMLElement[];

      items.sort((a, b) => {
        return (
          Number(a.dataset.floatingIndex || 0) -
          Number(b.dataset.floatingIndex || 0)
        );
      });

      listContentRef.value = items;

      // Create a map for faster lookup
      listItemsMap = new WeakMap();

      items.forEach((item, index) => {
        listItemsMap.set(item, index);
      });

      // Focus the first non-disabled item when opening
      if (
        toValue(focusItemOnOpen) &&
        focusItemOnOpenRef.value &&
        activeIndex !== null
      ) {
        const activeItem = items[toValue(activeIndex) || 0];
        if (activeItem) {
          activeItem.focus();
        }
      }
    }
  });

  // Watch for index changes and focus/scroll to the item
  watch([() => indexRef.value, () => toValue(disabledIndices)], () => {
    if (open.value && floating) {
      focusItem(indexRef.value);
      scrollIntoView();
    }
  });

  return {
    getReferenceProps: () => ({
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      "aria-activedescendant":
        indexRef.value !== null && open.value
          ? `floating-item-${indexRef.value}`
          : undefined,
    }),

    getFloatingProps: () => ({
      onKeyDown: handleKeyDown,
      onBlur: (event: FocusEvent) => {
        // The reference element should capture returning focus
        if (
          open.value &&
          !event.currentTarget.contains(event.relatedTarget as Element)
        ) {
          blurTimeoutId = window.setTimeout(() => {
            onOpenChange(false);
          });
        }
      },
      tabIndex: 0,
    }),

    getItemProps: ({ index, disabled = false }) => {
      const selected = toValue(selectedIndex) === index;
      const active = indexRef.value === index;

      return {
        role: "option",
        tabIndex: active ? 0 : -1,
        "aria-selected": selected,
        onFocus: () => {
          // Store the current index when an item receives focus
          if (!disabled) {
            navigate(index);
          }
        },
        onMouseEnter: () => {
          if (!disabled && toValue(focusItemOnHover)) {
            navigate(index);
          }
        },
        onMouseLeave: () => {
          // When mouse leaves an item, we might want to reset focus
        },
        onMouseMove: () => {
          if (!disabled && toValue(focusItemOnHover)) {
            keyRef.value = "";
          }
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            stopEvent(event);
            // Handle selection and closing if needed
          }
        },
        onClick: () => {
          if (!disabled) {
            navigate(index);
            // Additional click handling if needed
          }
        },
        id: `floating-item-${index}`,
        "data-floating-index": index,
      };
    },
  };
}

// Utility to prevent default behavior and stop propagation
function stopEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}
