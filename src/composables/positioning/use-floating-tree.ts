import { useId } from "@/utils"
import type { Ref } from "vue"
import { computed, shallowReactive, shallowRef } from "vue"
import type {
  AnchorElement,
  FloatingContext,
  FloatingElement,
  UseFloatingOptions,
} from "./use-floating"
import { useFloating } from "./use-floating"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Options for creating a TreeNode
 */
export interface CreateTreeNodeOptions {
  /** Optional ID for the node. If not provided, one will be generated. */
  id?: string
}

/**
 * Options for configuring tree behavior
 */
export interface CreateTreeOptions {
  // Renamed from UseTreeOptions
  /** Strategy for deleting child nodes when a parent is deleted.
   * - 'orphan': Children are detached from the tree (parent becomes null).
   * - 'recursive': Children are also deleted recursively.
   * @default 'recursive'
   */
  deleteStrategy?: "orphan" | "recursive"
}

interface AddNodeOptions extends UseFloatingOptions {
  /**
   * Parent node ID for tree hierarchy.
   * @default undefined
   */
  parentId?: string
}

/**
 * Represents a single node in a tree structure with hierarchical relationships.
 *
 * A TreeNode maintains references to its parent and children, allowing bidirectional
 * traversal of the tree. Each node stores generic data and provides methods for
 * tree navigation and manipulation.
 *
 * @template T The type of data stored in the node
 *
 * @example
 * ```ts
 * const node = createTreeNode({ name: 'Parent' });
 * const childNode = createTreeNode({ name: 'Child' }, node);
 * node.addChild(childNode);
 * ```
 */
export interface TreeNode<T> {
  /**
   * Unique identifier for this node
   */
  readonly id: string
  /**
   * The data stored in this node
   */
  readonly data: T
  /**
   * Reference to the parent node, or null if this is the root
   */
  readonly parent: Ref<TreeNode<T> | null>
  /**
   * Array of child nodes
   */
  readonly children: Ref<TreeNode<T>[]>
  /**
   * Whether this node is the root of the tree
   */
  readonly isRoot: boolean
  /**
   * Computed property indicating whether this node has no children
   */
  readonly isLeaf: Readonly<Ref<boolean>>
  /**
   * Adds a child node to this node's children array
   */
  addChild: (childNode: TreeNode<T>) => void
  /**
   * Internal method to remove a child instance from this node
   */
  _removeChildInstance: (childNode: TreeNode<T>) => boolean
  /**
   * Finds the first immediate child matching the predicate
   */
  findChild: (predicate: (node: TreeNode<T>) => boolean) => TreeNode<T> | null
  /**
   * Recursively finds the first descendant matching the predicate
   */
  findDescendant: (predicate: (node: TreeNode<T>) => boolean) => TreeNode<T> | null
  /**
   * Checks if this node is a descendant of the given ancestor
   */
  isDescendantOf: (potentialAncestor: TreeNode<T>) => boolean
  /**
   * Returns the path from root to this node (inclusive)
   */
  getPath: () => TreeNode<T>[]
}

/**
 * Core tree data structure for managing hierarchical node relationships.
 *
 * Provides methods for adding, removing, moving, and traversing nodes.
 * Maintains a root node and a map of all nodes for efficient lookups.
 * Supports both orphaning and recursive deletion strategies.
 *
 * @template T The type of data stored in tree nodes
 *
 * @example
 * ```ts
 * const tree = createTree<{ name: string }>();
 * const child = tree.addNode({ name: 'Child' }, tree.root?.id);
 * tree.traverse('dfs'); // Get all nodes in depth-first order
 * ```
 */
export interface Tree<T> {
  /**
   * The root node of the tree, or null if empty
   */
  readonly root: TreeNode<T> | null
  /**
   * Read-only map of all nodes indexed by their ID for O(1) lookups
   */
  readonly nodeMap: Readonly<Map<string, TreeNode<T>>>
  /**
   * Finds a node by its ID anywhere in the tree
   */
  findNodeById: (id: string) => TreeNode<T> | null
  /**
   * Adds a new node to the tree as a child of the specified parent
   */
  addNode: (
    data: T,
    parentId?: string | null,
    nodeOptions?: CreateTreeNodeOptions
  ) => TreeNode<T> | null
  /**
   * Removes a node from the tree using the specified deletion strategy
   */
  removeNode: (nodeId: string, deleteStrategy?: "orphan" | "recursive") => boolean
  /**
   * Moves a node to become a child of a different parent
   */
  moveNode: (nodeId: string, newParentId: string | null) => boolean
  /**
   * Traverses the tree using DFS or BFS strategy, optionally starting from a specific node
   */
  traverse: (strategy?: "dfs" | "bfs", startNode?: TreeNode<T> | null) => TreeNode<T>[]
  /**
   * Clears all nodes from the tree to allow garbage collection
   */
  dispose: () => void
}

