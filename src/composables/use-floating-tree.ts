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
  moveNode: (nodeId: string, newParentId: string | null) => boolean
  dispose: () => void
  addNode: (data: FloatingContext, parentId?: string | null) => TreeNode<FloatingContext> | null
  removeNode: (nodeId: string, deleteStrategy?: "orphan" | "recursive") => boolean
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
      console.warn(`forEach: Unknown relationship "${relationship}".`)
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

  const isTopmost = (nodeId: string): boolean => {
    const node = tree.findNodeById(nodeId)
    if (!node || !node.data.open.value) {
      return false // Node doesn't exist or isn't open
    }

    let parent = node.parent.value
    while (parent) {
      if (parent.data.open.value) {
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
    addNode: (data: FloatingContext, parentId?: string | null) => tree.addNode(data, parentId),
    removeNode: (nodeId: string, deleteStrategy?: "orphan" | "recursive") =>
      tree.removeNode(nodeId, deleteStrategy),
    traverse: (mode: "dfs" | "bfs", startNode?: TreeNode<FloatingContext>) =>
      tree.traverse(mode, startNode),

    isTopmost,
    getAllOpenNodes,
    forEach,
  }
}
