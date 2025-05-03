import { type Ref, onScopeDispose, ref, shallowRef, useId } from "vue"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Options for creating a TreeNode
 */
export interface TreeNodeOptions<T> {
  /** Optional ID for the node. If not provided, one will be generated. */
  id?: string
  /** Optional initial children data to populate the node with. */
  children?: T[]
}

/**
 * Options for configuring tree behavior
 */
export interface UseTreeOptions {
  /** Strategy for deleting child nodes when a parent is deleted.
   * - 'orphan': Children are detached from the tree (parent becomes null).
   * - 'recursive': Children are also deleted recursively.
   * @default 'recursive'
   */
  deleteStrategy?: "orphan" | "recursive"
}

/**
 * Return value from the useTree composable
 */
export interface UseTreeReturn<T> {
  /** The root node of the tree. */
  root: TreeNode<T>
  /** Adds a new node to the tree. If parentId is null/undefined, adds to the root. */
  addNode(data: T, parentId?: string | null, options?: TreeNodeOptions<T>): TreeNode<T> | null
  /** Removes a node by its ID. Handles recursive deletion based on options. */
  removeNode(nodeId: string): boolean
  /** Moves a node to become a child of a new parent. Set newParentId to null to move to root level. */
  moveNode(nodeId: string, newParentId: string | null): boolean
  /** Finds a node anywhere in the tree by its ID. Uses Map if enabled, otherwise traverses. */
  findNodeById(id: string): TreeNode<T> | null
  /** Traverses the tree starting from a given node (or root). */
  traverse(strategy?: "dfs" | "bfs", startNode?: TreeNode<T>): TreeNode<T>[]
  /** Gets all nodes in the tree as a flat list. */
  flattenNodes(startNode?: TreeNode<T>): TreeNode<T>[]
  /**
   * Provides direct access to the internal ID map if enabled.
   * The type is conditional: `Ref<Map<...>>` if `useIdMap` is true (or default), `undefined` if `useIdMap` is false.
   */
  nodeMap: Readonly<Ref<Map<string, TreeNode<T>>>>
}

//=======================================================================================
// 📌 TreeNode Class
//=======================================================================================

/**
 * Represents a node in a reactive tree structure.
 * Each node contains data, parent reference, and children references.
 */
export class TreeNode<T> {
  readonly id: string
  data: Ref<T>
  // Use shallowRef for parent to avoid potential deep reactivity issues/cycles if parent data changes triggering child updates unnecessarily.
  // The relationship itself (parent pointer) changing is what we usually care about reactively at this level.
  parent: Ref<TreeNode<T> | null>
  children: Ref<TreeNode<T>[]>

  // Internal reference for the composable's map (if used)
  private _internalMapRef?: Ref<Map<string, TreeNode<T>>>

  constructor(
    data: T,
    parent: TreeNode<T> | null = null,
    options: TreeNodeOptions<T> = {},
    internalMapRef?: Ref<Map<string, TreeNode<T>>>
  ) {
    this.id = options.id ?? useId()
    this.data = ref(data) as Ref<T>
    this.parent = shallowRef(parent) // Use shallowRef for parent link
    this.children = ref([])
    this._internalMapRef = internalMapRef

    // Add self to map if provided
    this._internalMapRef?.value.set(this.id, this)

    // Initialize children if provided
    if (options.children) {
      for (const childData of options.children) {
        this.addChild(childData)
      }
    }
  }

  /**
   * Adds a new child node.
   * @param childData The data for the new child node.
   * @param options Optional TreeNodeOptions for the new child.
   * @returns The newly created child TreeNode.
   */
  addChild(childData: T, options: TreeNodeOptions<T> = {}): TreeNode<T> {
    // Ensure child ID is unique if provided, otherwise generate
    if (options.id && this._internalMapRef?.value.has(options.id)) {
      console.warn(`TreeNode addChild: ID ${options.id} already exists. Generating a new one.`)
      options.id = undefined
    }
    const childNode = new TreeNode<T>(childData, this, options, this._internalMapRef)
    this.children.value.push(childNode)
    return childNode
  }

  /**
   * Removes a specific child node instance from this node's children.
   * Note: This only removes the direct child link. Use the composable's `removeNode` for full removal including map updates and recursive deletion.
   * @param childNode The child node instance to remove.
   * @returns True if the child was found and removed, false otherwise.
   */
  _removeChildInstance(childNode: TreeNode<T>): boolean {
    const index = this.children.value.findIndex((child) => child.id === childNode.id)
    if (index !== -1) {
      this.children.value.splice(index, 1)
      childNode.parent.value = null // Break the parent link reactively
      return true
    }
    return false
  }

