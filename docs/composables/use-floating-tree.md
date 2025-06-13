# useFloatingTree

To make the most of `useFloatingTree`, we recommend you're familiar with:

- **Vue 3 Composition API:** A good understanding is crucial, as `useFloatingTree` is built as a composable function.
- **The `useFloating` Composable:** Solid experience with the basic `useFloating` hook for positioning single floating elements is necessary. `useFloatingTree` orchestrates multiple `FloatingContext` instances, which are the output of `useFloating`.
- **Basic Tree Concepts (Helpful):** Familiarity with terms like nodes, parent-child relationships, and hierarchical structures will make it easier to understand how `useFloatingTree` manages interconnected UI elements.

## Orchestrating Your Floating UI Kingdom

While `useFloating` is excellent for positioning a single floating element, complex UI patterns often involve multiple connected floating elements. Without a tree structure, managing interactions like closing all child popovers when a parent closes, or ensuring only the topmost element is active, becomes cumbersome.

Enter `useFloatingTree` – your maestro for conducting an orchestra of hierarchical floating UI elements!

It provides a robust context system and a set of powerful tools to manage floating elements that need to be aware of each other in a parent-child hierarchy. Think of it as the central nervous system for your dynamic, layered UIs.

---

### Core Concepts

Before diving into the API, let's understand the key players:

1.  **Floating Tree:** The entire hierarchical structure managed by `useFloatingTree`.
2.  **Node (`TreeNode<FloatingContext>`):** Each individual floating element (a menu, a submenu, a tooltip) is represented as a node in the tree.
3.  **Node Data:** Each node holds a `data` property, which is the `FloatingContext` object returned by `useFloating`. This object contains the node's positioning information, open state, and other relevant data.
4.  **Root Node:** The very top-level node from which all other nodes descend. Even if not visually represented, it's the anchor of your tree.

## Floating Tree API

### useFloatingTree()

Creates a floating tree instance to manage hierarchical UI elements like popovers, tooltips, and menus.

- **Type:**

  ```ts
  function useFloatingTree(
    rootNodeData: FloatingContext,
    options?: { deleteStrategy?: "orphan" | "recursive" }
  ): UseFloatingTreeReturn
  ```

- **Details:**
  Initializes a new floating tree. The `rootNodeData` you provide anchors the entire tree and must be a `FloatingContext` object. The `options` object allows you to configure tree-wide behavior.

  - `deleteStrategy`: (Default: `"recursive"`) Controls what happens to child nodes when a parent is removed.
    - `"recursive"`: Removing a node also removes its entire subtree.
    - `"orphan"`: Removing a node sets its children's parent to `null`, but they remain in the tree.

- **Example:**

  ```vue
  <script setup lang="ts">
  import { ref } from "vue"
  import { useFloating, useFloatingTree } from "v-float"

  // Create the first floating context for your root floating element
  const rootData = useFloating({
    // The open state is crucial for many tree operations
    open: ref(true),
  })

  // Initialize the floating tree
  const tree = useFloatingTree(rootData, { deleteStrategy: "recursive" })
  </script>
  ```

---

## Tree Instance API

The `useFloatingTree` composable returns a `tree` object with the following properties and methods.

### tree.root

Reference to the root `TreeNode` instance of the tree.

- **Type:**
  ```ts
  readonly root: Readonly<TreeNode<FloatingContext>>
  ```
- **Details:**
  This is your entry point to the top of the hierarchy. It's a read-only property containing the root `TreeNode` which holds the `rootData` you provided during initialization.
- **Example:**
  ```ts
  const rootNode = tree.root
  console.log(rootNode.id) // The ID of the root node
  console.log(rootNode.children.value.length) // Number of direct children
  ```

### tree.nodeMap

A reactive map containing all nodes in the tree, keyed by their IDs.

- **Type:**
  ```ts
  readonly nodeMap: Readonly<Map<string, TreeNode<FloatingContext>>>
  ```
- **Details:**
  A `shallowReactive` map of all node IDs to their `TreeNode` instances. This is useful for debugging or direct node access, but you should prefer using the provided methods like `findNodeById` for most operations to ensure stability.
