---
description: Create a flat navigable collection over stable string values.
---

# useCollection

`useCollection` creates a headless string-value model for keyboard navigation. Use it when a menu, combobox, or dropdown needs value movement (next, previous, first, last) with disabled-value skipping, without touching the DOM.

## Type

```ts
function useCollection(options?: UseCollectionOptions): UseCollectionReturn;

interface UseCollectionOptions {
  values: MaybeRefOrGetter<readonly string[]>;
  isValueDisabled?: (value: string) => boolean;
}

interface CollectionNavigationOptions {
  loop?: boolean;
}

interface UseCollectionReturn {
  values: ComputedRef<readonly string[]>;
  enabledValues: ComputedRef<readonly string[]>;
  activeValue: Ref<string | null>;
  setActiveValue: (value: string | null) => void;
  setNext: (options?: CollectionNavigationOptions) => void;
  setPrevious: (options?: CollectionNavigationOptions) => void;
  setFirst: () => void;
  setLast: () => void;
  isItemDisabled: (value: string) => boolean;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `values` | `MaybeRefOrGetter<readonly string[]>` | `[]` | Reactive; must be stable strings. |
| `isValueDisabled` | `(value: string) => boolean` | — | Marks values to skip during movement. |
| `loop` (on `setNext`/`setPrevious`) | `boolean` | `false` | Wraps at boundaries; edges are a no-op by default. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `values` / `enabledValues` | `ComputedRef<readonly string[]>` | Full list and non-disabled subset. |
| `activeValue` | `Ref<string \| null>` | Starts as `null`; unknown/disabled values are ignored. |
| `setActiveValue` | `(value \| null) => void` | `null` always clears. |
| `setNext` / `setPrevious` / `setFirst` / `setLast` | `() => void` | Move through enabled values only. |
| `isItemDisabled` | `(value) => boolean` | Disabled check for rendering. |

## Details

- `options` is optional and defaults to `{ values: [] }`.
- If the active value disappears from `values` or becomes disabled, it is cleared synchronously.
- `useCollection` never touches the DOM, focus, open state, or trees. It pairs with [`useTypeahead`](/api/use-typeahead), which reads `collection.values` and drives `collection.setActiveValue` on match. Index-based focus movement belongs to [`useRovingFocus`](/api/use-roving-focus) and [`useAriaActivedescendant`](/api/use-aria-activedescendant), which you bridge manually (for example, through `useTypeahead`'s `onMatch`).

For nested multi-level menus, each menu and submenu level creates its own `useCollection` and coordinates node linkage via [`useFloatingTree`](/api/use-floating-tree).

## Example

This menu uses `useCollection` for value movement with a pinned click trigger.

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useClick, useCollection, useFloatingNode, usePosition } from "v-float";

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

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

useClick(node);
</script>

<template>
  <button ref="anchorEl" type="button">Actions</button>

  <div v-if="node.open" ref="floatingEl" role="menu" :style="styles">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="menuitem"
      :disabled="collection.isItemDisabled(item.value)"
      :class="{ active: collection.activeValue.value === item.value }"
      @mouseenter="collection.setActiveValue(item.value)"
      @click="collection.setActiveValue(item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
```

## See Also

- [`useTypeahead`](/api/use-typeahead) - Typeahead search over collection values
- [`useRovingFocus`](/api/use-roving-focus) - Physical focus movement between items
- [`useAriaActivedescendant`](/api/use-aria-activedescendant) - Virtual highlighting while focus stays put
- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [Keyboard Navigation](/guide/keyboard-navigation) - Navigation workflow
