We'll break this down into sections:

1.  **`useFloatingTree`**: The star of the show.
2.  **`Tree<T>`**: The powerful engine under the hood.
3.  **`TreeNode<T>`**: The fundamental building blocks.

This structure will help users understand not just _how_ to use `useFloatingTree`, but also the underlying mechanics if they need to dive deeper or customize.

## `useFloatingTree`: Orchestrating Your Floating UI Kingdom 👑

While `useFloating` is excellent for positioning a single floating element, complex UI patterns often involve multiple connected floating elements. Without a tree structure, managing interactions like closing all child popovers when a parent closes, or ensuring only the topmost element is active, becomes cumbersome.

Enter `useFloatingTree` – your maestro for conducting an orchestra of hierarchical floating UI elements!

**Overview: Why `useFloatingTree`?**

`useFloatingTree` provides a robust context system and a set of powerful tools to manage floating elements that need to be aware of each other in a parent-child hierarchy. It's designed for scenarios where simple, isolated floating elements aren't enough, and you need coordination, context sharing, and complex relationship management.

Think of it as the central nervous system for your dynamic, layered UIs. It ensures that:

- Parent elements maintain awareness of their child relationships.
- Elements can intelligently manage their sibling states.
- Elements understand their position in the overall hierarchy.
- Complex nested structures can be managed with ease.

---

### Core Concepts

Before diving into the API, let's understand the key players:

1.  **Floating Tree:** The entire hierarchical structure managed by `useFloatingTree`.
2.  **Node (`TreeNode<FloatingContext>`):** Each individual floating element (a menu, a submenu, a tooltip) is represented as a node in the tree.
3.  **Node Data:** Each node holds a `data` property, which is the `FloatingContext` object returned by `useFloating`. This object contains the node's positioning information, open state, and other relevant data.
4.  **Root Node:** The very top-level node from which all other nodes descend. Even if not visually represented, it's the anchor of your tree.

---

### Usage Examples

### 1. Initialize the Tree

Start by creating a root node for your floating tree. This root typically represents the primary floating element, or a conceptual "base" if your floating elements are not truly nested under one initial floating component.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useFloatingTree } from 'v-float'

// Create the first floating context for your root floating element
const rootData = useFloating(...)

// Initialize the floating tree with the root floating context
const tree = useFloatingTree(rootData)
</script>
```

> **Note:**
> When you call `useFloatingTree(rootData)`, it internally creates a new `Tree<FloatingContext>` instance using your provided `rootData` as the root node's data. The composable manages the tree for the duration of its own lifecycle, so you don't need to manually instantiate the `Tree`.
>
> **However, `useFloatingTree` does _not_ automatically call `dispose()` on the tree instance.** If you need to perform manual cleanup (for example, in advanced or non-standard scenarios), you are responsible for disposing of the tree yourself by calling `tree.dispose()`. In typical Vue usage, this is rarely necessary, but it's important to be aware of for edge cases.

### 2. Adding Nested Floating Elements

```ts
const childData = useFloating(...)
const childNode = tree.addNode(childData)

const grandchildData = useFloating(...)
const grandChildNode = tree.addNode(grandChildData, childNode.id)
```

## The Engine Room: `Tree<T>` Class

While `useFloatingTree` is tailored for floating UI elements, its power comes from a more generic and versatile `Tree<T>` class. This class is the backbone, providing the core tree data structure and manipulation logic. You might even use `Tree<T>` directly for other hierarchical data management needs in your application!

**Overview: What is `Tree<T>`?**

The `Tree<T>` class is a generic, reactive tree data structure.

- **Generic (`<T>`):** It can hold any type of data in its nodes, as long as you provide it. For `useFloatingTree`, `T` is `FloatingContext`.
- **Reactive:** Node data, parent/child relationships, and the `nodeMap` are built with Vue's reactivity system (`shallowRef`, `shallowReactive`), so changes automatically propagate where needed.
- **Full-Featured:** Provides all essential tree operations: adding, removing, moving nodes, traversal, and searching.

---

### API Reference: `Tree<T>`

```typescript
export class Tree<T> {
  readonly root: TreeNode<T>
  readonly nodeMap: Readonly<Map<string, TreeNode<T>>>

  constructor(initialRootData: T, options?: TreeOptions)

