We'll break this down into sections:

1.  **`useFloatingTree`**: The star of the show.
2.  **`Tree<T>`**: The powerful engine under the hood.
3.  **`TreeNode<T>`**: The fundamental building blocks.

This structure will help users understand not just *how* to use `useFloatingTree`, but also the underlying mechanics if they need to dive deeper or customize.

---

## `useFloatingTree`: Orchestrating Your Floating UI Kingdom 👑

While `useFloating` is excellent for positioning a single floating element, complex UI patterns often involve multiple connected floating elements. Without a tree structure, managing interactions like closing all child popovers when a parent closes, or ensuring only the topmost element is active, becomes cumbersome.

Enter `useFloatingTree` – your maestro for conducting an orchestra of hierarchical floating UI elements!

**Overview: Why `useFloatingTree`?**

`useFloatingTree` provides a robust context system and a set of powerful tools to manage floating elements that need to be aware of each other in a parent-child hierarchy. It's designed for scenarios where simple, isolated floating elements aren't enough, and you need coordination, context sharing, and complex relationship management.

Think of it as the central nervous system for your dynamic, layered UIs. It ensures that:

* Parent elements maintain awareness of their child relationships.
* Elements can intelligently manage their sibling states.
* Elements understand their position in the overall hierarchy.
* Complex nested structures can be managed with ease.

---

### Core Concepts

Before diving into the API, let's understand the key players:

1.  **Floating Tree:** The entire hierarchical structure managed by `useFloatingTree`.
2.  **Node (`TreeNode<FloatingContext>`):** Each individual floating element (a menu, a submenu, a tooltip) is represented as a node in the tree.
3.  **Node Data:** Each node holds a `data` property, which is the `FloatingContext` object returned by `useFloating`. This object contains the node's positioning information, open state, and other relevant data.
4.  **Root Node:** The very top-level node from which all other nodes descend. Even if not visually represented, it's the anchor of your tree.

---

### API Reference: `useFloatingTree`

```typescript
function useFloatingTree(
  rootNodeData: FloatingContext,
  options?: FloatingTreeOptions
): UseFloatingTreeReturn;
```

#### Parameters

*   `rootNodeData: FloatingContext`:
    *   **Description:** The data for the foundational root node of your floating tree. Every other node will ultimately be a descendant of this root.
    *   **Critical:** Must contain at least an `id` (e.g., `'root'`) and an `open` state (e.g., `ref(true)`). The root is often conceptually "open" to allow its children to exist.
    *   **Example:** `{ id: 'app-root-floating-context', open: ref(true) }`
*   `options?: FloatingTreeOptions`:
    *   **Description:** Optional configuration to customize the tree's behavior. Currently, this extends `TreeOptions` from the underlying `Tree` class.
    *   **Key Option (from `TreeOptions`):**
        *   `deleteStrategy`: `"orphan"` or `"recursive"` (default: `"recursive"`). Determines what happens to child nodes when a parent is removed.
            *   `"recursive"`: Removing a parent also removes all its descendants.
            *   `"orphan"`: Removing a parent detaches its children, making them root-level (orphaned) nodes within the tree's map, but they lose their parent connection.

#### Returns: `UseFloatingTreeReturn`

This is the object you'll interact with. It's packed with properties and methods to manage your floating UI hierarchy.

##### Properties

