---
description: Build nested menus with coordinated floating trees and pointer intent.
---

# Build Nested Menus

Nested menus are where floating UI stops being only about position. Once one menu can open another, the surfaces have to coordinate so branches open and close predictably and keyboard users are not stranded.

VFloat handles that coordination with [`useFloatingTree`](/api/use-floating-tree), [`provideFloatingTree`](/api/use-floating-tree), [`useFloatingTreeNode`](/api/use-floating-tree-node), and [`useListNavigation`](/api/use-list-navigation).

## What Tree Coordination Solves

A nested menu has problems that plain positioning does not solve:

- Which submenu is currently active?
- When one submenu opens, should a sibling close?
- When a child closes, where should focus return?
- How should forward and backward arrow keys move through the tree?

Those are tree questions, not geometry questions.

## Step 1: Create One Shared Tree

Start by creating one tree for the whole menu family.

```vue
<script setup lang="ts">
import { provideFloatingTree, useFloatingTree } from "v-float";

provideFloatingTree(useFloatingTree({ id: "main-menu-tree" }));
</script>
```

## Step 2: Register The Root Menu

Build a root menu with `useFloating()` and register it as a tree node.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useFloatingTreeNode, useListNavigation } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemsRef = ref<Array<HTMLElement | null>>([]);
const activeIndex = ref<number | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  open: ref(true),
});

const rootNode = useFloatingTreeNode(context, {
  id: "root-menu",
});

useListNavigation(context, {
  listRef: itemsRef,
  activeIndex,
  onNavigate(index) {
    activeIndex.value = index;
  },
});
</script>
```

## Step 3: Register A Child Menu

Create the submenu the same way, but attach it to the parent node.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useFloatingTreeNode, useListNavigation } from "v-float";

const childAnchorEl = ref<HTMLElement | null>(null);
const childFloatingEl = ref<HTMLElement | null>(null);
const childItemsRef = ref<Array<HTMLElement | null>>([]);
const childActiveIndex = ref<number | null>(null);

const childContext = useFloating(childAnchorEl, childFloatingEl, {
  open: ref(false),
});

const childNode = useFloatingTreeNode(childContext, {
  parent: rootNode,
  id: "file-submenu",
});

useListNavigation(childContext, {
  listRef: childItemsRef,
  activeIndex: childActiveIndex,
  nested: true,
  onNavigate(index) {
    childActiveIndex.value = index;
  },
});
</script>
```

## Step 4: Connect Parent Items To Child Nodes

Tell the parent list which item owns which child branch.

```vue
useListNavigation(context, { listRef: itemsRef, activeIndex, onNavigate(index) { activeIndex.value =
index; }, getChildNode: (index) => (index === 1 ? childNode : null), openChildOnFocus: true, });
```

That handoff is what lets forward keys open the submenu and backward keys restore the parent item.

## Where To Go Next

- Read [Tree Coordination Explained](/guide/tree-coordination-explained) for the deeper mental model.
- Read [Keyboard Navigation](/guide/keyboard-navigation) if the focus model still feels fuzzy.
- Read [Tree Debugging](/guide/tree-debugging) if a nested branch is not opening or closing the way you expect.
