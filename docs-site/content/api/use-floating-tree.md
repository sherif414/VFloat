## useFloatingTree()

Creates and manages a hierarchical tree of floating elements.

- **Type:**

  ```ts
  function useFloatingTree(
    treeOptions?: FloatingTreeOptions
  ): UseFloatingTreeReturn
  ```

- **Details:**

  Creates a new floating tree instance for managing hierarchical floating UI elements. The tree starts empty and you add nodes using the `addNode()` method. Each node wraps a `FloatingContext` created internally.

- **Example:**

```ts
const tree = useFloatingTree({ deleteStrategy: 'recursive' })

// Add root node
const root = tree.addNode(rootAnchorEl, rootFloatingEl, {
  placement: 'bottom-start'
})

// Add child node
const child = tree.addNode(childAnchorEl, childFloatingEl, {
  parentId: root?.id,
  placement: 'right-start'
})
```

**See also:** [Guide - Managing Floating UI Hierarchies](/guide/floating-ui/hierarchies)

## tree.nodeMap

A reactive map containing all nodes in the tree, keyed by their IDs.

- **Type:**

  ```ts
  readonly nodeMap: Readonly<Map<string, TreeNode<FloatingContext>>>
  ```

- **Details:**

  A reactive map of all nodes in the tree, keyed by ID. Internally, it's a `shallowReactive` Map. Useful for debugging or direct node access, but prefer using the provided methods for most operations.

- **Example:**

  ```ts
  const tree = useFloatingTree({ deleteStrategy: "recursive" })
  console.log(tree.nodeMap.get("node-id")) // Get specific node
  console.log(tree.nodeMap.size) // Total node count
  ```

## tree.root

Reference to the root TreeNode instance.

- **Type:**

  ```ts
  readonly root: TreeNode<FloatingContext> | null
  ```

- **Details:**

  Reference to the root TreeNode instance, or `null` if no nodes have been added yet. This is your entry point to the top of the hierarchy and contains the floating context of the root element.

- **Example:**

  ```ts
  const tree = useFloatingTree()
  const root = tree.addNode(rootAnchorEl, rootFloatingEl)
  
  if (tree.root) {
    console.log(tree.root.children.value.length) // Number of direct children
    console.log(tree.root.data.open.value) // Check if root is open
  }
  ```

## tree.addNode()

Adds a new floating element to the tree by creating its context internally.

- **Type:**

  ```ts
  addNode(
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options?: AddNodeOptions
  ): TreeNode<FloatingContext> | null
  ```

- **Details:**

  Adds a new floating element to the tree by internally creating a floating context using the provided anchor and floating elements. The `parentId` can be specified in the options to determine the parent node. If `parentId` is not provided, the node becomes a child of the root. Returns the created node or `null` if the parent doesn't exist.
  
  The node is assigned a stable ID automatically. When a parent node closes, all its open descendants are automatically closed with the reason `"tree-ancestor-close"`.

- **Example:**

  ```ts
  const tree = useFloatingTree()
  
  // Add root node
  const menuNode = tree.addNode(menuAnchorEl, menuFloatingEl, {
    placement: "bottom-start",
    open: ref(false)
  })

  // Add as child of specific parent using parentId
  const submenuNode = tree.addNode(submenuAnchorEl, submenuFloatingEl, {
    placement: "right-start",
    open: ref(false),
    parentId: menuNode?.id
  })
  
  // Access the floating context of the created node
  if (submenuNode) {
    const { floatingStyles } = submenuNode.data
  }
  ```

## TreeNode structure

Nodes returned by `tree.addNode()`, `tree.findNodeById()`, and traversal helpers are reactive objects with the following shape:

<!-- @tsdoc src="src/composables/use-floating-tree.ts" symbol="TreeNode" kind="interface" -->

### TreeNode example

```ts
const submenuNode = tree.addNode(submenuAnchorEl, submenuFloatingEl, { parentId: menuNode.id })

if (submenuNode) {
  // Access floating context
  submenuNode.data.open.value = true

  // Inspect hierarchy
  const parentId = submenuNode.parent.value?.id
  const descendantIds = submenuNode.children.value.map((child) => child.id)

  // Work with the path from root → submenu
  const path = submenuNode.getPath().map((node) => node.id)
}
```

## tree.removeNode()

Removes a node from the tree by its ID.

- **Type:**

  ```ts
  removeNode(nodeId: string, deleteStrategy?: "orphan" | "recursive"): boolean
  ```

- **Details:**

  Removes a node from the tree by its ID. Handles deletion of descendants based on the provided strategy or the tree's default. Returns `true` if successful.

- **Example:**

  ```ts
  const success = tree.removeNode("main-menu")
  // With recursive: removes main-menu and all children
  // With orphan: removes main-menu; children become orphans (no parent)
  console.log(success) // true if node existed and was removed

  // Override with 'orphan' strategy
  const successOrphan = tree.removeNode("other-menu", "orphan")
  console.log(successOrphan) // true if node existed and was removed
  ```

## tree.moveNode()

Moves an existing node to a new parent within the tree.

- **Type:**

  ```ts
  moveNode(nodeId: string, newParentId: string | null): boolean
  ```

- **Details:**

  Moves an existing node to a new parent within the tree. The node maintains all its children and data, but changes its position in the hierarchy. Returns `true` if successful.

- **Example:**

  ```ts
  // Move submenu from main-menu to different parent
  const moved = tree.moveNode("submenu", "other-menu")
  if (moved) {
    console.log("Submenu successfully moved")
  }

  // Move a node to be a direct child of the root
  tree.moveNode("node-id", null)
  ```

## tree.findNodeById()

