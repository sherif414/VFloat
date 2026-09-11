---
description: Manages virtual focus for comboboxes and listboxes using aria-activedescendant.
---

# useAriaActivedescendant

`useAriaActivedescendant` manages virtual focus for comboboxes, autocompletes, and searchable pickers. DOM focus remains on the `<input>` element while arrow keys navigate items, updating `aria-activedescendant` with the ID of the highlighted item.

## Type

```ts
function useAriaActivedescendant(
  context: UseAriaActivedescendantContext,
  options?: UseAriaActivedescendantOptions,
): UseAriaActivedescendantReturn;

interface UseAriaActivedescendantContext {
  anchorEl: Ref<HTMLElement | null>;
  elementsList?: Ref<Array<HTMLElement | null>>;
}

interface UseAriaActivedescendantOptions {
  idPrefix?: string;
  itemCount?: MaybeRefOrGetter<number>;
  initialIndex?: MaybeRefOrGetter<number>;
  loop?: MaybeRefOrGetter<boolean>;
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;
  virtualizer?: VirtualizerAdapter;
  item?: AriaActivedescendantItemParam;
  isItemDisabled?: (index: number) => boolean;
}

interface VirtualizerAdapter {
  scrollToIndex: (index: number, options?: { align?: "auto" | "start" | "end" | "center" }) => void;
  count?: MaybeRefOrGetter<number>;
  isIndexRendered?: (index: number) => boolean;
}

interface UseAriaActivedescendantReturn {
  activeIndex: Readonly<Ref<number>>;
  activeId: Readonly<Ref<string | null>>;
  handleKeydown: (event: KeyboardEvent) => void;
  setActiveIndex: (index: number) => void;
  first: () => void;
  last: () => void;
  next: () => void;
  prev: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `idPrefix` | `string` | `"vfloat-descendant"` | Prefix used to generate item IDs (`"{prefix}-{index}"`). |
| `itemCount` | `MaybeRefOrGetter<number>` | Auto | Total count of items. Inferred automatically if `elementsList` is supplied. |
| `initialIndex` | `MaybeRefOrGetter<number>` | `-1` | Initial active index. `-1` indicates no item is selected. |
| `loop` | `MaybeRefOrGetter<boolean>` | `true` | When `true`, arrow keys wrap around at boundaries. |
| `orientation` | `MaybeRefOrGetter<"vertical" \| "horizontal" \| "both">` | `"vertical"` | Navigation axis. |
| `virtualizer` | `VirtualizerAdapter` | `undefined` | Virtual scroller bridge for large lists. |
| `item` | `AriaActivedescendantItemParam` | `undefined` | Custom item ID or attribute resolver. |
| `isItemDisabled` | `(index: number) => boolean` | `undefined` | Predicate returning `true` for disabled item indices. Disabled items are skipped. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `activeIndex` | `Readonly<Ref<number>>` | Current highlighted index, or `-1` if none is active. |
| `activeId` | `Readonly<Ref<string \| null>>` | Active element ID string applied to the anchor's `aria-activedescendant`. |
| `handleKeydown` | `(event: KeyboardEvent) => void` | Event listener handling Arrow keys, Home, End, and PageUp/PageDown on the input. |
| `setActiveIndex` | `(index: number) => void` | Imperatively jumps to an index and scrolls it into view. |
| `first` / `last` | `() => void` | Moves to the first or last enabled item. |
| `next` / `prev` | `() => void` | Advances or retreats to adjacent enabled items. |

## Details

### Virtual Focus vs Physical Focus

In a combobox, the user must be able to type in the `<input>` while simultaneously browsing suggestions:

- **Physical focus ([`useRovingFocus`](/api/use-roving-focus))** moves the browser's cursor out of the `<input>`, which interrupts text entry and closes mobile virtual keyboards.
- **Virtual focus (`useAriaActivedescendant`)** keeps browser focus pinned to the `<input>`. As the user presses Arrow Down, the input's `aria-activedescendant` updates to reference the active item's DOM ID. Screen readers announce the active item, and VFloat scrolls the highlighted element into view.

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

const { activeIndex, handleKeydown } = useAriaActivedescendant(
  { anchorEl: inputEl },
  { virtualizer: adapter },
);
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
import { computed, ref } from "vue";
import { useAriaActivedescendant, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLInputElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const query = ref("");

const allItems = ["Vue.js", "React", "Svelte", "Solid", "Angular", "Ember"];
const filtered = computed(() =>
  allItems.filter((item) => item.toLowerCase().includes(query.value.toLowerCase())),
);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, { placement: "bottom-start" });

const { activeIndex, activeId, handleKeydown } = useAriaActivedescendant(
  { anchorEl },
  {
    itemCount: () => filtered.value.length,
    idPrefix: "framework-item",
  },
);

function onInput() {
  if (!node.open.value) node.setOpen(true);
}
</script>

<template>
  <div class="combobox-wrapper">
    <input
      ref="anchorEl"
      v-model="query"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="node.open"
      :aria-activedescendant="activeId ?? undefined"
      placeholder="Type a framework..."
      @input="onInput"
      @keydown="handleKeydown"
    />

    <ul
      v-if="node.open && filtered.length"
      ref="floatingEl"
      role="listbox"
      class="listbox"
      :style="styles"
    >
      <li
        v-for="(item, idx) in filtered"
        :id="`framework-item-${idx}`"
        :key="item"
        role="option"
        :aria-selected="activeIndex === idx"
        :class="{ highlighted: activeIndex === idx }"
      >
        {{ item }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.combobox-wrapper {
  position: relative;
  display: inline-block;
}
.listbox {
  margin: 0;
  padding: 4px;
  list-style: none;
  background: white;
  border: 1px solid #ccc;
  width: 200px;
}
.listbox li {
  padding: 6px 10px;
  cursor: pointer;
}
.listbox li.highlighted {
  background: #eef2ff;
  color: #3b82f6;
}
</style>
```

## See Also

- [`useRovingFocus`](/api/use-roving-focus) - Physical DOM focus alternative
- [`useTypeahead`](/api/use-typeahead) - Match query buffer
- [`usePosition`](/api/use-position) - Positioning popup menu under input
- [Keyboard Navigation](/guide/keyboard-navigation) - Focus patterns guide
