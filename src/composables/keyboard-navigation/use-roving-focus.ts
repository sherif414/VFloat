import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  readonly,
  type Ref,
  ref,
  toValue,
  watch,
} from "vue";
import { useEventListener } from "@/shared/use-event-listener";
import { type NavigationIntent, resolveKeyIntent } from "./intent";
import { useRtl } from "./rtl";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables keyboard roving focus navigation across a list of items according to the
 * WAI-ARIA roving tabindex pattern for composite widgets (toolbars, tablists, radiogroups, menus, listboxes).
 *
 * Maintains `tabindex="0"` on the active item and `tabindex="-1"` on all inactive items,
 * allowing the composite widget to be a single tab stop in the page sequential focus order.
 *
 * @param options - Configuration options for container element, items list, orientation, and navigation.
 * @returns Roving focus state and navigation control methods.
 *
 * @example Standard List
 * ```ts
 * const containerEl = useTemplateRef<HTMLElement>("container");
 * const itemsList = ref<Array<HTMLElement | null>>([]);
 *
 * const { activeIndex, next, prev } = useRovingFocus({
 *   containerEl,
 *   itemsList,
 * });
 * ```
 *
 * @example Radio Group (Both Directions with Select)
 * ```ts
 * const { activeIndex } = useRovingFocus({
 *   containerEl,
 *   itemsList,
 *   orientation: "both",
 *   loop: true,
 *   onSelect: (index) => {
 *     selectedValue.value = items[index].value;
 *   },
 * });
 * ```
 */
