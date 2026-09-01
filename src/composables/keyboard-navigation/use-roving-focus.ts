import { computed, type MaybeRefOrGetter, readonly, type Ref, toValue } from "vue";
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
 * Maintains `tabindex="0"` on the active element (or a persistent tab-stop fallback) and `tabindex="-1"`
 * on all inactive elements, allowing the composite widget to be a single tab stop in the sequential focus order.
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
 *   entryIndex: 0,
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
    elementsList,
    activeIndex: controlledActiveIndex,
    entryIndex: entryIndexOption,
    loop = false,
    rtl,
    enabled = true,
    focusOnHover = false,
    focusDisabledElements = false,
    onSelect,
    onActiveIndexChange,
  } = options;

  // --- Shared Options & Root State --------------------------------------------

  const isEnabled = computed(() => toValue(enabled));
  const orientation = computed(() => toValue(options.orientation ?? "vertical"));
  const containerEl = computed(() => toValue(options.containerEl));
  const isRtl = useRtl(containerEl, { rtl });
  const isLoop = computed(() => !!toValue(loop));
  const isFocusOnHover = computed(() => !!toValue(focusOnHover));
  const canFocusDisabled = computed(() => !!toValue(focusDisabledElements));

  const activeIndex = useControllableState({
    value: controlledActiveIndex,
    initialValue: -1,
    onChange: onActiveIndexChange,
  });

  // --- Element Validity -------------------------------------------------------

  /**
   * Whether the element at `idx` can receive roving focus. Returns false for
   * null elements, out-of-bounds indices, and disabled items (unless
   * `focusDisabledElements` is enabled).
   */
  function isNavigable(idx: number): boolean {
    const list = elementsList.value;
    if (idx < 0 || idx >= list.length) return false;
    const el = list[idx];
    if (!el) return false;
    if (canFocusDisabled.value) return true;
    return !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true";
  }

  /**
   * Whether the element at `idx` is actually disabled in the DOM, regardless
   * of the `focusDisabledElements` option. Used exclusively by the `onSelect`
   * guard: per WAI-ARIA APG, disabled items in composite widgets should be
   * focusable for discoverability but must not be activatable.
   */
  function isItemDisabled(idx: number): boolean {
    const el = elementsList.value[idx];
    if (!el) return true;
    return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";
  }

  // --- DOM Tabindex Resolution ------------------------------------------------

  /**
   * Returns the roving `tabindex` value for the element at `index`.
   *
   * Tier 1: If activeIndex is valid and navigable, it owns the tab stop.
   * Tier 2: Resolves the resting entry index from `entryIndex`.
   * Safety: Scans for the first navigable element as the universal fallback.
   */
  const getTabindex = (index: number): 0 | -1 => {
    const list = elementsList.value;
    if (list.length === 0) {
      if (activeIndex.value >= 0) {
        return index === activeIndex.value ? 0 : -1;
      }
      const entry = toValue(entryIndexOption);
      if (entry !== undefined && entry !== null) {
        return entry >= 0 && index === entry ? 0 : -1;
      }
      return index === 0 ? 0 : -1;
    }

    if (activeIndex.value >= 0 && isNavigable(activeIndex.value)) {
      return index === activeIndex.value ? 0 : -1;
    }

    const targetEntry = resolveEntryIndex(list.length, toValue(entryIndexOption), isNavigable);

    return index === targetEntry ? 0 : -1;
  };

  // --- Centralized Actions ----------------------------------------------------

  /**
   * Sets the active index state without moving DOM focus.
   * Pass `-1` to reset active focus and return the tab stop to the entry index.
   */
  function setActiveIndex(idx: number): void {
    if (idx === -1) {
      activeIndex.value = -1;
      return;
    }

    if (!isNavigable(idx)) return;

    activeIndex.value = idx;
  }

  /**
   * Sets the active index state AND physically focuses the element in the DOM.
   */
  function focusIndex(idx: number, options: { preventScroll?: boolean } = {}): void {
    const { preventScroll = false } = options;
    setActiveIndex(idx);

    if (isNavigable(idx)) {
      const el = elementsList.value[idx];
      if (!el) return;

      el.focus({ preventScroll: true });

      if (!preventScroll) {
        el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      }
    }
  }

  // --- Keyboard Navigation ----------------------------------------------------

  /**
   * Finds the index of the item that currently has DOM focus inside the
   * container. Used by `navigate()` to determine the resume point when
   * `activeIndex` is -1 (e.g. after pointerleave while DOM focus remains
   * inside the widget). Returns -1 if no item in the widget has focus.
   */
  function resolveFocusedIndex(): number {
    const container = containerEl.value;
    if (!container) return -1;
    const doc = container.ownerDocument;
    if (!doc) return -1;
    const focused = doc.activeElement;
    if (!focused || !container.contains(focused)) return -1;

    const elements = elementsList.value;
    for (let i = 0; i < elements.length; i++) {
      if (elements[i]?.contains(focused)) return i;
    }
    return -1;
  }

  function navigate(intent: NavigationIntent): void {
    const total = elementsList.value.length;
    if (total === 0) return;

    let current: number;
    if (activeIndex.value >= 0 && isNavigable(activeIndex.value)) {
      current = activeIndex.value;
    } else {
      // No active item — probe DOM focus for a resume point. This handles the
      // scenario where pointerleave cleared activeIndex to -1 but DOM focus
      // remains on an item inside the widget.
      current = resolveFocusedIndex();
      if (current < 0) {
        // No DOM focus in widget — start from edge so the first step lands
        // on the first (next/first) or last (previous/last) navigable item.
        current = intent === "next" || intent === "first" ? -1 : total;
      }
    }

    const targetIdx = resolveNavigableIndexByIntent(
      intent,
      current,
      total,
      (i) => !isNavigable(i),
      isLoop.value,
    );

    if (targetIdx !== null) {
      focusIndex(targetIdx);
    }
  }

  useEventListener(containerEl, "keydown", (e: KeyboardEvent) => {
    if (e.defaultPrevented || !isEnabled.value) return;

    const intent = resolveKeyIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });
    if (!intent) return;

    if (intent === "select") {
      const idx = activeIndex.value;
      // Guard: per WAI-ARIA APG, disabled items are focusable for discoverability
      // but must not be activatable. Check actual DOM disabled state, not the
      // navigation predicate (which is affected by focusDisabledElements).
      if (idx >= 0 && idx < elementsList.value.length && !isItemDisabled(idx)) {
        e.preventDefault();
        onSelect?.(idx, e);
      }
      return;
    }

    if (intent === "first" || intent === "last" || intent === "next" || intent === "previous") {
      e.preventDefault();
      navigate(intent);
    }
  });

  // --- Focus-In Synchronization -----------------------------------------------

  useEventListener(containerEl, "focusin", (e: FocusEvent) => {
    if (!isEnabled.value) return;
    const target = e.target as Node | null;
    if (!target) return;

    const elements = elementsList.value;
    for (let idx = 0; idx < elements.length; idx++) {
      if (elements[idx]?.contains(target)) {
        if (idx !== activeIndex.value) {
          // Element already has DOM focus (via click, Tab, or browser focus
          // management), so just sync state without moving DOM focus again.
          setActiveIndex(idx);
        }
        return;
      }
    }
  });

  // --- Focus-Out Synchronization ----------------------------------------------

  useEventListener(containerEl, "focusout", (e: FocusEvent) => {
    if (!isEnabled.value) return;
    const target = e.relatedTarget as Node | null;
    const container = containerEl.value;

    if (!container || !target || !container.contains(target)) {
      setActiveIndex(-1);
    }
  });

  // --- Pointer Hover Navigation -----------------------------------------------

  useEventListener(
    () => (isFocusOnHover.value ? containerEl.value : null),
    "pointermove",
    (e: PointerEvent) => {
      if (e.defaultPrevented || !isEnabled.value) return;
      if (e.pointerType === "touch") return;

      const target = e.target as Node | null;
      if (!target) return;

      const elements = elementsList.value;
      const activeIdx = activeIndex.value;

      // Already on the hovered item — no-op
      if (elements[activeIdx]?.contains(target)) return;

      for (let idx = 0; idx < elements.length; idx++) {
        if (!elements[idx]?.contains(target)) continue;

        if (idx !== activeIdx && isNavigable(idx)) {
          // Supports the "focus follows hover" exception (e.g. active menubar / open submenu).
          // preventScroll is to avoid viewport jumps while moving the mouse.
          focusIndex(idx, { preventScroll: true });
        }
        return;
      }
    },
  );

  useEventListener(
    () => (isFocusOnHover.value ? containerEl.value : null),
    "pointerleave",
    (e: PointerEvent) => {
      if (!isEnabled.value) return;
      if (e.pointerType === "touch") return;
      setActiveIndex(-1);
    },
  );

  return {
    activeIndex: readonly(activeIndex),
    getTabindex,
    setActiveIndex,
    focusIndex,
    next: () => navigate("next"),
    prev: () => navigate("previous"),
    first: () => navigate("first"),
    last: () => navigate("last"),
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Resolves the entry tab-stop index according to APG priority rules.
 */
function resolveEntryIndex(
  elementsCount: number,
  entryIndex: number | null | undefined,
  isNavigable: (idx: number) => boolean,
): number {
  if (elementsCount === 0) return -1;

  if (entryIndex !== undefined && entryIndex !== null) {
    if (entryIndex === -1) return -1;
    if (isNavigable(entryIndex)) return entryIndex;
  }

  for (let i = 0; i < elementsCount; i++) {
    if (isNavigable(i)) return i;
  }

  return -1;
}

/**
 * Finds the next enabled element index from a starting position in a given direction.
 */
function findNextNavigableIndex(
  startIdx: number,
  delta: 1 | -1,
  totalSize: number,
  isElementDisabled: (idx: number) => boolean,
  loop: boolean,
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

    if (!isElementDisabled(current)) {
      return current;
    }
  }

  return null;
}

