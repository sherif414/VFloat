import type { FloatingContext } from "./use-floating"
import { Tree, type TreeNode, type TreeOptions } from "./use-tree"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Configuration options for the floating tree
 */
export interface FloatingTreeOptions extends TreeOptions {}

//=======================================================================================
// 📌 FloatingTree Class
//=======================================================================================

/**
 * Manages a hierarchical tree of floating elements.
 * Handles cascading close behavior (closing a parent closes its descendants).
 * 
 * Extends the base Tree class with floating-specific functionality.
 * 
 * @example
 * ```ts
 * // Create a floating tree with root context
 * const tree = new FloatingTree(rootFloatingContext);
 * 
 * // Add a child node
 * const childNodeInfo = tree.addNode(childFloatingContext, tree.root.id);
 * 
 * // Close all descendants of a node
 * tree.closeDescendants(nodeId);
 * ```
 */
export class FloatingTree extends Tree<FloatingContext> {
  /**
   * Creates a new FloatingTree instance.
   * 
   * @param rootNodeData - The floating context for the root node
   * @param options - Configuration options for the tree behavior
   */
  constructor(
    rootNodeData: FloatingContext,
    options: FloatingTreeOptions = {}
  ) {
    super(rootNodeData, {
      deleteStrategy: "recursive",
      ...options,
    })
  }

  /**
   * Closes all descendant nodes of a given node ID.
   * This handles the cascading behavior when closing a parent node.
   * 
   * @param nodeId - The ID of the node whose descendants should be closed
   */
  closeDescendants(nodeId: string): void {
    const node = this.findNodeById(nodeId)
    if (!node) return

    const descendants = this.traverse("dfs", node)

    for (const descendant of descendants) {
      if (descendant.id === nodeId) continue

      const context = descendant.data.value
      if (context.open.value) {
        context.onOpenChange(false)
      }
    }
  }

  /**
   * Opens a node and all its ancestor nodes up to the root.
   * Ensures the entire branch leading to the target node is visible.
   *
   * @param nodeId - The ID of the node to open along with its parents.
   */
  openParents(nodeId: string): void {
    const node = this.findNodeById(nodeId)
    if (!node) return

    let current: TreeNode<FloatingContext> | null = node

    while (current) {
      const context = current.data.value
      if (!context.open.value) {
        context.onOpenChange(true)
      }
      current = current.parent.value
    }
  }

  /**
   * Closes all sibling nodes of a given node ID.
   * Useful for ensuring only one node at a specific level is open at a time.
   *
   * @param nodeId - The ID of the node whose siblings should be closed.
   */
  closeSiblings(nodeId: string): void {
    const node = this.findNodeById(nodeId)
    if (!node || !node.parent.value) return

    const parent = node.parent.value
    const siblings = parent.children.value

    for (const sibling of siblings) {
      if (sibling.id === nodeId) continue

      const context = sibling.data.value
      if (context.open.value) {
        context.onOpenChange(false)
      }
    }
  }

  /**
   * Closes all nodes in the tree except for the direct ancestors,
   * the node itself, and its immediate children (or all descendants, depending on desired behavior).
   * This focuses the user interaction on a specific branch.
   *
   * @param nodeId - The ID of the node whose branch should remain open.
   * @param closeDescendantsOfTarget - If true, also closes direct descendants of the target node. Defaults to false.
   */
  closeAllExceptBranch(nodeId: string, closeDescendantsOfTarget = false): void {
    const targetNode = this.findNodeById(nodeId)
    if (!targetNode) return

    const nodesToKeepOpen = new Set<string>()
    nodesToKeepOpen.add(targetNode.id)

    // Add ancestors
    let currentParent = targetNode.parent.value
    while (currentParent) {
      nodesToKeepOpen.add(currentParent.id)
      currentParent = currentParent.parent.value
    }

    // Optionally add descendants (or just children)
    if (!closeDescendantsOfTarget) {
      const descendants = this.traverse("dfs", targetNode)
      for (const desc of descendants) {
        nodesToKeepOpen.add(desc.id)
      }
      // If only direct children should be kept open:
      // const children = targetNode.children.value;
      // for (const child of children) {
      //   nodesToKeepOpen.add(child.id);
      // }
    }

    const allNodes = this.nodeMap.value.values()

    for (const node of allNodes) {
      if (!nodesToKeepOpen.has(node.id)) {
        const context = node.data.value
        if (context.open.value) {
          context.onOpenChange(false)
        }
      }
    }
  }

  /**
   * Retrieves a list of all currently open nodes in the tree.
   *
   * @returns An array of TreeNodes whose associated floating elements are open.
   */
  getAllOpenNodes(): TreeNode<FloatingContext>[] {
    const openNodes: TreeNode<FloatingContext>[] = []
    const allNodes = this.nodeMap.value.values()

    for (const node of allNodes) {
      if (node.data.value.open.value) {
        openNodes.push(node)
      }
    }
    return openNodes
  }

  /**
   * Checks if a given node is the topmost open node in the tree hierarchy.
   * A node is considered topmost if it's open and none of its ancestors are open.
   *
   * @param nodeId - The ID of the node to check.
   * @returns True if the node is open and no ancestors are open, false otherwise.
   */
  isTopmost(nodeId: string): boolean {
    const node = this.findNodeById(nodeId)
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
}
