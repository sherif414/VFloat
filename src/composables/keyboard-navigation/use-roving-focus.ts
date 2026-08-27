import {
  computed,
  type MaybeRefOrGetter,
  readonly,
  type Ref,
  toValue,
  watch,
} from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
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
 * By default, maintains `tabindex="0"` on the active item and `tabindex="-1"` on all inactive items,
 * allowing the composite widget to be a single tab stop in the page sequential focus order.
 *
 * @warning When `disableAutoTabindex` is `true`, `useRovingFocus` does not manage `tabindex` on DOM elements.
 * The consumer is responsible for setting `tabindex="-1"` (or dynamic `:tabindex="activeIndex === idx ? 0 : -1"`)
 * on every item in the template so that programmatic focus and keyboard navigation operate properly.
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
    defaultActiveIndex = 0,
    activeIndex: activeIndexOption,
    onActiveIndexChange: onActiveIndexChangeOption,
    orientation: orientationOption = "vertical",
    loop: loopOption = false,
    rtl: rtlOption,
    enabled: enabledOption = true,
    disableAutoTabindex = false,
    focusItemOnHover: focusItemOnHoverOption = false,
    scrollItemIntoView: scrollItemIntoViewOption = true,
    virtual: virtualOption = false,
    virtualItemRef,
    itemCount: itemCountOption,
    isItemDisabled: isItemDisabledOption,
    onSelect,
  } = options;

  const isEnabled = computed(() => toValue(enabledOption));
  const orientation = computed(() => toValue(orientationOption));
  const containerEl = computed(() => toValue(containerElOption));
  const isRtl = useRtl(containerEl, { rtl: rtlOption });
  const isLoop = computed(() => !!toValue(loopOption));
  const isVirtual = computed(() => !!toValue(virtualOption));
  const isFocusItemOnHover = computed(() => toValue(focusItemOnHoverOption));

  const activeIndex = useControllableState({
    value: activeIndexOption,
    initialValue: defaultActiveIndex,
    onChange: onActiveIndexChangeOption,
  });

  const size = computed<number>(() => {
    const list = toValue(itemsListOption);
    const explicitCount = toValue(itemCountOption);
    return resolveCollectionSize(list?.length ?? 0, explicitCount, isVirtual.value);
  });

  function getItemEl(idx: number): HTMLElement | null {
    const list = toValue(itemsListOption);
    return list?.[idx] ?? null;
  }

  function isItemDisabled(idx: number): boolean {
    const item = getItemEl(idx);
    return resolveIsItemDisabled(item, idx, isVirtual.value, isItemDisabledOption);
  }

  let lastFocusedIndex: number | null = null;

  // --- Active Index Bounds & Validation ---------------------------------------

  // Auto-correct active index when items list populates or resizes
  watch(
    [() => toValue(itemsListOption), size],
    ([list, totalSize]) => {
      if (!list || totalSize === 0) return;

      if (
        activeIndex.value < 0 ||
        activeIndex.value >= totalSize ||
        isItemDisabled(activeIndex.value)
      ) {
        const validIdx = resolveInitialNavigableIndex(
          defaultActiveIndex,
          totalSize,
          isItemDisabled,
        );

        if (validIdx !== null) {
          activeIndex.value = validIdx;
        }
      }
    },
    { immediate: true, flush: "post" },
  );

  // Revert invalid active index changes from external sources
  watch(
    activeIndex,
    (newIdx, oldIdx) => {
      if (newIdx < 0 || newIdx >= size.value || isItemDisabled(newIdx)) {
        if (
          oldIdx !== undefined &&
          oldIdx >= 0 &&
          oldIdx < size.value &&
          !isItemDisabled(oldIdx)
        ) {
          activeIndex.value = oldIdx;
        }
      }
    },
    { flush: "sync" },
  );

  // --- DOM Tabindex Synchronization -------------------------------------------

  // Synchronize tabindex attribute across items
  watch(
    [() => toValue(itemsListOption), size, activeIndex],
    ([list, totalSize, activeIdx]) => {
      if (disableAutoTabindex || !list || totalSize === 0) return;

      for (let idx = 0; idx < list.length; idx++) {
        const el = list[idx];
        if (el) {
          el.tabIndex = idx === activeIdx ? 0 : -1;
        }
      }
    },
    { immediate: true, flush: "post" },
  );

  // --- DOM Focus & Scroll Synchronization ------------------------------------

  function focusItem(idx: number): void {
    const el = getItemEl(idx);

    if (virtualItemRef) {
      virtualItemRef.value = el;
    }

    if (el) {
      el.focus();
      const scrollConfig = toValue(scrollItemIntoViewOption);
      if (scrollConfig) {
        const scrollOptions = typeof scrollConfig === "object" ? scrollConfig : undefined;
        el.scrollIntoView?.(scrollOptions);
      }
    }

    lastFocusedIndex = idx;
  }

  // Move DOM focus when activeIndex changes externally
  watch(
    activeIndex,
    (newIdx) => {
      if (newIdx === lastFocusedIndex) return;

      if (newIdx >= 0 && newIdx < size.value && !isItemDisabled(newIdx)) {
        focusItem(newIdx);
      }
    },
    { flush: "sync" },
  );

  // --- Keyboard Navigation ----------------------------------------------------

  function setActiveIndex(idx: number): void {
    if (idx < 0 || idx >= size.value || isItemDisabled(idx)) {
      return;
    }

    activeIndex.value = idx;
    focusItem(idx);
  }

  function navigate(intent: NavigationIntent): void {
    const targetIdx = resolveNavigableIndexByIntent(
      intent,
      activeIndex.value,
      size.value,
      isItemDisabled,
      isLoop.value,
    );

    if (targetIdx !== null) {
      setActiveIndex(targetIdx);
    }
  }

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
        activeIndex.value < size.value &&
        !isItemDisabled(activeIndex.value)
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

  useEventListener(containerEl, "keydown", onKeyDown);

  // --- Pointer Hover Activation -----------------------------------------------

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
        if (isItemDisabled(idx)) return;
        if (idx !== activeIndex.value) {
          setActiveIndex(idx);
        }
        return;
      }
    }
  }

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
 * Resolves the total size of the collection from item list length or virtual item count.
 */
