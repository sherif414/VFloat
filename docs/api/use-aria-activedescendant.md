---
description: Manages virtual focus for comboboxes and listboxes using aria-activedescendant.
---

# useAriaActivedescendant

`useAriaActivedescendant` manages virtual focus for comboboxes, autocompletes, and searchable pickers. DOM focus remains pinned to the `<input>` element to preserve caret navigation, IME composition, and virtual mobile keyboards while arrow keys navigate suggestions.

`useAriaActivedescendant` automatically synchronizes the `aria-activedescendant` DOM attribute on the anchor element, scrolls active items into view, resets when the floating surface closes, and implements the [`NavigationTarget`](/api/types#navigationtarget) protocol.

## Type

```ts
function useAriaActivedescendant(
  context: UseAriaActivedescendantContext,
  options?: UseAriaActivedescendantOptions,
): UseAriaActivedescendantReturn;

interface UseAriaActivedescendantContext extends Pick<
  FloatingNode,
  "id" | "refs" | "open" | "setOpen"
> {}

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

interface UseAriaActivedescendantReturn extends NavigationTarget {
  readonly activeIndex: Readonly<Ref<number>>;
  activeId: ComputedRef<string | undefined>;
  focusIndex: (target: NavigationTargetValue, options?: NavigationTargetOptions) => void;
  setActiveIndex: (index: number) => void;
  clearActive: () => void;
  scrollToActive: () => void;
  getItemId: (index: number, key?: string | number) => string;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `targetEl` | `MaybeRefOrGetter<HTMLElement \| null>` | `context.refs.anchorEl` | Target element holding physical DOM focus and receiving `aria-activedescendant`. |
| `containerEl` | `MaybeRefOrGetter<HTMLElement \| null>` | `context.refs.floatingEl` | Container element holding the items. Used for bounded scroll calculations. |
| `elementsList` | `MaybeRefOrGetter<Array<HTMLElement \| null>>` | `undefined` | List of element references for static or dynamic DOM lists. |
| `itemCount` | `MaybeRefOrGetter<number>` | Inferred / `0` | Total number of items when using virtualized lists. |
| `activeIndex` | `Ref<number>` | `undefined` | Optional controlled active index ref. |
| `defaultIndex` | `number` | `-1` | Initial active index in uncontrolled mode (`-1` = none). |
| `idPrefix` | `string` | Auto `useId()` | Base prefix used for generating descendant element IDs. |
| `getItemId` | `(index: number, key?: string \| number) => string` | Built-in pattern | Custom function resolving the DOM element ID for an item. |
| `getItemKey` | `(index: number) => string \| number` | `undefined` | Key extractor for stable identities in virtualized lists. |
| `orientation` | `MaybeRefOrGetter<"vertical" \| "horizontal" \| "both">` | `"vertical"` | Navigation axis. |
| `loop` | `MaybeRefOrGetter<boolean>` | `false` | When `true`, arrow keys wrap around at boundaries. |
| `pageSize` | `MaybeRefOrGetter<number>` | `10` | Number of items jumped on `PageUp` and `PageDown`. |
| `rtl` | `MaybeRefOrGetter<boolean>` | Auto-detected | Right-to-Left reading order flag. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | When `false`, keyboard handlers are inactive. |
| `scrollIntoView` | `MaybeRefOrGetter<boolean>` | `true` | Whether active items are automatically scrolled into view. |
| `editable` | `MaybeRefOrGetter<boolean \| "auto">` | `"auto"` | Preserves Space typing and Home/End caret navigation when target is editable. |
| `preventPointerDown` | `MaybeRefOrGetter<boolean>` | `true` | Prevents pointerdown default on non-interactive item surfaces to retain input focus. |
| `focusOnHover` | `MaybeRefOrGetter<boolean>` | `false` | Activates item highlight on pointermove. |
| `clearOnPointerLeave` | `MaybeRefOrGetter<boolean>` | `false` | Clears highlight when pointer leaves container. |
| `resetOnBlur` | `MaybeRefOrGetter<boolean>` | `false` | Resets highlight when target input loses focus. |
| `focusDisabledElements` | `MaybeRefOrGetter<boolean>` | `false` | Allows virtual highlighting of disabled items for APG discoverability. |
| `isItemDisabled` | `(index: number) => boolean` | Auto-detected | Custom predicate for disabled items. |
| `virtualizer` | `VirtualizerAdapter` | `undefined` | Virtual scroller bridge for large lists. |
| `onSelect` | `(index: number, event: Event) => void` | `undefined` | Callback fired on Enter or Space. |
| `onActiveIndexChange` | `(index: number) => void` | `undefined` | Callback fired on active index change. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `activeIndex` | `Readonly<Ref<number>>` | Current highlighted index, or `-1` if none is active. |
| `activeId` | `ComputedRef<string \| undefined>` | DOM ID of the currently active descendant, or `undefined` when inactive. |
| `focusIndex` | `(target: NavigationTargetValue, options?: NavigationTargetOptions) => void` | Polymorphic navigation method. Accepts an index, `"reset"`, or directional keywords (`"next"`, `"prev"`, `"first"`, `"last"`, `"page-up"`, `"page-down"`). |
| `setActiveIndex` | `(index: number) => void` | Imperatively sets active index and scrolls into view. |
| `clearActive` | `() => void` | Clears active descendant (sets index to `-1`). |
| `scrollToActive` | `() => void` | Imperatively scrolls the current active item into view. |
| `getItemId` | `(index: number, key?: string \| number) => string` | Resolves the DOM element ID for the item at `index` (with optional `key`). |

## Details

### Virtual Focus vs Physical Focus

In a combobox, the user must be able to type in the `<input>` while simultaneously browsing suggestions:

- **Physical focus ([`useRovingFocus`](/api/use-roving-focus))** moves the browser's cursor out of the `<input>`, which interrupts text entry and closes mobile virtual keyboards.
- **Virtual focus (`useAriaActivedescendant`)** keeps browser focus pinned to the `<input>`. As the user presses Arrow Down, the input's `aria-activedescendant` attribute automatically synchronizes to reference the active item's DOM ID. Screen readers announce the active item, and VFloat scrolls the highlighted element into view.

### Virtual Scroller Integration

For lists containing thousands of items, DOM rendering must be virtualized. VFloat exports two adapters that bridge virtualizer engines directly with `useAriaActivedescendant`:

#### 1. `@tanstack/vue-virtual` Adapter

```ts
import { useVirtualizer } from "@tanstack/vue-virtual";
import { createTanStackVirtualAdapter, useAriaActivedescendant } from "v-float";

const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollParentEl.value,
  estimateSize: () => 35,
});

