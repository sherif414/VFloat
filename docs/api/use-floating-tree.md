## useFloatingTree()

Creates a floating tree instance to manage hierarchical UI elements like popovers, tooltips, and menus.

- **Type:**

  ```ts
  function useFloatingTree(
    rootNodeData: FloatingContext,
    options?: FloatingTreeOptions
  ): UseFloatingTreeReturn
  ```

- **Details:**

  Creates a new floating tree instance to manage hierarchical UI elements. The root node anchors your entire floating tree and must include an `id` and reactive `open` state. Options control tree behavior like deletion strategy.

- **Example:**

  ```ts
  const tree = useFloatingTree({ id: "app-root", open: ref(true) }, { deleteStrategy: "recursive" })
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
  const tree = useFloatingTree(rootContext)
  console.log(tree.nodeMap.value.get("node-id")) // Get specific node
  console.log(tree.nodeMap.value.size) // Total node count
  ```

## tree.root

Reference to the root TreeNode instance.

- **Type:**

  ```ts
  readonly root: Readonly<TreeNode<FloatingContext>>
  ```

- **Details:**

  Reference to the root TreeNode instance. This is your entry point to the top of the hierarchy and contains the root data you provided during initialization.

- **Example:**

  ```ts
  const rootNode = tree.root
  console.log(rootNode.children.length) // Number of direct children
  ```

## tree.addNode()

Adds a new floating element to the tree.

- **Type:**

  ```ts
  addNode(data: FloatingContext, parentId?: string | null): TreeNode<FloatingContext> | null
  ```

- **Details:**

  Adds a new floating element to the tree. If `parentId` is `null` or `undefined`, the node becomes a child of the root. Returns the created node or `null` if the parent doesn't exist.

- **Example:**

  ```ts
  // Add as child of root
  const menuData = useFloating(...)
  const menuNode = tree.addNode(menuData)

  // Add as child of specific parent
  const submenuData = useFloating(...)
  const submenuNode = tree.addNode(submenuData, menuNode.id)
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
  // With orphan: removes main-menu, children become root-level
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
    mode: 'dfs' | 'bfs',
    startNode?: TreeNode<FloatingContext>
  ): TreeNode<FloatingContext>[]
  ```

- **Details:**

  Traverses the tree using depth-first search (DFS) or breadth-first search (BFS) and returns nodes in visit order. If no start node is provided, traversal begins from the root.

- **Example:**

  ```ts
  // Depth-first traversal from root
  const allNodes = tree.traverse("dfs")
  allNodes.forEach((node) => console.log(node.id))

  // Breadth-first from specific node
  const menuNode = tree.findNodeById("main-menu")
  const menuBranch = tree.traverse("bfs", menuNode)
  ```

## tree.isTopmost()

Checks if a given open node is the topmost open node in its branch.

- **Type:**

  ```ts
  isTopmost(nodeId: string): boolean
  ```

- **Details:**

  Checks if a given open node is the "highest" open node in its particular branch of the hierarchy. Useful for determining focus management or z-index priorities.

- **Example:**

  ```ts
  // Check which menu should receive focus
  if (tree.isTopmost("submenu")) {
    // This submenu is the topmost open element in its branch
    focusElement("submenu")
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

## tree.forEach()

Executes a callback function on nodes related to a specified target node.

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

  Executes a callback function on nodes related to a specified target node. The `relationship` option determines which nodes are included (defaults to `self-and-children`). Very powerful for bulk operations like closing related menus.

- **Example:**

  ```ts
  // Close all siblings of a node
  tree.forEach(
    "main-menu",
    (node) => {
      node.data.open.value = false
    },
    { relationship: "siblings-only" }
  )

  // Close all descendants
  tree.forEach(
    "main-menu",
    (node) => {
      node.data.open.value = false
    },
    { relationship: "descendants-only" }
  )

  // Apply custom logic to related nodes
  tree.forEach(
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

  const tree = useFloatingTree(rootContext)

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

  Defines the set of nodes to target in the `forEach` method, relative to a given node. Each relationship type specifies a different pattern of node selection for bulk operations.

- **Example:**

  ```ts
  // Different relationship examples
  tree.forEach("main-menu", closeNode, { relationship: "ancestors-only" }) // Close all parents
  tree.forEach("main-menu", closeNode, { relationship: "siblings-only" }) // Close sibling menus
  tree.forEach("main-menu", closeNode, { relationship: "descendants-only" }) // Close all submenus
  tree.forEach("main-menu", closeNode, { relationship: "children-only" }) // Close direct children
  tree.forEach("main-menu", closeNode, { relationship: "full-branch" }) // Close entire branch

  function closeNode(node) {
    node.data.open.value = false
  }
  ```