- **Example:**

  ```ts
  const totalNodes = tree.nodeMap.value.size
  console.log(`The tree has ${totalNodes} nodes.`)

  const specificNode = tree.nodeMap.value.get("node-id")
  ```

### tree.addNode()

Adds a new floating element to the tree.

- **Type:**
  ```ts
  addNode(
    data: FloatingContext,
    parentId?: string | null
  ): TreeNode<FloatingContext> | null
  ```
- **Details:**
  Creates and adds a new node to the tree with the provided `data`. If `parentId` is `null` or omitted, the node becomes a direct child of the root. It returns the newly created `TreeNode` instance or `null` if the specified `parentId` does not exist.
- **Example:**

  ```ts
  // Add a main menu as a child of the root
  const mainMenuData = useFloating({ open: ref(false) })
  const mainMenuNode = tree.addNode(mainMenuData)

  // Add a submenu as a child of the main menu
  const subMenuData = useFloating({ open: ref(false) })
  if (mainMenuNode) {
    const subMenuNode = tree.addNode(subMenuData, mainMenuNode.id)
  }
  ```

### tree.removeNode()

Removes a node from the tree by its ID.

- **Type:**
  ```ts
  removeNode(nodeId: string): boolean
  ```
- **Details:**
  Removes the node with the specified `nodeId`. The behavior towards descendants is determined by the `deleteStrategy` option set during tree initialization. Returns `true` if the node was found and removed, `false` otherwise.
- **Example:**
  ```ts
  // Assuming deleteStrategy is 'recursive' (default)
  // This will remove 'main-menu' and all its submenus.
  const success = tree.removeNode("main-menu")
  if (success) {
    console.log("Main menu and its children were removed.")
  }
  ```

### tree.moveNode()

Moves an existing node to a new parent within the tree.

- **Type:**
  ```ts
  moveNode(nodeId: string, newParentId: string | null): boolean
  ```
- **Details:**
  Moves an existing node to become a child of `newParentId`. The node and its entire subtree are re-parented. If `newParentId` is `null`, the node becomes a child of the root. This method prevents cyclic moves (e.g., moving a parent into its own child). Returns `true` on success.
- **Example:**

  ```ts
  // Move 'submenu-1' from 'main-menu' to 'other-menu'
  const moved = tree.moveNode("submenu-1", "other-menu")
  if (moved) {
    console.log("Submenu successfully moved.")
  }

  // Move a node to be a direct child of the root
  tree.moveNode("some-node", null)
  ```

### tree.findNodeById()

Locates and returns a specific node by its ID.

- **Type:**
  ```ts
  findNodeById(nodeId: string): TreeNode<FloatingContext> | null
  ```
- **Details:**
  Provides a quick, efficient way to look up a node by its ID from the internal `nodeMap`. Returns the `TreeNode` instance or `null` if no node with the given ID exists.
- **Example:**
  ```ts
  const menuNode = tree.findNodeById("main-menu")
  if (menuNode) {
    // Toggle its open state
    menuNode.data.open.value = !menuNode.data.open.value
  }
  ```

### tree.traverse()

Traverses the tree using depth-first or breadth-first search.

- **Type:**
  ```ts
  traverse(
    strategy: "dfs" | "bfs" = "dfs",
    startNode: TreeNode<FloatingContext> | null = tree.root
  ): TreeNode<FloatingContext>[]
  ```
- **Details:**
  Performs a traversal starting from `startNode` (or the root by default) and returns an array of nodes in the visited order.
  - `'dfs'` (Depth-First Search): Explores as far as possible along each branch before backtracking.
  - `'bfs'` (Breadth-First Search): Explores all neighbor nodes at the present depth prior to moving on to the nodes at the next depth level.
- **Example:**

  ```ts
  // Get all nodes in the tree via DFS
  const allNodesDfs = tree.traverse("dfs")
  allNodesDfs.forEach((node) => console.log(node.id))

  // Get all descendants of a specific menu via BFS
  const menuNode = tree.findNodeById("main-menu")
  if (menuNode) {
    const menuBranch = tree.traverse("bfs", menuNode)
  }
  ```

