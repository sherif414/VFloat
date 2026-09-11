---
description: Coordinate related floating nodes such as nested menus in an explicit tree.
---

# useFloatingTree

`useFloatingTree` creates an explicit coordination scope for related floating nodes. Nodes remain independent until registered with `tree.addNode()`.

Trees coordinate complex UI hierarchies, such as multi-level dropdowns, nested cascading menus, and stacked popovers. When you pass `tree` to [`useDismiss`](/api/use-dismiss) or [`useHover`](/api/use-hover), interactions become family-aware: pointer events or clicks inside a child surface do not dismiss the parent surface.

## Type

```ts
function useFloatingTree(): FloatingTree;

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
  forEach: (
    target: FloatingNodeId | Pick<FloatingNode, "id">,
    relationship: RelationshipSelector,
    action: (node: FloatingNode) => boolean | void,
    options?: ForEachOptions,
  ) => void;
}

type TreeRelationship =
  | "parent"
  | "children"
  | "ancestors"
  | "descendants"
  | "siblings"
  | "root";

type RelationshipSelector =
  | TreeRelationship
  | ((node: FloatingNode, tree: FloatingTree) => FloatingNode[] | Iterable<FloatingNode>);

interface ForEachOptions {
  order?: "top-down" | "bottom-up";
}
```

## Options

`useFloatingTree` takes no parameters.

## Returns

`useFloatingTree` returns a `FloatingTree` instance with the following methods:

| Method | Signature | Description |
| --- | --- | --- |
| `addNode` | `(child, parentId?) => void` | Registers a node in the tree. Pass `parentId` to link under an existing node (`null` for roots). |
| `removeNode` | `(id) => void` | Removes a node and re-parents surviving children to the removed node's parent. |
| `getNode` | `(id) => FloatingNode \| undefined` | Looks up a registered node by its stable id symbol. |
| `getParent` | `(id) => FloatingNode \| undefined` | Retrieves the immediate parent node. |
| `getChildren` | `(id) => FloatingNode[]` | Returns immediate child nodes. |
| `getDescendants` | `(id) => FloatingNode[]` | Returns all descendants across all levels. |
| `getFloatingElements` | `(node) => HTMLElement[]` | Collects the floating DOM elements for the given node and all its descendants. |
| `getDeepestOpenContext` | `(node) => FloatingNode` | Returns the deepest open descendant in the current active branch. |
| `isTargetWithin` | `(node, target) => boolean` | Checks whether an event target is contained within the node or any of its descendants. |
| `forEach` | `(target, rel, action, options?) => void` | Traverses related nodes matching a structural relationship (`ancestors`, `descendants`, `siblings`). |

## Details

### Tree Lifecycles and Scope

- Each tree owns an isolated map of nodes. Different components or modals can maintain independent trees without interference.
- `tree.addNode()` automatically unregisters the node when the calling component's Vue effect scope disposes.
- When registering child nodes, ensure parent nodes are registered first. Registering under an unrecognized parent leaves the node as a root node and issues a development warning.

### Family-Aware Interaction Checks

Passing `tree` to interaction composables enables family-wide boundaries:

- **Outside Click (`useDismiss`):** Clicking inside a submenu does not trigger an outside-press event on the parent menu.
- **Escape Dismissal (`useDismiss`):** Pressing Escape closes the deepest open submenu first, rather than collapsing the entire menu tree at once.
- **Hover Transitions (`useHover`):** Moving the cursor from a parent menu item into a child submenu panel does not trigger pointer-leave dismissal on the parent.

### Cascading Teardown with `tree.forEach`

When a parent menu collapses, you often want to close open child menus bottom-up:

```ts
tree.forEach(
  rootNode.id,
  "descendants",
  (descendant) => {
    if (descendant.open.value) {
      descendant.setOpen(false, "programmatic");
    }
  },
  { order: "bottom-up" },
);
```

## Example

This nested menu registers a root node and a submenu node, sharing one dismissal gate:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, useFloatingTree, usePosition } from "v-float";

const menuAnchorEl = ref<HTMLElement | null>(null);
const menuFloatingEl = ref<HTMLElement | null>(null);
const subMenuAnchorEl = ref<HTMLElement | null>(null);
const subMenuFloatingEl = ref<HTMLElement | null>(null);

const tree = useFloatingTree();

const rootNode = useFloatingNode({ anchorEl: menuAnchorEl, floatingEl: menuFloatingEl });
const subNode = useFloatingNode({ anchorEl: subMenuAnchorEl, floatingEl: subMenuFloatingEl });

tree.addNode(rootNode);
tree.addNode(subNode, rootNode.id);

const rootPos = usePosition(rootNode, { placement: "bottom-start" });
const subPos = usePosition(subNode, { placement: "right-start" });

useClick(rootNode);
useClick(subNode);

useDismiss(rootNode, { tree });
useDismiss(subNode, { tree });
</script>

<template>
  <button ref="menuAnchorEl">Options</button>

  <div v-if="rootNode.open" ref="menuFloatingEl" :style="rootPos.styles">
    <button>Account Settings</button>
    <button ref="subMenuAnchorEl">More Options &rarr;</button>

    <div v-if="subNode.open" ref="subMenuFloatingEl" :style="subPos.styles">
      <button>Export Data</button>
      <button>Delete Account</button>
    </div>
  </div>
</template>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Create nodes that join a tree
- [`useDismiss`](/api/use-dismiss) - Dismiss nested nodes sequentially on Escape or outside click
- [Tree Coordination Explained](/guide/tree-coordination-explained) - Architecture behind explicit tree linkage
- [Build Nested Menus](/guide/build-nested-menus) - Practical guide to multi-tier menus
