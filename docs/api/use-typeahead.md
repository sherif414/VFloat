---
description: Captures typing sequences to jump to matching items in a list.
---

# useTypeahead

`useTypeahead` captures rapid keystrokes to jump directly to matching items in an item list. It buffers typed characters, supports repeated-character cycling, and emits matching indices to drive focus composables.

## Type

```ts
function useTypeahead(options: UseTypeaheadOptions): UseTypeaheadReturn;

interface UseTypeaheadOptions {
  items: MaybeRefOrGetter<Array<string>>;
  activeIndex?: MaybeRefOrGetter<number>;
  resetMs?: MaybeRefOrGetter<number>;
  findMatch?: TypeaheadFindMatchFn;
  onMatch?: (index: number) => void;
}

type TypeaheadFindMatchFn = (\n  items: Array<string>,\n  query: string,\n  activeIndex: number,\n) => number;

interface UseTypeaheadReturn {
  searchQuery: Readonly<Ref<string>>;
  handleKeydown: (event: KeyboardEvent) => void;
  reset: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `items` | `MaybeRefOrGetter<Array<string>>` | Required | Array of text labels to match against. |
| `activeIndex` | `MaybeRefOrGetter<number>` | `-1` | Currently active index, used as the starting offset when cycling. |
| `resetMs` | `MaybeRefOrGetter<number>` | `750` | Inactivity timeout in milliseconds before clearing the typing buffer. |
| `findMatch` | `TypeaheadFindMatchFn` | Prefix search | Custom matcher returning the matching item index, or `-1`. |
| `onMatch` | `(index: number) => void` | `undefined` | Callback invoked with the index of the matched item. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `searchQuery` | `Readonly<Ref<string>>` | The current buffered search string. |
| `handleKeydown` | `(event: KeyboardEvent) => void` | Keydown listener to attach to the list container or trigger. |
| `reset` | `() => void` | Clears the search buffer immediately and cancels pending timers. |

## Details

### Query Buffering and Cycling

- **Multi-character matching:** Typing "c" followed quickly by "a" searches for items starting with "ca" (e.g. "Canada").
- **Repeated single-character cycling:** Typing "c", pausing, and typing "c" again searches for the next item starting with "c" (cycling from "Cambodia" &rarr; "Cameroon" &rarr; "Canada").
- **Space handling:** When the buffer is empty, pressing Space triggers normal page or button activation. When the buffer already contains text, Space appends to the search query, allowing multi-word searches (e.g. "san francisco").

### Pairing with Focus Composables

Pass `onMatch` directly to `useRovingFocus`'s `focusItem` or `useAriaActivedescendant`'s `setActiveIndex`:

```ts
const { focusItem } = useRovingFocus({ elementsList });

const { handleKeydown: handleTypeahead } = useTypeahead({\n  items: countryNames,\n  onMatch: (index) => focusItem(index),\n});
```

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useRovingFocus, useTypeahead } from "v-float";

const countries = ["Argentina", "Australia", "Belgium", "Brazil", "Canada", "Chile", "China"];
const elementsList = ref<Array<HTMLElement | null>>([]);

const { activeIndex, getTabindex, handleKeydown: handleRoving, focusItem } = useRovingFocus(
  { elementsList },
);

const { handleKeydown: handleTypeahead, searchQuery } = useTypeahead({
  items: countries,
  activeIndex,
  onMatch: (idx) => focusItem(idx),
});

function onKeydown(event: KeyboardEvent) {
  handleRoving(event);
  handleTypeahead(event);
}
</script>

<template>
  <div role="listbox" class="listbox" tabindex="0" @keydown="onKeydown">
    <div v-if="searchQuery" class="search-badge">Query: {{ searchQuery }}</div>

    <div
      v-for="(country, idx) in countries"
      :key="country"
      :ref="(el) => (elementsList[idx] = el as HTMLElement | null)"
      role="option"
      :tabindex="getTabindex(idx)"
      :class="{ selected: activeIndex === idx }"
      @click="focusItem(idx)"
    >
      {{ country }}
    </div>
  </div>
</template>

<style scoped>
.listbox {
  width: 220px;
  border: 1px solid #ccc;
  padding: 6px;
  outline: none;
}
.search-badge {
  font-size: 11px;
  color: #666;
  padding-bottom: 4px;
}
.selected {
  background: #eef2ff;
  color: #3b82f6;
}
</style>
```

## See Also

- [`useRovingFocus`](/api/use-roving-focus) - Physical DOM focus navigation
- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Virtual combobox focus navigation
- [List Navigation Gotchas](/guide/list-navigation-gotchas) - Common pitfalls with keyboard lists