### tree.forEach()

Executes a callback function on a group of nodes related to a target node.

- **Type:**
  ```ts
  forEach(
    nodeId: string,
    callback: (node: TreeNode<FloatingContext>) => void,
    options?: {
      relationship?: NodeRelationship
      applyToMatching?: boolean
    }
  ): void
  ```
- **Details:**
  A powerful utility for performing bulk actions. It identifies a set of nodes based on their `relationship` to the `nodeId` and executes the `callback` on each one. By default (`applyToMatching: true`), the callback is also applied to the starting node if it fits the relationship criteria (e.g., for 'self-and-descendants').
- **Example:**

  ```ts
  // Close all sibling menus when one is opened
  tree.forEach(
    "file-menu",
    (node) => {
      node.data.open.value = false
    },
    { relationship: "siblings-only" }
  )

  // Close an entire menu branch
  tree.forEach(
    "main-menu",
    (node) => {
      node.data.open.value = false
    },
    { relationship: "self-and-descendants" }
  )
  ```

### tree.isTopmost()

Checks if a given open node is the topmost open node in its branch.

- **Type:**
  ```ts
  isTopmost(nodeId: string): boolean
  ```
- **Details:**
  Determines if the specified node is the "highest" open node within its direct line of descendants. This is extremely useful for managing focus or applying specific styles (e.g., a special `z-index`) to the most recently opened element in a nested menu system.
- **Example:**
  ```ts
  // In a nested menu, determine if the submenu should receive focus
  if (tree.isTopmost("submenu-2")) {
    // This submenu is the active one, focus its first item
    focusElementInside("submenu-2-container")
  }
  ```

### tree.getAllOpenNodes()

Retrieves all currently open nodes in the tree.

- **Type:**
  ```ts
  getAllOpenNodes(): TreeNode<FloatingContext>[]
  ```
- **Details:**
  Scans the entire tree and returns an array of all nodes where `node.data.open.value` is `true`, regardless of their position or depth.
- **Example:**
  ```ts
  // Close all open elements in the entire application
  const openNodes = tree.getAllOpenNodes()
  openNodes.forEach((node) => {
    node.data.open.value = false
  })
  ```

### tree.dispose()

Cleans up the tree instance and helps prevent memory leaks.

- **Type:**
  ```ts
  dispose(): void
  ```
- **Details:**
  Clears the internal `nodeMap`, effectively breaking all internal references between nodes in the tree. This should be called when the tree is no longer needed, typically in a component's `onUnmounted` lifecycle hook.
- **Example:**

  ```ts
  import { onUnmounted } from "vue"

  const tree = useFloatingTree(rootContext)

  onUnmounted(() => {
    tree.dispose()
    console.log("Floating tree disposed.")
  })
  ```

---

### NodeRelationship

The `NodeRelationship` type is used in `tree.forEach()` to specify which group of nodes to target.

| Relationship                  | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `ancestors-only`              | All parent nodes, up to the root.                                         |
| `siblings-only`               | All nodes that share the same immediate parent.                           |
| `descendants-only`            | All children, grandchildren, and so on, down the entire subtree.          |
| `children-only`               | Only the immediate children of the node.                                  |
| `self-and-ancestors`          | The node itself and all its parent nodes up to the root.                  |
| `self-and-children`           | The node itself and its immediate children.                               |
| `self-and-descendants`        | The node itself and its entire subtree.                                   |
| `self-and-siblings`           | The node itself and all its siblings.                                     |
| `self-ancestors-and-children` | The node, its parents, and its immediate children.                        |
| `full-branch`                 | The node, all its ancestors, and all its descendants (the entire branch). |
| `all-except-branch`           | All nodes in the tree _except_ for the node's full branch.                |

---

## Common Patterns

### Nested Menu System

Here's how you might manage a nested menu where opening a new menu closes its siblings and clicking outside closes everything.

