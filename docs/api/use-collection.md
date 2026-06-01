---
description: Create a flat navigable collection over stable string values.
---

# useCollection

`useCollection` creates a small flat collection manager for keyboard navigation. Use it when your floating surface has one level of string-valued items and does not need the hierarchy features from [`useTree`](/api/use-tree).

## Type

```ts
function useCollection(options: UseCollectionOptions): UseCollectionReturn;

interface UseCollectionOptions {
  values: MaybeRefOrGetter<readonly string[]>;
  isValueDisabled?: (value: string) => boolean;
}

interface CollectionNavigationOptions {
  loop?: boolean;
}

interface UseCollectionReturn {
  activeValue: Ref<string | null>;
  setActiveValue: (value: string | null) => void;
  setNext: (options?: CollectionNavigationOptions) => void;
  setPrevious: (options?: CollectionNavigationOptions) => void;
  setFirst: () => void;
  setLast: () => void;
  isItemDisabled: (value: string) => boolean;
}
```

## Details

`useCollection` satisfies the [`NavigableCollection`](/api/use-list-navigation) shape expected by `useListNavigation`.

- `values` is the ordered set of item values.
- Values must be stable strings.
- `isValueDisabled` marks values that navigation should skip.
- `setActiveValue()` ignores unknown and disabled values.
- `setNext()` and `setPrevious()` move through enabled values only.
- Pass `{ loop: true }` to wrap at the collection boundaries.
- If the active value disappears from `values` or becomes disabled, it is cleared.

For nested menus, trees, or data where each item needs to carry an object payload, use [`useTree`](/api/use-tree) instead.

## Example

This menu uses `useCollection` for flat keyboard navigation.

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import {
  useClick,
  useCollection,
  useFloatingContext,
  useListNavigation,
  usePosition,
} from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const items = [
  { value: "edit", label: "Edit" },
  { value: "duplicate", label: "Duplicate" },
  { value: "archive", label: "Archive", disabled: true },
];

const values = computed(() => items.map((item) => item.value));
const collection = useCollection({
  values,
  isValueDisabled: (value) => value === "archive",
});

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);

useClick(context);
useListNavigation(context, {
  collection,
  loop: true,
});
</script>

<template>
  <button ref="anchorEl" type="button">Actions</button>

  <div v-if="context.state.open.value" ref="floatingEl" role="menu" :style="styles">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="menuitem"
      :disabled="collection.isItemDisabled(item.value)"
      :class="{ active: collection.activeValue.value === item.value }"
    >
      {{ item.label }}
    </button>
  </div>
</template>
```

## See Also

- [`useListNavigation`](/api/use-list-navigation)
- [`useTree`](/api/use-tree)
- [Keyboard Navigation](/guide/keyboard-navigation)