  /**
   * Updates the node's data.
   * If T is an object, performs a shallow merge using Object.assign.
   * If T is a primitive, replaces the value.
   * @param newData Partial data for objects, or the new value for primitives.
   */
  updateData(newData: Partial<T> | T) {
    const currentValue = this.data.value
    if (
      typeof currentValue === "object" &&
      currentValue !== null &&
      typeof newData === "object" &&
      newData !== null
    ) {
      // Shallow merge for objects
      this.data.value = Object.assign({}, currentValue, newData)
    } else {
      // Replace value for primitives or if types mismatch significantly
      this.data.value = newData as T
    }
  }

  /**
   * Finds the first direct child matching the predicate.
   * @param predicate Function to test each child node.
   * @returns The matching child node or null if not found.
   */
  findChild(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
    return this.children.value.find(predicate) ?? null
  }

  /**
   * Finds the first descendant node (including self) matching the predicate using DFS.
   * @param predicate Function to test each node.
   * @returns The matching descendant node or null if not found.
   */
  findDescendant(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | null {
    const stack: TreeNode<T>[] = [this]
    while (stack.length > 0) {
      const node = stack.pop()!

      if (predicate(node)) {
        return node
      }
      // Add children in reverse order for pre-order DFS via pop()
      for (let i = node.children.value.length - 1; i >= 0; i--) {
        stack.push(node.children.value[i])
      }
    }
    return null
  }

  /**
   * Checks if this node is a descendant of the potential ancestor.
   * @param potentialAncestor The node to check against.
   * @returns True if this node is a descendant, false otherwise.
   */
  isDescendantOf(potentialAncestor: TreeNode<T>): boolean {
    let currentParent = this.parent.value
    while (currentParent) {
      if (currentParent.id === potentialAncestor.id) {
        return true
      }
      currentParent = currentParent.parent.value
    }
    return false
  }

  /**
   * Gets the path of nodes from the root to this node.
   * @returns An array of nodes starting with the root and ending with this node.
   */
  getPath(): TreeNode<T>[] {
    const path: TreeNode<T>[] = []
    let currentNode: TreeNode<T> | null = this
    while (currentNode) {
      path.push(currentNode)
      currentNode = currentNode.parent.value
    }
    return path.reverse() // Reverse to get root -> node order
  }

  /** Checks if the node is the root of the tree. */
  get isRoot(): boolean {
    return this.parent.value === null
  }

  /** Checks if the node is a leaf node (has no children). */
  get isLeaf(): boolean {
    return this.children.value.length === 0
  }

  /** Cleans up node references, removing from ID map if applicable. Internal use. */
  _cleanup(): void {
    // Remove from map if it exists
    this._internalMapRef?.value.delete(this.id)
    // Nullify parent ref to help GC, though Vue's shallowRef helps
    // this.parent.value = null; // Already done in _removeChildInstance or move
  }
}

//=======================================================================================
// 📌 useTree
//=======================================================================================

/**
 * Creates and manages a reactive tree structure.
 *
 * This composable provides a complete tree data structure with reactive nodes,
 * supporting operations like adding, removing, and moving nodes, as well as
 * traversal and search functionality.
 *
 * @param initialRootData Data for the root node.
 * @param options Configuration options for the tree behavior.
 * @returns An object with the reactive root node and tree management utilities.
 *
 * @example
 * ```ts
 * const { root, addNode, removeNode } = useTree({ name: 'Root' })
 * const childNode = addNode({ name: 'Child' }, root.id)
 * ```
 */
export function useTree<T, TOptions extends UseTreeOptions = UseTreeOptions>(
  initialRootData: T,
  options?: TOptions
): UseTreeReturn<T> {
  const { deleteStrategy = "recursive" } = options ?? {}

  const nodeMap =shallowRef(new Map<string, TreeNode<T>>())
  const root = new TreeNode<T>(initialRootData, null, {}, nodeMap)

  // --- Internal Recursive Helper for Deletion/Cleanup ---
  const cleanupNodeRecursive = (node: TreeNode<T>) => {
    // Recursively cleanup children first (Post-order)
    for (const child of node.children.value) {
      cleanupNodeRecursive(child)
    }
    // Cleanup the node itself (remove from map)
    node._cleanup()
  }

  // --- Core Utility Functions ---

  const findNodeById = (id: string): TreeNode<T> | null => {
    if (nodeMap) {
      return nodeMap.value.get(id) ?? null
    }
    // Fallback to traversal if map is disabled
    return root.findDescendant((node) => node.id === id)
  }

  const addNode = (
    data: T,
    parentId: string | null = null, // Default to root if null/undefined
    nodeOptions: TreeNodeOptions<T> = {}
  ): TreeNode<T> | null => {
    const parentNode = parentId ? findNodeById(parentId) : root
    if (!parentNode) {
      console.error(`useTree addNode: Parent node with ID ${parentId} not found.`)
      return null
    }
    return parentNode.addChild(data, nodeOptions)
  }

  const removeNode = (nodeId: string): boolean => {
    const nodeToRemove = findNodeById(nodeId)
    if (!nodeToRemove) {
      return false
    }
    if (nodeToRemove.isRoot) {
      console.error("useTree removeNode: Cannot remove the root node.")
      return false
    }

    const parent = nodeToRemove.parent.value! // Root case is handled, so parent must exist

    // 1. Handle children based on strategy
    if (deleteStrategy === "recursive") {
      // Cleanup children (removes from map) and the node itself
      cleanupNodeRecursive(nodeToRemove)
    } else {
      // 'orphan'
      // Detach children from the node being removed
      for (const child of nodeToRemove.children.value) {
        child.parent.value = null // Orphan the children
        // Note: Orphans are now detached but still exist in the map if used.
        // Consider if orphans should also be removed from the map, or if they might be re-parented later.
        // For simplicity here, they remain in the map unless explicitly removed later.
      }
      nodeToRemove.children.value = [] // Clear children array of the removed node
      nodeToRemove._cleanup() // Clean up the node itself (remove from map)
    }

    // 2. Remove node from its parent's children array
    return parent._removeChildInstance(nodeToRemove)
  }

  const moveNode = (nodeId: string, newParentId: string | null): boolean => {
    const nodeToMove = findNodeById(nodeId)
    if (!nodeToMove) {
      console.error(`useTree moveNode: Node with ID ${nodeId} not found.`)
      return false
    }
    if (nodeToMove.isRoot) {
      console.error("useTree moveNode: Cannot move the root node.")
      return false
    }
    if (nodeId === newParentId) {
      console.error("useTree moveNode: Cannot move a node to be a child of itself.")
      return false
    }

    const newParent = newParentId ? findNodeById(newParentId) : root // Allow moving to root theoretically? Revisit if needed.
    if (!newParent) {
      console.error(`useTree moveNode: New parent node with ID ${newParentId} not found.`)
      return false
    }

    // Check for cyclic move (moving a node into one of its own descendants)
    if (newParent.isDescendantOf(nodeToMove)) {
      console.error("useTree moveNode: Cannot move a node to become its own descendant.")
      return false
    }

    const oldParent = nodeToMove.parent.value

    if (!oldParent) {
      console.error("useTree moveNode: Node unexpectedly has no parent.") // Should not happen
      return false
    }

    // 1. Remove from old parent
    if (!oldParent._removeChildInstance(nodeToMove)) {
      console.error("useTree moveNode: Failed to remove node from its original parent.")
      return false
    }

    // 2. Add to new parent
    newParent.children.value.push(nodeToMove)

    // 3. Update node's parent reference
    nodeToMove.parent.value = newParent

    return true
  }

  const traverse = (
    strategy: "dfs" | "bfs" = "dfs",
    startNode: TreeNode<T> = root
  ): TreeNode<T>[] => {
    const result: TreeNode<T>[] = []
    if (!startNode) return result // Handle case where startNode might be null

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

  const flattenNodes = (startNode: TreeNode<T> = root): TreeNode<T>[] => {
    // DFS traversal is suitable for flattening
    return traverse("dfs", startNode)
  }

  // Cleanup on component unmount (important if using the ID map)
  onScopeDispose(() => {
    if (nodeMap) {
      // Clear the map to allow nodes to be garbage collected
      nodeMap.value.clear()
    }
  })

  return {
    root,
    addNode,
    removeNode,
    moveNode,
    findNodeById,
    traverse,
    flattenNodes,
    nodeMap,
  }
}