/**
 * Resolves the target index for a given semantic navigation intent.
 */
function resolveNavigableIndexByIntent(
  intent: NavigationIntent,
  currentIdx: number | null,
  totalSize: number,
  isNavigableElement: (idx: number) => boolean,
  loop: boolean,
): number | null {
  if (totalSize === 0) return null;

  switch (intent) {
    case "next": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : -1;
      return findNextNavigableIndex(start, 1, totalSize, isNavigableElement, loop);
    }
    case "previous": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : totalSize;
      return findNextNavigableIndex(start, -1, totalSize, isNavigableElement, loop);
    }
    case "first":
      return findNextNavigableIndex(-1, 1, totalSize, isNavigableElement, false);
    case "last":
      return findNextNavigableIndex(totalSize, -1, totalSize, isNavigableElement, false);
    default:
      return null;
  }
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
   * Sets the active index state without moving DOM focus.
   * Pass `-1` to reset active focus and return the tab stop to the resting entry index.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Sets the active index and moves DOM focus to the element.
   */
  focusIndex: (index: number, options?: { preventScroll?: boolean }) => void;

  /**
   * Computes the roving `tabindex` (`0` or `-1`) for an element at the specified index.
   */
  getTabindex: (index: number) => 0 | -1;

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
   * Optional entry focus index (plain number, ref, or getter).
   * Designates the item that receives `tabindex="0"` when the widget is idle or entered.
   * Can be set to `-1` for widgets that start with no initial highlight (e.g. Menus, Comboboxes).
   * When omitted or null, falls back automatically to the first enabled element.
   */
  entryIndex?: MaybeRefOrGetter<number | null | undefined>;

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
   * Whether moving the pointer over an item moves DOM focus and the active
   * index to that item.
   *
   * Useful for widgets whose interaction pattern requires focus to follow
   * pointer movement, such as certain menubar and menu interactions.
   *
   * @default false
   */
  focusOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to allow keyboard navigation and roving focus to land on disabled elements.
   *
   * - `false` (default / WCAG 2.1.1): Disabled elements are skipped during keyboard navigation and cannot receive active focus.
   * - `true` (WAI-ARIA APG): Disabled elements can receive keyboard focus for discoverability, but cannot be selected (`onSelect` will not fire).
   *
   * @default false
   */
  focusDisabledElements?: MaybeRefOrGetter<boolean>;

  /**
   * Callback fired when Enter or Space is pressed on the active element.
   */
  onSelect?: (index: number, event: KeyboardEvent) => void;

  /**
   * Callback fired when the active index changes.
   */
  onActiveIndexChange?: (index: number) => void;
}
