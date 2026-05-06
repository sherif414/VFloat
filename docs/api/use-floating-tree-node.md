---
description: Registers a floating context inside a floating tree.
---

# useFloatingTreeNode

`useFloatingTreeNode` registers a floating context as part of a tree. Use it for nested menus, submenus, and any branch where opening one surface should affect its relatives.

## Type

```ts
function useFloatingTreeNode(
  context: FloatingContext,
  options?: UseFloatingTreeNodeOptions,
): FloatingTreeNode;

interface UseFloatingTreeNodeOptions {
  tree?: FloatingTree | null;
  id?: MaybeRefOrGetter<string | undefined>;
  parent?: MaybeRefOrGetter<FloatingTreeNode | null | undefined>;
}

interface FloatingTreeNode {
  tree: FloatingTree;
  id: Readonly<Ref<string>>;
  parentId: Readonly<Ref<string | null>>;
  childIds: Readonly<Ref<string[]>>;
  context: FloatingContext;
  state: {
    isRoot: Readonly<Ref<boolean>>;
    isLeaf: Readonly<Ref<boolean>>;
    isActive: Readonly<Ref<boolean>>;
  };
  actions: {
    open: (event?: Event) => void;
    close: (event?: Event) => void;
    closeBranch: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeChildren: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    closeSiblings: (reasonOrEvent?: OpenChangeReason | Event, event?: Event) => void;
    isTargetWithinNode: (target: EventTarget | null) => boolean;
    isTargetWithinBranch: (target: EventTarget | null) => boolean;
  };
}
```

## Details

`useFloatingTreeNode` links a floating context to a shared tree and keeps the branch state in sync.

- Root nodes pass `tree` directly.
- Child nodes can inherit the tree from `parent`, or pass both `tree` and `parent` when that is clearer.
- If no tree can be resolved, VFloat throws. Tree membership is explicit so unrelated floating families stay isolated.
- `parent` must belong to the same tree. Cross-tree parent links throw instead of silently creating mixed topology.
- Sibling-collapse and descendant-cascade policy belongs to [`useFloatingTree`](/api/use-floating-tree), not individual nodes.
- `state.isRoot`, `state.isLeaf`, and `state.isActive` are derived from the tree structure.
- `actions.open()` marks the node active and lets the tree apply its open policies.
- `actions.close()` restores focus to the node anchor when the close reason allows it.
- `actions.closeBranch()`, `actions.closeChildren()`, and `actions.closeSiblings()` forward to the tree registry and preserve an optional `OpenChangeReason`.
- `actions.isTargetWithinNode()` and `actions.isTargetWithinBranch()` help dismissal logic tell whether an event came from the current branch.

## Example

This example wires a root menu and a nested submenu into the same tree.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useFloatingTree, useFloatingTreeNode } from "v-float";

const tree = useFloatingTree();

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const childAnchorEl = ref<HTMLElement | null>(null);
const childFloatingEl = ref<HTMLElement | null>(null);

const rootContext = useFloating(rootAnchorEl, rootFloatingEl, {
  open: ref(true),
});

const childContext = useFloating(childAnchorEl, childFloatingEl, {
  open: ref(false),
});

const rootNode = useFloatingTreeNode(rootContext, {
  tree,
  id: "root-menu",
});

const childNode = useFloatingTreeNode(childContext, {
  parent: rootNode,
  id: "child-menu",
});
</script>
```

## See Also

- [`useFloatingTree`](/api/use-floating-tree)
- [`useListNavigation`](/api/use-list-navigation)
- [`useHover`](/api/use-hover)
- [`useClick`](/api/use-click)
- [Build Nested Menus](/guide/build-nested-menus)
- [Tree Coordination Explained](/guide/tree-coordination-explained)
- [Keyboard Navigation](/guide/keyboard-navigation)
