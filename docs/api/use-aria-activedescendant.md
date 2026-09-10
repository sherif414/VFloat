---
description: Keeps DOM focus on an input while highlighting options virtually.
---

# useAriaActivedescendant

`useAriaActivedescendant` drives virtual focus for text-input widgets such as comboboxes and autocompletes. Physical DOM focus stays pinned on the input while `aria-activedescendant` highlights the active option.

## Type

```ts
function useAriaActivedescendant(
  options: UseAriaActivedescendantOptions,
): UseAriaActivedescendantReturn;

type AriaActivedescendantItemParam = number | { index: number; key?: string | number };

interface UseAriaActivedescendantOptions {
  targetEl?: MaybeRefOrGetter<HTMLElement | null>;
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;
  itemCount?: MaybeRefOrGetter<number>;
  elementsList?: MaybeRefOrGetter<Array<HTMLElement | null>>;
  activeIndex?: Ref<number>;
  defaultIndex?: number;
  idPrefix?: string;
  getItemId?: (index: number, key?: string | number) => string;
  getItemKey?: (index: number) => string | number;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  loop?: MaybeRefOrGetter<boolean>;
  pageSize?: MaybeRefOrGetter<number>;
  rtl?: MaybeRefOrGetter<boolean>;
  enabled?: MaybeRefOrGetter<boolean>;
  scrollIntoView?: MaybeRefOrGetter<boolean>;
  editable?: MaybeRefOrGetter<boolean | "auto">;
  preventPointerDown?: MaybeRefOrGetter<boolean>;
  focusOnHover?: MaybeRefOrGetter<boolean>;
  clearOnPointerLeave?: MaybeRefOrGetter<boolean>;
  resetOnBlur?: MaybeRefOrGetter<boolean>;
  focusDisabledElements?: MaybeRefOrGetter<boolean>;
  isItemDisabled?: (index: number) => boolean;
  virtualizer?: VirtualizerAdapter;
  onSelect?: (index: number, event: Event) => void;
  onActiveIndexChange?: (index: number) => void;
  isKeyHandled?: (event: KeyboardEvent) => boolean;
}

interface UseAriaActivedescendantReturn {
  activeIndex: Readonly<Ref<number>>;
  activeId: ComputedRef<string | undefined>;
  setActiveIndex: (index: number) => void;
  clearActive: () => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  pageUp: () => void;
  pageDown: () => void;
  scrollToActive: () => void;
  getTargetProps: () => Record<string, unknown>;
  getContainerProps: () => Record<string, unknown>;
  getItemProps: (itemOrIndex: AriaActivedescendantItemParam) => Record<string, unknown>;
  getOptionProps: (index: number) => Record<string, unknown>;
  getVirtualItemProps: (virtualItem: {
    index: number;
    key?: string | number;
  }) => Record<string, unknown>;
}
```

## Details

Unlike [`useRovingFocus`](/api/use-roving-focus), this composable takes no floating node and never moves DOM focus. Wire it by spreading `getTargetProps()` on the input, an `id` from `getContainerProps()` on the listbox, and `getItemProps(index)` on each option.

- `targetEl` holds physical focus and owns the keyboard listeners; `containerEl` bounds scrolling and hover handling. Either may be omitted for headless index use, but normally both are provided.
- The item count resolves from `elementsList` first, then `itemCount`, then `virtualizer.count`. Use `itemCount` for virtualized lists where only a window of rows is mounted.
- Options render as `${idPrefix}-opt-${key ?? index}` with an SSR-safe generated prefix unless `getItemId` overrides the scheme. The attribute commits only when the referenced element is actually mounted; off-screen rows clear it until they render.
- `orientation` defaults to `"vertical"`; `loop` defaults to `false`. <kbd>PageUp</kbd>/<kbd>PageDown</kbd> move by `pageSize` (default `10`); <kbd>Home</kbd>/<kbd>End</kbd> jump to the edges.
- Disabled options resolve from `isItemDisabled` first, then DOM `disabled`/`aria-disabled` attributes. `focusDisabledElements` allows highlighting them, but `onSelect` still never fires for disabled options. `tabindex` is never touched.
- `editable` defaults to `"auto"`, which preserves Space, Home, and End for text editing inside inputs and skips handling during IME composition.
- `scrollIntoView` defaults to `true`. For virtualized lists, pass a `virtualizer` adapter instead of scrolling the DOM: `createTanStackVirtualAdapter(virtualizer)` for TanStack Virtual, or `createCustomVirtualAdapter({ scrollToIndex, count, isIndexRendered })` for anything else. Unrendered indices keep the attribute cleared.
- `focusOnHover` (default `false`) highlights the hovered option; `clearOnPointerLeave` (default `false`, only with `focusOnHover`) clears on leave; `resetOnBlur` (default `false`) resets to `defaultIndex` (default `-1`) when focus leaves the input and list.
- Typeahead search is not built in. Pair with [`useTypeahead`](/api/use-typeahead) and forward `onMatch: (index) => setActiveIndex(index)`.

## Example

This combobox keeps focus in the input while arrows highlight options virtually.

```vue
<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from "vue";
import { useAriaActivedescendant } from "v-float";

const query = ref("");
const isOpen = ref(false);
const inputEl = useTemplateRef<HTMLInputElement>("inputEl");
const itemEls = shallowRef<HTMLElement[]>([]);

const allCities = ["Cairo", "Alexandria", "Luxor", "Aswan"];
const filteredCities = computed(() =>
  allCities.filter((city) => city.toLowerCase().includes(query.value.toLowerCase())),
);

const { activeIndex, getTargetProps, getItemProps } = useAriaActivedescendant({
  targetEl: inputEl,
  elementsList: itemEls,
  onSelect: (index) => {
    query.value = filteredCities.value[index]!;
    isOpen.value = false;
  },
});
</script>

<template>
  <div class="combobox">
    <input
      ref="inputEl"
      v-model="query"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      v-bind="getTargetProps()"
      @focus="isOpen = true"
    />

    <ul v-if="isOpen" role="listbox">
      <li
        v-for="(city, index) in filteredCities"
        :key="city"
        ref="itemEls"
        role="option"
        v-bind="getItemProps(index)"
        :class="{ 'is-active': activeIndex === index }"
      >
        {{ city }}
      </li>
    </ul>
  </div>
</template>
```

## See Also

- [`useRovingFocus`](/api/use-roving-focus) - Physical focus for menus, tabs, and toolbars
- [`useCollection`](/api/use-collection) - Headless string-value model
- [`useTypeahead`](/api/use-typeahead) - Type-to-focus search that drives `setActiveIndex`
- [Keyboard Navigation](/guide/keyboard-navigation)
