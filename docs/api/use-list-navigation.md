---
description: Coordinates keyboard-driven list navigation, focus movement, typeahead matching, and viewport scroll alignment in VFloat.
---

# useListNavigation

`useListNavigation` is a headless composable that coordinates keyboard navigation, focus management (roving tabindex vs `aria-activedescendant`), typeahead search, and DOM scroll alignment for linear list widgets such as listboxes, dropdown menus, select lists, comboboxes, virtual lists, and tabs.

## Type

```ts
function useListNavigation<T = ListNavigationItem | string>(
  items: MaybeRefOrGetter<readonly T[]>,
  options?: UseListNavigationOptions<T>,
): UseListNavigationReturn<T>;

type FocusStrategy = "roving" | "activedescendant";
type NavigationOrientation = "vertical" | "horizontal";

interface ListNavigationItem {
  id?: string;
  label?: string;
  disabled?: boolean;
  value?: unknown;
}

interface UseListNavigationOptions<T = ListNavigationItem | string> {
  /**
   * Ref or getter pointing to the container or input DOM element.
   * Event listeners (keyboard, click delegation, hover delegation) and ARIA attributes
   * are attached directly to this element.
   */
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Optional ref or getter pointing to an array of item DOM elements (e.g. from `ref="itemEls"` in `v-for` or virtual row assignments).
   */
  itemEls?: MaybeRefOrGetter<readonly (HTMLElement | null)[] | null | undefined>;

  /**
   * Focus management strategy:
   * - 'roving': Uses roving tabindex (`tabindex="0"` on active item, `-1` on inactive) and calls `el.focus()`.
   * - 'activedescendant': Focus remains on the container/input; sets `aria-activedescendant` and calls `el.scrollIntoView()`.
   * @default 'roving'
   */
  strategy?: MaybeRefOrGetter<FocusStrategy>;

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
   * Custom extractor for item ID.
   */
  getItemId?: (item: T, index: number) => string;

  /**
   * Custom extractor for item label (used in typeahead search).
   */
  getItemLabel?: (item: T, index: number) => string;

  /**
   * Custom predicate for disabled items.
   */
  isItemDisabled?: (item: T, index: number) => boolean;

  /**
   * Callback fired when an item is committed/selected via Enter, Space, click, or `selectOnFocus`.
   */
  onSelect?: (item: T, index: number, event: Event) => void;

  /**
   * Callback fired when the active item index changes.
   */
  onActiveChange?: (item: T | undefined, index: number) => void;
}

interface UseListNavigationReturn<T = ListNavigationItem | string> {
  /**
   * Currently active item index (-1 if none is active).
   */
  activeIndex: Ref<number>;

  /**
   * Currently active item reference.
   */
  activeItem: ComputedRef<T | undefined>;

  /**
   * Sets the active index directly.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Moves to the next enabled item.
   */
  next: () => void;

  /**
   * Moves to the previous enabled item.
   */
  prev: () => void;

  /**
   * Jumps to the first enabled item.
   */
  first: () => void;

  /**
   * Jumps to the last enabled item.
   */
  last: () => void;

  /**
   * Stops all watchers, timers, and listeners.
   */
  cleanup: () => void;
}
```

## Details

### Item Element Resolution & Event Delegation

`useListNavigation` resolves item elements via the `itemEls` array ref:

1. **Standard Lists:** Pass `ref="itemEls"` in `v-for`. The composable uses the array of elements to manage focus and event delegation.
2. **Virtual Lists:** For virtualized lists (e.g. `@tanstack/vue-virtual`), assign each virtual row element into the `itemEls` array (`:ref="(el) => itemEls[virtualRow.index] = el"`).

Clicks and hover pointer moves are **delegated on `containerEl`**, automatically resolving the item index from the target DOM element.

### Focus Strategies

- **Roving Tabindex (`strategy: 'roving'` - default):** Physical DOM focus moves directly to the active item element. The active item receives `tabindex="0"`, while all inactive siblings receive `tabindex="-1"`. Native browser focus rings and scrolling operate automatically.
- **Active Descendant (`strategy: 'activedescendant'`):** Physical DOM focus remains locked on the container or text `<input>`. The container automatically receives `aria-activedescendant="<item-id>"`, and `el.scrollIntoView({ block: 'nearest', inline: 'nearest' })` is invoked to keep the active descendant visible without losing typing cursor focus.

### Integrated Typeahead

Typing printable characters matches item labels:

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
import { ref, shallowRef, useTemplateRef } from "vue";
import { useListNavigation } from "v-float";

const cities = ref([
  { id: "cai", label: "Cairo" },
  { id: "ale", label: "Alexandria" },
  { id: "giz", label: "Giza", disabled: true },
  { id: "lux", label: "Luxor" },
]);

const containerEl = useTemplateRef<HTMLElement>("containerEl");
const itemEls = shallowRef<HTMLElement[]>([]);

const { activeIndex } = useListNavigation(cities, {
  containerEl,
  itemEls,
  strategy: "roving",
  loop: true,
  onSelect: (item) => console.log("Selected:", item.label),
});
</script>

<template>
  <ul ref="containerEl" role="listbox" class="listbox">
    <li
      v-for="(city, index) in cities"
      :key="city.id"
      ref="itemEls"
      role="option"
      :tabindex="activeIndex === index ? 0 : -1"
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
import { computed, ref, useTemplateRef, watch } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { useListNavigation } from "v-float";

const items = ref(Array.from({ length: 10000 }, (_, i) => ({ id: `id-${i}`, label: `Item ${i}` })));
const containerEl = useTemplateRef<HTMLElement>("containerEl");
const itemEls = shallowRef<(HTMLElement | null)[]>([]);

const virtualizer = useVirtualizer(
  computed(() => ({
    count: items.value.length,
    getScrollElement: () => containerEl.value,
    estimateSize: () => 36,
    overscan: 5,
  })),
);

const { activeIndex } = useListNavigation(items, {
  containerEl,
  itemEls,
  strategy: "roving",
  loop: true,
  onSelect: (item) => console.log("Selected:", item.label),
});

// Automatically scroll virtual list on keyboard navigation
watch(activeIndex, (idx) => {
  if (idx >= 0) {
    virtualizer.value.scrollToIndex(idx, { align: "auto" });
  }
});
</script>

<template>
  <div ref="containerEl" role="listbox" class="virtual-list-container">
    <div
      :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }"
    >
      <div
        v-for="virtualRow in virtualizer.getVirtualItems()"
        :key="virtualRow.index"
        :ref="(el) => (itemEls[virtualRow.index] = el as HTMLElement | null)"
        role="option"
        :tabindex="activeIndex === virtualRow.index ? 0 : -1"
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

const { activeIndex } = useListNavigation(filteredCities, {
  containerEl: inputEl,
  itemEls,
  strategy: "activedescendant",
  onSelect: (item) => {
    query.value = item.label;
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
