---
description: Coordinates related floating contexts through a shared tree.
---

# useFloatingTree

`useFloatingTree` creates a shared registry for related floating contexts. Use it when several surfaces need to coordinate open state, branch closing, or keyboard handoff.

## Type

```ts
function useFloatingTree(options?: UseFloatingTreeOptions): FloatingTree;

interface UseFloatingTreeOptions {
  id?: MaybeRefOrGetter<string | undefined>;
  closeSiblingsOnOpen?: MaybeRefOrGetter<boolean | undefined>;
  closeChildrenOnClose?: MaybeRefOrGetter<boolean | undefined>;
}

interface FloatingTree {
  id: Readonly<Ref<string>>;
  activeId: Readonly<Ref<string | null>>;
  activePath: Readonly<Ref<string[]>>;
  actions: {
    getNode: (id: string) => FloatingTreeNode | null;
    closeAll: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeBranch: (id: string, reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeChildren: (id: string, reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeSiblings: (id: string, reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    isTargetWithinTree: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (id: string, target: EventTarget | null) => boolean;
  };
}
```

## Details

`useFloatingTree` gives related floating surfaces a single coordination layer. It does not position anything by itself; it just tracks the open branch and exposes helpers for tree-aware closing and containment checks.

- `id` defaults to an auto-generated value like `floating-tree-1`. Pass your own id when you want a stable registry name.
- `closeSiblingsOnOpen` defaults to `true`. When enabled, opening one node closes sibling branches in the same tree.
- `closeChildrenOnClose` defaults to `true`. When enabled, closing one node closes descendant branches leaf-first.
- `activeId` tracks the most recently active open node.
- `activePath` lists node ids from the root branch down to the active node.
- `actions.closeBranch()` closes the node and all of its descendants.
- `actions.closeChildren()` closes descendants but leaves the current node open.
- `actions.closeSiblings()` closes other branches that share the same parent.
- `actions.closeAll()` closes every registered branch, preferring root nodes first.
- Close helpers accept an optional `OpenChangeReason` before the event. If omitted, tree-driven closes use `"programmatic"`.
- `actions.isTargetWithinTree()` and `actions.isTargetWithinBranch()` are useful for outside-click and escape handling.

## Example

This example creates a shared tree and explicitly links a root node to it.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useFloatingTree, useFloatingTreeNode } from "v-float";

const tree = useFloatingTree({ id: "account-menu-tree" });

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

const rootNode = useFloatingTreeNode(context, {
  tree,
  id: "account-menu",
});
</script>
```

## See Also

- [`useFloatingTreeNode`](/api/use-floating-tree-node)
- [`useListNavigation`](/api/use-list-navigation)
- [Build Nested Menus](/guide/build-nested-menus)
- [Tree Coordination Explained](/guide/tree-coordination-explained)
- [Keyboard Navigation](/guide/keyboard-navigation)