/**
 * Configuration options for the floating tree
 */
export interface FloatingTreeOptions extends CreateTreeOptions {}

/**
 * Return type for the useFloatingTree composable.
 *
 * Extends the base Tree interface with floating-specific methods for managing
 * a hierarchical tree of floating UI elements. Each node wraps a FloatingContext
 * and provides methods to query and manipulate open states across the tree.
 *
 * @example
 * ```ts
 * const tree = useFloatingTree();
 * const childNode = tree.addNode(anchorEl, floatingEl, { parentId: tree.root?.id });
 * const deepest = tree.getDeepestOpenNode();
 * tree.applyToNodes(childNode.id, (node) => node.data.setOpen(false), {
 *   relationship: 'descendants-only'
 * });
 * ```
 */
export interface UseFloatingTreeReturn
  extends Omit<Tree<FloatingContext>, "addNode" | "root"> {
  /**
   * The root node of the floating tree
   */
  root: TreeNode<FloatingContext> | null
  /**
   * Adds a new floating element node to the tree with the specified anchor and floating elements
   */
  addNode: (
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options?: AddNodeOptions
  ) => TreeNode<FloatingContext> | null
  /**
   * Returns an array of all nodes that are currently open
   */
  getAllOpenNodes: () => TreeNode<FloatingContext>[]
  /**
   * Returns the deepest (most nested) open node in the tree, or null if none are open
   */
  getDeepestOpenNode: () => TreeNode<FloatingContext> | null
  /**
   * Executes a provided function once for each tree node that matches the specified relationship.
   * This is a flexible iteration method that can target nodes based on their relationship to a target node.
   *
   * @param nodeId - The ID of the target node used as a reference point for the relationship
   * @param callback - A function to execute for each matching node
   * @param options - Configuration options for the iteration behavior
   */
  applyToNodes: (
    nodeId: string,
    callback: (node: TreeNode<FloatingContext>) => void,
    options?: {
      relationship?: NodeRelationship
      applyToMatching?: boolean
    }
  ) => void
}

/**
 * Predefined node relationship strategies used for filtering nodes.
 */
type NodeRelationship =
  | "ancestors-only" // Only the target's ancestors
  | "siblings-only" // Only the siblings of the target
  | "descendants-only" // Only the descendants of the target
  | "children-only" // Only the target's immediate children
  | "self-and-ancestors" // The target and its ancestors
  | "self-and-children" // The target and its immediate children
  | "self-and-descendants" // The target and all its descendants
  | "self-and-siblings" // The target and its siblings
  | "self-ancestors-and-children" // The target, its ancestors, and its immediate children
  | "full-branch" // The entire branch (target, ancestors, and all descendants)
  | "all-except-branch" // All nodes except the branch (inverse of full-branch)

/**
 * Action to perform on each node that matches the filter criteria
 */
type NodeActionFn = (node: TreeNode<FloatingContext>) => void

/**
 * Options for the applyToNodes function
 */
interface FilterNodesOptions {
  /** The relationship to use for filtering nodes based on their relationship to the target */
  relationship?: NodeRelationship
  /** Whether to apply the action to matching nodes (true) or non-matching nodes (false) */
  applyToMatching?: boolean
}

//=======================================================================================
// 📌 useFloatingTree
//=======================================================================================

/**
 * Creates and manages a hierarchical tree of floating elements.
 *
 * Each node in the tree is assigned a stable ID. For non-root nodes, `addNode` generates
 * the ID and injects it into the created FloatingContext (passed to `useFloating`).
 * Consumers should not provide a custom `id` in `UseFloatingOptions` when using `addNode`;
 * it will be ignored in favor of the generated one.
 *
 * @param treeOptions - Options for tree behavior
 * @returns UseFloatingTreeReturn with tree management methods and root context
 */
