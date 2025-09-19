import type { Ref } from "vue"
import { computed, shallowReactive, shallowRef } from "vue"
import { useId } from "@/utils"
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

// Removed UseTreeReturn interface as the class itself serves this purpose

export interface TreeNode<T> {
  readonly id: string
  readonly data: T
  readonly parent: Ref<TreeNode<T> | null>
  readonly children: Ref<TreeNode<T>[]>
  readonly isRoot: boolean
  readonly isLeaf: Readonly<Ref<boolean>>
  addChild: (childNode: TreeNode<T>) => void
  _removeChildInstance: (childNode: TreeNode<T>) => boolean
  findChild: (predicate: (node: TreeNode<T>) => boolean) => TreeNode<T> | null
  findDescendant: (predicate: (node: TreeNode<T>) => boolean) => TreeNode<T> | null
  isDescendantOf: (potentialAncestor: TreeNode<T>) => boolean
  getPath: () => TreeNode<T>[]
}

export interface Tree<T> {
  readonly root: TreeNode<T>
  readonly nodeMap: Readonly<Map<string, TreeNode<T>>>
  findNodeById: (id: string) => TreeNode<T> | null
  addNode: (
    data: T,
    parentId?: string | null,
    nodeOptions?: CreateTreeNodeOptions
  ) => TreeNode<T> | null
  removeNode: (nodeId: string, deleteStrategy?: "orphan" | "recursive") => boolean
  moveNode: (nodeId: string, newParentId: string | null) => boolean
  traverse: (strategy?: "dfs" | "bfs", startNode?: TreeNode<T> | null) => TreeNode<T>[]
  dispose: () => void
}

/**
 * Configuration options for the floating tree
 */
export interface FloatingTreeOptions extends CreateTreeOptions {}

export interface UseFloatingTreeReturn extends Omit<Tree<FloatingContext>, "addNode"> {
  addNode: (
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options?: UseFloatingOptions
  ) => TreeNode<FloatingContext> | null
  getAllOpenNodes: () => TreeNode<FloatingContext>[]
  getTopmostOpenNode: () => TreeNode<FloatingContext> | null
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
 * Options for the filterNodes function
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
 * @param anchorEl - The anchor element for the root floating context
 * @param floatingEl - The floating element for the root floating context
 * @param options - Options for the root floating context
 * @param treeOptions - Options for tree behavior
 * @returns UseFloatingTreeReturn with tree management methods and root context
 */
export function useFloatingTree(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options: UseFloatingOptions = {},
  treeOptions: FloatingTreeOptions = {}
): UseFloatingTreeReturn {
  const { ...floatingOptions } = options
  const rootContext = useFloating(anchorEl, floatingEl, floatingOptions)

  const tree = createTree(rootContext, treeOptions)

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

  const getTopmostOpenNode = (): TreeNode<FloatingContext> | null => {
    let topmostNode: TreeNode<FloatingContext> | null = null
    let maxLevel = -1

    for (const node of tree.nodeMap.values()) {
      if (node.data.open.value) {
        const level = node.getPath().length
        if (level > maxLevel) {
          maxLevel = level
          topmostNode = node
        }
      }
    }

    return topmostNode
  }

  const addNode = (
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options: UseFloatingOptions = {}
  ): TreeNode<FloatingContext> | null => {
    // Extract parentId from options
    const { parentId, ...floatingOptions } = options

    // Create floating context internally
    const context = useFloating(anchorEl, floatingEl, floatingOptions)
    return tree.addNode(context, parentId)
  }

  return {
    ...tree,
    addNode,
    getAllOpenNodes,
    getTopmostOpenNode,
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
 * @param initialRootData Data for the root node.
 * @param options Configuration options for the tree behavior.
 * @returns A tree management object with methods and reactive properties
 *
 * @example
 * ```ts
 * const myTree = createTree({ name: 'Root' });
 * const childNode = myTree.addNode({ name: 'Child' }, myTree.root.id);
 * ```
 */
export function createTree<T>(initialRootData: T, options?: CreateTreeOptions): Tree<T> {
  const deleteStrategy = options?.deleteStrategy ?? "recursive"
  const nodeMap = shallowReactive(new Map<string, TreeNode<T>>())
  const root = createTreeNode<T>(initialRootData, null, {}, true)

  nodeMap.set(root.id, root)

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

    // biome-ignore lint/style/noNonNullAssertion: <Root case is handled, so parent must exist>
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
        // biome-ignore lint/style/noNonNullAssertion: <stack is initialized with items>
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
        // biome-ignore lint/style/noNonNullAssertion: <stack is initialized with items>
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
