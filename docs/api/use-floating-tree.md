### API Reference: `useFloatingTree`

```typescript
function useFloatingTree(
  rootNodeData: FloatingContext,
  options?: FloatingTreeOptions
): UseFloatingTreeReturn
```

#### Parameters

- `rootNodeData: FloatingContext`:
  - **Description:** The data for the foundational root node of your floating tree. Every other node will ultimately be a descendant of this root.
  - **Critical:** Must contain at least an `id` (e.g., `'root'`) and an `open` state (e.g., `ref(true)`). The root is often conceptually "open" to allow its children to exist.
  - **Example:** `{ id: 'app-root-floating-context', open: ref(true) }`
- `options?: FloatingTreeOptions`:
  - **Description:** Optional configuration to customize the tree's behavior. Currently, this extends `TreeOptions` from the underlying `Tree` class.
  - **Key Option (from `TreeOptions`):**
    - `deleteStrategy`: `"orphan"` or `"recursive"` (default: `"recursive"`). Determines what happens to child nodes when a parent is removed.
      - `"recursive"`: Removing a parent also removes all its descendants.
      - `"orphan"`: Removing a parent detaches its children, making them root-level (orphaned) nodes within the tree's map, but they lose their parent connection.

#### Returns: `UseFloatingTreeReturn`

This is the object you'll interact with. It's packed with properties and methods to manage your floating UI hierarchy.

##### Properties

