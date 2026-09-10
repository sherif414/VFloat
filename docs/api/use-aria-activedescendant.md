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

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `targetEl` / `containerEl` | `MaybeRefOrGetter<HTMLElement \| null>` | — | Input holding focus and list bounding scroll/hover. |
| `itemCount` / `elementsList` | count or element array | — | `elementsList` wins; use `itemCount` for virtualized lists. |
| `activeIndex` / `defaultIndex` | `Ref<number>` / `number` | uncontrolled / `-1` | Pass a ref to control. |
| `orientation` | `"vertical" \| "horizontal" \| "both"` | `"vertical"` | Arrow-key axes. |
| `loop` | `MaybeRefOrGetter<boolean>` | `false` | Wraps at edges. |
| `pageSize` | `MaybeRefOrGetter<number>` | `10` | PageUp/PageDown step. |
| `enabled` / `scrollIntoView` / `preventPointerDown` | `MaybeRefOrGetter<boolean>` | `true` | Navigation, scrolling, and pointerdown prevention. |
| `editable` | `boolean \| "auto"` | `"auto"` | Preserves editing keys inside inputs. |
| `focusOnHover` / `clearOnPointerLeave` / `resetOnBlur` / `focusDisabledElements` | `MaybeRefOrGetter<boolean>` | `false` | Hover, leave, blur, and disabled highlighting. |
| `isItemDisabled` | `(index) => boolean` | — | Wins over DOM disabled attributes. |
| `idPrefix` / `getItemId` / `getItemKey` | strings and fns | SSR-safe prefix | Option id scheme `${prefix}-opt-${key ?? index}`. |
| `virtualizer` / `onSelect` / `onActiveIndexChange` / `isKeyHandled` | adapters and callbacks | — | Virtual lists, selection, and key interception. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `activeIndex` / `activeId` | refs | Index and committed DOM id; id clears for unmounted rows. |
| `setActiveIndex` / `clearActive` / `next` / `prev` / `first` / `last` / `pageUp` / `pageDown` | functions | Programmatic movement. |
| `scrollToActive` | `() => void` | Scrolls the active option into view. |
| `getTargetProps` / `getContainerProps` / `getItemProps` / `getOptionProps` / `getVirtualItemProps` | prop getters | Spread on input, listbox, and options. |

## Details

Unlike [`useRovingFocus`](/api/use-roving-focus), this composable takes no floating node and never moves DOM focus. Wire it by spreading `getTargetProps()` on the input, an `id` from `getContainerProps()` on the listbox, and `getItemProps(index)` on each option.

- `targetEl` holds physical focus and owns the keyboard listeners; `containerEl` bounds scrolling and hover handling. Either may be omitted for headless index use, but normally both are provided.
- The item count resolves from `elementsList` first, then `itemCount`, then `virtualizer.count`. Use `itemCount` for virtualized lists where only a window of rows is mounted.
- The attribute commits only when the referenced element is actually mounted; off-screen rows clear it until they render.
- Disabled options resolve from `isItemDisabled` first, then DOM `disabled`/`aria-disabled` attributes. `focusDisabledElements` allows highlighting them, but `onSelect` still never fires for disabled options. `tabindex` is never touched.
- For virtualized lists, pass a `virtualizer` adapter instead of scrolling the DOM. Unrendered indices keep the attribute cleared.
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
