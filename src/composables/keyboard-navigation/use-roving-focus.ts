import { computed, type MaybeRefOrGetter, readonly, type Ref, toValue, watch } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
import { useEventListener } from "@/shared/use-event-listener";
import { type NavigationIntent, resolveKeyIntent } from "./intent";
import { useRtl } from "./rtl";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables keyboard roving focus navigation across a list of elements according to the
 * WAI-ARIA roving tabindex pattern for composite widgets (toolbars, tablists, radiogroups, menus, listboxes).
 *
 * By default, maintains `tabindex="0"` on the active element and `tabindex="-1"` on all inactive elements,
 * allowing the composite widget to be a single tab stop in the page sequential focus order.
 *
 * @warning When `autoTabindex` is `false`, `useRovingFocus` does not manage `tabindex` on DOM elements.
 * The consumer is responsible for setting `tabindex="-1"` (or dynamic `:tabindex="activeIndex === idx ? 0 : -1"`)
 * on every element in the template so that programmatic focus and keyboard navigation operate properly.
 *
 * @param options - Configuration options for container element, elements list, orientation, and navigation.
 * @returns Roving focus state and navigation control methods.
 *
 * @example Standard List
 * ```ts
 * const containerEl = useTemplateRef<HTMLElement>("container");
 * const elementsList = ref<Array<HTMLElement | null>>([]);
 *
 * const { activeIndex, next, prev } = useRovingFocus({
 *   containerEl,
 *   elementsList,
 * });
 * ```
 *
 * @example Radio Group (Both Directions with Select)
 * ```ts
 * const { activeIndex } = useRovingFocus({
 *   containerEl,
 *   elementsList,
 *   orientation: "both",
 *   loop: true,
 *   onSelect: (index) => {
 *     selectedValue.value = options[index].value;
 *   },
 * });
 * ```
 */