- `nodeMap: Readonly<Map<string, TreeNode<FloatingContext>>>`
  - **Description:** A read-only map giving you direct access to every node in the tree, keyed by its unique `id`. Super handy for debugging or advanced direct manipulations (though usually, you'll use the provided methods).
  - **Reactive:** The map itself is shallowly reactive, meaning additions and removals will trigger updates. The `TreeNode` instances within are also reactive.
- `root: Readonly<TreeNode<FloatingContext>>`
  - **Description:** A read-only reference to the root `TreeNode` instance. This is your entry point to the top of the hierarchy.

##### Methods

- `addNode(data: FloatingContext, parentId?: string): TreeNode<FloatingContext> | null`

  - **Description:** Adds a new floating element (node) to the tree.
  - **Parameters:**
    - `data: FloatingContext`: The data for the new node (e.g., `{ id: 'main-menu', open: ref(false) }`).
    - `parentId?: string`: The ID of the parent node. If omitted, the new node becomes a child of the `root` node.
  - **Returns:** The newly created `TreeNode` instance, or `null` if the `parentId` doesn't exist.
  - **Example:** `const fileMenuNode = tree.addNode({ id: 'file-menu', open: ref(false) }, 'toolbar-menu-bar');`

- `removeNode(nodeId: string): boolean`

  - **Description:** Removes a node (and potentially its descendants, based on `deleteStrategy`) from the tree.
  - **Parameters:**
    - `nodeId: string`: The ID of the node to remove.
  - **Returns:** `true` if the node was found and removed successfully, `false` otherwise (e.g., node not found, trying to remove root).
  - **Caution:** Cannot remove the root node.

- `moveNode(nodeId: string, newParentId: string): boolean`

  - **Description:** Reparents an existing node, moving it under a new parent within the tree.
  - **Parameters:**
    - `nodeId: string`: The ID of the node to move.
    - `newParentId: string`: The ID of the new parent node. Can be the root's ID.
  - **Returns:** `true` if the move was successful, `false` if the move is invalid (e.g., node or new parent not found, attempting to create a cycle by moving a node under one of its own descendants).
  - **Heads Up!** You can't move a node to be a child of itself or one of its descendants.

- `findNodeById(nodeId: string): TreeNode<FloatingContext> | null`

  - **Description:** Quickly locates and returns a specific node by its ID.
  - **Parameters:**
    - `nodeId: string`: The ID of the node to find.
  - **Returns:** The `TreeNode` instance if found, or `null`.

- `traverse(mode: "dfs" | "bfs", startNode?: TreeNode<FloatingContext>): TreeNode<FloatingContext>[]`

  - **Description:** Traverses the tree (or a subtree) and returns an array of nodes in the order they were visited.
  - **Parameters:**
    - `mode: "dfs" | "bfs"`:
      - `"dfs"`: Depth-First Search (explores as far as possible along each branch before backtracking).
      - `"bfs"`: Breadth-First Search (explores level by level).
    - `startNode?: TreeNode<FloatingContext>`: The node to begin traversal from. Defaults to the `root` node if omitted.
  - **Returns:** An array of `TreeNode` instances.
  - **Use Case:** Useful for operations that need to process nodes in a specific order, like collecting all visible elements.

- `isTopmost(nodeId: string): boolean`

  - **Description:** Checks if a given _open_ node is the "highest" open node in its particular branch of the hierarchy. This means the node itself is open, and none of its direct ancestors are also open.
  - **Parameters:**
    - `nodeId: string`: The ID of the node to check.
  - **Returns:** `true` if the node is open and no open ancestors are found up to the root; `false` if the node isn't open, doesn't exist, or an ancestor is open.
  - **Use Case:** Useful for determining which menu/popover should have modality or capture certain events (like Escape key presses).

- `getAllOpenNodes(): TreeNode<FloatingContext>[]`

  - **Description:** Retrieves a list of all nodes in the entire tree whose `data.open.value` (or equivalent if `FloatingContext` is structured differently) is `true`.
  - **Returns:** An array of `TreeNode<FloatingContext>` instances that are currently marked as open.
  - **Use Case:** Debugging, rendering overlays, managing focus across multiple open elements.

- `forEach(nodeId: string, callback: (node: TreeNode<FloatingContext>) => void, options?: { relationship?: NodeRelationship; applyToMatching?: boolean })`

  - **Description:** A powerful iterator that executes a callback function on nodes related to a specified target node. This is your go-to for targeted batch operations.
  - **Parameters:**
    - `nodeId: string`: The ID of the "target" node, which serves as the reference point for determining relationships.
    - `callback: (node: TreeNode<FloatingContext>) => void`: The function to execute for each node that meets the criteria.
    - `options?`:
      - `relationship?: NodeRelationship`: (Default: `"self-and-children"`) Specifies which nodes relative to `nodeId` the callback should apply to. See `NodeRelationship` types below.
      - `applyToMatching?: boolean`: (Default: `true`) If `true`, the callback runs on nodes _matching_ the relationship. If `false`, it runs on nodes _not matching_ the relationship (i.e., the inverse set).
  - **Use Case:** Closing all sibling menus when one opens, disabling all descendant items, finding the closest open ancestor.

- `dispose(): void`
  - **Description:** Cleans up the tree, primarily by clearing the internal `nodeMap`. This is **crucial** for preventing memory leaks, especially in component-based frameworks like Vue where composables might be tied to a component's lifecycle.
  - **When to Call:** Call this when the floating tree is no longer needed (e.g., in Vue's `onScopeDispose` or `onUnmounted` hook).

---

### Key Types for `useFloatingTree`

- `FloatingContext` (imported from `./use-floating` or defined by you)

  - **Purpose:** The data payload for each node.
  - **Essential Properties:**
    - `id: string`: A unique identifier for the node.
    - `open: Ref<boolean>` (or similar reactive boolean): Indicates if the floating element represented by this node is currently visible/active.
  - **Example:**
    ```typescript
    interface MyFloatingContext {
      id: string
      open: Ref<boolean>
      label?: string // Optional custom data
    }
    ```

- `FloatingTreeOptions extends TreeOptions`

  - **Purpose:** Configuration for the `useFloatingTree` instance.
  - Inherits `deleteStrategy` from `TreeOptions`.

- `NodeRelationship`
  - **Purpose:** Defines the set of nodes to target in the `forEach` method, relative to a given `nodeId`.
  - **Available Values & Meanings:**
    - `"ancestors-only"`: All direct parent nodes, up to the root.
    - `"siblings-only"`: Nodes sharing the same immediate parent, excluding the target node itself.
    - `"descendants-only"`: All children, grandchildren, etc., of the target node, excluding the target itself.
    - `"children-only"`: Only the immediate children of the target node.
    - `"self-and-ancestors"`: The target node and all its ancestors.
    - `"self-and-children"`: The target node and its immediate children. _(Default for `forEach`)_
    - `"self-and-descendants"`: The target node and all its descendants.
    - `"self-and-siblings"`: The target node and its siblings.
    - `"self-ancestors-and-children"`: The target, its ancestors, and its immediate children.
    - `"full-branch"`: The target node, all its ancestors, and all its descendants (the entire lineage).
    - `"all-except-branch"`: All nodes in the tree _except_ for the target node's full branch.

---

title: useFloatingTree
description: A Vue Composable for managing a hierarchy of floating UI elements like popovers, tooltips, and menus.

---

# `useFloatingTree`

The `useFloatingTree` composable provides a powerful and reactive way to manage a hierarchical tree of floating UI elements built with `@floating-ui/vue`. It's designed for scenarios where you have multiple nested or related floating components (e.g., a menu with sub-menus, a tooltip that opens another tooltip, or cascading popovers) and need to control their behavior as a group.

## Purpose

While `useFloating` is excellent for positioning a single floating element, complex UI patterns often involve multiple connected floating elements. Without a tree structure, managing interactions like closing all child popovers when a parent closes, or ensuring only the topmost element is active, becomes cumbersome.

`useFloatingTree` solves this by:

1.  **Centralizing State:** It acts as a single source of truth for the relationships and open/closed states of your floating elements.
2.  **Enabling Hierarchical Control:** You can easily perform operations across entire branches of your floating UI, like closing all descendants or finding the currently active topmost element.
3.  **Simplifying Complex Interactions:** It provides utilities to manage common patterns, such as ensuring only one branch of the tree is active at a time or closing related floating elements.

## Use Cases

`useFloatingTree` shines in the following scenarios:

- **Nested Dropdown Menus:** Clicking a top-level menu item opens a dropdown, and hovering over a sub-item in that dropdown opens another nested menu. `useFloatingTree` can manage the opening and closing of these nested layers.
- **Cascading Popovers:** A popover contains a button that, when clicked, opens another popover.
- **Complex Tooltip Chains:** A tooltip displays information, and part of that information is itself interactive and triggers another tooltip.
- **Context Menus:** When a context menu is opened, any previously opened floating elements (not part of its branch) should close.
- **Overlay Management:** Ensuring that only the most relevant, topmost floating element remains open, automatically closing others.

## User Journey & Guide

### 1. Initialize the Tree

Start by creating a root node for your floating tree. This root typically represents the primary floating element, or a conceptual "base" if your floating elements are not truly nested under one initial floating component.

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating } from "@floating-ui/vue"
import { useFloatingTree } from "@/composables/use-floating-tree" // Assuming your path

const anchorEl1 = ref(null)
const floatingEl1 = ref(null)
const open1 = ref(false)

// Create the first floating context for your root floating element
const floatingContext1 = useFloating(anchorEl1, floatingEl1, { open: open1 })

// Initialize the floating tree with the root floating context
const tree = useFloatingTree(floatingContext1)
</script>

<template>
  <div>
    <button ref="anchorEl1" @click="open1 = !open1">Open Popover 1</button>
    <div ref="floatingEl1" :style="floatingContext1.floatingStyles.value" v-if="open1">
      Popover Content 1
      <!-- ... potentially other floating elements -->
    </div>
  </div>
</template>
```

### 2. Adding Nested Floating Elements

When you have a floating element that opens another floating element, you add the child's `FloatingContext` to the tree, specifying its parent's ID.

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating } from "@floating-ui/vue"
import { useFloatingTree } from "@/composables/use-floating-tree"

const anchorEl1 = ref(null)
const floatingEl1 = ref(null)
const open1 = ref(false)

const anchorEl2 = ref(null)
const floatingEl2 = ref(null)
const open2 = ref(false)

const floatingContext1 = useFloating(anchorEl1, floatingEl1, { open: open1, nodeId: "popover-1" })
const floatingContext2 = useFloating(anchorEl2, floatingEl2, { open: open2, nodeId: "popover-2" })

const tree = useFloatingTree(floatingContext1)

// Add the second popover as a child of the first popover
// This should typically be done after the node is initially rendered/available.
// Use a watcher or onMounted if the child context isn't immediately available.
tree.addNode(floatingContext2, floatingContext1.nodeId!) // floatingContext1.nodeId will be 'popover-1'
</script>

<template>
  <div>
    <button ref="anchorEl1" @click="open1 = !open1">Open Popover 1</button>
    <div ref="floatingEl1" :style="floatingContext1.floatingStyles.value" v-if="open1">
      Popover Content 1
      <button ref="anchorEl2" @click="open2 = !open2">Open Nested Popover 2</button>
      <div ref="floatingEl2" :style="floatingContext2.floatingStyles.value" v-if="open2">
        Popover Content 2
      </div>
    </div>
  </div>
</template>
```

**Important Note:** The `nodeId` in `useFloating` is crucial for `useFloatingTree` to track nodes by ID. Make sure to provide unique IDs for your floating elements.

### 3. Controlling Visibility and Interactions

The true power of `useFloatingTree` lies in its methods for iterating and managing node states.

#### Closing Ancestors and Siblings

A common pattern is to close related popovers when a new one opens. For instance, clicking a sub-menu item might close other sibling sub-menus and parent menus.

```ts
// Inside your component where a node's open state changes:
function handleOpenToggle(nodeId: string, isOpen: boolean) {
  const targetNode = tree.findNodeById(nodeId)
  if (!targetNode) return

  targetNode.data.value.onOpenChange(isOpen) // Update the target node's open state

  if (isOpen) {
    // When opening a node, close all other nodes that are not its ancestors or descendants
    tree.forEach(
      nodeId,
      (node) => {
        if (node.data.value.open.value) {
          node.data.value.onOpenChange(false)
        }
      },
      { relationship: "full-branch", applyToMatching: false } // Apply to all nodes NOT in the full branch
    )
  }
}
```

#### Finding the Topmost Open Node

You might need to identify which floating element is currently at the "top" of the visual stack, perhaps for handling keyboard navigation or focus management.

```ts
const activeTopmostNode = computed(() => {
  const openNodes = tree.getAllOpenNodes()
  // Sort by depth (or any other criteria) to determine topmost
  // A more robust approach might involve tracking z-index or actual visual overlap.
  // For hierarchical popovers, `isTopmost` is usually sufficient.
  for (const node of openNodes) {
    if (tree.isTopmost(node.id)) {
      return node
    }
  }
  return null
})
```

#### Traversing the Tree

You can traverse the tree using Depth-First Search (DFS) or Breadth-First Search (BFS) for custom logic.

```ts
// Perform an action on all descendants of a specific node
const allDescendants = tree.traverse("dfs", tree.findNodeById("parent-menu-id"))
allDescendants.forEach((node) => {
  // Do something with each descendant
  console.log(`Node: ${node.id}, Data:`, node.data.value)
})
```

### 4. Cleaning Up

It's crucial to call `tree.dispose()` when the component using `useFloatingTree` is unmounted to prevent memory leaks and ensure reactivity is properly cleaned up.

```vue
<script setup lang="ts">
import { onScopeDispose } from "vue"
// ... other imports and setup

const tree = useFloatingTree(floatingContext1)

onScopeDispose(() => {
  tree.dispose()
})
</script>
```

By leveraging `useFloatingTree`, you gain a structured and reactive way to manage the complex interactions that arise with multiple, interconnected floating UI elements, leading to cleaner code and more robust user experiences.
