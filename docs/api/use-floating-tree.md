# useFloatingTree

`useFloatingTree` creates a shared registry for related floating contexts. Use it when several surfaces need to coordinate open state, branch closing, or keyboard handoff.

## Type

```ts
function useFloatingTree(options?: UseFloatingTreeOptions): FloatingTree;
function provideFloatingTree(tree: FloatingTree): FloatingTree;
function useCurrentFloatingTree(): FloatingTree | null;

interface UseFloatingTreeOptions {
  id?: MaybeRefOrGetter<string | undefined>;
}

interface FloatingTree {
  id: Readonly<Ref<string>>;
  activeId: Readonly<Ref<string | null>>;
  activePath: Readonly<Ref<string[]>>;
  actions: {
    getNode: (id: string) => FloatingTreeNode | null;
    closeAll: (event?: Event) => void;
    closeBranch: (id: string, event?: Event) => void;
    closeChildren: (id: string, event?: Event) => void;
    closeSiblings: (id: string, event?: Event) => void;
    isTargetWithinTree: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (id: string, target: EventTarget | null) => boolean;
  };
}
```

## Details

`useFloatingTree` gives related floating surfaces a single coordination layer. It does not position anything by itself; it just tracks the open branch and exposes helpers for tree-aware closing and containment checks.

- `id` defaults to an auto-generated value like `floating-tree-1`. Pass your own id when you want a stable registry name.
- `activeId` tracks the most recently active open node.
- `activePath` lists node ids from the root branch down to the active node.
- `actions.closeBranch()` closes the node and all of its descendants.
- `actions.closeChildren()` closes descendants but leaves the current node open.
- `actions.closeSiblings()` closes other branches that share the same parent.
- `actions.closeAll()` closes every registered branch, preferring root nodes first.
- `actions.isTargetWithinTree()` and `actions.isTargetWithinBranch()` are useful for outside-click and escape handling.
- `provideFloatingTree(tree)` makes the tree available to descendants through Vue injection.
- `useCurrentFloatingTree()` returns the injected tree when one is available, or `null` outside an injection context.

## Example

This example creates a shared tree once and makes it available to descendants.

```vue
<script setup lang="ts">
import { provideFloatingTree, useFloatingTree } from "v-float";

const tree = provideFloatingTree(useFloatingTree({ id: "account-menu-tree" }));
</script>

<template>
  <slot />
</template>
```

## See Also

- [`useFloatingTreeNode`](/api/use-floating-tree-node)
- [`useListNavigation`](/api/use-list-navigation)
- [Build Nested Menus](/guide/build-nested-menus)
- [Tree Coordination Explained](/guide/tree-coordination-explained)
- [Keyboard Navigation](/guide/keyboard-navigation)
