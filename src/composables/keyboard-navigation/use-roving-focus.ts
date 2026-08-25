import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";
import type { FloatingContext } from "@/composables/floating-context";
import { useEventListener } from "@/shared/use-event-listener";
import { type NavigationIntent, resolveKeyIntent } from "./intent";
import { useRtl } from "./rtl";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables keyboard roving focus navigation across a list of items.
 *
 * Supports standard DOM lists as well as virtualized lists with virtual focus tracking.
 *
 * @param context - The floating context object containing state and refs.
 * @param options - Configuration options for roving focus behavior and virtual list support.
 * @returns Roving focus state and navigation control methods.
 *
 * @example Standard List
 * ```ts
 * const itemsList = ref<Array<HTMLElement | null>>([]);
 * useRovingFocus(context, { itemsList });
 * ```
 *
 * @example Virtual List
 * ```ts
 * const virtualItemRef = ref<HTMLElement | null>(null);
 * useRovingFocus(context, {
 *   itemsList,
 *   virtual: true,
 *   virtualItemRef,
 *   itemCount: 10000,
 * });
 * ```
 */
export function useRovingFocus(
  context: FloatingContext,
  options: UseRovingFocusOptions,
): UseRovingFocusReturn {
  const {
    itemsList: itemsListOption,
    virtual: virtualOption = false,
    virtualItemRef,
    itemCount: itemCountOption,
    activeIndex: activeIndexOption,
    initialIndex: initialIndexOption,
    autoFocus: autoFocusOption = true,
    scrollItemIntoView: scrollItemIntoViewOption = true,
    loop: loopOption = false,
    orientation: orientationOption = "vertical",
    rtl: rtlOption,
    enabled: enabledOption = true,
    isItemDisabled: isItemDisabledOption,
    onNavigate,
  } = options;

  const { refs, state } = context;

  //=====================================================================================
  // Reactive Options & State
  //=====================================================================================
  const isEnabled = computed(() => toValue(enabledOption));
  const loop = computed(() => toValue(loopOption));
  const orientation = computed(() => toValue(orientationOption));
  const isRtl = useRtl(refs.floatingEl, { rtl: rtlOption });

  const activeIndex = ref<number | null>(
    toValue(activeIndexOption) ?? toValue(initialIndexOption) ?? null,
  );

  watch(
    () => toValue(activeIndexOption),
    (val) => {
      if (val !== undefined) {
        activeIndex.value = val;
      }
    },
  );

  //=====================================================================================
  // Drivers
  //=====================================================================================
  const collection = createNavigableCollection({
    itemsList: itemsListOption,
    itemCount: itemCountOption,
    virtual: virtualOption,
    isItemDisabled: isItemDisabledOption,
  });

  const traverser = createNavigationTraverser(collection, { loop });

  const focusDriver = createFocusDriver({
    itemsList: itemsListOption,
    scrollItemIntoView: scrollItemIntoViewOption,
    virtualItemRef,
  });

  //=====================================================================================
  // Navigation Actions
  //=====================================================================================
  function setActiveIndex(idx: number, _e?: Event): void {
    if (idx < -1 || idx >= collection.getCount() || (idx >= 0 && collection.isDisabled(idx))) {
      return;
    }

    const previousIdx = activeIndex.value;
    activeIndex.value = idx;

    focusDriver.sync(idx, collection.getItem(idx));

    if (idx !== previousIdx) {
      onNavigate?.(idx >= 0 ? idx : null);
    }
  }

  function next(_e?: Event): void {
    const nextIdx = traverser.findNext(activeIndex.value);
    if (nextIdx !== null) {
      setActiveIndex(nextIdx);
    }
  }

  function prev(_e?: Event): void {
    const prevIdx = traverser.findPrev(activeIndex.value);
    if (prevIdx !== null) {
      setActiveIndex(prevIdx);
    }
  }

  function first(_e?: Event): void {
    const firstIdx = traverser.findFirst();
    if (firstIdx !== null) {
      setActiveIndex(firstIdx);
    }
  }

  function last(_e?: Event): void {
    const lastIdx = traverser.findLast();
    if (lastIdx !== null) {
      setActiveIndex(lastIdx);
    }
  }

  function onNavigateIntent(intent: NavigationIntent): void {
    const targetIdx = traverser.resolveIntent(intent, activeIndex.value);
    if (targetIdx !== null) {
      setActiveIndex(targetIdx);
    }
  }

  //=====================================================================================
  // Lifecycle & Tabindex Synchronization
  //=====================================================================================
  watch(
    [() => state.open.value, () => refs.floatingEl.value],
    ([isOpen, floatingEl]) => {
      if (!isEnabled.value || !isOpen || !floatingEl) {
        if (!isOpen) {
          activeIndex.value = null;
        }
        return;
      }

      if (!toValue(autoFocusOption)) return;

      const initialIdx = toValue(initialIndexOption) ?? toValue(activeIndexOption) ?? null;
      if (initialIdx !== null && initialIdx >= 0) {
        setActiveIndex(initialIdx);
      } else {
        first();
      }
    },
    { flush: "post" },
  );

  // Sync tabIndex on element list changes
  watch(
    [() => toValue(itemsListOption), () => state.open.value],
    ([list, isOpen]) => {
      if (!isOpen || !list || list.length === 0) return;
      focusDriver.syncTabIndex(activeIndex.value ?? 0);
    },
    { flush: "post" },
  );

  //=====================================================================================
  // Event Handlers
  //=====================================================================================
  function onFloatingKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || !isEnabled.value) return;

    const intent = resolveKeyIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });
    if (!intent) return;

    e.preventDefault();
    onNavigateIntent(intent);
  }

  useEventListener(refs.floatingEl, "keydown", onFloatingKeyDown);

  return {
    activeIndex,
    setActiveIndex,
    next,
    prev,
    first,
    last,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Creates a navigable collection abstraction over DOM and virtual item lists.
 *
 * @param options - Configuration for items list, virtual count, and disabled predicate.
 * @returns An object for querying count, elements, and disabled state.
 */
export function createNavigableCollection(
  options: CreateNavigableCollectionOptions,
): NavigableCollection {
  const {
    itemsList: itemsListOption,
    itemCount: itemCountOption,
    virtual: virtualOption,
    isItemDisabled: customIsItemDisabled,
  } = options;

  return {
    getCount(): number {
      const isVirtual = toValue(virtualOption) ?? false;
      const explicitCount = toValue(itemCountOption);
      if (isVirtual && explicitCount != null) {
        return explicitCount;
      }
      return toValue(itemsListOption)?.length ?? 0;
    },

    getItem(idx: number): HTMLElement | null {
      const list = toValue(itemsListOption);
      return list?.[idx] ?? null;
    },

    isDisabled(idx: number): boolean {
      const list = toValue(itemsListOption);
      const el = list?.[idx] ?? null;

      if (customIsItemDisabled?.(el, idx)) {
        return true;
      }

      const isVirtual = toValue(virtualOption) ?? false;
      if (!el) {
        return !isVirtual;
      }

      return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
    },
  };
}

/**
 * Creates a pure navigation traverser that calculates target indices without side effects.
 *
 * @param collection - The navigable collection data source.
 * @param options - Navigation options including boundary looping.
 * @returns Pure index calculation methods.
 */
export function createNavigationTraverser(
  collection: NavigableCollection,
  options: NavigationTraverserOptions = {},
): NavigationTraverser {
  const { loop: loopOption } = options;

  function findNext(currentIdx: number | null): number | null {
    const count = collection.getCount();
    if (count === 0) return null;

    const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : -1;
    const isLoop = toValue(loopOption) ?? false;
    return findNextNavigableIndex(start, 1, collection, isLoop);
  }

  function findPrev(currentIdx: number | null): number | null {
    const count = collection.getCount();
    if (count === 0) return null;

    const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : count;
    const isLoop = toValue(loopOption) ?? false;
    return findNextNavigableIndex(start, -1, collection, isLoop);
  }

  function findFirst(): number | null {
    return findFirstNavigableIndex(collection);
  }

  function findLast(): number | null {
    return findLastNavigableIndex(collection);
  }

  function resolveIntent(intent: NavigationIntent, currentIdx: number | null): number | null {
    switch (intent) {
      case "next":
        return findNext(currentIdx);
      case "previous":
        return findPrev(currentIdx);
      case "first":
        return findFirst();
      case "last":
        return findLast();
      default:
        return null;
    }
  }

  return {
    findNext,
    findPrev,
    findFirst,
    findLast,
    resolveIntent,
  };
}

/**
 * Creates a focus driver that encapsulates DOM side-effects (tabindex, focus, scrolling, virtual tracking).
 *
 * @param options - Configuration for item elements, scrolling, and virtual ref.
 * @returns Focus and tabindex manipulation methods.
 */
export function createFocusDriver(options: CreateFocusDriverOptions): FocusDriver {
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
export function findNextNavigableIndex(
  startIndex: number,
  delta: 1 | -1,
  collection: NavigableCollection,
  loop: boolean,
): number | null {
  const count = collection.getCount();
  if (count === 0) return null;

  let current = startIndex;

  for (let step = 0; step < count; step++) {
    current += delta;

    if (current >= count) {
      if (!loop) return null;
      current = 0;
    } else if (current < 0) {
      if (!loop) return null;
      current = count - 1;
    }

    if (!collection.isDisabled(current)) {
      return current;
    }
  }

  return null;
}

/**
 * Finds the first enabled item index in the collection.
 *
 * @param collection - Collection query interface.
 * @returns First enabled item index, or null if none enabled.
 */
export function findFirstNavigableIndex(collection: NavigableCollection): number | null {
  const count = collection.getCount();
  for (let idx = 0; idx < count; idx++) {
    if (!collection.isDisabled(idx)) {
      return idx;
    }
  }
  return null;
}

/**
 * Finds the last enabled item index in the collection.
 *
 * @param collection - Collection query interface.
 * @returns Last enabled item index, or null if none enabled.
 */
export function findLastNavigableIndex(collection: NavigableCollection): number | null {
  const count = collection.getCount();
  for (let idx = count - 1; idx >= 0; idx--) {
    if (!collection.isDisabled(idx)) {
      return idx;
    }
  }
  return null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Normalized interface for querying collection items and disabled states.
 */
export interface NavigableCollection {
  /**
   * Total number of items in the collection.
   */
  getCount: () => number;

  /**
   * Retrieves the HTML element reference at a given index.
   */
  getItem: (idx: number) => HTMLElement | null;

  /**
   * Checks whether the item at a given index is disabled.
   */
  isDisabled: (idx: number) => boolean;
}

/**
 * Configuration options for `createNavigableCollection`.
 */
export interface CreateNavigableCollectionOptions {
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
   * Custom disabled predicate.
   */
  isItemDisabled?: (item: HTMLElement | null, idx: number) => boolean;
}

/**
 * Pure index traversal interface.
 */
export interface NavigationTraverser {
  /**
   * Calculates the next enabled index.
   */
  findNext: (currentIdx: number | null) => number | null;

  /**
   * Calculates the previous enabled index.
   */
  findPrev: (currentIdx: number | null) => number | null;

  /**
   * Finds the first enabled index.
   */
  findFirst: () => number | null;

  /**
   * Finds the last enabled index.
   */
  findLast: () => number | null;

  /**
   * Resolves a semantic navigation intent to a target index.
   */
  resolveIntent: (intent: NavigationIntent, currentIdx: number | null) => number | null;
}

/**
 * Configuration options for `createNavigationTraverser`.
 */
export interface NavigationTraverserOptions {
  /**
   * Whether navigation wraps around list boundaries.
   */
  loop?: MaybeRefOrGetter<boolean | undefined>;
}

/**
 * Interface for applying DOM focus and tabindex side-effects.
 */
export interface FocusDriver {
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
export interface CreateFocusDriverOptions {
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
  activeIndex: Ref<number | null>;

  /**
   * Sets the active index and moves focus to the item.
   */
  setActiveIndex: (index: number, event?: Event) => void;

  /**
   * Moves focus to the next enabled item.
   */
  next: (event?: Event) => void;

  /**
   * Moves focus to the previous enabled item.
   */
  prev: (event?: Event) => void;

  /**
   * Moves focus to the first enabled item.
   */
  first: (event?: Event) => void;

  /**
   * Moves focus to the last enabled item.
   */
  last: (event?: Event) => void;
}

/**
 * Options for configuring roving focus navigation with virtual list support.
 */
export interface UseRovingFocusOptions {
  /**
   * The list of HTML element references representing navigable items.
   */
  itemsList: MaybeRefOrGetter<Array<HTMLElement | null>>;

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
   * The currently active item index in the list.
   */
  activeIndex?: MaybeRefOrGetter<number | null>;

  /**
   * The initial item index to focus when the floating element opens.
   */
  initialIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Whether to automatically focus the first/selected item upon opening.
   * @default true
   */
  autoFocus?: MaybeRefOrGetter<boolean>;

  /**
   * Whether or how to scroll the active item into view upon navigation.
   * @default true
   */
  scrollItemIntoView?: MaybeRefOrGetter<boolean | ScrollIntoViewOptions>;

  /**
   * Whether keyboard navigation loops around when reaching the list boundaries.
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Layout orientation of the navigable list items.
   * @default "vertical"
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal">;

  /**
   * Whether the layout follows a Right-to-Left (RTL) reading order.
   * @default false
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Whether roving focus navigation is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Predicate for determining if an item at a given index is disabled.
   */
  isItemDisabled?: (item: HTMLElement | null, index: number) => boolean;

  /**
   * Callback fired when the active item index changes during navigation.
   */
  onNavigate?: (index: number | null) => void;
}
