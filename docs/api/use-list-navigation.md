---
description: Coordinates keyboard-driven list navigation, focus movement, typeahead matching, and viewport scroll alignment in VFloat.
---

# useListNavigation

`useListNavigation` is a headless composable that coordinates keyboard navigation, focus management (roving tabindex vs `aria-activedescendant`), typeahead search, and DOM scroll alignment for linear list widgets such as listboxes, dropdown menus, select lists, comboboxes, virtual lists, and tabs.

## Type

```ts
function useListNavigation(
  items: MaybeRefOrGetter<readonly (HTMLElement | null)[] | null | undefined>,
  options?: UseListNavigationOptions,
): UseListNavigationReturn;

type NavigationStrategyType = "roving" | "activedescendant";
type FocusStrategy = NavigationStrategyType;
type NavigationOrientation = "vertical" | "horizontal";

interface UseListNavigationOptions {
  /**
   * Ref or getter pointing to the target container or input DOM element.
   * Event listeners (keyboard, click delegation, hover delegation) and ARIA attributes
   * are attached directly to this element.
   */
  targetEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Navigation focus management strategy:
   * - 'roving': Uses roving tabindex (`tabindex="0"` on active item, `-1` on inactive) and calls `el.focus()`.
   * - 'activedescendant': Focus remains on the target/input; sets `aria-activedescendant` and calls `el.scrollIntoView()`.
   *
   * Item `tabindex` attributes are owned and synchronized by the composable in both modes.
   * @default 'roving'
   */
  strategy?: MaybeRefOrGetter<NavigationStrategyType>;

  /**
   * Navigation axis:
   * - 'vertical': ArrowUp/ArrowDown navigate items.
   * - 'horizontal': ArrowLeft/ArrowRight navigate items (inverting in RTL).
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
   * By default reads `el.id` or generates an ID.
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

interface UseListNavigationReturn {
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
```

## Details

### Single Item Source of Truth & Event Delegation

`useListNavigation` takes the template ref array of DOM elements (`items`) as its single source of truth:

1. **Standard Lists:** Bind `ref="itemEls"` in `v-for` and pass `itemEls` as the first argument.
2. **Virtual Lists:** For virtualized lists (e.g. `@tanstack/vue-virtual`), assign each virtual row element into the sparse array (`:ref="(el) => itemEls[virtualRow.index] = el"`).

Clicks, hover pointer moves, and key presses are **delegated on `targetEl`**, automatically resolving the item index from the target DOM element.

### Navigation Strategies

- **Roving Tabindex (`strategy: 'roving'` - default):** Physical DOM focus moves directly to the active item element. The active item receives `tabindex="0"`, while all inactive siblings receive `tabindex="-1"`. Native browser focus rings and scrolling operate automatically.
- **Active Descendant (`strategy: 'activedescendant'`):** Physical DOM focus remains locked on `targetEl` (e.g. text `<input>`). The target element automatically receives `aria-activedescendant="<item-id>"`, and `el.scrollIntoView({ block: 'nearest', inline: 'nearest' })` is invoked to keep the active descendant visible without losing typing cursor focus.

You never bind `tabindex` yourself — the composable owns that attribute for every item element in both strategies, keeping it in sync with the active index, the strategy, and the `enabled` flag. Original values are restored when navigation is disabled or cleaned up, so unmounting never leaves stale attributes behind.

### Integrated Typeahead

Typing printable characters matches item labels automatically:

- **Automatic Extraction:** By default, labels are read from `el.getAttribute('aria-label')` or `el.textContent`.
- **Single-Character Cycling:** Repeatedly typing the same character (e.g. `g`, `g`, `g`) rotates focus sequentially through all enabled items starting with "G".
- **Multi-Character Sequences:** Rapidly typing different characters (e.g. `n`, `e`, `w`) buffers the string `"new"` and navigates directly to matching labels like `"New York"`.
- **Input Gating:** When focus is inside an editable `<input>` or `<textarea>`, typeahead is bypassed to preserve normal typing.

### Clean Keyboard Coordination

- **Arrow Keys:** Up/Down (vertical) and Left/Right (horizontal) navigate enabled items.
- **Home & End:** Instantly jump to the first and last enabled options.
- **Natural Tab Exit:** `Tab` and `Shift+Tab` pass through to standard document flow, allowing seamless macro-level focus trapping by [`useFocusManager`](/api/use-focus-manager) when inside modal dialogs.
- **Escape Delegation:** Escape key dismissals are handled cleanly by [`useEscapeKey`](/api/use-escape-key).

