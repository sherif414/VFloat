import { computed, ref, type MaybeRefOrGetter, readonly, type Ref, toValue } from "vue";
import { useControllableState } from "@/shared/use-controllable-state";
import { useEventListener } from "@/shared/use-event-listener";
import { type NavigationIntent, resolveKeyIntent } from "./intent";
import { resolveNavigableIndexByIntent } from "./navigation";
import { useRtl } from "./rtl";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables keyboard roving focus navigation across standalone composite widgets (menus, tabs, toolbars, trees, non-searchable listboxes).
 *
 * Physical DOM focus moves directly to each item, providing native `:focus-visible` styling,
 * built-in scroll alignment, and roving `tabindex="0"` / `tabindex="-1"` coordination.
 *
 * For text-input-driven components (comboboxes, autocompletes, searchable selects),
 * use {@link useAriaActivedescendant}.
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
    entryFocusMode = "last-focused",
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

  // Stores the index of the last focused element to support the WAI-ARIA APG
  // "last-focused" re-entry pattern across focusout boundaries.
  const lastFocusedIndex = ref<number | null>(null);

  // Tracks the entryIndex value when focus last occurred so dynamic entryIndex
  // changes synchronously supersede stale focus history without imperative watchers.
  const entryIndexAtLastFocus = ref<number | null | undefined>(undefined);

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
   * Single source of truth for the designated roving focus tab stop.
   * Evaluates reactively based on active focus, APG history, and entry configuration.
   */
  const tabStopIndex = computed<number>(() => {
    const list = elementsList.value;
    const entry = toValue(entryIndexOption);

    // Initial / SSR pre-mount phase (DOM refs not yet registered)
    if (list.length === 0) {
      if (activeIndex.value >= 0) {
        return activeIndex.value;
      }
      if (entry !== undefined && entry !== null) {
        return entry >= 0 ? entry : -1;
      }
      return 0;
    }

    // Tier 1: If activeIndex is valid and navigable, it owns the tab stop.
    if (activeIndex.value >= 0 && isNavigable(activeIndex.value)) {
      return activeIndex.value;
    }

    const hasEntryChanged = entry !== entryIndexAtLastFocus.value;

    // Tier 2: If entryFocusMode is "last-focused" and entry hasn't changed, returns tab stop to last focused item.
    if (
      entryFocusMode === "last-focused" &&
      !hasEntryChanged &&
      lastFocusedIndex.value !== null &&
      isNavigable(lastFocusedIndex.value)
    ) {
      return lastFocusedIndex.value;
    }

    // Tier 3: Resolves resting entry index from `entryIndex` (or first navigable fallback).
    return resolveEntryIndex(list.length, entry, isNavigable);
  });

  /**
   * Returns the roving `tabindex` value for the element at `index`.
   */
  const getTabindex = (index: number): 0 | -1 => {
    return index === tabStopIndex.value ? 0 : -1;
  };

  // --- Centralized Actions ----------------------------------------------------

  /**
   * Resets the roving focus interaction state and history, returning the
   * resting tab stop to the configured `entryIndex` (or first enabled fallback).
   */
  function reset(): void {
    activeIndex.value = -1;
    lastFocusedIndex.value = null;
    entryIndexAtLastFocus.value = undefined;
  }

  /**
   * Sets the active index state without moving DOM focus.
   * Pass `-1` to reset active focus and return the tab stop to the entry index.
   */
  function setActiveIndex(idx: number): void {
    if (idx === -1) {
      reset();
      return;
    }

    if (!isNavigable(idx)) return;

    activeIndex.value = idx;
    lastFocusedIndex.value = idx;
    entryIndexAtLastFocus.value = toValue(entryIndexOption);
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
        if (
          entryFocusMode === "last-focused" &&
          lastFocusedIndex.value !== null &&
          isNavigable(lastFocusedIndex.value)
        ) {
          current = lastFocusedIndex.value;
        } else {
          // No DOM focus in widget — start from edge so the first step lands
          // on the first (next/first) or last (previous/last) navigable item.
          current = intent === "next" || intent === "first" ? -1 : total;
        }
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
        setActiveIndex(idx);
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
      activeIndex.value = -1;
      if (entryFocusMode === "entry-index") {
        lastFocusedIndex.value = null;
        entryIndexAtLastFocus.value = undefined;
      }
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
      activeIndex.value = -1;
      if (entryFocusMode === "entry-index") {
        lastFocusedIndex.value = null;
        entryIndexAtLastFocus.value = undefined;
      }
    },
  );

  return {
    activeIndex: readonly(activeIndex),
    tabStopIndex: readonly(tabStopIndex),
    getTabindex,
    setActiveIndex,
    reset,
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

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Mode defining how the composite widget handles sequential tab entry after blur.
 *
 * - `"last-focused"` (default / WAI-ARIA APG): Initial tab entry targets `entryIndex`
 *   (or first enabled item); subsequent entries restore focus to the last focused element.
 * - `"entry-index"`: Every sequential tab entry unconditionally resets focus
 *   back to `entryIndex` (or first enabled item).
 */
export type RovingEntryFocusMode = "last-focused" | "entry-index";

/**
 * Return shape for `useRovingFocus`.
 */
export interface UseRovingFocusReturn {
  /**
   * The currently active element index (-1 when unfocused).
   */
  activeIndex: Readonly<Ref<number>>;

  /**
   * The currently resolved tab-stop index designating which element owns `tabindex="0"`.
   */
  tabStopIndex: Readonly<Ref<number>>;

  /**
   * Sets the active index state without moving DOM focus.
   * Pass `-1` or call `reset()` to reset active focus and return the tab stop to the resting entry index.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Resets the roving focus interaction state and history, returning the
   * resting tab stop to the configured `entryIndex` (or first enabled fallback).
   */
  reset: () => void;

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
   * Strategy for determining which element receives focus when sequentially
   * tabbing into the composite widget after focus has previously left.
   *
   * - `"last-focused"` (default / WAI-ARIA APG): Initial tab entry targets
   *   `entryIndex` (or first enabled item); subsequent entries restore focus
   *   to the last focused element.
   * - `"entry-index"`: Every sequential tab entry unconditionally resets focus
   *   back to `entryIndex` (or first enabled item).
   *
   * @default "last-focused"
   */
  entryFocusMode?: RovingEntryFocusMode;

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
