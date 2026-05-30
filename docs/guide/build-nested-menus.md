---
description: Build nested multi-level menus with coordinated reactive collections and nested components.
---

# Build Nested Menus

Nested menus (submenus) introduce state challenges beyond standard one-dimensional list navigation:

- Which submenus are currently open?
- When the user presses the expand key (e.g., `ArrowRight`), which item should gain focus next?
- When the user presses the collapse key (e.g., `ArrowLeft`), how does focus return to the parent trigger item?
- If items in a submenu are disabled, how does keyboard traversal safely bypass them?

In VFloat, these questions are resolved by configuring a single tree collection with [`useTree`](/api/use-tree). The menu tree coordinates through reactive data instead of nested DOM assumptions.

---

## The 2D Tree Model

By providing `getItemChildren` to `useTree`, you transform a flat list into a reactive tree structure:

1. **`expandedValues`** acts as the single source of truth for which submenus are currently open.
2. **`flattenedItems`** is a computed list that automatically flattens only the expanded branches in a depth-first traversal.
3. **`useListNavigation`** reads this structure and emits enter/exit intents. In vertical mode:
   - Pressing **`ArrowRight`** (or `ArrowLeft` in RTL) can expand a submenu branch through `onEnter`.
   - Pressing **`ArrowLeft`** (or `ArrowRight` in RTL) can collapse a branch through `onExit`.

---

## Complete Nested Menu Example

Here is how to build the coordinated data, keyboard, and ARIA pieces for a multi-level nested dropdown.

### 1. Define the Hierarchical Data Structure

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useTree, useListNavigation, useRole } from "v-float";

interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  children?: MenuItem[];
}

const menuItems = ref<MenuItem[]>([
  { id: "edit", label: "Edit" },
  {
    id: "share-branch",
    label: "Share As...",
    children: [
      { id: "share-email", label: "Email Link", disabled: true },
      { id: "share-slack", label: "Send to Slack" },
      { id: "share-teams", label: "Send to Teams" },
    ],
  },
  { id: "delete", label: "Delete" },
]);

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);

const context = useFloatingContext(anchorEl, floatingEl);
const { styles } = usePosition(context);

// Define the 2D collection
const tree = useTree<MenuItem>({
  items: menuItems,
  getItemId: (item) => item.id,
  isItemDisabled: (item) => !!item.disabled,
  getItemChildren: (item) => item.children, // Activates 2D Tree Navigation
});

// Configure keyboard navigation
useListNavigation(context, {
  collection: tree.rootBranch,
  orientation: "vertical",
  onEnter(activeValue) {
    if (!tree.hasChildren(activeValue)) return;

    tree.expandBranch(activeValue);
    const firstEnabled = tree.getFirstEnabledDescendantValue(activeValue);
    if (firstEnabled) tree.setActiveValue(firstEnabled);
  },
  onExit(activeValue) {
    const parentValue = tree.getParentValue(activeValue);
    if (!parentValue) return;

    tree.setActiveValue(parentValue);
    tree.collapseBranch(parentValue);
  },
});

// Sync ARIA roles for trees
useRole(context, {
  role: "tree",
  listRef: itemsRef,
});
</script>
```

### 2. Render the Tree Recursively or Dynamically

Since `tree.flattenedItems` contains a flat list of _currently visible_ nodes (taking expansion state into account), you can render them in a single flat list while applying indentation to sub-items based on their parent hierarchy.

Alternatively, you can render them as traditional nested popovers by matching `tree.expandedValues` to toggle submenus.

Here is the clean flat roving-tabindex render pattern using indentation:

```vue
<template>
  <button ref="anchorEl" type="button" @click="context.state.setOpen(!context.state.open.value)">
    Project Actions
  </button>

  <div v-if="context.state.open.value" ref="floatingEl" role="tree" :style="styles">
    <div
      v-for="(item, index) in tree.flattenedItems.value"
      :key="item.id"
      :ref="(el) => (itemsRef[index] = el as HTMLElement | null)"
      role="treeitem"
      :aria-disabled="item.disabled"
      :aria-expanded="
        tree.hasChildren(item.id) ? tree.expandedValues.value.has(item.id) : undefined
      "
      :tabindex="tree.activeValue.value === item.id ? 0 : -1"
      :class="{
        active: tree.activeValue.value === item.id,
        'is-submenu-trigger': tree.hasChildren(item.id),
        'indent-sub': tree.getParentValue(item.id) !== null,
      }"
      @click="tree.setActiveValue(item.id)"
    >
      <span>{{ item.label }}</span>
      <span v-if="tree.hasChildren(item.id)">▶</span>
    </div>
  </div>
</template>

<style scoped>
.indent-sub {
  padding-left: 24px; /* visually separate submenu items */
}
</style>
```

---

## Tree Coordination Edge Cases Solved Automatically

By routing your tree layout through `useTree` and `useListNavigation`, VFloat gives you the pieces for these behaviors:

- **Disabled Skipped Sub-Nodes:** The `onEnter` handler shown above uses `getFirstEnabledDescendantValue()` to bypass disabled descendants and focus the first _enabled_ submenu choice.
- **Opener Safeguard:** If a submenu branch exists but all of its nested children are disabled, expanding the branch leaves focus safely on the parent trigger item, avoiding focus traps.
- **RTL Support:** Right-to-left writing directions can swap the expansion and collapse directions (for example, `ArrowLeft` expands submenus and `ArrowRight` collapses them).

---

## See Also

- [`useTree`](/api/use-tree)
- [`useListNavigation`](/api/use-list-navigation)
- [Keyboard Navigation Guide](/guide/keyboard-navigation)