*   `nodeMap: Readonly<Map<string, TreeNode<FloatingContext>>>`
    *   **Description:** A read-only map giving you direct access to every node in the tree, keyed by its unique `id`. Super handy for debugging or advanced direct manipulations (though usually, you'll use the provided methods).
    *   **Reactive:** The map itself is shallowly reactive, meaning additions and removals will trigger updates. The `TreeNode` instances within are also reactive.
*   `root: Readonly<TreeNode<FloatingContext>>`
    *   **Description:** A read-only reference to the root `TreeNode` instance. This is your entry point to the top of the hierarchy.

##### Methods

*   `addNode(data: FloatingContext, parentId?: string): TreeNode<FloatingContext> | null`
    *   **Description:** Adds a new floating element (node) to the tree.
    *   **Parameters:**
        *   `data: FloatingContext`: The data for the new node (e.g., `{ id: 'main-menu', open: ref(false) }`).
        *   `parentId?: string`: The ID of the parent node. If omitted, the new node becomes a child of the `root` node.
    *   **Returns:** The newly created `TreeNode` instance, or `null` if the `parentId` doesn't exist.
    *   **Example:** `const fileMenuNode = tree.addNode({ id: 'file-menu', open: ref(false) }, 'toolbar-menu-bar');`

*   `removeNode(nodeId: string): boolean`
    *   **Description:** Removes a node (and potentially its descendants, based on `deleteStrategy`) from the tree.
    *   **Parameters:**
        *   `nodeId: string`: The ID of the node to remove.
    *   **Returns:** `true` if the node was found and removed successfully, `false` otherwise (e.g., node not found, trying to remove root).
    *   **Caution:** Cannot remove the root node.

*   `moveNode(nodeId: string, newParentId: string): boolean`
    *   **Description:** Reparents an existing node, moving it under a new parent within the tree.
    *   **Parameters:**
        *   `nodeId: string`: The ID of the node to move.
        *   `newParentId: string`: The ID of the new parent node. Can be the root's ID.
    *   **Returns:** `true` if the move was successful, `false` if the move is invalid (e.g., node or new parent not found, attempting to create a cycle by moving a node under one of its own descendants).
    *   **Heads Up!** You can't move a node to be a child of itself or one of its descendants.

*   `findNodeById(nodeId: string): TreeNode<FloatingContext> | null`
    *   **Description:** Quickly locates and returns a specific node by its ID.
    *   **Parameters:**
        *   `nodeId: string`: The ID of the node to find.
    *   **Returns:** The `TreeNode` instance if found, or `null`.

*   `traverse(mode: "dfs" | "bfs", startNode?: TreeNode<FloatingContext>): TreeNode<FloatingContext>[]`
    *   **Description:** Traverses the tree (or a subtree) and returns an array of nodes in the order they were visited.
    *   **Parameters:**
        *   `mode: "dfs" | "bfs"`:
            *   `"dfs"`: Depth-First Search (explores as far as possible along each branch before backtracking).
            *   `"bfs"`: Breadth-First Search (explores level by level).
        *   `startNode?: TreeNode<FloatingContext>`: The node to begin traversal from. Defaults to the `root` node if omitted.
    *   **Returns:** An array of `TreeNode` instances.
    *   **Use Case:** Useful for operations that need to process nodes in a specific order, like collecting all visible elements.

*   `isTopmost(nodeId: string): boolean`
    *   **Description:** Checks if a given *open* node is the "highest" open node in its particular branch of the hierarchy. This means the node itself is open, and none of its direct ancestors are also open.
    *   **Parameters:**
        *   `nodeId: string`: The ID of the node to check.
    *   **Returns:** `true` if the node is open and no open ancestors are found up to the root; `false` if the node isn't open, doesn't exist, or an ancestor is open.
    *   **Use Case:** Useful for determining which menu/popover should have modality or capture certain events (like Escape key presses).

*   `getAllOpenNodes(): TreeNode<FloatingContext>[]`
    *   **Description:** Retrieves a list of all nodes in the entire tree whose `data.open.value` (or equivalent if `FloatingContext` is structured differently) is `true`.
    *   **Returns:** An array of `TreeNode<FloatingContext>` instances that are currently marked as open.
    *   **Use Case:** Debugging, rendering overlays, managing focus across multiple open elements.

*   `forEach(nodeId: string, callback: (node: TreeNode<FloatingContext>) => void, options?: { relationship?: NodeRelationship; applyToMatching?: boolean })`
    *   **Description:** A powerful iterator that executes a callback function on nodes related to a specified target node. This is your go-to for targeted batch operations.
    *   **Parameters:**
        *   `nodeId: string`: The ID of the "target" node, which serves as the reference point for determining relationships.
        *   `callback: (node: TreeNode<FloatingContext>) => void`: The function to execute for each node that meets the criteria.
        *   `options?`:
            *   `relationship?: NodeRelationship`: (Default: `"self-and-children"`) Specifies which nodes relative to `nodeId` the callback should apply to. See `NodeRelationship` types below.
            *   `applyToMatching?: boolean`: (Default: `true`) If `true`, the callback runs on nodes *matching* the relationship. If `false`, it runs on nodes *not matching* the relationship (i.e., the inverse set).
    *   **Use Case:** Closing all sibling menus when one opens, disabling all descendant items, finding the closest open ancestor.

*   `dispose(): void`
    *   **Description:** Cleans up the tree, primarily by clearing the internal `nodeMap`. This is **crucial** for preventing memory leaks, especially in component-based frameworks like Vue where composables might be tied to a component's lifecycle.
    *   **When to Call:** Call this when the floating tree is no longer needed (e.g., in Vue's `onScopeDispose` or `onUnmounted` hook).

---

### Key Types for `useFloatingTree`

*   `FloatingContext` (imported from `./use-floating` or defined by you)
    *   **Purpose:** The data payload for each node.
    *   **Essential Properties:**
        *   `id: string`: A unique identifier for the node.
        *   `open: Ref<boolean>` (or similar reactive boolean): Indicates if the floating element represented by this node is currently visible/active.
    *   **Example:**
        ```typescript
        interface MyFloatingContext {
          id: string;
          open: Ref<boolean>;
          label?: string; // Optional custom data
        }
        ```

*   `FloatingTreeOptions extends TreeOptions`
    *   **Purpose:** Configuration for the `useFloatingTree` instance.
    *   Inherits `deleteStrategy` from `TreeOptions`.

*   `NodeRelationship`
    *   **Purpose:** Defines the set of nodes to target in the `forEach` method, relative to a given `nodeId`.
    *   **Available Values & Meanings:**
        *   `"ancestors-only"`: All direct parent nodes, up to the root.
        *   `"siblings-only"`: Nodes sharing the same immediate parent, excluding the target node itself.
        *   `"descendants-only"`: All children, grandchildren, etc., of the target node, excluding the target itself.
        *   `"children-only"`: Only the immediate children of the target node.
        *   `"self-and-ancestors"`: The target node and all its ancestors.
        *   `"self-and-children"`: The target node and its immediate children. *(Default for `forEach`)*
        *   `"self-and-descendants"`: The target node and all its descendants.
        *   `"self-and-siblings"`: The target node and its siblings.
        *   `"self-ancestors-and-children"`: The target, its ancestors, and its immediate children.
        *   `"full-branch"`: The target node, all its ancestors, and all its descendants (the entire lineage).
        *   `"all-except-branch"`: All nodes in the tree *except* for the target node's full branch.

---

### Usage Examples

#### 1. Basic Setup & Adding Nodes

```typescript
import { ref } from 'vue';
import { useFloatingTree } from '@/composables/use-floating-tree';
import type { FloatingContext } from "./use-floating"; // Assuming this type definition

// 1. Initialize the tree with a root context
const tree = useFloatingTree({ id: 'app-root', open: ref(true) });

// 2. Add a main menu (child of root)
const mainMenuCtx: FloatingContext = { id: 'main-menu', open: ref(false) };
const mainMenuNode = tree.addNode(mainMenuCtx);

if (mainMenuNode) {
  // 3. Add a submenu to the main menu
  const fileMenuCtx: FloatingContext = { id: 'file-menu', open: ref(false) };
  const fileMenuNode = tree.addNode(fileMenuCtx, mainMenuNode.id);

  // 4. Add an item to the file menu
  const openItemCtx: FloatingContext = { id: 'file-open-item', open: ref(false) }; // Items might also be "openable" if they trigger further UI
  tree.addNode(openItemCtx, fileMenuNode.id);
}

// To open the main menu:
const menuToOpen = tree.findNodeById('main-menu');
if (menuToOpen) {
  menuToOpen.data.value.open.value = true;
}
```

#### 2. Nested Menus: Closing Siblings

```typescript
// ... (setup from previous example) ...

function openMenu(menuId: string) {
  const targetMenu = tree.findNodeById(menuId);
  if (!targetMenu) return;

  // Close sibling menus
  if (targetMenu.parent.value) {
    tree.forEach(targetMenu.id, (sibling) => {
      if (sibling.id !== targetMenu.id) { // Don't close self
        sibling.data.value.open.value = false;
      }
    }, { relationship: 'siblings-only', applyToMatching: true }); // Target siblings
  }
  
  // Open the target menu
  targetMenu.data.value.open.value = true;

  // Optional: Close descendant submenus if the parent is being opened fresh
  tree.forEach(targetMenu.id, (descendant) => {
    descendant.data.value.open.value = false;
  }, { relationship: 'descendants-only' });
}

// openMenu('main-menu');
// openMenu('file-menu'); // Assuming 'file-menu' is a sibling or cousin in this context
```

#### 3. Dynamic Updates: Moving and Removing

```typescript
// ... (setup from previous example) ...

// Let's say 'file-menu' has 'edit-menu' as a child initially
// const editMenuCtx = { id: 'edit-menu', open: ref(false) };
// tree.addNode(editMenuCtx, 'file-menu');

// Move 'edit-menu' to be a direct child of 'main-menu'
// tree.moveNode('edit-menu', 'main-menu');

// Remove the 'file-open-item'
// tree.removeNode('file-open-item'); // If deleteStrategy is 'recursive', this is fine.

// Don't forget to clean up when the component/scope is destroyed!
// import { onScopeDispose } from 'vue';
// onScopeDispose(() => {
//   tree.dispose();
// });
```

---

### Best Practices

*   **Unique IDs are King:** Always ensure every `FloatingContext` has a globally unique `id`. This is fundamental for all tree operations.
*   **Dispose Diligently:** Call `tree.dispose()` when your floating tree is no longer needed (e.g., component unmount) to prevent memory leaks.
*   **Reactive Data:** Ensure the `open` state (and any other state you rely on) within your `FloatingContext` is reactive (e.g., using Vue's `ref` or `reactive`).
*   **Leverage `forEach`:** For operations on multiple related nodes (e.g., closing siblings, disabling descendants), `forEach` with `NodeRelationship` is more efficient and declarative than manual traversal.
*   **Immutable Root (Mostly):** Avoid removing or directly manipulating the `root` node properties after initialization, unless you have a very specific reason.

---

### Potential Pitfalls

*   **Memory Leaks:** Forgetting to call `dispose()` is the most common culprit.
*   **Non-Unique IDs:** Will lead to unpredictable behavior with `findNodeById`, `addNode`, `removeNode`, etc.
*   **Cyclic Moves:** `moveNode` prevents moving a node to be a descendant of itself, returning `false`. Be aware of this if you're dynamically restructuring.
*   **Recursive Deletion:** The default `deleteStrategy: 'recursive'` means removing a node also wipes out its entire subtree. If you want to preserve children, consider `"orphan"` or manual reparenting before removal.
*   **Modifying `nodeMap` or `root` Directly:** These are exposed as `Readonly` for a reason. While the underlying objects might be mutable, directly altering the `Map` structure or reassigning `root` can break `useFloatingTree`'s internal state. Stick to the provided methods.

---
---

## The Engine Room: `Tree<T>` Class

While `useFloatingTree` is tailored for floating UI elements, its power comes from a more generic and versatile `Tree<T>` class. This class is the backbone, providing the core tree data structure and manipulation logic. You might even use `Tree<T>` directly for other hierarchical data management needs in your application!

**Overview: What is `Tree<T>`?**

The `Tree<T>` class is a generic, reactive tree data structure.

*   **Generic (`<T>`):** It can hold any type of data in its nodes, as long as you provide it. For `useFloatingTree`, `T` is `FloatingContext`.
*   **Reactive:** Node data, parent/child relationships, and the `nodeMap` are built with Vue's reactivity system (`shallowRef`, `shallowReactive`), so changes automatically propagate where needed.
*   **Full-Featured:** Provides all essential tree operations: adding, removing, moving nodes, traversal, and searching.

---

### API Reference: `Tree<T>`

```typescript
export class Tree<T> {
  readonly root: TreeNode<T>;
  readonly nodeMap: Readonly<Map<string, TreeNode<T>>>;

  constructor(initialRootData: T, options?: TreeOptions);

  findNodeById(id: string): TreeNode<T> | null;
  addNode(data: T, parentId?: string | null, nodeOptions?: TreeNodeOptions<T>): TreeNode<T> | null;
  removeNode(nodeId: string): boolean;
  moveNode(nodeId: string, newParentId: string | null): boolean;
  traverse(strategy?: "dfs" | "bfs", startNode?: TreeNode<T> | null): TreeNode<T>[];
  dispose(): void;
}
```

#### Constructor

*   `constructor(initialRootData: T, options?: TreeOptions)`
    *   **`initialRootData: T`:** The data for the root node of this tree.
    *   **`options?: TreeOptions`:**
        *   `deleteStrategy?: "orphan" | "recursive"`: (Default: `"recursive"`)
            *   `"recursive"`: When a node is removed, all its descendants are also removed from the tree and `nodeMap`.
            *   `"orphan"`: When a node is removed, its children have their `parent` reference set to `null` but remain in the `nodeMap`. They become disconnected subtrees.

#### Properties

*   `root: TreeNode<T>`
    *   **Description:** The root `TreeNode` instance of this tree. It's read-only on the `Tree` instance itself, but the `root.data` can be modified.
*   `nodeMap: Readonly<Map<string, TreeNode<T>>>`
    *   **Description:** A shallowly reactive, read-only map of all node IDs to their `TreeNode<T>` instances. Essential for quick lookups.

#### Methods

*   `findNodeById(id: string): TreeNode<T> | null`
    *   **Description:** Finds a node by its ID.
    *   **Returns:** The `TreeNode<T>` or `null`.

*   `addNode(data: T, parentId: string | null = null, nodeOptions: TreeNodeOptions<T> = {}): TreeNode<T> | null`
    *   **Description:** Creates a new `TreeNode<T>` with the given `data` and adds it as a child to the node specified by `parentId`. If `parentId` is `null` or omitted, adds to the `root`.
    *   **`nodeOptions.id`:** You can suggest an ID. If it's a duplicate, a new one will be generated (with a dev warning).
    *   **Returns:** The new `TreeNode<T>` or `null` if `parentId` is invalid.

*   `removeNode(nodeId: string): boolean`
    *   **Description:** Removes the node with `nodeId`. Behavior towards children depends on `deleteStrategy`.
    *   **Returns:** `true` on success, `false` if node not found or trying to remove root.

*   `moveNode(nodeId: string, newParentId: string | null): boolean`
    *   **Description:** Moves the node `nodeId` to become a child of `newParentId`. If `newParentId` is `null`, it attempts to move it to be a child of the root (though typically, you'd provide `this.root.id`).
    *   **Returns:** `true` on success. `false` for errors (node not found, cyclic move, etc.).

*   `traverse(strategy: "dfs" | "bfs" = "dfs", startNode: TreeNode<T> | null = this.root): TreeNode<T>[]`
    *   **Description:** Performs DFS or BFS traversal starting from `startNode` (defaults to root).
    *   **Returns:** An array of `TreeNode<T>` instances in visited order.

*   `dispose(): void`
    *   **Description:** Clears the `nodeMap`. Call this when the `Tree` instance is no longer needed to help with garbage collection.

---
---

## The Building Blocks: `TreeNode<T>` Class

Each element in your `Tree<T>` (and thus, your `useFloatingTree`) is an instance of `TreeNode<T>`. This class encapsulates the data for a single node and its relationships with its parent and children.

**Overview: What is `TreeNode<T>`?**

A `TreeNode<T>` is a reactive container for your data (`T`) within the tree structure. It holds:

*   A unique `id`.
*   The actual `data` (e.g., `FloatingContext`).
*   Reactive references to its `parent` and `children`.

---

### API Reference: `TreeNode<T>`

```typescript
export class TreeNode<T> {
  readonly id: string;
  data: Ref<T>;
  parent: Ref<TreeNode<T> | null>;
  children: Ref<TreeNode<T>[]>;

  constructor(data: T, parent?: TreeNode<T> | null, options?: TreeNodeOptions<T>, isRoot?: boolean);

  // Primarily internal, prefer Tree's methods for adding/removing
  // addChild(childNode: TreeNode<T>): void;
  // _removeChildInstance(childNode: TreeNode<T>): boolean;

  updateData(newData: Partial<T> | T): void;
  findChild(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null;
  findDescendant(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null;
  isDescendantOf(potentialAncestor: TreeNode<T>): boolean;
  getPath(): TreeNode<T>[];

  get isRoot(): boolean;
  get isLeaf(): boolean;
}
```

#### Constructor

*   `constructor(data: T, parent: TreeNode<T> | null = null, options: TreeNodeOptions<T> = {}, isRoot = false)`
    *   **`data: T`:** The data payload for this node.
    *   **`parent: TreeNode<T> | null`:** The parent node. `null` for the root or orphaned nodes.
    *   **`options?: TreeNodeOptions<T>`:**
        *   `id?: string`: Optional ID. If not provided or duplicate, one is generated by `useId()`.
        *   `children?: T[]`: *(Note: The provided code doesn't seem to use `options.children` in the constructor to auto-create child nodes; `addChild` is used post-construction by the `Tree` class).*
    *   **`isRoot: boolean`:** An internal flag set to `true` by the `Tree` class only for the actual root node.

#### Properties

*   `id: string` (readonly)
    *   **Description:** The unique identifier for this node. Generated if not provided.
*   `data: Ref<T>`
    *   **Description:** A Vue `shallowRef` holding the actual data for this node. You can update it via `node.data.value = ...` or `node.updateData(...)`.
*   `parent: Ref<TreeNode<T> | null>`
    *   **Description:** A Vue `shallowRef` pointing to the parent `TreeNode`, or `null` if it's the root or an orphan.
*   `children: Ref<TreeNode<T>[]>`
    *   **Description:** A Vue `shallowRef` holding an array of its direct child `TreeNode` instances.

#### Methods

*   `updateData(newData: Partial<T> | T)`
    *   **Description:** Updates the node's `data.value`. If `T` is an object and `newData` is a partial object, it performs a shallow merge (`Object.assign`). Otherwise, it replaces the value.
    *   **Example:** `node.updateData({ open: ref(true) });` or `node.data.value.open.value = true;`

*   `findChild(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null`
    *   **Description:** Searches only the *direct children* of this node.
    *   **Returns:** The first child satisfying the `predicate`, or `null`.

*   `findDescendant(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null`
    *   **Description:** Performs a Depth-First Search starting from *this node* (including itself) to find a descendant that satisfies the `predicate`.
    *   **Returns:** The first matching descendant (or self), or `null`.

*   `isDescendantOf(potentialAncestor: TreeNode<T>): boolean`
    *   **Description:** Checks if this node is a descendant of the `potentialAncestor` node by traversing up its parent chain.
    *   **Returns:** `true` if it's a descendant, `false` otherwise.

*   `getPath(): TreeNode<T>[]`
    *   **Description:** Traverses upwards from this node to the root.
    *   **Returns:** An array of `TreeNode<T>` instances representing the path from the root down to (and including) this node. Example: `[root, parentOfParent, parent, thisNode]`.

*   `addChild(childNode: TreeNode<T>): void`
    *   **Description:** (Usually called by `Tree.addNode`) Adds an *existing* `TreeNode` instance to this node's `children` array. Updates reactivity.
*   `_removeChildInstance(childNode: TreeNode<T>): boolean`
    *   **Description:** (Usually called by `Tree.removeNode` or `Tree.moveNode`) Removes a specific `TreeNode` instance from this node's `children` array and sets the child's `parent` to `null`.
    *   **Returns:** `true` if found and removed.

#### Getters

*   `get isRoot(): boolean`
    *   **Description:** Returns `true` if this node was designated as the *true root* during its creation by the `Tree` class. An orphaned node (parent is `null` but `_isRoot` is `false`) will return `false`.
*   `get isLeaf(): boolean`
    *   **Description:** Returns `true` if this node has no children (`children.value.length === 0`).

---
