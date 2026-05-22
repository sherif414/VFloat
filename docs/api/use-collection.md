---
description: A data-first structural manager for flat lists and nested trees in VFloat.
---

# useCollection

`useCollection` is a data-first reactive state manager for coordinating floating collections such as dropdowns, popovers, select lists, and nested menus. It manages active focus state, item expansion, hierarchy, and keyboard traversals without interacting directly with the DOM.

## Type

```ts
function useCollection<T>(options: UseCollectionOptions<T>): UseCollectionReturn<T>;

interface UseCollectionOptions<T> {
  /**
   * The flat list or hierarchical tree of items in the collection.
   */
  items: MaybeRefOrGetter<T[]>;

  /**
   * Function to extract a unique string identifier from an item.
   */
  itemValue: (item: T) => string;

  /**
   * Optional function to determine if an item is disabled (cannot be navigated).
   */
  itemDisabled?: (item: T) => boolean;

  /**
   * Optional function to extract children from an item, turning a 1D list into a 2D tree.
   */
  itemChildren?: (item: T) => T[] | null | undefined;
}

interface CollectionNavigationOptions {
  /**
   * If true, traversal wraps around when reaching the start or end.
   */
  loop?: boolean;
}

interface UseCollectionReturn<T> {
  /**
   * The currently active item value in the collection.
   */
  activeValue: Ref<string | null>;

  /**
   * Set of item values whose submenus/branches are currently expanded.
   */
  expandedValues: Ref<Set<string>>;

  /**
   * A dynamically flattened array of currently visible items based on expansion state.
   */
  flattenedItems: ComputedRef<T[]>;

  /**
   * Expand a branch by its item value.
   */
  expandBranch: (value: string) => void;

  /**
   * Collapse a branch by its item value.
   */
  collapseBranch: (value: string) => void;

  /**
   * Collapse all active branches.
   */
  collapseAll: () => void;

  /**
   * Check if a specific value has children.
   */
  hasChildren: (value: string) => boolean;

  /**
   * Get the parent value for a given nested item value.
   */
  getParentValue: (value: string) => string | null;

  /**
   * Set the active value directly.
   */
  setActiveValue: (value: string | null) => void;

  /**
   * Advance to the next focusable item.
   */
  setNext: (options?: CollectionNavigationOptions) => void;

  /**
   * Go back to the previous focusable item.
   */
  setPrevious: (options?: CollectionNavigationOptions) => void;

  /**
   * Go to the first focusable item.
   */
  setFirst: () => void;

  /**
   * Go to the last focusable item.
   */
  setLast: () => void;

  /**
   * Get the first enabled descendant value for a given branch value (pre-order DFS).
   */
  getFirstEnabledDescendantValue: (value: string) => string | null;
}
```

## Details

`useCollection` serves as the single source of truth for items in a navigation structure:

- **Decoupled state:** It maintains reactive indices/IDs (`activeValue` and `expandedValues`) and translates relative movements (next, previous, first, last) to state changes.
- **Tree Coordination (2D support):** When `itemChildren` is provided, it supports expanding and collapsing branches. `flattenedItems` computed property automatically resolves nested children in depth-first order only if their parent is marked as expanded in `expandedValues`.
- **Keyboard Helpers:** Public methods like `setNext()` and `setPrevious()` automatically bypass disabled items (using the `itemDisabled` predicate).
- **DFS targeting:** `getFirstEnabledDescendantValue` performs a pre-order depth-first search to find the first enabled descendant of a branch, supporting highly resilient multi-level submenus.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useCollection, useFloating, useListNavigation } from "v-float";

interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

const items = ref<MenuItem[]>([
  { id: "new", label: "New File" },
  { id: "open", label: "Open File..." },
  { id: "share", label: "Share", disabled: true },
  { id: "close", label: "Close" },
]);

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

const collection = useCollection({
  items,
  itemValue: (item) => item.id,
  itemDisabled: (item) => !!item.disabled,
});

useListNavigation(context, {
  collection,
  orientation: "vertical",
});
</script>

<template>
  <button ref="anchorEl">File Menu</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="menu"
    :style="context.position.styles.value"
  >
    <div
      v-for="item in collection.flattenedItems.value"
      :key="item.id"
      role="menuitem"
      :aria-disabled="item.disabled"
      :class="{ active: collection.activeValue.value === item.id }"
      @click="collection.setActiveValue(item.id)"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## See Also

- [`useListNavigation`](/api/use-list-navigation)
- [`useFloating`](/api/use-floating)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
- [Build Nested Menus Guide](/guide/build-nested-menus)
