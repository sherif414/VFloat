---
description: A data-first structural mediator for flat lists and nested trees in VFloat.
---

# useTree

`useTree` is a data-first structural mediator for coordinating flat lists and hierarchical tree collections (such as dropdowns, popovers, select lists, and nested/recursive menus). It manages active focus state, item expansion, hierarchical branch structures, and keyboard traversals without interacting directly with the DOM.

## Type

```ts
function useTree<T>(options: UseTreeOptions<T>): UseTreeReturn<T>;

interface UseTreeOptions<T> {
  /**
   * The flat list or hierarchical tree of items in the collection.
   */
  items: MaybeRefOrGetter<T[]>;

  /**
   * Function to extract a unique string identifier from an item.
   */
  getItemId: (item: T) => string;

  /**
   * Optional function to determine if an item is disabled (cannot be navigated).
   */
  isItemDisabled?: (item: T) => boolean;

  /**
   * Optional function to extract children from an item, turning a 1D list into a 2D tree.
   */
  getItemChildren?: (item: T) => T[] | null | undefined;
}

interface TreeBranch<T> {
  /**
   * The parent node's value, or `null` for the root branch.
   */
  parentValue: string | null;

  /**
   * The direct children items at this branch level.
   */
  items: ComputedRef<T[]>;

  /**
   * Projected active value — only non-null when the tree's active value
   * belongs to this specific branch.
   */
  activeValue: Ref<string | null>;

  /**
   * Set the active value directly. Rejects disabled items.
   */
  setActiveValue: (value: string | null) => void;

  /**
   * Navigate to the next enabled item within this branch.
   */
  setNext: (options?: { loop?: boolean }) => void;

  /**
   * Navigate to the previous enabled item within this branch.
   */
  setPrevious: (options?: { loop?: boolean }) => void;

  /**
   * Navigate to the first enabled item within this branch.
   */
  setFirst: () => void;

  /**
   * Navigate to the last enabled item within this branch.
   */
  setLast: () => void;

  /**
   * Check if a specific value is disabled.
   */
  isItemDisabled: (value: string) => boolean;
}

interface UseTreeReturn<T> {
  /**
   * The currently active value across the entire tree.
   */
  activeValue: Ref<string | null>;

  /**
   * Set of item values whose branches are currently expanded.
   */
  expandedValues: Ref<ReadonlySet<string>>;

  /**
   * DFS-order flattened array of currently visible items based on expansion state.
   */
  flattenedItems: ComputedRef<T[]>;

  /**
   * Set the active value directly. Rejects disabled items.
   */
  setActiveValue: (value: string | null) => void;

  /**
   * Expand a branch by its parent item value. No-op for leaf nodes.
   */
  expandBranch: (value: string) => void;

  /**
   * Collapse a branch by its parent item value.
   */
  collapseBranch: (value: string) => void;

  /**
   * Collapse all branches.
   */
  collapseAll: () => void;

  /**
   * Check if a specific value's branch is currently expanded.
   */
  isExpanded: (value: string) => boolean;

  /**
   * Look up the original item by its value. Returns `null` if not found.
   */
  getItem: (value: string) => T | null;

  /**
   * Check if a node has children (i.e., is a branch parent).
   */
  hasChildren: (value: string) => boolean;

  /**
   * Check if a specific value is disabled.
   */
  isItemDisabled: (value: string) => boolean;

  /**
   * Get the parent value for a given item value. Returns `null` for root items.
   */
  getParentValue: (value: string) => string | null;

  /**
   * Get the depth of a node in the tree. Root items are depth 0.
   * Returns -1 if the value is not found.
   */
  getDepth: (value: string) => number;

  /**
   * Get all ancestor values from parent to root (closest first).
   */
  getAncestorValues: (value: string) => string[];

  /**
   * Get sibling values (same-level items, excluding the item itself).
   */
  getSiblingValues: (value: string) => string[];

  /**
   * Get the first enabled descendant value via DFS. Returns `null` if none found.
   */
  getFirstEnabledDescendantValue: (value: string) => string | null;

  /**
   * The root-level branch containing all top-level items.
   */
  rootBranch: TreeBranch<T>;

  /**
   * Get the branch for a specific parent node. Returns `null` for leaf nodes.
   * Branch instances are cached — same parent always returns the same reference.
   */
  getBranch: (parentValue: string) => TreeBranch<T> | null;
}
```

## Details

`useTree` serves as the single source of truth for items in a navigation structure:

- **Decoupled State:** It maintains reactive indices/IDs (`activeValue` and `expandedValues`) and translates relative movements (next, previous, first, last) to state changes.
- **Tree Coordination (2D support):** When `getItemChildren` is provided, it supports expanding and collapsing branches. `flattenedItems` computed property automatically resolves nested children in depth-first order only if their parent is marked as expanded in `expandedValues`.
- **Keyboard Helpers:** Public methods like `setNext()` and `setPrevious()` automatically bypass disabled items (using the `isItemDisabled` predicate).
- **DFS Targeting:** `getFirstEnabledDescendantValue` performs a pre-order depth-first search to find the first enabled descendant of a branch, supporting highly resilient multi-level submenus.
- **Scope-Aware Sub-Branches:** Every parent node with children forms a unique branch. Its `activeValue` is projected, meaning it is only non-null when the global active value of the tree belongs to that branch. This structurally satisfies the `NavigableCollection` contract needed by `useListNavigation` to achieve scope-aware keyboard navigation without cross-branch contamination.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useTree, useClick, useFloatingContext, useListNavigation, usePosition } from "v-float";

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

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context);

const tree = useTree({
  items,
  getItemId: (item) => item.id,
  isItemDisabled: (item) => !!item.disabled,
});

useClick(context);
useListNavigation(context, {
  collection: tree.rootBranch,
  orientation: "vertical",
});
</script>

<template>
  <button ref="anchorEl">File Menu</button>

  <div v-if="context.state.open.value" ref="floatingEl" role="menu" :style="styles">
    <div
      v-for="item in tree.flattenedItems.value"
      :key="item.id"
      role="menuitem"
      :aria-disabled="item.disabled"
      :class="{ active: tree.activeValue.value === item.id }"
      @click="tree.setActiveValue(item.id)"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## See Also

- [`useListNavigation`](/api/use-list-navigation)
- [`useFloatingContext`](/api/use-floating-context)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
- [Build Nested Menus Guide](/guide/build-nested-menus)