export function useRovingFocus(options: UseRovingFocusOptions): UseRovingFocusReturn {
  const {
    containerEl: containerElOption,
    itemsList: itemsListOption,
    defaultActiveIndex: defaultActiveIndexOption = 0,
    activeIndex: activeIndexOption,
    orientation: orientationOption = "vertical",
    loop: loopOption = false,
    rtl: rtlOption,
    enabled: enabledOption = true,
    focusItemOnHover: focusItemOnHoverOption = false,
    scrollItemIntoView: scrollItemIntoViewOption = true,
    virtual: virtualOption = false,
    virtualItemRef,
    itemCount: itemCountOption,
    isItemDisabled: isItemDisabledOption,
    onSelect,
  } = options;

  //=====================================================================================
  // Options & Reactive State
  //=====================================================================================
  const isEnabled = computed(() => toValue(enabledOption));
  const isFocusItemOnHover = computed(() => toValue(focusItemOnHoverOption));
  const orientation = computed(() => toValue(orientationOption));
  const containerEl = computed(() => toValue(containerElOption));
  const isRtl = useRtl(containerEl, { rtl: rtlOption });

  const internalActiveIndex = ref<number>(toValue(defaultActiveIndexOption) ?? 0);
  const activeIndex = activeIndexOption ?? internalActiveIndex;

  //=====================================================================================
  // Drivers
  //=====================================================================================
  const collection = createNavigableCollection({
    itemsList: itemsListOption,
    itemCount: itemCountOption,
    virtual: virtualOption,
    loop: loopOption,
    isItemDisabled: isItemDisabledOption,
  });

  const focusDriver = createFocusDriver({
    itemsList: itemsListOption,
    scrollItemIntoView: scrollItemIntoViewOption,
    virtualItemRef,
  });

  let lastSyncedIndex: number | null = null;

  //=====================================================================================
  // Navigation Actions
  //=====================================================================================
  function setActiveIndex(idx: number): void {
    if (idx < 0 || idx >= collection.size.value || collection.isItemDisabled(idx)) {
      return;
    }

    activeIndex.value = idx;
    lastSyncedIndex = idx;
    focusDriver.sync(idx, collection.getItem(idx));
  }

  function navigate(intent: NavigationIntent): void {
    const targetIdx = collection.findIndexByIntent(intent, activeIndex.value);
    if (targetIdx !== null) {
      setActiveIndex(targetIdx);
    }
  }

  //=====================================================================================
  // Synchronization & Watchers
  //=====================================================================================
  // Synchronize tabindex when items populate or change
  watch(
    [() => toValue(itemsListOption), collection.size],
    ([list, size]) => {
      if (!list || size === 0) return;

      if (
        activeIndex.value < 0 ||
        activeIndex.value >= size ||
        collection.isItemDisabled(activeIndex.value)
      ) {
        const defaultIdx = toValue(defaultActiveIndexOption) ?? 0;
        let validIdx: number | null = null;

        if (defaultIdx >= 0 && defaultIdx < size && !collection.isItemDisabled(defaultIdx)) {
          validIdx = defaultIdx;
        } else {
          validIdx = findNextNavigableIndex(-1, 1, collection, false);
        }

        if (validIdx !== null) {
          activeIndex.value = validIdx;
        }
      }

      focusDriver.syncTabIndex(activeIndex.value);
    },
    { immediate: true, flush: "post" },
  );

  // Synchronize tabindex and DOM focus when activeIndex is changed externally
  watch(
    activeIndex,
    (newIdx, oldIdx) => {
      if (newIdx === lastSyncedIndex) return;

      if (newIdx < 0 || newIdx >= collection.size.value || collection.isItemDisabled(newIdx)) {
        // Revert invalid index changes
        if (
          oldIdx !== undefined &&
          oldIdx >= 0 &&
          oldIdx < collection.size.value &&
          !collection.isItemDisabled(oldIdx)
        ) {
          activeIndex.value = oldIdx;
        }
        return;
      }

      lastSyncedIndex = newIdx;
      focusDriver.sync(newIdx, collection.getItem(newIdx));
    },
    { flush: "sync" },
  );

  //=====================================================================================
  // Event Handlers
  //=====================================================================================
  function onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || !isEnabled.value) return;

    const intent = resolveKeyIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });
    if (!intent) return;

    if (intent === "select") {
      e.preventDefault();
      if (
        activeIndex.value >= 0 &&
        activeIndex.value < collection.size.value &&
        !collection.isItemDisabled(activeIndex.value)
      ) {
        onSelect?.(activeIndex.value, e);
      }
      return;
    }

    if (intent === "first" || intent === "last" || intent === "next" || intent === "previous") {
      e.preventDefault();
      navigate(intent);
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (e.defaultPrevented || !isEnabled.value || !isFocusItemOnHover.value) return;
    if (e.pointerType === "touch") return;

    const target = e.target as Node | null;
    if (!target) return;

    const list = toValue(itemsListOption);
    if (!list) return;

    for (let idx = 0; idx < list.length; idx++) {
      const el = list[idx];
      if (el && el.contains(target)) {
        if (collection.isItemDisabled(idx)) return;
        if (idx !== activeIndex.value) {
          setActiveIndex(idx);
        }
        return;
      }
    }
  }

  useEventListener(containerEl, "keydown", onKeyDown);
  useEventListener(containerEl, "pointermove", onPointerMove);

  return {
    activeIndex: readonly(activeIndex) as Readonly<Ref<number>>,
    setActiveIndex,
    next: () => {
      navigate("next");
    },
    prev: () => {
      navigate("previous");
    },
    first: () => {
      navigate("first");
    },
    last: () => {
      navigate("last");
    },
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Creates a navigable collection abstraction over DOM and virtual item lists.
 *
 * @param options - Configuration for items list, virtual count, and disabled predicate.
 * @returns An object for querying size, elements, and disabled state.
 */
function createNavigableCollection(options: CreateNavigableCollectionOptions): NavigableCollection {
  const {
    itemsList,
    itemCount,
    virtual,
    loop = false,
    isItemDisabled: customIsItemDisabled,
  } = options;

  const size = computed<number>(() => {
    const isVirtual = !!toValue(virtual);
    const explicitCount = toValue(itemCount);

    if (isVirtual && explicitCount != null) {
      return Math.max(0, explicitCount);
    }

    const items = toValue(itemsList);
    return items ? Math.max(0, items.length) : 0;
  });

  const getItem = (idx: number) => {
    const list = toValue(itemsList);
    return list[idx] ?? null;
  };

  const isItemDisabled = (idx: number) => {
    const item = getItem(idx);

    if (customIsItemDisabled?.(item, idx)) {
      return true;
    }

    if (!item) {
      return !toValue(virtual);
    }

    return item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true";
  };

  const findIndexByIntent = (intent: NavigationIntent, currentIdx: number | null = null) => {
    const total = size.value;
    if (total === 0) return null;

    const isLoop = toValue(loop) ?? false;

    switch (intent) {
      case "next": {
        const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : -1;
        return findNextNavigableIndex(start, 1, { size, isItemDisabled }, isLoop);
      }
      case "previous": {
        const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : total;
        return findNextNavigableIndex(start, -1, { size, isItemDisabled }, isLoop);
      }
      case "first":
        return findNextNavigableIndex(-1, 1, { size, isItemDisabled }, false);
      case "last":
        return findNextNavigableIndex(total, -1, { size, isItemDisabled }, false);
      default:
        return null;
    }
  };

  return {
    size,
    findIndexByIntent,
    getItem,
    isItemDisabled,
  };
}

/**
 * Creates a focus driver that encapsulates DOM side-effects (tabindex, focus, scrolling, virtual tracking).
 *
 * @param options - Configuration for item elements, scrolling, and virtual ref.
 * @returns Focus and tabindex manipulation methods.
 */
function createFocusDriver(options: CreateFocusDriverOptions): FocusDriver {
  const { itemsList: itemsListOption, scrollItemIntoView: scrollOption, virtualItemRef } = options;

  function syncTabIndex(targetIndex: number | null): void {
    const list = toValue(itemsListOption);
    if (!list || list.length === 0) return;
    for (let idx = 0; idx < list.length; idx++) {
      const el = list[idx];
      if (el) {
        el.tabIndex = idx === targetIndex ? 0 : -1;
      }
    }
  }

  function applyFocus(el: HTMLElement | null): void {
    if (virtualItemRef) {
      virtualItemRef.value = el;
    }

    if (el) {
      el.focus();
      const shouldScroll = toValue(scrollOption);
      if (shouldScroll) {
        const scrollConfig = typeof shouldScroll === "object" ? shouldScroll : undefined;
        el.scrollIntoView?.(scrollConfig);
      }
    }
  }

  function sync(targetIndex: number, targetEl: HTMLElement | null): void {
    syncTabIndex(targetIndex);
    applyFocus(targetEl);
  }

  return {
    sync,
    syncTabIndex,
    applyFocus,
  };
}

/**
 * Finds the next enabled item index from a starting position in a given direction.
 *
 * @param startIndex - Starting index for the search.
 * @param delta - Direction of movement (+1 for forward, -1 for backward).
 * @param collection - Collection query interface.
 * @param loop - Whether search wraps around boundaries.
 * @returns The next valid index, or null if none found.
 */
function findNextNavigableIndex(
  startIndex: number,
  delta: 1 | -1,
  collection: Pick<NavigableCollection, "size" | "isItemDisabled">,
  loop: boolean,
): number | null {
  const size = collection.size.value;
  if (size === 0) return null;

  let current = startIndex;

  for (let step = 0; step < size; step++) {
    current += delta;

    if (current >= size) {
      if (!loop) return null;
      current = 0;
    } else if (current < 0) {
      if (!loop) return null;
      current = size - 1;
    }

    if (!collection.isItemDisabled(current)) {
      return current;
    }
  }

  return null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Normalized interface for querying collection items, disabled states, and navigation indices.
 */
interface NavigableCollection {
  /**
   * Total number of items in the collection.
   */
  size: ComputedRef<number>;

  /**
   * Retrieves the HTML element reference at a given index.
   */
  getItem: (idx: number) => HTMLElement | null;

  /**
   * Checks whether the item at a given index is disabled.
   */
  isItemDisabled: (idx: number) => boolean;

  /**
   * Finds the target index for a given navigation intent.
   */
  findIndexByIntent: (intent: NavigationIntent, currentIdx?: number | null) => number | null;
}

/**
 * Configuration options for `createNavigableCollection`.
 */
interface CreateNavigableCollectionOptions {
  /**
   * The list of HTML element references.
   */
  itemsList: MaybeRefOrGetter<Array<HTMLElement | null>>;

  /**
   * Total number of items in virtual list mode.
   */
  itemCount?: MaybeRefOrGetter<number | undefined>;

  /**
   * Whether virtual mode is enabled.
   */
  virtual?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Whether navigation wraps around list boundaries.
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Custom disabled predicate.
   */
  isItemDisabled?: (item: HTMLElement | null, idx: number) => boolean;
}

/**
 * Interface for applying DOM focus and tabindex side-effects.
 */
interface FocusDriver {
  /**
   * Synchronizes tabindex and applies focus/scroll to the active element.
   */
  sync: (targetIndex: number, targetEl: HTMLElement | null) => void;

  /**
   * Synchronizes roving tabindex across items.
   */
  syncTabIndex: (targetIndex: number | null) => void;

  /**
   * Applies focus, scrolling, and virtual reference updates.
   */
  applyFocus: (el: HTMLElement | null) => void;
}

/**
 * Configuration options for `createFocusDriver`.
 */
interface CreateFocusDriverOptions {
  /**
   * The list of HTML element references representing navigable items.
   */
  itemsList: MaybeRefOrGetter<Array<HTMLElement | null>>;

  /**
   * Whether or how to scroll the active item into view upon navigation.
   */
  scrollItemIntoView?: MaybeRefOrGetter<boolean | ScrollIntoViewOptions>;

  /**
   * Ref tracking the currently active virtual item DOM element.
   */
  virtualItemRef?: Ref<HTMLElement | null>;
}

/**
 * Return shape for `useRovingFocus`.
 */
export interface UseRovingFocusReturn {
  /**
   * The currently active item index.
   */
  activeIndex: Readonly<Ref<number>>;

  /**
   * Sets the active index and moves focus to the item.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Moves focus to the next enabled item.
   */
  next: () => void;

  /**
   * Moves focus to the previous enabled item.
   */
  prev: () => void;

  /**
   * Moves focus to the first enabled item.
   */
  first: () => void;

  /**
   * Moves focus to the last enabled item.
   */
  last: () => void;
}

/**
 * Options for configuring roving focus navigation across composite widget items.
 */
export interface UseRovingFocusOptions {
  /**
   * Container element that receives keyboard and pointer events and is used for RTL detection.
   */
  containerEl: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * The list of HTML element references representing navigable items.
   */
  itemsList: MaybeRefOrGetter<Array<HTMLElement | null>>;

  /**
   * Default active item index when initialized.
   * If the item at this index is disabled or out of bounds, falls back to the first enabled item.
   * @default 0
   */
  defaultActiveIndex?: MaybeRefOrGetter<number>;

  /**
   * Optional controlled active index ref.
   * When provided, the composable synchronizes with and updates this ref.
   */
  activeIndex?: Ref<number>;

  /**
   * Layout orientation of the navigable list items.
   * - `"vertical"`: ArrowUp / ArrowDown
   * - `"horizontal"`: ArrowLeft / ArrowRight
   * - `"both"`: all four arrow keys navigate sequentially
   * @default "vertical"
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;

  /**
   * Whether keyboard navigation loops around when reaching the list boundaries.
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Whether the layout follows a Right-to-Left (RTL) reading order.
   * When omitted, automatically detected from `containerEl`.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Whether roving focus navigation is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether moving the pointer over an item moves focus and active index to that item.
   * @default false
   */
  focusItemOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Whether or how to scroll the active item into view upon navigation.
   * @default true
   */
  scrollItemIntoView?: MaybeRefOrGetter<boolean | ScrollIntoViewOptions>;

  /**
   * Whether virtualized list mode is enabled.
   * When true, navigation tracks virtual items without requiring all elements in the DOM.
   * @default false
   */
  virtual?: MaybeRefOrGetter<boolean>;

  /**
   * Ref tracking the currently active virtual item DOM element.
   */
  virtualItemRef?: Ref<HTMLElement | null>;

  /**
   * Total number of items in the virtual list.
   * Useful when `itemsList` only contains currently rendered/windowed items.
   */
  itemCount?: MaybeRefOrGetter<number>;

  /**
   * Predicate for determining if an item at a given index is disabled.
   */
  isItemDisabled?: (item: HTMLElement | null, index: number) => boolean;

  /**
   * Callback fired when Enter or Space is pressed on the active item.
   */
  onSelect?: (index: number, event: KeyboardEvent) => void;
}