export function useRovingFocus(options: UseRovingFocusOptions): UseRovingFocusReturn {
  const {
    containerEl,
    elementsList,
    defaultActiveIndex = 0,
    activeIndex: controlledActiveIndex,
    onActiveIndexChange,
    orientation = "vertical",
    loop = false,
    rtl,
    enabled = true,
    autoTabindex = true,
    focusOnHover = false,
    scrollIntoView = true,
    virtual = false,
    virtualElement,
    elementCount,
    isElementDisabled: customIsElementDisabled,
    allowDisabledFocus = false,
    onSelect,
  } = options;

  const isEnabled = computed(() => toValue(enabled));
  const resolvedOrientation = computed(() => toValue(orientation));
  const resolvedContainerEl = computed(() => toValue(containerEl));
  const isRtl = useRtl(resolvedContainerEl, { rtl });
  const isLoop = computed(() => !!toValue(loop));
  const isVirtual = computed(() => !!toValue(virtual));
  const isAutoTabindex = computed(() => !!toValue(autoTabindex));
  const isFocusOnHover = computed(() => !!toValue(focusOnHover));
  const canFocusDisabled = computed(() => !!toValue(allowDisabledFocus));

  const activeIndex = useControllableState({
    value: controlledActiveIndex,
    initialValue: defaultActiveIndex,
    onChange: onActiveIndexChange,
  });

  const elementsListSize = computed<number>(() => {
    const list = toValue(elementsList);
    const count = toValue(elementCount) ?? 0;
    return isVirtual.value ? count : (list?.length ?? 0);
  });

  function getElement(idx: number): HTMLElement | null {
    const list = toValue(elementsList);
    return list?.[idx] ?? null;
  }

  function isDisabled(idx: number): boolean {
    const el = getElement(idx);
    return isElementDisabled(el, idx, isVirtual.value, customIsElementDisabled);
  }

  let lastFocusedIdx: number | null = null;

  // --- Active Index Bounds & Validation ---------------------------------------

  // Auto-correct active index when elements populate or resize
  watch(
    [() => toValue(elementsList), elementsListSize, canFocusDisabled],
    ([list, size, canFocus]) => {
      if (!list || size === 0) return;

      if (
        activeIndex.value < 0 ||
        activeIndex.value >= size ||
        (!canFocus && isDisabled(activeIndex.value))
      ) {
        const validIdx = resolveInitialNavigableIndex(
          defaultActiveIndex,
          size,
          isDisabled,
          canFocus,
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
      const isInvalid =
        newIdx < 0 ||
        newIdx >= elementsListSize.value ||
        (!canFocusDisabled.value && isDisabled(newIdx));

      if (isInvalid) {
        if (
          oldIdx !== undefined &&
          oldIdx >= 0 &&
          oldIdx < elementsListSize.value &&
          (canFocusDisabled.value || !isDisabled(oldIdx))
        ) {
          activeIndex.value = oldIdx;
        }
      }
    },
    { flush: "sync" },
  );

  // --- DOM Tabindex Synchronization -------------------------------------------

  // Synchronize tabindex attribute across elements
  watch(
    [() => toValue(elementsList), elementsListSize, activeIndex, isAutoTabindex],
    ([list, size, activeIdx, autoManage]) => {
      if (!autoManage || !list || size === 0) return;

      for (let idx = 0; idx < list.length; idx++) {
        const el = list[idx];
        if (el) {
          el.tabIndex = idx === activeIdx ? 0 : -1;
        }
      }
    },
    { immediate: true, flush: "post" },
  );

  // --- DOM Focus & Scroll Synchronization -------------------------------------

  function focusElement(idx: number): void {
    const el = getElement(idx);

    if (virtualElement) {
      virtualElement.value = el;
    }

    if (el) {
      el.focus();
      const scrollConfig = toValue(scrollIntoView);
      if (scrollConfig) {
        const scrollOptions = typeof scrollConfig === "object" ? scrollConfig : undefined;
        el.scrollIntoView?.(scrollOptions);
      }
    }

    lastFocusedIdx = idx;
  }

  // Move DOM focus when activeIndex changes externally
  watch(
    activeIndex,
    (newIdx) => {
      if (newIdx === lastFocusedIdx) return;

      if (
        newIdx >= 0 &&
        newIdx < elementsListSize.value &&
        (canFocusDisabled.value || !isDisabled(newIdx))
      ) {
        focusElement(newIdx);
      }
    },
    { flush: "sync" },
  );

  // --- Keyboard Navigation ----------------------------------------------------

  function setActiveIndex(idx: number): void {
    if (idx < 0 || idx >= elementsListSize.value || (!canFocusDisabled.value && isDisabled(idx))) {
      return;
    }

    activeIndex.value = idx;
    focusElement(idx);
  }

  function navigate(intent: NavigationIntent): void {
    const targetIdx = resolveNavigableIndexByIntent(
      intent,
      activeIndex.value,
      elementsListSize.value,
      isDisabled,
      isLoop.value,
      canFocusDisabled.value,
    );

    if (targetIdx !== null) {
      setActiveIndex(targetIdx);
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || !isEnabled.value) return;

    const intent = resolveKeyIntent(e, {
      orientation: resolvedOrientation.value,
      rtl: isRtl.value,
    });
    if (!intent) return;

    if (intent === "select") {
      e.preventDefault();
      if (
        activeIndex.value >= 0 &&
        activeIndex.value < elementsListSize.value &&
        !isDisabled(activeIndex.value)
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

  useEventListener(resolvedContainerEl, "keydown", onKeyDown);

  // --- Pointer Hover Activation -----------------------------------------------

  function onPointerMove(e: PointerEvent): void {
    if (e.defaultPrevented || !isEnabled.value || !isFocusOnHover.value) return;
    if (e.pointerType === "touch") return;

    const target = e.target as Node | null;
    if (!target) return;

    const list = toValue(elementsList);
    if (!list) return;

    for (let idx = 0; idx < list.length; idx++) {
      const el = list[idx];
      if (el && el.contains(target)) {
        if (!canFocusDisabled.value && isDisabled(idx)) return;
        if (idx !== activeIndex.value) {
          setActiveIndex(idx);
        }
        return;
      }
    }
  }

  useEventListener(resolvedContainerEl, "pointermove", onPointerMove);

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
 * Determines whether a collection element at a given index is disabled.
 */
export function isElementDisabled(
  element: HTMLElement | null,
  idx: number,
  isVirtual: boolean = false,
  customPredicate?: (element: HTMLElement | null, idx: number) => boolean,
): boolean {
  if (customPredicate?.(element, idx)) {
    return true;
  }

  if (!element) {
    return !isVirtual;
  }

  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

/**
 * Finds the next enabled element index from a starting position in a given direction.
 */
export function findNextNavigableIndex(
  startIdx: number,
  delta: 1 | -1,
  totalSize: number,
  isElementDisabledFn: (idx: number) => boolean,
  loop: boolean,
  allowDisabledFocus: boolean = false,
): number | null {
  if (totalSize === 0) return null;

  let current = startIdx;

  for (let step = 0; step < totalSize; step++) {
    current += delta;

    if (current >= totalSize) {
      if (!loop) return null;
      current = 0;
    } else if (current < 0) {
      if (!loop) return null;
      current = totalSize - 1;
    }

    if (allowDisabledFocus || !isElementDisabledFn(current)) {
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
  isElementDisabledFn: (idx: number) => boolean,
  loop: boolean,
  allowDisabledFocus: boolean = false,
): number | null {
  if (totalSize === 0) return null;

  switch (intent) {
    case "next": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : -1;
      return findNextNavigableIndex(
        start,
        1,
        totalSize,
        isElementDisabledFn,
        loop,
        allowDisabledFocus,
      );
    }
    case "previous": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : totalSize;
      return findNextNavigableIndex(
        start,
        -1,
        totalSize,
        isElementDisabledFn,
        loop,
        allowDisabledFocus,
      );
    }
    case "first":
      return findNextNavigableIndex(
        -1,
        1,
        totalSize,
        isElementDisabledFn,
        false,
        allowDisabledFocus,
      );
    case "last":
      return findNextNavigableIndex(
        totalSize,
        -1,
        totalSize,
        isElementDisabledFn,
        false,
        allowDisabledFocus,
      );
    default:
      return null;
  }
}

/**
 * Resolves an initial or fallback valid index within collection boundaries.
 */
export function resolveInitialNavigableIndex(
  defaultIdx: number,
  totalSize: number,
  isElementDisabledFn: (idx: number) => boolean,
  allowDisabledFocus: boolean = false,
): number | null {
  if (
    defaultIdx >= 0 &&
    defaultIdx < totalSize &&
    (allowDisabledFocus || !isElementDisabledFn(defaultIdx))
  ) {
    return defaultIdx;
  }
  return findNextNavigableIndex(-1, 1, totalSize, isElementDisabledFn, false, allowDisabledFocus);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Return shape for `useRovingFocus`.
 */
export interface UseRovingFocusReturn {
  /**
   * The currently active element index.
   */
  activeIndex: Readonly<Ref<number>>;

  /**
   * Sets the active index and moves focus to the element.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Moves focus to the next enabled element.
   */
  next: () => void;

  /**
   * Moves focus to the previous enabled element.
   */
  prev: () => void;

  /**
   * Moves focus to the first enabled element.
   */
  first: () => void;

  /**
   * Moves focus to the last enabled element.
   */
  last: () => void;
}

/**
 * Options for configuring roving focus navigation across composite widget elements.
 */
export interface UseRovingFocusOptions {
  /**
   * Container element that receives keyboard and pointer events and is used for RTL detection.
   */
  containerEl: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * The list of HTML element references representing navigable elements.
   */
  elementsList: MaybeRefOrGetter<Array<HTMLElement | null>>;

  /**
   * Default active element index when uncontrolled.
   * If the element at this index is disabled or out of bounds, falls back to the first enabled element.
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
   * Layout orientation of the navigable list elements.
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
   * Whether `useRovingFocus` automatically synchronizes `tabindex="0"` on the active element
   * and `tabindex="-1"` on all inactive elements in the DOM.
   *
   * When set to `false`, `useRovingFocus` will not mutate `tabindex` attributes on elements.
   * You are responsible for ensuring elements have appropriate `tabindex` attributes in your template.
   *
   * @default true
   */
  autoTabindex?: MaybeRefOrGetter<boolean>;

  /**
   * Whether moving the pointer over an element moves focus and active index to that element.
   * @default false
   */
  focusOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Whether or how to scroll the active element into view upon navigation.
   * @default true
   */
  scrollIntoView?: MaybeRefOrGetter<boolean | ScrollIntoViewOptions>;

  /**
   * Whether virtualized list mode is enabled.
   * When true, navigation tracks virtual elements without requiring all elements in the DOM.
   * @default false
   */
  virtual?: MaybeRefOrGetter<boolean>;

  /**
   * Ref tracking the currently active virtual DOM element.
   */
  virtualElement?: Ref<HTMLElement | null>;

  /**
   * Total number of elements in the virtual list.
   * Useful when `elementsList` only contains currently rendered/windowed elements.
   */
  elementCount?: MaybeRefOrGetter<number>;

  /**
   * Predicate for determining if an element at a given index is disabled.
   */
  isElementDisabled?: (element: HTMLElement | null, index: number) => boolean;

  /**
   * Whether to allow keyboard navigation and roving focus to land on disabled elements.
   *
   * - `false` (default / WCAG 2.1.1): Disabled elements are skipped during keyboard navigation and cannot receive active focus.
   * - `true` (WAI-ARIA APG): Disabled elements can receive keyboard focus for discoverability, but cannot be selected (`onSelect` will not fire).
   *
   * @default false
   */
  allowDisabledFocus?: MaybeRefOrGetter<boolean>;

  /**
   * Callback fired when Enter or Space is pressed on the active element.
   */
  onSelect?: (index: number, event: KeyboardEvent) => void;
}
