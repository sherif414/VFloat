import {
  computed,
  getCurrentInstance,
  type MaybeRefOrGetter,
  ref,
  toValue,
  useId,
  watch,
  watchPostEffect,
} from "vue";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import { createFocusStrategyController } from "./focus-strategies";
import { resolveKeyboardIntent } from "./intent";
import { useRtl } from "./rtl";
import { createTypeahead } from "./typeahead";
import type {
  ListNavigationItem,
  UseListNavigationOptions,
  UseListNavigationReturn,
} from "./types";

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
 * Supports hybrid element resolution (automatic DOM queries, `itemEls` array, or `registerItemElement`)
 * and event delegation on the container element.
 *
 * Supports two focus strategies:
 * - `'roving'`: Uses roving tabindex (`tabindex="0"` on active item, `-1` on others) and calls `.focus()`.
 * - `'activedescendant'`: Focus remains on the container/input; sets `aria-activedescendant` and calls `.scrollIntoView()`.
 *
 * @param items - Reactive collection or getter of items (objects or strings).
 * @param options - Configuration options for container element ref, item resolution, strategy, orientation, and callbacks.
 * @returns State, navigation controls, and element registration helpers.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref, useTemplateRef } from "vue";
 * import { useListNavigation } from "v-float";
 *
 * const items = ref(["Apple", "Banana", "Cherry"]);
 * const containerEl = useTemplateRef<HTMLElement>("containerEl");
 *
 * const { activeIndex } = useListNavigation(items, {
 *   containerEl,
 *   strategy: "roving",
 *   loop: true,
 *   onSelect: (item) => console.log("Selected:", item),
 * });
 * </script>
 *
 * <template>
 *   <ul ref="containerEl" role="listbox">
 *     <li
 *       v-for="(item, index) in items"
 *       :key="item"
 *       role="option"
 *       :class="{ active: activeIndex === index }"
 *     >
 *       {{ item }}
 *     </li>
 *   </ul>
 * </template>
 * ```
 */
export function useListNavigation<T = ListNavigationItem | string>(
  items: MaybeRefOrGetter<readonly T[]>,
  options: UseListNavigationOptions<T> = {},
): UseListNavigationReturn<T> {
  const {
    containerEl: containerElOption,
    itemEls: itemElsOption,
    itemSelector,
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

  const itemsList = computed<readonly T[]>(() => toValue(items) ?? []);
  const containerEl = computed(() => toValue(containerElOption) ?? null);
  const strategy = computed(() => toValue(strategyOption));
  const orientation = computed(() => toValue(orientationOption));
  const isLoop = computed(() => toValue(loopOption));
  const isTypeahead = computed(() => toValue(typeaheadOption));
  const typeaheadTimeout = computed(() => toValue(typeaheadTimeoutOption));
  const isFocusOnHover = computed(() => toValue(focusOnHoverOption));
  const isSelectOnFocus = computed(() => toValue(selectOnFocusOption));
  const isEnabled = computed(() => toValue(enabledOption));

  const isRtl = useRtl(containerEl, { rtl: rtlOption });
  const autoIdPrefix = generateId();

  const activeIndex = ref(-1);
  const activeItem = computed<T | undefined>(() => {
    const idx = activeIndex.value;
    return idx >= 0 && idx < itemsList.value.length ? itemsList.value[idx] : undefined;
  });

  const focusController = createFocusStrategyController(() => containerEl.value, {
    getItemEls: () => toValue(itemElsOption),
    itemSelector,
  });

  const typeaheadController = createTypeahead({
    timeout: typeaheadTimeout,
    enabled: isTypeahead,
  });

  const cleanupRegistry = createCleanupRegistry();
  cleanupRegistry.add(typeaheadController.cleanup);
  cleanupRegistry.add(focusController.clearElements);

  //=====================================================================================
  // Item Resolvers
  //=====================================================================================

  function resolveItemId(item: T, index: number): string {
    if (getItemIdOption) {
      return getItemIdOption(item, index);
    }
    if (item && typeof item === "object" && "id" in item && (item as any).id) {
      return String((item as any).id);
    }
    return `vfloat-item-${autoIdPrefix}-${index}`;
  }

  function resolveItemLabel(item: T, index: number): string {
    if (getItemLabelOption) {
      return getItemLabelOption(item, index);
    }
    if (typeof item === "string") {
      return item;
    }
    if (
      item &&
      typeof item === "object" &&
      "label" in item &&
      typeof (item as any).label === "string"
    ) {
      return (item as any).label;
    }
    return String(item ?? "");
  }

  function resolveItemDisabled(item: T, index: number): boolean {
    if (isItemDisabledOption) {
      return Boolean(isItemDisabledOption(item, index));
    }
    if (item && typeof item === "object" && "disabled" in item) {
      return Boolean((item as any).disabled);
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

    if (index >= 0 && resolveItemDisabled(list[index], index)) {
      return;
    }

    const previousIndex = activeIndex.value;
    activeIndex.value = index;

    const currentItem = index >= 0 ? list[index] : undefined;

    if (index !== previousIndex) {
      onActiveChange?.(currentItem, index);

      if (isSelectOnFocus.value && currentItem !== undefined) {
        onSelect?.(currentItem, index, event as Event);
      }
    }

    const activeId = currentItem !== undefined ? resolveItemId(currentItem, index) : null;
    focusController.syncFocus(index, strategy.value, activeId);
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

      if (!resolveItemDisabled(list[current], current)) {
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
      if (!resolveItemDisabled(list[i], i)) {
        setActiveIndex(i, event);
        return;
      }
    }
  }

  function last(event?: Event): void {
    const list = itemsList.value;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!resolveItemDisabled(list[i], i)) {
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
        const item = list[idx];
        if (!resolveItemDisabled(item, idx)) {
          e.preventDefault();
          onSelect?.(item, idx, e);
        }
      }
      return;
    }

    // Attempt typeahead match on unhandled printable characters
    const matchedIndex = typeaheadController.handleKey(e, {
      items: itemsList.value,
      activeIndex: activeIndex.value,
      isItemDisabled: resolveItemDisabled,
      getItemLabel: resolveItemLabel,
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
    const index = focusController.findItemIndex(target);

    if (index === null || index < 0 || index >= itemsList.value.length) {
      return;
    }

    const item = itemsList.value[index];
    if (resolveItemDisabled(item, index)) {
      return;
    }

    setActiveIndex(index, e);
    onSelect?.(item, index, e);
  }

  function onPointermove(e: PointerEvent): void {
    if (!isEnabled.value || !isFocusOnHover.value) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const index = focusController.findItemIndex(target);

    if (index === null || index < 0 || index >= itemsList.value.length) {
      return;
    }

    const item = itemsList.value[index];
    if (resolveItemDisabled(item, index)) {
      return;
    }

    if (activeIndex.value !== index) {
      setActiveIndex(index, e);
    }
  }

  function onBlur(): void {
    typeaheadController.reset();
  }

  // Attach keydown, click delegation, pointermove delegation, and blur listeners to container
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? containerEl.value : null), "keydown", onKeydown),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? containerEl.value : null), "click", onClick),
  );
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && isFocusOnHover.value ? containerEl.value : null),
      "pointermove",
      onPointermove,
    ),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? containerEl.value : null), "blur", onBlur),
  );

  // Synchronize activedescendant attributes when containerEl and activeItem change
  watchPostEffect(() => {
    const el = containerEl.value;
    if (!el || !isEnabled.value) return;

    if (strategy.value === "activedescendant") {
      if (!el.hasAttribute("tabindex") && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
        el.setAttribute("tabindex", "0");
      }
      el.setAttribute("aria-orientation", orientation.value);
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
    activeItem,
    setActiveIndex,
    next,
    prev,
    first,
    last,
    registerItemElement: focusController.registerItemElement,
    cleanup: cleanupRegistry.cleanup,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

//=======================================================================================
// 📌 Types
//=======================================================================================

export type * from "./types";