export function useFloatingTree(treeOptions: FloatingTreeOptions = {}): UseFloatingTreeReturn {
  let tree!: Tree<FloatingContext>
  tree = createTree<FloatingContext>(treeOptions)

  const applyToNodes = (
    nodeId: string,
    callback: NodeActionFn,
    options: FilterNodesOptions = {}
  ): void => {
    const { relationship = "self-and-children", applyToMatching = true } = options
    const targetNode = tree.findNodeById(nodeId)
    if (!targetNode) {
      return
    }

    const relevantNodes: TreeNode<FloatingContext>[] = []
    const relevantNodeIds = new Set<string>() // For quick lookups and deduplication

    const addNodeToRelevant = (node: TreeNode<FloatingContext> | null) => {
      if (node && !relevantNodeIds.has(node.id)) {
        relevantNodes.push(node)
        relevantNodeIds.add(node.id)
      }
    }

    const addNodesToRelevant = (nodes: (TreeNode<FloatingContext> | null)[]) => {
      for (const node of nodes) {
        addNodeToRelevant(node)
      }
    }

    if (relationship === "ancestors-only") {
      for (const ancestor of targetNode.getPath()) {
        if (ancestor.id !== targetNode.id) {
          addNodeToRelevant(ancestor)
        }
      }
    } else if (relationship === "siblings-only") {
      if (targetNode.parent.value) {
        for (const sibling of targetNode.parent.value.children.value) {
          if (sibling.id !== targetNode.id) {
            addNodeToRelevant(sibling)
          }
        }
      }
    } else if (relationship === "descendants-only") {
      for (const descendant of tree.traverse("dfs", targetNode)) {
        if (descendant.id !== targetNode.id) {
          addNodeToRelevant(descendant)
        }
      }
    } else if (relationship === "children-only") {
      addNodesToRelevant(targetNode.children.value)
    } else if (relationship === "self-and-ancestors") {
      addNodesToRelevant(targetNode.getPath())
    } else if (relationship === "self-and-children") {
      addNodeToRelevant(targetNode)
      addNodesToRelevant(targetNode.children.value)
    } else if (relationship === "self-and-descendants") {
      addNodesToRelevant(tree.traverse("dfs", targetNode))
    } else if (relationship === "self-and-siblings") {
      addNodeToRelevant(targetNode)
      if (targetNode.parent.value) {
        addNodesToRelevant(targetNode.parent.value.children.value)
      }
    } else if (relationship === "self-ancestors-and-children") {
      addNodesToRelevant(targetNode.getPath())
      addNodesToRelevant(targetNode.children.value)
    } else if (relationship === "full-branch") {
      addNodesToRelevant(targetNode.getPath())
      addNodesToRelevant(tree.traverse("dfs", targetNode))
    } else if (relationship === "all-except-branch") {
      const branchNodes = new Set<string>()
      for (const n of targetNode.getPath()) {
        branchNodes.add(n.id)
      }
      for (const n of tree.traverse("dfs", targetNode)) {
        branchNodes.add(n.id)
      }

      for (const node of tree.nodeMap.values()) {
        const isMatch = !branchNodes.has(node.id)
        if (isMatch === applyToMatching) {
          callback(node)
        }
      }
      return // Exit early as iteration and callback are handled
    } else {
      // Default case for unknown relationship
      console.warn(`applyToNodes: Unknown relationship "${relationship}".`)
      return
    }

    // Apply the callback based on applyToMatching
    if (applyToMatching) {
      for (const node of relevantNodes) {
        callback(node)
      }
    } else {
      for (const node of tree.nodeMap.values()) {
        if (!relevantNodeIds.has(node.id)) {
          callback(node)
        }
      }
    }
  }

  /**
   * Retrieves a list of all currently open nodes in the tree.
   *
   * @returns An array of TreeNodes whose associated floating elements are open.
   */
  const getAllOpenNodes = (): TreeNode<FloatingContext>[] => {
    const openNodes: TreeNode<FloatingContext>[] = []
    for (const node of tree.nodeMap.values()) {
      if (node.data.open.value) {
        openNodes.push(node)
      }
    }
    return openNodes
  }

  /**
   * Retrieves the deepest (most nested) open node in the tree.
   *
   * Finds the open node with the greatest nesting depth. If multiple nodes
   * are open at the same depth, returns the last one encountered.
   *
   * @returns The deepest open node, or null if no nodes are open.
   */
  const getDeepestOpenNode = (): TreeNode<FloatingContext> | null => {
    let deepestNode: TreeNode<FloatingContext> | null = null
    let maxLevel = -1

    for (const node of tree.nodeMap.values()) {
      if (node.data.open.value) {
        const level = node.getPath().length
        if (level > maxLevel) {
          maxLevel = level
          deepestNode = node
        }
      }
    }

    return deepestNode
  }

  const addNode = (
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options: AddNodeOptions = {}
  ): TreeNode<FloatingContext> | null => {
    // A new stable ID is generated here and applied to both the tree node and the floating context.
    // Any `options.id` from UseFloatingOptions is ignored for consistency.
    const { parentId, ...floatingOptions } = options

    const nodeId = useId()
    const userOnOpenChange = floatingOptions.onOpenChange
    const context = useFloating(anchorEl, floatingEl, {
      ...floatingOptions,
      id: nodeId,
      onOpenChange: (open, reason, event) => {
        userOnOpenChange?.(open, reason, event)
        if (!open) {
          const currentNode = tree.findNodeById(nodeId)
          if (currentNode) {
            const children = currentNode.children.value
            for (const child of children) {
              if (child.data.open.value) {
                child.data.setOpen(false, "tree-ancestor-close", event)
              }
            }
          }
        }
      },
    })
    const newNode = tree.addNode(context, parentId, { id: nodeId })

    return newNode
  }

  return {
    ...tree,
    get root() {
      return tree.root
    },
    addNode,
    getAllOpenNodes,
    getDeepestOpenNode,
    applyToNodes,
  }
}

