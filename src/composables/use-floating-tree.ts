import type { VirtualElement } from "@floating-ui/dom"
import {
  type InjectionKey,
  type Ref,
  type WatchStopHandle,
  onScopeDispose,
  provide,
  watch,
} from "vue"
import { type FloatingContext, type UseFloatingOptions, useFloating } from "./use-floating"
import { type TreeNode, type UseTreeOptions, type UseTreeReturn, useTree } from "./use-tree"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Context provided by useFloatingTree
 */
export interface FloatingTreeContext {
  /** The tree's node map */
  nodeMap: Readonly<Ref<Map<string, TreeNode<FloatingContext>>>>

  /** adds a floating node to the tree */
  addNode: (
    nodeData: FloatingContext,
    parentId: string | null
  ) => { nodeId: string; context: FloatingContext } | null

  /** removes a floating node from the tree */
  removeNode: (nodeId: string) => void

  /** Retrieves the TreeNode for a given node ID */
  findNodeById: (nodeId: string) => TreeNode<FloatingContext> | null

  /** Closes all descendant nodes of a given node ID */
  closeDescendants: (nodeId: string) => void
}

/**
 * Configuration options for the floating tree
 */
export interface UseFloatingTreeOptions extends UseTreeOptions {}


//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages a hierarchical tree of floating elements.
 * Handles cascading close behavior (closing a parent closes its descendants).
 *
 * @param anchorEl - Reference element for the root floating element
 * @param floatingEl - Root floating element
 * @param floatingOptions - Options for the root floating element
 * @param treeOptions - Options for the underlying tree structure
 * @returns Methods and state for managing the floating tree
 */
export function useFloatingTree(
  rootNodeData: FloatingContext,
  treeOptions: UseFloatingTreeOptions = {}
): FloatingTreeContext {

  const tree = useTree<FloatingContext>(rootNodeData, {
    deleteStrategy: "recursive",
    ...treeOptions,
  })

  const closeDescendants = (nodeId: string) => {
    const node = tree.findNodeById(nodeId)
    if (!node) return

    const descendants = tree.traverse("dfs", node)

    for (const descendant of descendants) {
      if (descendant.id === nodeId) continue

      const context = descendant.data.value
      if (context.open.value) {
        context.onOpenChange(false)
      }
    }
  }

  const addNode = (
    nodeData: FloatingContext,
    parentId: string | null
  ): { nodeId: string; context: FloatingContext } | null => {
    if (parentId !== null && !tree.findNodeById(parentId)) {
      console.error(`[useFloatingTree] registerNode: Parent node with ID '${parentId}' not found.`)
      return null
    }

    const treeNode = tree.addNode(nodeData, parentId)
    if (!treeNode) {
      console.error("[useFloatingTree] registerNode: Failed to add node to tree.")
      return null
    }

    const nodeId = treeNode.id
    return { nodeId, context: nodeData }
  }

  const removeNode = (nodeId: string): void => {
    const nodeToRemove = tree.findNodeById(nodeId)
    if (!nodeToRemove) {
      // Node might have already been removed by parent's recursive delete or doesn't exist
      return
    }

    // Remove node from the tree (this will handle recursive cleanup based on options)
    const removed = tree.removeNode(nodeId)
    if (!removed) {
      // Node might have already been removed by parent's recursive delete
      // Or potentially failed for other reasons (e.g., trying to remove root - though checked in removeNode)
      console.warn(
        `[useFloatingTree] unregisterNode: Failed to remove node ${nodeId} from tree structure.`
      )
    }
  }

  const findNodeById = (nodeId: string): TreeNode<FloatingContext> | null => {
    return tree.findNodeById(nodeId)
  }

  return {
    findNodeById,
    addNode,
    removeNode,
    closeDescendants,
    nodeMap: tree.nodeMap,
  }
}
