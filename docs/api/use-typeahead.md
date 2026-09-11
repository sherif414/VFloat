---
description: Captures typing sequences to jump to matching items in a list.
---

# useTypeahead

`useTypeahead` captures rapid keystrokes typed inside the floating panel to jump directly to matching items in an item list. It buffers typed characters, supports repeated-character cycling, and emits matching indices to drive focus composables.

## Type

```ts
function useTypeahead(node: UseTypeaheadContext, options?: UseTypeaheadOptions): UseTypeaheadReturn;

interface UseTypeaheadContext extends Pick<FloatingNode, "refs" | "open"> {}

interface UseTypeaheadOptions {
  items?: MaybeRefOrGetter<readonly (string | null)[]>;
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;
  activeIndex?: MaybeRefOrGetter<number>;
  onMatch?: (index: number) => void;
  enabled?: MaybeRefOrGetter<boolean>;
  resetMs?: MaybeRefOrGetter<number>;
  ignoreKeys?: MaybeRefOrGetter<readonly string[]>;
  findMatch?: TypeaheadFindMatchFn | null | undefined;
  isItemDisabled?: (index: number) => boolean;
}

type TypeaheadFindMatchFn = (
  items: readonly (string | null)[],
  query: string,
  activeIndex: number,
) => number;

interface UseTypeaheadReturn {
  searchQuery: Readonly<Ref<string>>;
  reset: () => void;
}
```

## Options

| Name             | Type                                            | Default        | Notes                                                                                                           |
| ---------------- | ----------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `items`          | `MaybeRefOrGetter<readonly (string \| null)[]>` | `[]`           | Array of text labels to match against. `null` entries are skipped.                                              |
| `containerEl`    | `MaybeRefOrGetter<HTMLElement \| null>`         | Floating panel | Keyboard scope for typeahead search. Override for inline widgets whose list lives outside the panel.            |
| `activeIndex`    | `MaybeRefOrGetter<number>`                      | `-1`           | Currently active index, used as the starting offset when cycling. Never written; forward matches via `onMatch`. |
| `onMatch`        | `(index: number) => void`                       | `undefined`    | Callback invoked with the index of the matched item.                                                            |
| `enabled`        | `MaybeRefOrGetter<boolean>`                     | `true`         | Whether typeahead search is active.                                                                             |
| `resetMs`        | `MaybeRefOrGetter<number>`                      | `750`          | Inactivity timeout in milliseconds before clearing the typing buffer.                                           |
| `ignoreKeys`     | `MaybeRefOrGetter<readonly string[]>`           | `[]`           | Additional keys to ignore during typeahead search.                                                              |
| `findMatch`      | `TypeaheadFindMatchFn`                          | Prefix search  | Custom matcher returning the matching item index, or `-1`. Out-of-range or disabled results count as no match.  |
| `isItemDisabled` | `(index: number) => boolean`                    | `undefined`    | Predicate for skipping disabled items during matching.                                                          |

## Returns

| Name          | Type                    | Notes                                                            |
| ------------- | ----------------------- | ---------------------------------------------------------------- |
| `searchQuery` | `Readonly<Ref<string>>` | The current buffered search string. Empty when idle.             |
| `reset`       | `() => void`            | Clears the search buffer immediately and cancels pending timers. |

## Details

### Keyboard Scope Follows the Trigger and the List Container

Typeahead listens on the floating panel, where the ARIA APG places type-ahead for menus, listboxes, trees, and grids, and on the anchor trigger, which stays searchable while the popup is closed so collapsed selects can preselect. Typing on the trigger never changes open state: it only emits `onMatch`, leaving opening to the trigger's own activation keys. Idle Space and navigation keys pass through untouched on both targets.

### Query Buffering and Cycling

- **Multi-character matching:** Typing "c" followed quickly by "a" searches for items starting with "ca" (e.g. "Canada").
- **Repeated single-character cycling:** Typing "c", "c", "c" in rapid succession cycles through items starting with "c" (cycling from "Cambodia" &rarr; "Cameroon" &rarr; "Canada"), resuming after the current `activeIndex`.
- **Space handling:** When the buffer is empty, pressing Space preserves normal button or option activation. When the buffer already contains text, Space appends to the search query, allowing multi-word searches (e.g. "san francisco").
- **Failed queries:** A query with no match clears the buffer so the next keystroke starts fresh instead of extending a dead query.

### Pairing with Focus Composables

Pass `onMatch` directly to `useRovingFocus`'s `focusIndex` or `useAriaActivedescendant`'s `setActiveIndex`:

```ts
const { focusIndex } = useRovingFocus(context, { elementsList });

const { searchQuery } = useTypeahead(context, {
  items: countryNames,
  onMatch: (index) => focusIndex(index),
});
```

## Example

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { useFloatingNode, useRovingFocus, useTypeahead } from "v-float";

const countries = ["Argentina", "Australia", "Belgium", "Brazil", "Canada", "Chile", "China"];
const anchorEl = useTemplateRef<HTMLElement>("anchor");
const floatingEl = useTemplateRef<HTMLElement>("floating");
const elementsList = ref<Array<HTMLElement | null>>([]);
const open = ref(true);

const context = useFloatingNode({ anchorEl, floatingEl, open });
const { activeIndex, getTabindex, focusIndex } = useRovingFocus(context, { elementsList });

const { searchQuery } = useTypeahead(context, {
  items: countries,
  onMatch: (idx) => focusIndex(idx),
});
</script>

<template>
  <button ref="anchor">Choose a country</button>
  <div v-if="open" ref="floating" role="listbox" class="listbox" tabindex="-1">
    <div v-if="searchQuery" class="search-badge">Query: {{ searchQuery }}</div>

    <div
      v-for="(country, idx) in countries"
      :key="country"
      :ref="(el) => (elementsList[idx] = el as HTMLElement | null)"
      role="option"
      :tabindex="getTabindex(idx)"
      :class="{ selected: activeIndex === idx }"
      @click="focusIndex(idx)"
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
