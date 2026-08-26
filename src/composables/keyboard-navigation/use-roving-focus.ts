import {
  computed,
  ComputedRef,
  type MaybeRefOrGetter,
  readonly,
  type Ref,
  ref,
  toValue,
  watch,
} from "vue";
import type { FloatingContext } from "@/composables/floating-context";
import { getAnchorElement } from "@/shared/elements";
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
    initialIndex: initialIndexOption,
    autoFocus: autoFocusOption = true,
    scrollItemIntoView: scrollItemIntoViewOption = true,
    loop: loopOption = false,
    orientation: orientationOption = "vertical",
    rtl: rtlOption,
    enabled: enabledOption = true,
    openOnArrowDown: openOnArrowDownOption = true,
    focusItemOnHover: focusItemOnHoverOption = false,
    focusOnHover: focusOnHoverOption,
    isItemDisabled: isItemDisabledOption,
    onNavigate,
  } = options;

  const { refs, state } = context;

  //=====================================================================================
  // Reactive Options & State
  //=====================================================================================
  const isEnabled = computed(() => toValue(enabledOption));
  const isOpenOnArrowDown = computed(() => toValue(openOnArrowDownOption));
  const isFocusItemOnHover = computed(() => {
    if (focusOnHoverOption !== undefined) {
      return toValue(focusOnHoverOption);
    }
    return toValue(focusItemOnHoverOption);
  });
  const orientation = computed(() => toValue(orientationOption));
  const isRtl = useRtl(refs.floatingEl, { rtl: rtlOption });
  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));

  const activeIndex = ref<number | null>(toValue(initialIndexOption) ?? null);

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

  //=====================================================================================
  // Navigation Actions
  //=====================================================================================
  function setActiveIndex(idx: number): void {
    if (idx < -1 || idx >= collection.size.value || (idx >= 0 && collection.isItemDisabled(idx))) {
      return;
    }

    const previousIdx = activeIndex.value;
    activeIndex.value = idx;

    focusDriver.sync(idx, collection.getItem(idx));

    if (idx !== previousIdx) {
      onNavigate?.(idx >= 0 ? idx : null);
    }
  }

  function navigate(intent: NavigationIntent): void {
    const targetIdx = collection.findIndexByIntent(intent, activeIndex.value);
    if (targetIdx !== null) {
      setActiveIndex(targetIdx);
    }
  }

  //=====================================================================================
  // Lifecycle & Tabindex Synchronization
  //=====================================================================================
  watch(
    [state.open, refs.floatingEl],
    ([isOpen, floatingEl]) => {
      if (!isEnabled.value || !isOpen || !floatingEl) {
        activeIndex.value = null;
        return;
      }

      if (!toValue(autoFocusOption)) return;

      const initialIdx = toValue(initialIndexOption);
      if (initialIdx != null && initialIdx >= 0) {
        setActiveIndex(initialIdx);
      } else {
        navigate("first");
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
  function onAnchorKeyDown(e: KeyboardEvent): void {
    if (e.key !== "ArrowDown") return;
    if (e.defaultPrevented || !isEnabled.value || !isOpenOnArrowDown.value) return;
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;

    e.preventDefault();
    if (!state.open.value) {
      state.setOpen(true, "keyboard-activate", e);
    } else if (toValue(autoFocusOption)) {
      const initialIdx = toValue(initialIndexOption);
      if (initialIdx != null) {
        setActiveIndex(initialIdx);
      } else {
        navigate("first");
      }
    }
  }

  function onFloatingKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || !isEnabled.value) return;

    const intent = resolveKeyIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });
    if (!intent) return;

    e.preventDefault();
    navigate(intent);
  }

  function onFloatingPointerMove(e: PointerEvent): void {
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

  useEventListener(anchorEl, "keydown", onAnchorKeyDown);
  useEventListener(refs.floatingEl, "keydown", onFloatingKeyDown);
  useEventListener(refs.floatingEl, "pointermove", onFloatingPointerMove);

  return {
    activeIndex: readonly(activeIndex),
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
export function createNavigableCollection(
  options: CreateNavigableCollectionOptions,
): NavigableCollection {
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
export interface NavigableCollection {
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
  activeIndex: Readonly<Ref<number | null>>;

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
   * Whether pressing ArrowDown while focus is on the anchor element opens the floating element.
   * @default true
   */
  openOnArrowDown?: MaybeRefOrGetter<boolean>;

  /**
   * Whether moving the pointer over an item moves focus and active index to that item.
   * @default false
   */
  focusItemOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Alias for `focusItemOnHover`.
   * @default false
   */
  focusOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Predicate for determining if an item at a given index is disabled.
   */
  isItemDisabled?: (item: HTMLElement | null, index: number) => boolean;

  /**
   * Callback fired when the active item index changes during navigation.
   */
  onNavigate?: (index: number | null) => void;
}