const adapter = createTanStackVirtualAdapter(rowVirtualizer);

const { activeIndex, getItemId } = useAriaActivedescendant(context, {
  virtualizer: adapter,
  getItemKey: (idx) => items[idx].id,
});
```

#### 2. Custom Virtualizer Adapter

```ts
import { createCustomVirtualAdapter, useAriaActivedescendant } from "v-float";

const adapter = createCustomVirtualAdapter({
  scrollToIndex: (index, options) => myCustomScroller.scrollTo(index, options),
  count: () => items.value.length,
  isIndexRendered: (index) => myCustomScroller.isRendered(index),
});
```

## Example

```vue
<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useAriaActivedescendant, useFloatingNode, usePosition } from "v-float";

const anchorEl = shallowRef<HTMLInputElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const elementsList = shallowRef<Array<HTMLElement | null>>([]);
const query = shallowRef("");

const allItems = ["Vue.js", "React", "Svelte", "Solid", "Angular", "Ember"];
const filtered = computed(() =>
  allItems.filter((item) => item.toLowerCase().includes(query.value.toLowerCase())),
);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, { placement: "bottom-start" });

const { activeIndex, getItemId } = useAriaActivedescendant(context, {
  elementsList,
  onSelect: (index) => {
    query.value = filtered.value[index]!;
    context.setOpen(false);
  },
});

function onInput() {
  if (!context.open.value) context.setOpen(true);
}
</script>

<template>
  <div class="combobox-wrapper">
    <input
      ref="anchorEl"
      v-model="query"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="context.open.value"
      placeholder="Type a framework..."
      @input="onInput"
      @focus="context.setOpen(true)"
    />

    <ul
      v-if="context.open.value && filtered.length"
      ref="floatingEl"
      role="listbox"
      class="listbox"
      :style="styles"
    >
      <li
        v-for="(item, idx) in filtered"
        :id="getItemId(idx)"
        :key="item"
        :ref="(el) => (elementsList[idx] = el as HTMLElement | null)"
        role="option"
        :aria-selected="activeIndex === idx"
        :data-active="activeIndex === idx ? '' : undefined"
        :class="{ highlighted: activeIndex === idx }"
      >
        {{ item }}
      </li>
    </ul>
  </div>
</template>
```

## See Also

- [`useRovingFocus`](/api/use-roving-focus) - Physical DOM focus alternative
- [`useTypeahead`](/api/use-typeahead) - Match query buffer
- [`usePosition`](/api/use-position) - Positioning popup menu under input
- [Keyboard Navigation](/guide/keyboard-navigation) - Focus patterns guide