export function resolveCollectionSize(
  itemsListLength: number,
  itemCount?: number | null,
  isVirtual: boolean = false,
): number {
  if (isVirtual && itemCount != null) {
    return Math.max(0, itemCount);
  }
  return Math.max(0, itemsListLength);
}

/**
 * Determines whether a collection item at a given index is disabled.
 */
export function resolveIsItemDisabled(
  item: HTMLElement | null,
  idx: number,
  isVirtual: boolean = false,
  customPredicate?: (item: HTMLElement | null, idx: number) => boolean,
): boolean {
  if (customPredicate?.(item, idx)) {
    return true;
  }

  if (!item) {
    return !isVirtual;
  }

  return item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true";
}

/**
 * Finds the next enabled item index from a starting position in a given direction.
 */
export function findNextNavigableIndex(
  startIndex: number,
  delta: 1 | -1,
  totalSize: number,
  isItemDisabled: (idx: number) => boolean,
  loop: boolean,
): number | null {
  if (totalSize === 0) return null;

  let current = startIndex;

  for (let step = 0; step < totalSize; step++) {
    current += delta;

    if (current >= totalSize) {
      if (!loop) return null;
      current = 0;
    } else if (current < 0) {
      if (!loop) return null;
      current = totalSize - 1;
    }

    if (!isItemDisabled(current)) {
      return current;
    }
  }

  return null;
}

/**
 * Resolves the target index for a given semantic navigation intent.
 */
export function resolveNavigableIndexByIntent(
  intent: NavigationIntent,
  currentIdx: number | null,
  totalSize: number,
  isItemDisabled: (idx: number) => boolean,
  loop: boolean,
): number | null {
  if (totalSize === 0) return null;

  switch (intent) {
    case "next": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : -1;
      return findNextNavigableIndex(start, 1, totalSize, isItemDisabled, loop);
    }
    case "previous": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : totalSize;
      return findNextNavigableIndex(start, -1, totalSize, isItemDisabled, loop);
    }
    case "first":
      return findNextNavigableIndex(-1, 1, totalSize, isItemDisabled, false);
    case "last":
      return findNextNavigableIndex(totalSize, -1, totalSize, isItemDisabled, false);
    default:
      return null;
  }
}

/**
 * Resolves an initial or fallback valid index within collection boundaries.
 */
export function resolveInitialNavigableIndex(
  defaultIndex: number,
  totalSize: number,
  isItemDisabled: (idx: number) => boolean,
): number | null {
  if (defaultIndex >= 0 && defaultIndex < totalSize && !isItemDisabled(defaultIndex)) {
    return defaultIndex;
  }
  return findNextNavigableIndex(-1, 1, totalSize, isItemDisabled, false);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

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
   * Default active item index when uncontrolled.
   * If the item at this index is disabled or out of bounds, falls back to the first enabled item.
   * @default 0
   */
  defaultActiveIndex?: number;

  /**
   * Optional controlled active index ref.
   * When provided, the composable synchronizes with and updates this ref.
   */
  activeIndex?: Ref<number>;

  /**
   * Callback invoked whenever the active index changes.
   */
  onActiveIndexChange?: (index: number) => void;

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
   * Whether to disable automatic `tabindex` management on item elements.
   *
   * By default (`false`), `useRovingFocus` automatically synchronizes `tabindex="0"` on the active item
   * and `tabindex="-1"` on all inactive items in the DOM.
   *
   * @warning When set to `true`, `useRovingFocus` will not mutate `tabindex` attributes on items.
   * You are responsible for ensuring every item has `tabindex="-1"` (or dynamic `:tabindex="activeIndex === idx ? 0 : -1"`)
   * in your template so that programmatic focus and keyboard navigation operate properly.
   *
   * @default false
   */
  disableAutoTabindex?: boolean;

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

