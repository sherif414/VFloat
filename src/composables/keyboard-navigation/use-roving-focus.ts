import { computed, type MaybeRefOrGetter, readonly, type Ref, toValue, watch } from "vue";
import { getDocument } from "@/shared/env";
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
 * By default, maintains `tabindex="0"` on the active element (or fallback element) and `tabindex="-1"`
 * on all inactive elements, allowing the composite widget to be a single tab stop in the sequential focus order.
 *
 * @warning When `autoTabindex` is `false`, `useRovingFocus` does not manage `tabindex` on DOM elements.
 * The consumer is responsible for setting `tabindex="-1"` (or dynamic `:tabindex="activeIndex === idx ? 0 : -1"`)
 * on every element in the template so that programmatic focus and keyboard navigation operate properly.
 *
 * @param options - Configuration options for container element, elements list, orientation, and navigation.
 * @returns Roving focus state and navigation control methods.
 *
 * @example Standard List (Uncontrolled)
 * ```ts
 * const containerEl = useTemplateRef<HTMLElement>("container");
 * const elementsList = ref<Array<HTMLElement | null>>([]);
 *
 * const { activeIndex, next, prev } = useRovingFocus({
 *   containerEl,
 *   elementsList,
 *   defaultIndex: 0,
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
    activeIndex: controlledActiveIndex,
    defaultIndex = 0,
    orientation = "vertical",
    loop = false,
    rtl,
    enabled = true,
    autoTabindex = true,
    focusOnHover = false,
    scrollIntoView = true,
    allowDisabledFocus = false,
    onSelect,
    onActiveIndexChange,
  } = options;

  const isEnabled = computed(() => toValue(enabled));
  const resolvedOrientation = computed(() => toValue(orientation));
  const resolvedContainerEl = computed(() => toValue(containerEl));
  const isRtl = useRtl(resolvedContainerEl, { rtl });
  const isLoop = computed(() => !!toValue(loop));
  const isAutoTabindex = computed(() => !!toValue(autoTabindex));
  const isFocusOnHover = computed(() => !!toValue(focusOnHover));
  const canFocusDisabled = computed(() => !!toValue(allowDisabledFocus));

  const activeIndex = useControllableState({
    value: controlledActiveIndex,
    initialValue: defaultIndex,
    onChange: (value) => {
      onActiveIndexChange?.(value);
    },
  });

  function isElementDisabled(idx: number): boolean {
    const el = elementsList.value[idx];
    return !!(el?.hasAttribute("disabled") || el?.getAttribute("aria-disabled") === "true");
  }

  let isInitialized = false;
  const targetInitialIndex = controlledActiveIndex ? controlledActiveIndex.value : defaultIndex;
  let lastFocusedIdx: number | null = null;

  // --- Active Index Bounds & Validation ---------------------------------------

  // Auto-correct active index when elements populate or resize
  watch(
    [elementsList, canFocusDisabled],
    ([elements, focusDisabled]) => {
      if (elements.length === 0) return;

      const idx = activeIndex.value;

      if (!isInitialized) {
        isInitialized = true;
        // On first element population, attempt to honor the intended initial / default index
        const resolved = resolveInitialNavigableIndex(
          targetInitialIndex,
          elements.length,
          isElementDisabled,
          focusDisabled,
        );
        if (resolved !== null && resolved !== idx) {
          activeIndex.value = resolved;
        }
        return;
      }

      if (idx === -1) return;

      const isInvalidIndex =
        idx < 0 || idx >= elements.length || (!focusDisabled && isElementDisabled(idx));
      if (!isInvalidIndex) return;

      const initialIndex = resolveInitialNavigableIndex(
        idx,
        elements.length,
        isElementDisabled,
        focusDisabled,
      );

      if (initialIndex !== null) {
        activeIndex.value = initialIndex;
      }
    },
    { immediate: true, flush: "post" },
  );

  // Revert invalid active index changes from external sources
  watch(
    activeIndex,
    (newIdx, oldIdx) => {
      const elements = elementsList.value;
      if (elements.length === 0) return;

      // -1 is a valid unfocused index
      if (newIdx === -1) return;

      const isInvalid =
        newIdx < -1 ||
        newIdx >= elements.length ||
        (!canFocusDisabled.value && isElementDisabled(newIdx));

      if (isInvalid) {
        if (
          oldIdx !== undefined &&
          (oldIdx === -1 ||
            (oldIdx >= 0 &&
              oldIdx < elements.length &&
              (canFocusDisabled.value || !isElementDisabled(oldIdx))))
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
    [elementsList, activeIndex, isAutoTabindex, canFocusDisabled],
    ([elements, activeIdx, autoManage, focusDisabled]) => {
      if (!autoManage || elements.length === 0) return;

      // When activeIndex is -1, designate the first enabled fallback element for sequential Tab entry
      const targetTabindexZeroIdx =
        activeIdx >= 0 && activeIdx < elements.length
          ? activeIdx
          : resolveFallbackNavigableIndex(elements.length, isElementDisabled, focusDisabled);

      for (let idx = 0; idx < elements.length; idx++) {
        const el = elements[idx];
        if (el) {
          el.tabIndex = idx === targetTabindexZeroIdx ? 0 : -1;
        }
      }
    },
    { immediate: true, flush: "post" },
  );

  // --- DOM Focus & Scroll Synchronization -------------------------------------

  interface FocusElementOptions {
    preventScroll?: boolean;
  }

  function isWidgetFocused(): boolean {
    const container = resolvedContainerEl.value;
    const doc = container?.ownerDocument ?? getDocument();
    return isElementOrChildFocused(container, elementsList.value, doc?.activeElement);
  }

  function focusElement(idx: number, focusOptions: FocusElementOptions = {}): void {
    if (idx < 0 || idx >= elementsList.value.length) return;
    const el = elementsList.value[idx];
    if (!el) return;

    el.focus({ preventScroll: focusOptions.preventScroll });
    if (!focusOptions.preventScroll) {
      const scrollConfig = toValue(scrollIntoView);
      if (scrollConfig) {
        const scrollOptions = typeof scrollConfig === "object" ? scrollConfig : undefined;
        el.scrollIntoView?.(scrollOptions);
      }
    }
    lastFocusedIdx = idx;
  }

  // Move DOM focus when activeIndex changes externally while widget is focused
  watch(
    activeIndex,
    (newIdx) => {
      if (newIdx === lastFocusedIdx || newIdx === -1) return;

      if (
        isWidgetFocused() &&
        newIdx >= 0 &&
        newIdx < elementsList.value.length &&
        (canFocusDisabled.value || !isElementDisabled(newIdx))
      ) {
        focusElement(newIdx);
      }
    },
    { flush: "sync" },
  );

  // --- Keyboard & Focus Navigation --------------------------------------------

  function setActiveIndex(idx: number, focusOptions?: FocusElementOptions): void {
    if (idx === -1) {
      lastFocusedIdx = -1;
      activeIndex.value = -1;
      return;
    }

    if (
      idx < 0 ||
      idx >= elementsList.value.length ||
      (!canFocusDisabled.value && isElementDisabled(idx))
    ) {
      return;
    }

    lastFocusedIdx = idx;
    activeIndex.value = idx;
    focusElement(idx, focusOptions);
  }

  function navigate(intent: NavigationIntent): void {
    const targetIdx = resolveNavigableIndexByIntent(
      intent,
      activeIndex.value,
      elementsList.value.length,
      isElementDisabled,
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
        activeIndex.value < elementsList.value.length &&
        !isElementDisabled(activeIndex.value)
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

  function onFocusIn(e: FocusEvent): void {
    if (!isEnabled.value) return;
    const target = e.target as Node | null;
    if (!target) return;

    const elements = elementsList.value;

    for (let idx = 0; idx < elements.length; idx++) {
      const el = elements[idx];
      if (el && (el === target || el.contains(target))) {
        if (!canFocusDisabled.value && isElementDisabled(idx)) return;
        if (idx !== activeIndex.value) {
          lastFocusedIdx = idx;
          activeIndex.value = idx;
        }
        return;
      }
    }
  }

  useEventListener(resolvedContainerEl, "focusin", onFocusIn);

  // --- Pointer Hover Activation -----------------------------------------------

  function onPointerMove(e: PointerEvent): void {
    if (e.defaultPrevented || !isEnabled.value || !isFocusOnHover.value) return;
    if (e.pointerType === "touch") return;

    const target = e.target as Node | null;
    if (!target) return;

    const elements = elementsList.value;

    for (let idx = 0; idx < elements.length; idx++) {
      const el = elements[idx];
      if (el && el.contains(target)) {
        if (!canFocusDisabled.value && isElementDisabled(idx)) return;
        if (idx !== activeIndex.value) {
          setActiveIndex(idx, { preventScroll: true });
        }
        return;
      }
    }
  }

  useEventListener(resolvedContainerEl, "pointermove", onPointerMove);

  return {
    activeIndex: readonly(activeIndex) as Readonly<Ref<number>>,
    setActiveIndex: (index: number) => {
      setActiveIndex(index);
    },
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
 * Checks whether the active element is within the container or matches any element in the elementsList.
 */
export function isElementOrChildFocused(
  container: HTMLElement | null | undefined,
  elements: Array<HTMLElement | null>,
  activeElement: Element | null | undefined,
): boolean {
  if (!activeElement) return false;

  if (container && (container === activeElement || container.contains(activeElement))) {
    return true;
  }

  for (let idx = 0; idx < elements.length; idx++) {
    const el = elements[idx];
    if (el && (el === activeElement || el.contains(activeElement))) {
      return true;
    }
  }

  return false;
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
 * Resolves the fallback element index that should receive tabindex="0" for sequential tab entry.
 */
export function resolveFallbackNavigableIndex(
  totalSize: number,
  isElementDisabledFn: (idx: number) => boolean,
  allowDisabledFocus: boolean = false,
): number | null {
  if (totalSize === 0) return null;
  return findNextNavigableIndex(-1, 1, totalSize, isElementDisabledFn, false, allowDisabledFocus);
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
  if (defaultIdx === -1) {
    return -1;
  }
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
   * The currently active element index (-1 when unfocused).
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
  elementsList: Readonly<Ref<(HTMLElement | null)[]>>;

  /**
   * Optional controlled active index ref.
   * When provided, the composable synchronizes with and updates this ref.
   */
  activeIndex?: Ref<number>;

  /**
   * Initial active index for uncontrolled mode.
   * Can be set to `-1` for widgets that start with no initial highlight (e.g. Menus, Comboboxes).
   * @default 0
   */
  defaultIndex?: number;

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

  /**
   * Callback fired when the active index changes.
   */
  onActiveIndexChange?: (index: number) => void;
}