Locates and returns a specific node by its ID.

- **Type:**

  ```ts
  findNodeById(nodeId: string): TreeNode<FloatingContext> | null
  ```

- **Details:**

  Quickly locates and returns a specific node by its ID. Returns `null` if no node with the given ID exists in the tree.

- **Example:**

  ```ts
  const menuNode = tree.findNodeById("main-menu")
  if (menuNode) {
    console.log(menuNode.data.open.value) // Check if open
    console.log(menuNode.parent?.id) // Parent ID
    console.log(menuNode.children.length) // Child count
  }
  ```

## tree.traverse()

Traverses the tree using depth-first or breadth-first search.

- **Type:**

  ```ts
  traverse(
    strategy?: 'dfs' | 'bfs',
    startNode?: TreeNode<FloatingContext> | null
  ): TreeNode<FloatingContext>[]
  ```

- **Details:**

  Traverses the tree using depth-first search (DFS) or breadth-first search (BFS) and returns nodes in visit order. If no start node is provided, traversal begins from the root. Defaults to DFS strategy.

  Ordering guarantee:
  - The returned array always begins with the provided `startNode` (target node), for both `dfs` and `bfs` modes.
  - When `startNode` is omitted, the first element will be the `root` node.

- **Example:**

  ```ts
  // Depth-first traversal from root
  const allNodes = tree.traverse("dfs")
  allNodes.forEach((node) => console.log(node.id))

  // Breadth-first from specific node
  const menuNode = tree.findNodeById("main-menu")
  const menuBranch = tree.traverse("bfs", menuNode)
  ```

## tree.getDeepestOpenNode()

Returns the deepest (most nested) open node in the tree.

- **Type:**

  ```ts
  getDeepestOpenNode(): TreeNode<FloatingContext> | null
  ```

- **Details:**

  Finds and returns the open node with the greatest nesting depth. If multiple nodes are open at the same depth, returns the last one encountered. Returns `null` if no nodes are open.

- **Example:**

  ```ts
  const deepest = tree.getDeepestOpenNode()
  if (deepest) {
    console.log(`Deepest open node: ${deepest.id}`)
    console.log(`Nesting level: ${deepest.getPath().length}`)
  }
  ```

## tree.getAllOpenNodes()

Retrieves all currently open nodes in the tree.

- **Type:**

  ```ts
  getAllOpenNodes(): TreeNode<FloatingContext>[]
  ```

- **Details:**

  Retrieves all nodes in the entire tree whose `open` state is currently `true`. Returns an array of open nodes regardless of their position in the hierarchy.

- **Example:**

  ```ts
  const openNodes = tree.getAllOpenNodes()
  console.log(`${openNodes.length} elements are currently open`)

  openNodes.forEach((node) => {
    console.log(`${node.id} is open`)
  })
  ```

## tree.applyToNodes()

Executes a callback function on nodes related to a specified target node.

- **Type:**

  ```ts
  applyToNodes(
    nodeId: string,
    callback: (node: TreeNode<FloatingContext>) => void,
    options?: {
      relationship?: NodeRelationship
      applyToMatching?: boolean
    }
  ): void
  ```

- **Details:**

  Executes a callback function on nodes related to a specified target node. The `relationship` option determines which nodes are included (defaults to `self-and-children`). Very powerful for bulk operations like closing related menus.

- **Example:**

  ```ts
  // Close all siblings of a node
  tree.applyToNodes(
    "main-menu",
    (node) => {
      node.data.open.value = false
    },
    { relationship: "siblings-only" }
  )

  // Close all descendants
  tree.applyToNodes(
    "main-menu",
    (node) => {
      node.data.open.value = false
    },
    { relationship: "descendants-only" }
  )

  // Apply custom logic to related nodes
  tree.applyToNodes(
    "user-menu",
    (node) => {
      if (node.data.disabled) {
        node.data.open.value = false
      }
    },
    { relationship: "self-and-descendants" }
  )
  ```

## tree.dispose()

Cleans up the tree instance and prevents memory leaks.

- **Type:**

  ```ts
  dispose(): void
  ```

- **Details:**

  Cleans up the tree instance by clearing the internal node map and breaking references. Should be called when the component unmounts to prevent memory leaks.

- **Example:**

  ```ts
  import { onUnmounted } from "vue"

  const tree = useFloatingTree()

  onUnmounted(() => {
    tree.dispose()
  })
  ```

### NodeRelationship

Defines the set of nodes to target relative to a given node.

- **Type:**

  ```ts
  type NodeRelationship =
    | "ancestors-only"
    | "siblings-only"
    | "descendants-only"
    | "children-only"
    | "self-and-ancestors"
    | "self-and-children"
    | "self-and-descendants"
    | "self-and-siblings"
    | "self-ancestors-and-children"
    | "full-branch"
    | "all-except-branch"
  ```

- **Details:**

  Defines the set of nodes to target in the `applyToNodes` method, relative to a given node. Each relationship type specifies a different pattern of node selection for bulk operations.

  ```ts
  // Different relationship examples
  tree.applyToNodes("main-menu", closeNode, { relationship: "ancestors-only" }) // Close all parents
  tree.applyToNodes("main-menu", closeNode, { relationship: "siblings-only" }) // Close sibling menus
  tree.applyToNodes("main-menu", closeNode, { relationship: "descendants-only" }) // Close all submenus
  tree.applyToNodes("main-menu", closeNode, { relationship: "children-only" }) // Close direct children
  tree.applyToNodes("main-menu", closeNode, { relationship: "full-branch" }) // Close entire branch

  function closeNode(node) {
    node.data.open.value = false
  }
  ```
