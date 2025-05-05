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
export interface TreeOptions {
  // Renamed from UseTreeOptions
  /** Strategy for deleting child nodes when a parent is deleted.
   * - 'orphan': Children are detached from the tree (parent becomes null).
   * - 'recursive': Children are also deleted recursively.
   * @default 'recursive'
   */
  deleteStrategy?: "orphan" | "recursive"
}

// Removed UseTreeReturn interface as the class itself serves this purpose

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

  constructor(data: T, parent: TreeNode<T> | null = null, options: TreeNodeOptions<T> = {}) {
    this.id = options.id ?? useId()
    this.data = ref(data) as Ref<T>
    this.parent = shallowRef(parent) // Use shallowRef for parent link
    this.children = shallowRef([])
  }

  /**
   * Adds an existing node instance to this node's children array.
   * @param childNode The TreeNode instance to add.
   */
  addChild(childNode: TreeNode<T>): void {
    this.children.value = [...this.children.value, childNode]
  }

  /**
   * Removes a specific child node instance from this node's children.
   * Note: This only removes the direct child link. Use the Tree's `removeNode` method for full removal including map updates and recursive deletion.
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
}

//=======================================================================================
// 📌 Tree Class
//=======================================================================================

/**
 * Manages a reactive tree structure.
 *
 * This class provides a complete tree data structure with reactive nodes,
 * supporting operations like adding, removing, and moving nodes, as well as
 * traversal and search functionality.
 *
 * @template T The type of data stored in the tree nodes.
 */
export class Tree<T> {
  /** The root node of the tree. */
  readonly root: TreeNode<T>
  /** Readonly reactive map of node IDs to TreeNode instances for quick lookups. */
  readonly nodeMap: Readonly<Ref<Map<string, TreeNode<T>>>>

  private readonly deleteStrategy: "orphan" | "recursive"

  /**
   * Creates a new Tree instance.
   * @param initialRootData Data for the root node.
   * @param options Configuration options for the tree behavior.
   *
   * @example
   * ```ts
   * const myTree = new Tree({ name: 'Root' });
   * const childNode = myTree.addNode({ name: 'Child' }, myTree.root.id);
   * ```
   */
  constructor(initialRootData: T, options?: TreeOptions) {
    this.deleteStrategy = options?.deleteStrategy ?? "recursive"
    // Use shallowRef for the map itself to avoid deep reactivity on the Map structure
    const map = shallowRef(new Map<string, TreeNode<T>>())
    this.nodeMap = map as Readonly<Ref<Map<string, TreeNode<T>>>> // Provide readonly access externally
    this.root = new TreeNode<T>(initialRootData, null, {})
    this.nodeMap.value.set(this.root.id, this.root)
  }

  /**
   * Finds a node anywhere in the tree by its ID.
   * @param id The ID of the node to find.
   * @returns The node if found, otherwise null.
   */
  findNodeById(id: string): TreeNode<T> | null {
    return this.nodeMap.value.get(id) ?? null
  }

  /**
   * Adds a new node to the tree.
   * @param data The data for the new node.
   * @param parentId The ID of the parent node. If null or undefined, adds to the root.
   * @param nodeOptions Optional configuration for the new node (e.g., custom ID).
   * @returns The newly created TreeNode, or null if the parent was not found.
   */
  addNode(
    data: T,
    parentId: string | null = null,
    nodeOptions: TreeNodeOptions<T> = {}
  ): TreeNode<T> | null {
    const parentNode = parentId ? this.findNodeById(parentId) : this.root
    if (!parentNode) {
      console.error(`Tree addNode: Parent node with ID ${parentId} not found.`)
      return null
    }

    // Ensure child ID is unique if provided, otherwise generate
    if (nodeOptions.id && this.nodeMap.value.has(nodeOptions.id)) {
      console.warn(`Tree addNode: ID ${nodeOptions.id} already exists. Generating a new one.`)
      nodeOptions.id = undefined
    }

    const newNode = new TreeNode<T>(data, parentNode, nodeOptions)
    this.nodeMap.value.set(newNode.id, newNode)
    parentNode.addChild(newNode)
    return newNode
  }

  /**
   * Removes a node from the tree by its ID.
   * Handles deletion of descendants based on the `deleteStrategy` option.
   * @param nodeId The ID of the node to remove.
   * @returns True if the node was successfully removed, false otherwise.
   */
  removeNode(nodeId: string): boolean {
    const nodeToRemove = this.findNodeById(nodeId)
    if (!nodeToRemove) {
      return false
    }
    if (nodeToRemove.isRoot) {
      console.error("Tree removeNode: Cannot remove the root node.")
      return false
    }

    const parent = nodeToRemove.parent.value! // Root case is handled, so parent must exist

    // 1. Handle children based on strategy
    if (this.deleteStrategy === "recursive") {
      // Cleanup children (removes from map) and the node itself
      this._cleanupNodeRecursive(nodeToRemove)
    } else {
      // 'orphan'
      // Detach children from the node being removed
      for (const child of nodeToRemove.children.value) {
        child.parent.value = null // Orphan the children
        // Note: Orphans remain in the map unless explicitly removed later.
      }
      nodeToRemove.children.value = [] // Clear children array of the removed node
      this.nodeMap.value.delete(nodeToRemove.id)
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
  moveNode(nodeId: string, newParentId: string | null): boolean {
    const nodeToMove = this.findNodeById(nodeId)
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

    const newParent = newParentId ? this.findNodeById(newParentId) : this.root
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

    if (!oldParent) {
      // Should not happen for non-root nodes if internal logic is correct
      console.error("Tree moveNode: Node to move unexpectedly lacks a parent.")
      return false
    }

    // 1. Remove from old parent
    if (!oldParent._removeChildInstance(nodeToMove)) {
      console.error("Tree moveNode: Failed to remove node from its original parent.")
      return false // Indicates an inconsistency
    }

    // 2. Add to new parent
    newParent.children.value.push(nodeToMove)

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
  traverse(
    strategy: "dfs" | "bfs" = "dfs",
    startNode: TreeNode<T> | null = this.root // Allow potentially null startNode
  ): TreeNode<T>[] {
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
   * Gets all nodes in the subtree starting from `startNode` as a flat list (using DFS traversal).
   * @param startNode The node to start flattening from. Defaults to the root node.
   * @returns A flat array of all descendant nodes (including the start node).
   */
  flattenNodes(startNode: TreeNode<T> | null = this.root): TreeNode<T>[] {
    // DFS traversal is suitable for flattening
    return this.traverse("dfs", startNode)
  }

  /**
   * Clears the internal node map. This is crucial for allowing garbage collection
   * when the Tree instance is no longer needed, especially in scenarios like
   * Vue components where the instance might be tied to the component lifecycle.
   * Call this method when you are finished with the Tree instance (e.g., in `onScopeDispose`).
   */
  dispose(): void {
    this.nodeMap.value.clear()
  }

  // --- Internal Recursive Helper for Deletion/Cleanup ---
  private _cleanupNodeRecursive(node: TreeNode<T>): void {
    // Recursively cleanup children first (Post-order)
    // Iterate over a copy of the array in case of modifications? Shallow copy is enough here.
    const childrenCopy = [...node.children.value]
    for (const child of childrenCopy) {
      this._cleanupNodeRecursive(child) // This will handle removal from map
    }
    // Cleanup the node itself (remove from map)
    this.nodeMap.value.delete(node.id)
    // Explicitly clear children array after recursive cleanup
    node.children.value = []
  }
}
