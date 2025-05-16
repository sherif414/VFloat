import type { FloatingContext } from "./use-floating"
import { Tree, type TreeNode, type TreeOptions } from "./use-tree"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Configuration options for the floating tree
 */
export interface FloatingTreeOptions extends TreeOptions {}

export interface UseFloatingTreeReturn {
  readonly nodeMap: Readonly<Map<string, TreeNode<FloatingContext>>>
  readonly root: Readonly<TreeNode<FloatingContext>>
  findNodeById: (nodeId: string) => TreeNode<FloatingContext> | null
  moveNode: (nodeId: string, newParentId: string) => boolean
  dispose: () => void
  addNode: (data: FloatingContext, parentId?: string) => TreeNode<FloatingContext> | null
  removeNode: (nodeId: string) => boolean
  traverse: (
    mode: "dfs" | "bfs",
    startNode?: TreeNode<FloatingContext>
  ) => TreeNode<FloatingContext>[]
  /**
   * Checks if a given node is the topmost open node in the tree hierarchy.
   * A node is considered topmost if it's open and none of its ancestors are open.
   *
   * @param nodeId - The ID of the node to check.
   * @returns True if the node is open and no ancestors are open, false otherwise.
   */
  isTopmost: (nodeId: string) => boolean
  getAllOpenNodes: () => TreeNode<FloatingContext>[]
  /**
   * Executes a provided function once for each tree node that matches the specified relationship.
   * This is a flexible iteration method that can target nodes based on their relationship to a target node.
   *
   * @param nodeId - The ID of the target node used as a reference point for the relationship
   * @param callback - A function to execute for each matching node
   * @param options - Configuration options for the iteration behavior
   */
  forEach: (
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
 * Manages a hierarchical tree of floating elements.
 */
export function useFloatingTree(
  rootNodeData: FloatingContext,
  options: FloatingTreeOptions = {}
): UseFloatingTreeReturn {
  const tree = new Tree(rootNodeData, options)

  const forEach = (
    nodeId: string,
    callback: NodeActionFn,
    options: FilterNodesOptions = {}
  ): void => {
    const { relationship = "self-and-children", applyToMatching = true } = options
    const targetNode = tree.findNodeById(nodeId)
    if (!targetNode) return

    const allNodes = Array.from(tree.nodeMap.values())
    for (const node of allNodes) {
      const matches = matchNodeRelationship(node, targetNode, relationship)

      if (matches === applyToMatching) {
        callback(node)
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
    const allNodes = tree.nodeMap.values()

    for (const node of allNodes) {
      if (node.data.value.open.value) {
        openNodes.push(node)
      }
    }
    return openNodes
  }

  const isTopmost = (nodeId: string): boolean => {
    const node = tree.findNodeById(nodeId)
    if (!node || !node.data.value.open.value) {
      return false // Node doesn't exist or isn't open
    }

    let parent = node.parent.value
    while (parent) {
      if (parent.data.value.open.value) {
        return false // An ancestor is open
      }
      parent = parent.parent.value
    }

    return true // No open ancestors found
  }

  return {
    // Wrap original Tree methods in arrow functions to preserve context
    get nodeMap() {
      return tree.nodeMap
    },
    get root() {
      return tree.root
    },
    findNodeById: (nodeId: string) => tree.findNodeById(nodeId),
    moveNode: (nodeId, newParentId) => tree.moveNode(nodeId, newParentId),
    dispose: () => tree.dispose(),
    addNode: (data: FloatingContext, parentId?: string) => tree.addNode(data, parentId),
    removeNode: (nodeId: string) => tree.removeNode(nodeId),
    traverse: (mode: "dfs" | "bfs", startNode?: TreeNode<FloatingContext>) =>
      tree.traverse(mode, startNode),

    isTopmost,
    getAllOpenNodes,
    forEach,
  }
}

//=======================================================================================
// 📌 Helper Functions
//=======================================================================================

/**
 * Determines the relationship between two nodes based on the selected relationship
 */
function matchNodeRelationship<T>(
  node: TreeNode<T>,
  target: TreeNode<T>,
  relationship: NodeRelationship
): boolean {
  // Fast path for self check
  if (node.id === target.id) {
    // If the node is the target itself, it matches unless the relationship is strictly exclusive of self.
    return (
      relationship !== "ancestors-only" &&
      relationship !== "descendants-only" &&
      relationship !== "siblings-only" &&
      relationship !== "children-only"
    )
  }

  // Calculate relationships on demand based on relationship
  switch (relationship) {
    case "ancestors-only":
      return target.isDescendantOf(node)

    case "siblings-only":
      // Ensure they share the same parent and are not the same node
      return hasSameParent(node, target)

    case "descendants-only":
      return node.isDescendantOf(target)

    case "children-only":
      return node.parent.value?.id === target.id

    case "self-and-ancestors":
      // 'self' is handled by the initial check if node === target.
      // For 'ancestors', target must be a descendant of node.
      return target.isDescendantOf(node)

    case "self-and-children":
      // 'self' is handled by the initial check if node === target.
      // For 'children', node must be a child of target.
      return node.parent.value?.id === target.id

    case "self-and-descendants":
      // 'self' is handled by the initial check if node === target.
      // For 'descendants', node must be a descendant of target.
      return node.isDescendantOf(target)

    case "self-ancestors-and-children":
      // 'self' is handled by the initial check if node === target.
      // For 'ancestors', target must be a descendant of node.
      return target.isDescendantOf(node) || node.parent.value?.id === target.id

    case "self-and-siblings":
      // 'self' is handled by the initial check if node === target.
      // For 'siblings', they must share the same parent.
      return hasSameParent(node, target)

    case "full-branch": {
      if (node.isDescendantOf(target)) return true
      if (target.isDescendantOf(node)) return true
      return node.id === target.id
    }

    case "all-except-branch": {
      if (node.id === target.id) return false
      if (node.isDescendantOf(target)) return false
      if (target.isDescendantOf(node)) return false
      return true
    }

    default:
      return false
  }
}

/**
 * Helper function to check if two nodes have the same parent
 */
function hasSameParent<T>(node1: TreeNode<T>, node2: TreeNode<T>): boolean {
  const parent1 = node1.parent.value
  const parent2 = node2.parent.value

  if (!parent1 || !parent2) return false
  return parent1.id === parent2.id
}