  findNodeById(id: string): TreeNode<T> | null
  addNode(data: T, parentId?: string | null, nodeOptions?: TreeNodeOptions<T>): TreeNode<T> | null
  removeNode(nodeId: string): boolean
  moveNode(nodeId: string, newParentId: string | null): boolean
  traverse(strategy?: "dfs" | "bfs", startNode?: TreeNode<T> | null): TreeNode<T>[]
  dispose(): void
}
```

#### Constructor

- `constructor(initialRootData: T, options?: TreeOptions)`
  - **`initialRootData: T`:** The data for the root node of this tree.
  - **`options?: TreeOptions`:**
    - `deleteStrategy?: "orphan" | "recursive"`: (Default: `"recursive"`)
      - `"recursive"`: When a node is removed, all its descendants are also removed from the tree and `nodeMap`.
      - `"orphan"`: When a node is removed, its children have their `parent` reference set to `null` but remain in the `nodeMap`. They become disconnected subtrees.

#### Properties

- `root: TreeNode<T>`
  - **Description:** The root `TreeNode` instance of this tree. It's read-only on the `Tree` instance itself, but the `root.data` can be modified.
- `nodeMap: Readonly<Map<string, TreeNode<T>>>`
  - **Description:** A shallowly reactive, read-only map of all node IDs to their `TreeNode<T>` instances. Essential for quick lookups.

#### Methods

- `findNodeById(id: string): TreeNode<T> | null`

  - **Description:** Finds a node by its ID.
  - **Returns:** The `TreeNode<T>` or `null`.

- `addNode(data: T, parentId: string | null = null, nodeOptions: TreeNodeOptions<T> = {}): TreeNode<T> | null`

  - **Description:** Creates a new `TreeNode<T>` with the given `data` and adds it as a child to the node specified by `parentId`. If `parentId` is `null` or omitted, adds to the `root`.
  - **`nodeOptions.id`:** You can suggest an ID. If it's a duplicate, a new one will be generated (with a dev warning).
  - **Returns:** The new `TreeNode<T>` or `null` if `parentId` is invalid.

- `removeNode(nodeId: string): boolean`

  - **Description:** Removes the node with `nodeId`. Behavior towards children depends on `deleteStrategy`.
  - **Returns:** `true` on success, `false` if node not found or trying to remove root.

- `moveNode(nodeId: string, newParentId: string | null): boolean`

  - **Description:** Moves the node `nodeId` to become a child of `newParentId`. If `newParentId` is `null`, it attempts to move it to be a child of the root (though typically, you'd provide `this.root.id`).
  - **Returns:** `true` on success. `false` for errors (node not found, cyclic move, etc.).

- `traverse(strategy: "dfs" | "bfs" = "dfs", startNode: TreeNode<T> | null = this.root): TreeNode<T>[]`

  - **Description:** Performs DFS or BFS traversal starting from `startNode` (defaults to root).
  - **Returns:** An array of `TreeNode<T>` instances in visited order.

- `dispose(): void`
  - **Description:** Clears the `nodeMap`. Call this when the `Tree` instance is no longer needed to help with garbage collection.

## The Building Blocks: `TreeNode<T>` Class

Each element in your `Tree<T>` (and thus, your `useFloatingTree`) is an instance of `TreeNode<T>`. This class encapsulates the data for a single node and its relationships with its parent and children.

**Overview: What is `TreeNode<T>`?**

A `TreeNode<T>` is a reactive container for your data (`T`) within the tree structure. It holds:

- A unique `id`.
- The actual `data` (e.g., `FloatingContext`).
- Reactive references to its `parent` and `children`.

---

### API Reference: `TreeNode<T>`

```typescript
export class TreeNode<T> {
  readonly id: string
  data: Ref<T>
  parent: Ref<TreeNode<T> | null>
  children: Ref<TreeNode<T>[]>

  constructor(data: T, parent?: TreeNode<T> | null, options?: TreeNodeOptions<T>, isRoot?: boolean)

  // Primarily internal, prefer Tree's methods for adding/removing
  // addChild(childNode: TreeNode<T>): void;
  // _removeChildInstance(childNode: TreeNode<T>): boolean;

