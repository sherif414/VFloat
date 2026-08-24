import {
  computed,
  type ComputedRef,
  getCurrentInstance,
  type MaybeRefOrGetter,
  type Ref,
  ref,
  toValue,
  useId,
  watch,
  watchPostEffect,
} from "vue";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import { resolveKeyboardIntent } from "./intent";
import {
  createNavigationController,
  createNavigationStrategy,
  type NavigationOrientation,
  type NavigationStrategyType,
} from "./navigation-strategies";
import { useRtl } from "./rtl";
import { createTypeahead } from "./typeahead";

let idCounter = 0;

function generateId(): string {
  if (getCurrentInstance()) {
    return useId();
  }
  return String(++idCounter);
}

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Coordinates keyboard navigation, focus movement, typeahead matching, and DOM scroll alignment
 * for linear list widgets such as menus, listboxes, select dropdowns, and comboboxes.
 *
 * Receives the array ref of item DOM elements as the single source of truth (`items`),
 * delegating click, hover, and keyboard interactions on `targetEl`.
 *
 * Supports two navigation strategies:
 * - `'roving'`: Uses roving tabindex (`tabindex="0"` on active item, `-1` on others) and calls `.focus()`.
 * - `'activedescendant'`: Focus remains on the target/input; sets `aria-activedescendant` and calls `.scrollIntoView()`.
 *
 * The `tabindex` attribute of every item element is owned and synchronized internally —
 * consumers never bind `tabindex` themselves. Original values are restored on cleanup.
 *
 * @param items - Reactive array ref or getter of item DOM elements (e.g. from `ref="itemEls"` in `v-for`).
 * @param options - Configuration options for target element ref, strategy, orientation, and callbacks.
 * @returns State, active element computed ref, navigation controls, and cleanup helper.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { shallowRef, useTemplateRef } from "vue";
 * import { useListNavigation } from "v-float";
 *
 * const targetEl = useTemplateRef<HTMLElement>("targetEl");
 * const itemEls = shallowRef<HTMLElement[]>([]);
 *
 * const { activeIndex, activeEl } = useListNavigation(itemEls, {
 *   targetEl,
 *   strategy: "roving",
 *   loop: true,
 *   onSelect: (index, el) => console.log("Selected index:", index, el),
 * });
 * </script>
 *
 * <template>
 *   <ul ref="targetEl" role="listbox">
 *     <li
 *       v-for="(item, index) in ['Apple', 'Banana', 'Cherry']"
 *       :key="item"
 *       ref="itemEls"
 *       role="option"
 *       :class="{ active: activeIndex === index }"
 *     >
 *       {{ item }}
 *     </li>
 *   </ul>
 * </template>
 * ```
 */
export function useListNavigation(
  items: MaybeRefOrGetter<readonly (HTMLElement | null)[] | null | undefined>,
  options: UseListNavigationOptions = {},
): UseListNavigationReturn {
  const {
    targetEl: targetElOption,
    strategy: strategyOption = "roving",
    orientation: orientationOption = "vertical",
    loop: loopOption = false,
    typeahead: typeaheadOption = true,
    typeaheadTimeout: typeaheadTimeoutOption = 500,
    focusOnHover: focusOnHoverOption = true,
    selectOnFocus: selectOnFocusOption = false,
    enabled: enabledOption = true,
    rtl: rtlOption,
    getItemId: getItemIdOption,
    getItemLabel: getItemLabelOption,
    isItemDisabled: isItemDisabledOption,
    onSelect,
    onActiveChange,
  } = options;

  //=====================================================================================
  // State & Derived Options
  //=====================================================================================

  const itemsList = computed<readonly (HTMLElement | null)[]>(() => toValue(items) ?? []);
  const targetEl = computed(() => toValue(targetElOption) ?? null);
  const strategyName = computed(() => toValue(strategyOption));
  const orientation = computed(() => toValue(orientationOption));
  const isLoop = computed(() => toValue(loopOption));
  const isTypeahead = computed(() => toValue(typeaheadOption));
  const typeaheadTimeout = computed(() => toValue(typeaheadTimeoutOption));
  const isFocusOnHover = computed(() => toValue(focusOnHoverOption));
  const isSelectOnFocus = computed(() => toValue(selectOnFocusOption));
  const isEnabled = computed(() => toValue(enabledOption));

  const activeStrategy = computed(() => createNavigationStrategy(strategyName.value));
  const isRtl = useRtl(targetEl, { rtl: rtlOption });
  const autoIdPrefix = generateId();

  const activeIndex = ref(-1);
  const activeEl = computed<HTMLElement | null>(() => {
    const idx = activeIndex.value;
    return idx >= 0 && idx < itemsList.value.length ? (itemsList.value[idx] ?? null) : null;
  });

  const navigationController = createNavigationController(
    () => targetEl.value,
    () => itemsList.value,
  );

  const typeaheadController = createTypeahead({
    timeout: typeaheadTimeout,
    enabled: isTypeahead,
  });

  const cleanupRegistry = createCleanupRegistry();
  cleanupRegistry.add(typeaheadController.cleanup);
  cleanupRegistry.add(restoreItemTabindexes);

  //=====================================================================================
  // Item Tabindex Management
  //=====================================================================================

  // Tracks the pre-existing `tabindex` of every touched item so managed attributes can be
  // rolled back on disable/cleanup instead of leaving stale values behind.
  const previousItemTabindexes = new Map<HTMLElement, string | null>();

  function setItemTabindex(itemEl: HTMLElement, tabindex: number): void {
    const nextValue = String(tabindex);
    if (itemEl.getAttribute("tabindex") === nextValue) return;

    // Capture only the first observed value so repeated syncs never snapshot our own writes
    if (!previousItemTabindexes.has(itemEl)) {
      previousItemTabindexes.set(itemEl, itemEl.getAttribute("tabindex"));
    }
    itemEl.setAttribute("tabindex", nextValue);
  }

  function restoreItemTabindexes(): void {
    for (const [itemEl, previousValue] of previousItemTabindexes) {
      if (previousValue === null) {
        itemEl.removeAttribute("tabindex");
      } else {
        itemEl.setAttribute("tabindex", previousValue);
      }
    }
    previousItemTabindexes.clear();
  }

  //=====================================================================================
  // Item Accessors
  //=====================================================================================

  function getItemId(itemEl: HTMLElement | null, index: number): string {
    if (getItemIdOption) {
      return getItemIdOption(itemEl, index);
    }
    if (itemEl?.id) {
      return itemEl.id;
    }
    return `vfloat-item-${autoIdPrefix}-${index}`;
  }

  function getItemLabel(itemEl: HTMLElement | null, index: number): string {
    if (getItemLabelOption) {
      return getItemLabelOption(itemEl, index);
    }
    if (itemEl) {
      const ariaLabel = itemEl.getAttribute("aria-label");
      if (ariaLabel) {
        return ariaLabel.trim();
      }
      return itemEl.textContent?.trim() ?? "";
    }
    return "";
  }

  function isItemDisabled(itemEl: HTMLElement | null, index: number): boolean {
    if (isItemDisabledOption) {
      return Boolean(isItemDisabledOption(itemEl, index));
    }
    if (itemEl) {
      return itemEl.hasAttribute("disabled") || itemEl.getAttribute("aria-disabled") === "true";
    }
    return false;
  }

  //=====================================================================================
  // Navigation Methods
  //=====================================================================================

  function setActiveIndex(index: number, event?: Event): void {
    const list = itemsList.value;

    if (index < -1 || index >= list.length) {
      return;
    }

    const itemEl = index >= 0 ? (list[index] ?? null) : null;

    if (index >= 0 && isItemDisabled(itemEl, index)) {
      return;
    }

    const previousIndex = activeIndex.value;
    activeIndex.value = index;

    if (index !== previousIndex) {
      onActiveChange?.(index, itemEl);

      if (isSelectOnFocus.value && index >= 0) {
        onSelect?.(index, itemEl, event as Event);
      }
    }

    const activeId = index >= 0 ? getItemId(itemEl, index) : null;
    navigationController.syncFocus(index, activeStrategy.value, activeId);
  }

  function findNextIndex(start: number, delta: 1 | -1, loop: boolean): number | null {
    const list = itemsList.value;
    const count = list.length;
    if (count === 0) return null;

    let current = start;

    for (let step = 0; step < count; step++) {
      current += delta;

      if (current >= count) {
        if (!loop) return null;
        current = 0;
      } else if (current < 0) {
        if (!loop) return null;
        current = count - 1;
      }

      const itemEl = list[current] ?? null;
      if (!isItemDisabled(itemEl, current)) {
        return current;
      }
    }

    return null;
  }

  function next(event?: Event): void {
    const list = itemsList.value;
    if (list.length === 0) return;

    const start = activeIndex.value >= 0 ? activeIndex.value : -1;
    const nextIdx = findNextIndex(start, 1, isLoop.value);
    if (nextIdx !== null) {
      setActiveIndex(nextIdx, event);
    }
  }

  function prev(event?: Event): void {
    const list = itemsList.value;
    if (list.length === 0) return;

    const start = activeIndex.value >= 0 ? activeIndex.value : list.length;
    const prevIdx = findNextIndex(start, -1, isLoop.value);
    if (prevIdx !== null) {
      setActiveIndex(prevIdx, event);
    }
  }

  function first(event?: Event): void {
    const list = itemsList.value;
    for (let i = 0; i < list.length; i++) {
      const itemEl = list[i] ?? null;
      if (!isItemDisabled(itemEl, i)) {
        setActiveIndex(i, event);
        return;
      }
    }
  }

  function last(event?: Event): void {
    const list = itemsList.value;
    for (let i = list.length - 1; i >= 0; i--) {
      const itemEl = list[i] ?? null;
      if (!isItemDisabled(itemEl, i)) {
        setActiveIndex(i, event);
        return;
      }
    }
  }

  //=====================================================================================
  // Event Handlers & Delegation
  //=====================================================================================

  function onKeydown(e: KeyboardEvent): void {
    if (!isEnabled.value || e.defaultPrevented) {
      return;
    }

    const intent = resolveKeyboardIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });

    if (intent === "next") {
      e.preventDefault();
      next(e);
      return;
    }

    if (intent === "previous") {
      e.preventDefault();
      prev(e);
      return;
    }

    if (intent === "first") {
      e.preventDefault();
      first(e);
      return;
    }

    if (intent === "last") {
      e.preventDefault();
      last(e);
      return;
    }

    if (intent === "select") {
      const idx = activeIndex.value;
      const list = itemsList.value;
      if (idx >= 0 && idx < list.length) {
        const itemEl = list[idx] ?? null;
        if (!isItemDisabled(itemEl, idx)) {
          e.preventDefault();
          onSelect?.(idx, itemEl, e);
        }
      }
      return;
    }

    // Attempt typeahead match on unhandled printable characters
    const matchedIndex = typeaheadController.handleKey(e, {
      items: itemsList.value,
      activeIndex: activeIndex.value,
      isItemDisabled,
      getItemLabel,
    });

    if (matchedIndex !== null) {
      e.preventDefault();
      setActiveIndex(matchedIndex, e);
    }
  }

  function onClick(e: MouseEvent): void {
    if (!isEnabled.value || e.defaultPrevented) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const index = navigationController.findItemIndex(target);

    if (index === null || index < 0 || index >= itemsList.value.length) {
      return;
    }

    const itemEl = itemsList.value[index] ?? null;
    if (isItemDisabled(itemEl, index)) {
      return;
    }

    setActiveIndex(index, e);
    onSelect?.(index, itemEl, e);
  }

  function onPointermove(e: PointerEvent): void {
    if (!isEnabled.value || !isFocusOnHover.value) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const index = navigationController.findItemIndex(target);

    if (index === null || index < 0 || index >= itemsList.value.length) {
      return;
    }

    const itemEl = itemsList.value[index] ?? null;
    if (isItemDisabled(itemEl, index)) {
      return;
    }

    if (activeIndex.value !== index) {
      setActiveIndex(index, e);
    }
  }

  function onBlur(): void {
    typeaheadController.reset();
  }

  // Attach keydown, click delegation, pointermove delegation, and blur listeners to targetEl
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? targetEl.value : null), "keydown", onKeydown),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? targetEl.value : null), "click", onClick),
  );
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && isFocusOnHover.value ? targetEl.value : null),
      "pointermove",
      onPointermove,
    ),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? targetEl.value : null), "blur", onBlur),
  );

  // Synchronize targetEl attributes when strategy and targetEl change
  watchPostEffect(() => {
    const el = targetEl.value;
    if (!el || !isEnabled.value) return;

    activeStrategy.value.onTargetUpdate?.(el, orientation.value);
  });

  // Owns item tabindex so consumers never bind it manually; reruns on items,
  // active index, strategy, or enabled changes and rolls back when disabled
  watchPostEffect(() => {
    if (!isEnabled.value) {
      restoreItemTabindexes();
      return;
    }

    const list = itemsList.value;
    const strategy = activeStrategy.value;

    for (let idx = 0; idx < list.length; idx++) {
      const itemEl = list[idx];
      if (!itemEl) continue;
      setItemTabindex(itemEl, strategy.getItemTabindex(idx, activeIndex.value));
    }
  });

  // Clamps active index when items list shrinks
  watch(itemsList, (newList) => {
    if (activeIndex.value >= newList.length) {
      setActiveIndex(newList.length > 0 ? newList.length - 1 : -1);
    }
  });

  tryOnScopeDispose(cleanupRegistry.cleanup);

  return {
    activeIndex,
    activeEl,
    setActiveIndex,
    next,
    prev,
    first,
    last,
    cleanup: cleanupRegistry.cleanup,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export type {
  FocusStrategy,
  NavigationOrientation,
  NavigationStrategyType,
} from "./navigation-strategies";

export {
  ActiveDescendantNavigationStrategy,
  createNavigationController,
  createNavigationStrategy,
  NavigationStrategy,
  RovingFocusNavigationStrategy,
} from "./navigation-strategies";

/**
 * Standard item representation for list navigation (metadata helpers).
 */
export interface ListNavigationItem {
  /**
   * Unique identifier for the item.
   * If omitted, a deterministic auto-generated ID is assigned.
   */
  id?: string;
  /**
   * Accessible text label used for typeahead search matching.
   */
  label?: string;
  /**
   * Whether this item is disabled and should be skipped by keyboard navigation.
   */
  disabled?: boolean;
  /**
   * Custom underlying value or payload associated with the item.
   */
  value?: unknown;
}

/**
 * Options for configuring `useListNavigation`.
 */
export interface UseListNavigationOptions {
  /**
   * Ref or getter pointing to the target container or input DOM element.
   * Event listeners (keyboard, click delegation, hover delegation) and ARIA attributes
   * are attached directly to this element.
   */
  targetEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Navigation focus management strategy:
   * - `'roving'`: Uses roving tabindex (`tabindex="0"` on active item, `-1` on inactive) and calls `el.focus()`.
   * - `'activedescendant'`: Focus remains on the target/input; sets `aria-activedescendant` and calls `el.scrollIntoView()`.
   *
   * Item `tabindex` attributes are owned and synchronized by the composable in both modes.
   * @default 'roving'
   */
  strategy?: MaybeRefOrGetter<NavigationStrategyType>;

  /**
   * Navigation axis:
   * - `'vertical'`: ArrowUp/ArrowDown navigate items.
   * - `'horizontal'`: ArrowLeft/ArrowRight navigate items (inverting in RTL).
   * @default 'vertical'
   */
  orientation?: MaybeRefOrGetter<NavigationOrientation>;

  /**
   * If true, navigation wraps around list boundaries (end-to-start and vice versa).
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Whether typing printable characters activates typeahead search.
   * @default true
   */
  typeahead?: MaybeRefOrGetter<boolean>;

  /**
   * Duration in milliseconds before the typed buffer is reset.
   * @default 500
   */
  typeaheadTimeout?: MaybeRefOrGetter<number>;

  /**
   * Whether moving the pointer over an item activates it via event delegation.
   * @default true
   */
  focusOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * If true, changing the active index via navigation automatically triggers `onSelect`.
   * @default false
   */
  selectOnFocus?: MaybeRefOrGetter<boolean>;

  /**
   * Whether navigation behavior is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Explicit RTL layout override.
   * When omitted, direction is inferred from the DOM context.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Custom extractor for item ID (used in `aria-activedescendant`).
   * By default reads `el.id` or generates an auto-ID.
   */
  getItemId?: (itemEl: HTMLElement | null, index: number) => string;

  /**
   * Custom extractor for item label (used in typeahead search).
   * By default reads `el.getAttribute("aria-label")` or `el.textContent`.
   */
  getItemLabel?: (itemEl: HTMLElement | null, index: number) => string;

  /**
   * Custom predicate for disabled items.
   * By default checks `el.hasAttribute("disabled")` or `el.getAttribute("aria-disabled") === "true"`.
   */
  isItemDisabled?: (itemEl: HTMLElement | null, index: number) => boolean;

  /**
   * Callback fired when an item is committed/selected via Enter, Space, click, or `selectOnFocus`.
   */
  onSelect?: (index: number, itemEl: HTMLElement | null, event: Event) => void;

  /**
   * Callback fired when the active item index changes.
   */
  onActiveChange?: (index: number, itemEl: HTMLElement | null) => void;
}

/**
 * Return shape for `useListNavigation`.
 */
export interface UseListNavigationReturn {
  /**
   * Currently active item index (-1 if none is active).
   */
  activeIndex: Ref<number>;

  /**
   * Currently active item DOM element (null if none is active).
   */
  activeEl: ComputedRef<HTMLElement | null>;

  /**
   * Sets the active index directly.
   */
  setActiveIndex: (index: number, event?: Event) => void;

  /**
   * Moves to the next enabled item.
   */
  next: (event?: Event) => void;

  /**
   * Moves to the previous enabled item.
   */
  prev: (event?: Event) => void;

  /**
   * Jumps to the first enabled item.
   */
  first: (event?: Event) => void;

  /**
   * Jumps to the last enabled item.
   */
  last: (event?: Event) => void;

  /**
   * Stops all watchers, timers, and listeners.
   */
  cleanup: () => void;
}
