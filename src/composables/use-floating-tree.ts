import type { Ref } from "vue"
import type { FloatingContext } from "./use-floating"
import { Tree, type TreeNode, type TreeOptions, type TreeNodeOptions } from "./use-tree"

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
}