//=======================================================================================
// 📌 TreeNode Factory Function
//=======================================================================================

/**
 * Creates a reactive tree node with data, parent reference, and children references.
 * @param data The data to store in the node
 * @param parent The parent node, or null for root nodes
 * @param options Configuration options for the node
 * @param isRoot Whether this node is the true root of a tree
 * @returns A reactive tree node object with methods and reactive properties
 */
export function createTreeNode<T>(
  data: T,
  parent: TreeNode<T> | null = null,
  options: CreateTreeNodeOptions = {},
  isRoot = false
): TreeNode<T> {
  const id = options.id ?? useId()
  const parentRef = shallowRef(parent)
  const childrenRef = shallowRef<TreeNode<T>[]>([])

  const isLeaf = computed(() => childrenRef.value.length === 0)

  // Create the node object first to avoid circular references
  const node: TreeNode<T> = {
    id,
    data,
    parent: parentRef,
    children: childrenRef,
    isRoot,
    isLeaf,
    addChild: (childNode: TreeNode<T>): void => {
      childrenRef.value = [...childrenRef.value, childNode]
    },
    _removeChildInstance: (childNode: TreeNode<T>): boolean => {
      if (!childrenRef.value.includes(childNode)) return false
      childrenRef.value = childrenRef.value.filter((node) => node.id !== childNode.id)
      childNode.parent.value = null // Break the parent link reactively
      return true
    },
    findChild: (predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null => {
      return childrenRef.value.find(predicate) ?? null
    },
    findDescendant: (predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null => {
      const stack: TreeNode<T>[] = [node]

      while (stack.length > 0) {
        const currentNode = stack.pop()!
        if (predicate(currentNode)) {
          return currentNode
        }
        // Add children in reverse order for pre-order DFS via pop()
        for (let i = currentNode.children.value.length - 1; i >= 0; i--) {
          stack.push(currentNode.children.value[i])
        }
      }
      return null
    },
    isDescendantOf: (potentialAncestor: TreeNode<T>): boolean => {
      let currentParent = parentRef.value
      while (currentParent) {
        if (currentParent.id === potentialAncestor.id) {
          return true
        }
        currentParent = currentParent.parent.value
      }
      return false
    },
    getPath: (): TreeNode<T>[] => {
      const path: TreeNode<T>[] = []
      let currentNode: TreeNode<T> | null = node

      while (currentNode) {
        path.push(currentNode)
        currentNode = currentNode.parent.value
      }
      return path.reverse() // Reverse to get root -> node order
    },
  }

  return Object.freeze(node)
}

//=======================================================================================
// 📌 Tree Factory Function
//=======================================================================================

/**
 * Creates and manages a reactive tree structure.
 *
 * This factory function provides a complete tree data structure with reactive nodes,
 * supporting operations like adding, removing, and moving nodes, as well as
 * traversal and search functionality.
 *
 * @template T The type of data stored in the tree nodes.
 * @param options Configuration options for the tree behavior.
 * @returns A tree management object with methods and reactive properties
 *
 * @example
 * ```ts
 * const myTree = createTree<{ name: string }>();
 * const childNode = myTree.addNode({ name: 'Child' }, myTree.root?.id);
 * ```
 */
export function createTree<T>(options?: CreateTreeOptions): Tree<T> {
  const deleteStrategy = options?.deleteStrategy ?? "recursive"
  const nodeMap = shallowReactive(new Map<string, TreeNode<T>>())
  let root: TreeNode<T> | null = null

  /**
   * Finds a node anywhere in the tree by its ID.
   * @param id The ID of the node to find.
   * @returns The node if found, otherwise null.
   */
  const findNodeById = (id: string): TreeNode<T> | null => {
    return nodeMap.get(id) ?? null
  }

  /**
   * Adds a new node to the tree.
   * @param data The data for the new node.
   * @param parentId The ID of the parent node. If null or undefined, adds to the root.
   * @param nodeOptions Optional configuration for the new node (e.g., custom ID).
   * @returns The newly created TreeNode, or null if the parent was not found.
   */
  const addNode = (
    data: T,
    parentId: string | null = null,
    nodeOptions: CreateTreeNodeOptions = {}
  ): TreeNode<T> | null => {
    // If root doesn't exist, the first node added becomes the root.
    if (!root) {
      if (parentId != null) {
        console.error(
          `Tree addNode: Cannot add a non-root node before a root exists. Received parentId=${parentId}.`
        )
        return null
      }
      const newRoot = createTreeNode<T>(data, null, nodeOptions, true)
      nodeMap.set(newRoot.id, newRoot)
      root = newRoot
      return newRoot
    }

    const parentNode = parentId ? findNodeById(parentId) : root
    if (!parentNode) {
      console.error(`Tree addNode: Parent node with ID ${parentId} not found.`)
      return null
    }

    // Ensure child ID is unique if provided, otherwise generate
    if (nodeOptions.id && nodeMap.has(nodeOptions.id)) {
      if (import.meta.env.DEV) {
        console.warn(`Tree addNode: ID ${nodeOptions.id} already exists. Generating a new one.`)
      }
      nodeOptions.id = undefined
    }

    const newNode = createTreeNode<T>(data, parentNode, nodeOptions)
    nodeMap.set(newNode.id, newNode)
    parentNode.addChild(newNode)
    return newNode
  }

  /**
   * Removes a node from the tree by its ID.
   * Handles deletion of descendants based on the provided strategy or the tree's default.
   * @param nodeId The ID of the node to remove.
   * @param deleteStrategy Optional strategy override. If not provided, uses the tree's default strategy.
   * @returns True if the node was successfully removed, false otherwise.
   */
  const removeNode = (nodeId: string, strategyOverride?: "orphan" | "recursive"): boolean => {
    const strategy = strategyOverride ?? deleteStrategy

    const nodeToRemove = findNodeById(nodeId)
    if (!nodeToRemove) {
      return false
    }
    if (nodeToRemove.isRoot) {
      console.error("Tree removeNode: Cannot remove the root node.")
      return false
    }

    const parent = nodeToRemove.parent.value!

    // 1. Handle children based on strategy
    if (strategy === "recursive") {
      // Cleanup children (removes from map)
      cleanupNodeRecursive(nodeToRemove)
    } else {
      // 'orphan'
      // Detach children from the node being removed
      for (const child of nodeToRemove.children.value) {
        child.parent.value = null // Orphan the children
        // Note: Orphans remain in the map unless explicitly removed later.
      }
      nodeToRemove.children.value = [] // Clear children array of the removed node
      nodeMap.delete(nodeToRemove.id)
    }

    // 2. Remove node from its parent's children array
    return parent._removeChildInstance(nodeToRemove)
  }

  /**
   * Moves a node to become a child of a new parent.
   * @param nodeId The ID of the node to move.
   * @param newParentId The ID of the new parent node. Set to null to move to the root level.
   * @returns True if the node was successfully moved, false otherwise.
   */
  const moveNode = (nodeId: string, newParentId: string | null): boolean => {
    const nodeToMove = findNodeById(nodeId)
    if (!nodeToMove) {
      console.error(`Tree moveNode: Node with ID ${nodeId} not found.`)
      return false
    }
    if (nodeToMove.isRoot) {
      console.error("Tree moveNode: Cannot move the root node.")
      return false
    }
    if (nodeId === newParentId) {
      console.error("Tree moveNode: Cannot move a node to be a child of itself.")
      return false
    }

    const newParent = newParentId ? findNodeById(newParentId) : root
    if (!newParent) {
      console.error(`Tree moveNode: New parent node with ID ${newParentId} not found.`)
      return false
    }

    // Check for cyclic move (moving a node into one of its own descendants)
    if (newParent.isDescendantOf(nodeToMove)) {
      console.error("Tree moveNode: Cannot move a node to become its own descendant.")
      return false
    }

    const oldParent = nodeToMove.parent.value

    // 1. Remove from old parent if it exists
    if (oldParent) {
      if (!oldParent._removeChildInstance(nodeToMove)) {
        console.error("Tree moveNode: Failed to remove node from its original parent.")
        return false // Indicates an inconsistency
      }
    } else if (!nodeToMove.isRoot) {
      // If it's an orphan (not root and no parent), it's okay to proceed to re-parent it.
      // No removal needed from a non-existent parent.
    } else if (nodeToMove.isRoot) {
      // This case should have been caught earlier, but as a safeguard:
      console.error("Tree moveNode: Attempting to move the root node, which is not allowed.")
      return false
    }

    // 2. Add to new parent
    newParent.addChild(nodeToMove)

    // 3. Update node's parent reference
    nodeToMove.parent.value = newParent

    return true
  }

  /**
   * Traverses the tree using either Depth-First Search (DFS) or Breadth-First Search (BFS).
   * @param strategy The traversal strategy ('dfs' or 'bfs'). Defaults to 'dfs'.
   * @param startNode The node to start traversal from. Defaults to the root node.
   * @returns An array of nodes in the order they were visited.
   *
   * Ordering guarantee:
   * - The returned array will always begin with the provided `startNode` (the target node),
   *   regardless of whether `strategy` is 'dfs' or 'bfs'.
   * - When `startNode` is omitted, traversal begins at the root and the first element will be `root`.
   */
  const traverse = (
    strategy: "dfs" | "bfs" = "dfs",
    startNode: TreeNode<T> | null = root // Allow potentially null startNode
  ): TreeNode<T>[] => {
    const result: TreeNode<T>[] = []
    if (!startNode) {
      // If startNode is explicitly null or root was somehow nullified
      console.warn("Tree traverse: Start node is null, returning empty array.")
      return result
    }

    if (strategy === "dfs") {
      const stack: TreeNode<T>[] = [startNode]
      while (stack.length > 0) {
        const node = stack.pop()!
        result.push(node)
        // Add children in reverse for pre-order pop()
        for (let i = node.children.value.length - 1; i >= 0; i--) {
          stack.push(node.children.value[i])
        }
      }
    } else {
      // bfs
      const queue: TreeNode<T>[] = [startNode]
      while (queue.length > 0) {
        const node = queue.shift()!
        result.push(node)
        for (const child of node.children.value) {
          queue.push(child)
        }
      }
    }
    return result
  }

  /**
   * Clears the internal node map. This is crucial for allowing garbage collection
   * when the Tree instance is no longer needed, especially in scenarios like
   * Vue components where the instance might be tied to the component lifecycle.
   * Call this method when you are finished with the Tree instance (e.g., in `onScopeDispose`).
   */
  const dispose = (): void => {
    nodeMap.clear()
  }

  // --- Internal Recursive Helper for Deletion/Cleanup ---
  const cleanupNodeRecursive = (node: TreeNode<T>): void => {
    // Recursively cleanup children first (Post-order)
    // Iterate over a copy of the array in case of modifications? Shallow copy is enough here.
    const childrenCopy = [...node.children.value]
    for (const child of childrenCopy) {
      cleanupNodeRecursive(child) // This will handle removal from map
    }
    // Cleanup the node itself (remove from map)
    nodeMap.delete(node.id)
    // Explicitly clear children array after recursive cleanup
    node.children.value = []
  }

  return Object.freeze({
    get root() {
      return root
    },
    get nodeMap() {
      return nodeMap
    },
    findNodeById,
    addNode,
    removeNode,
    moveNode,
    traverse,
    dispose,
  })
}