  updateData(newData: Partial<T> | T): void
  findChild(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null
  findDescendant(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null
  isDescendantOf(potentialAncestor: TreeNode<T>): boolean
  getPath(): TreeNode<T>[]

  get isRoot(): boolean
  get isLeaf(): boolean
}
```

#### Constructor

- `constructor(data: T, parent: TreeNode<T> | null = null, options: TreeNodeOptions<T> = {}, isRoot = false)`
  - **`data: T`:** The data payload for this node.
  - **`parent: TreeNode<T> | null`:** The parent node. `null` for the root or orphaned nodes.
  - **`options?: TreeNodeOptions<T>`:**
    - `id?: string`: Optional ID. If not provided or duplicate, one is generated by `useId()`.
  - **`isRoot: boolean`:** An internal flag set to `true` by the `Tree` class only for the actual root node.

#### Properties

- `id: string` (readonly)
  - **Description:** The unique identifier for this node. Generated if not provided.
- `data: Ref<T>`
  - **Description:** A Vue `shallowRef` holding the actual data for this node. You can update it via `node.data = ...` or `node.updateData(...)`.
- `parent: Ref<TreeNode<T> | null>`
  - **Description:** A Vue `shallowRef` pointing to the parent `TreeNode`, or `null` if it's the root or an orphan.
- `children: Ref<TreeNode<T>[]>`
  - **Description:** A Vue `shallowRef` holding an array of its direct child `TreeNode` instances.

#### Methods

- `updateData(newData: Partial<T> | T)`

  - **Description:** Updates the node's `data`. If `T` is an object and `newData` is a partial object, it performs a shallow merge (`Object.assign`). Otherwise, it replaces the value.
  - **Example:** `node.updateData({ open: ref(true) });` or `node.data.open.value = true;`

- `findChild(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null`

  - **Description:** Searches only the _direct children_ of this node.
  - **Returns:** The first child satisfying the `predicate`, or `null`.

- `findDescendant(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null`

  - **Description:** Performs a Depth-First Search starting from _this node_ (including itself) to find a descendant that satisfies the `predicate`.
  - **Returns:** The first matching descendant (or self), or `null`.

- `isDescendantOf(potentialAncestor: TreeNode<T>): boolean`

  - **Description:** Checks if this node is a descendant of the `potentialAncestor` node by traversing up its parent chain.
  - **Returns:** `true` if it's a descendant, `false` otherwise.

- `getPath(): TreeNode<T>[]`

  - **Description:** Traverses upwards from this node to the root.
  - **Returns:** An array of `TreeNode<T>` instances representing the path from the root down to (and including) this node. Example: `[root, parentOfParent, parent, thisNode]`.

- `addChild(childNode: TreeNode<T>): void`
  - **Description:** (Usually called by `Tree.addNode`) Adds an _existing_ `TreeNode` instance to this node's `children` array. Updates reactivity. (Internal: Generally not called directly by consumers. Prefer Tree.addNode and Tree.removeNode.)
- `_removeChildInstance(childNode: TreeNode<T>): boolean`
  - **Description:** (Usually called by `Tree.removeNode` or `Tree.moveNode`) Removes a specific `TreeNode` instance from this node's `children` array and sets the child's `parent` to `null`. (Internal: Generally not called directly by consumers. Prefer Tree.addNode and Tree.removeNode.)
  - **Returns:** `true` if found and removed.

#### Getters

- `get isRoot(): boolean`
  - **Description:** Returns `true` if this node was designated as the _true root_ during its creation by the `Tree` class. An orphaned node (parent is `null` but `_isRoot` is `false`) will return `false`.
- `get isLeaf(): boolean`
  - **Description:** Returns `true` if this node has no children (`children.value.length === 0`).

---

### Potential Pitfalls

- **Memory Leaks:** Forgetting to call `dispose()` is the most common culprit.
- **Non-Unique IDs:** Will lead to unpredictable behavior with `findNodeById`, `addNode`, `removeNode`, etc.
- **Cyclic Moves:** `moveNode` prevents moving a node to be a descendant of itself, returning `false`. Be aware of this if you're dynamically restructuring.
- **Recursive Deletion:** The default `deleteStrategy: 'recursive'` means removing a node also wipes out its entire subtree. If you want to preserve children, consider `"orphan"` or manual reparenting before removal.
- **Modifying `nodeMap` or `root` Directly:** These are exposed as `Readonly` for a reason. While the underlying objects might be mutable, directly altering the `Map` structure or reassigning `root` can break `useFloatingTree`'s internal state. Stick to the provided methods.