## Examples

### Pattern 1: Standard Listbox (Template Ref Array)

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from "vue";
import { useListNavigation } from "v-float";

const cities = [
  { id: "cai", label: "Cairo" },
  { id: "ale", label: "Alexandria" },
  { id: "giz", label: "Giza", disabled: true },
  { id: "lux", label: "Luxor" },
];

const targetEl = useTemplateRef<HTMLElement>("targetEl");
const itemEls = shallowRef<HTMLElement[]>([]);

const { activeIndex } = useListNavigation(itemEls, {
  targetEl,
  strategy: "roving",
  loop: true,
  onSelect: (index, el) => console.log("Selected:", cities[index].label),
});
</script>

<template>
  <ul ref="targetEl" role="listbox" class="listbox">
    <li
      v-for="(city, index) in cities"
      :key="city.id"
      ref="itemEls"
      role="option"
      :aria-disabled="city.disabled"
      class="listbox-option"
      :class="{
        'is-active': activeIndex === index,
        'is-disabled': city.disabled,
      }"
    >
      {{ city.label }}
    </li>
  </ul>
</template>
```

### Pattern 2: Virtualized List (`@tanstack/vue-virtual`)

```vue
<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { useListNavigation } from "v-float";

const items = Array.from({ length: 10000 }, (_, i) => ({ id: `id-${i}`, label: `Item ${i}` }));
const targetEl = useTemplateRef<HTMLElement>("targetEl");
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

const virtualizer = useVirtualizer(
  computed(() => ({
    count: items.length,
    getScrollElement: () => targetEl.value,
    estimateSize: () => 36,
    overscan: 5,
  })),
);

const { activeIndex } = useListNavigation(itemEls, {
  targetEl,
  strategy: "roving",
  loop: true,
  onSelect: (index) => console.log("Selected:", items[index].label),
});

// Automatically scroll virtual list on keyboard navigation
watch(activeIndex, (idx) => {
  if (idx >= 0) {
    virtualizer.value.scrollToIndex(idx, { align: "auto" });
  }
});
</script>

<template>
  <div ref="targetEl" role="listbox" class="virtual-list-container">
    <div
      :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }"
    >
      <div
        v-for="virtualRow in virtualizer.getVirtualItems()"
        :key="virtualRow.index"
        :ref="(el) => (itemEls[virtualRow.index] = el as HTMLElement | null)"
        role="option"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
        }"
        class="virtual-list-item"
        :class="{ 'is-active': activeIndex === virtualRow.index }"
      >
        {{ items[virtualRow.index].label }}
      </div>
    </div>
  </div>
</template>
```

### Pattern 3: Autocomplete Combobox (Active Descendant)

```vue
<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from "vue";
import { useListNavigation } from "v-float";

const query = ref("");
const isOpen = ref(false);
const inputEl = useTemplateRef<HTMLInputElement>("inputEl");
const itemEls = shallowRef<HTMLElement[]>([]);

const allCities = [
  { id: "city-cai", label: "Cairo" },
  { id: "city-ale", label: "Alexandria" },
  { id: "city-lux", label: "Luxor" },
  { id: "city-asw", label: "Aswan" },
];

const filteredCities = computed(() =>
  allCities.filter((city) => city.label.toLowerCase().includes(query.value.toLowerCase())),
);

const { activeIndex } = useListNavigation(itemEls, {
  targetEl: inputEl,
  strategy: "activedescendant",
  onSelect: (index) => {
    query.value = filteredCities.value[index].label;
    isOpen.value = false;
  },
});
</script>

<template>
  <div class="combobox">
    <input
      ref="inputEl"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? 'combobox-list' : undefined"
      v-model="query"
      @focus="isOpen = true"
      class="combobox-input"
    />

    <ul
      v-if="isOpen && filteredCities.length > 0"
      id="combobox-list"
      role="listbox"
      class="combobox-list"
    >
      <li
        v-for="(city, index) in filteredCities"
        :key="city.id"
        ref="itemEls"
        role="option"
        class="combobox-option"
        :class="{ 'is-active': activeIndex === index }"
      >
        {{ city.label }}
      </li>
    </ul>
  </div>
</template>
```

## See Also

- [`useEscapeKey`](/api/use-escape-key)
- [`useFocusManager`](/api/use-focus-manager)
- [`useRole`](/api/use-role)
- [`useFloatingContext`](/api/use-floating-context)
