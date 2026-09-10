---
description: Coordinate related floating nodes such as nested menus in an explicit tree.
---

# useFloatingTree

`useFloatingTree` creates an explicit coordination scope for related floating nodes. Nodes stay standalone until they join a tree with `tree.addNode()`.

## Type

The factory signature and the tree coordination surface:

```ts
function useFloatingTree(): FloatingTree;
```

```ts
interface FloatingTree {
  addNode: (child: FloatingNode, parentId?: FloatingNodeId | null) => void;
  removeNode: (id: FloatingNodeId) => void;
  getNode: (id: FloatingNodeId) => FloatingNode | undefined;
  getParent: (id: FloatingNodeId) => FloatingNode | undefined;
  getChildren: (id: FloatingNodeId) => FloatingNode[];
  getDescendants: (id: FloatingNodeId) => FloatingNode[];
  getFloatingElements: (node: Pick<FloatingNode, "id" | "refs">) => HTMLElement[];
  getDeepestOpenContext: <T extends Pick<FloatingNode, "id" | "open" | "setOpen">>(
    node: T,
  ) => T | FloatingNode;
  isTargetWithin: (node: Pick<FloatingNode, "id" | "refs">, target: EventTarget | null) => boolean;
  closeDescendants: (
    node: Pick<FloatingNode, "id">,
    reason?: OpenChangeReason,
    event?: Event,
  ) => void;
}
```

## Details

Each tree owns its own node map, so multiple trees stay fully isolated from each other. The same node may join more than one tree; pass the relevant tree explicitly to interaction composables through their `tree` option.

- `addNode(child, parentId = null)` registers a node and links it under `parentId` (`null` for roots). It never mutates the node object.
- Register parents before children. Registering under an unknown parent leaves the node as a root and warns in development.
- A node cannot be its own parent, and registering the same node twice is a no-op with a development warning.
- `addNode` automatically unregisters when the calling effect scope disposes.
- `removeNode(id)` removes a node and re-parents its immediate children to the removed node's parent (or to root level), so surviving subtrees stay reachable.
- `closeDescendants(node, reason = "programmatic", event?)` closes open descendants from innermost child to nearest parent. Call it explicitly when parent teardown must cascade; `node.setOpen` stays tree-agnostic and never cascades on its own.
- `isTargetWithin(node, target)` checks the node's own anchor and floating elements plus every descendant's, which is what lets outside-click and focus checks treat a menu family as one surface.
- `getDeepestOpenContext(node)` finds the deepest currently open node in the subtree for stacked dismissal.
- Writing a controlled `open` ref directly does not cascade and does not call `onOpenChange`.

## Example

This menu registers a root node and a submenu node, then treats outside pointer input against the whole family.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useFloatingTree, useOutsideClick } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const subAnchorEl = ref<HTMLElement | null>(null);
const subFloatingEl = ref<HTMLElement | null>(null);

const tree = useFloatingTree();
const node = useFloatingNode({ anchorEl, floatingEl });
const subNode = useFloatingNode({ anchorEl: subAnchorEl, floatingEl: subFloatingEl });

tree.addNode(node);
tree.addNode(subNode, node.id);

useOutsideClick(node, { tree });
</script>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Create the standalone nodes that join a tree
- [`useOutsideClick`](/api/use-outside-click) - Dismiss a whole node family on outside input
- [`useEscapeKey`](/api/use-escape-key) - Stacked dismissal through the deepest open node
- [Tree Coordination Explained](/guide/tree-coordination-explained) - Why linkage is explicit