```vue
<script setup>
import { ref } from "vue"
import { useFloatingTree } from "v-float"

const tree = useFloatingTree({ open: ref(true) })

// Create menu hierarchy
const mainMenu = tree.addNode({ open: ref(false) })
const fileMenu = tree.addNode({ open: ref(false) }, mainMenu.id)
const editMenu = tree.addNode({ open: ref(false) }, mainMenu.id)

// When opening the file menu, close the edit menu
function openFileMenu() {
  tree.forEach(
    fileMenu.id,
    (node) => {
      node.data.open.value = false
    },
    { relationship: "siblings-only" }
  )
  fileMenu.data.open.value = true
}

// Close all menus when clicking outside
function handleClickOutside() {
  tree.forEach(
    tree.root.id,
    (node) => {
      if (!node.isRoot) {
        // Don't close the conceptual root
        node.data.open.value = false
      }
    },
    { relationship: "descendants-only" }
  )
}
</script>
```

---

## The Engine Room: `Tree<T>` and `TreeNode<T>` Classes

While `useFloatingTree` is your primary interface, it is a specialized wrapper around a generic and reactive `Tree<T>` class. You can even use this class directly for other hierarchical data management needs.

### API Reference: `Tree<T>`

A generic, reactive tree data structure.

- **Constructor:** `new Tree<T>(initialRootData: T, options?: TreeOptions)`
  - **Details:** Creates a new tree. `options` can include `deleteStrategy`.
- **Properties:**
  - `root: TreeNode<T>`: The root node of the tree.
  - `nodeMap: Readonly<Map<string, TreeNode<T>>>`: A reactive map of all node IDs to their instances.
- **Methods:**
  - `findNodeById(id: string): TreeNode<T> | null`: Finds a node by ID.
  - `addNode(data: T, parentId?: string | null, ...): TreeNode<T> | null`: Adds a new node.
  - `removeNode(nodeId: string): boolean`: Removes a node.
  - `moveNode(nodeId: string, newParentId: string | null): boolean`: Moves a node.
  - `traverse(strategy?, startNode?): TreeNode<T>[]`: Traverses the tree.
  - `dispose(): void`: Clears the `nodeMap` for garbage collection.

### API Reference: `TreeNode<T>`

A reactive container for your data within the tree structure.

- **Constructor:** `new TreeNode<T>(data: T, parent?, options?, isRoot?)`
- **Properties:**
  - `id: string`: The unique node identifier.
  - `data: T`: The data payload (e.g., `FloatingContext`).
  - `parent: Ref<TreeNode<T> | null>`: A reactive ref to the parent node.
  - `children: Ref<TreeNode<T>[]>`: A reactive ref to the array of child nodes.
- **Methods:**
  - `updateData(newData: Partial<T> | T)`: Merges or replaces the node's data.
  - `findChild(predicate): TreeNode<T> | null`: Searches direct children.
  - `findDescendant(predicate): TreeNode<T> | null`: Performs a DFS search on descendants.
  - `isDescendantOf(potentialAncestor): boolean`: Checks if the node is in a subtree.
  - `getPath(): TreeNode<T>[]`: Returns the path from the root to the current node.
- **Getters:**
  - `isRoot: boolean`: True if this is the tree's designated root.
  - `isLeaf: boolean`: True if the node has no children.

---

## Potential Pitfalls

- **Memory Leaks:** Forgetting to call `tree.dispose()` in `onUnmounted` is the most common cause of memory leaks.
- **Non-Unique IDs:** Providing duplicate IDs when creating nodes can lead to unpredictable behavior. Let the system generate IDs if you're unsure.
- **Cyclic Moves:** `moveNode` prevents moving a node to be a descendant of itself by returning `false`. Be aware of this when dynamically restructuring the tree.
- **Recursive Deletion:** The default `deleteStrategy: 'recursive'` means removing a node also wipes out its entire subtree. If you want to preserve children, use the `"orphan"` strategy or manually reparent them before removal.
- **Direct State Mutation:** Avoid modifying the `tree.root` or `tree.nodeMap` properties directly. Always use the provided methods (`addNode`, `removeNode`, etc.) to ensure reactivity and internal state consistency.
