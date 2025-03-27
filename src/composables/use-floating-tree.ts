import {
  type InjectionKey,
  type Ref,
  type WatchStopHandle,
  onScopeDispose,
  provide,
  watch,
} from "vue"
import { type TreeNode, type UseTreeOptions, type UseTreeReturn, useTree } from "./tree"
import { type FloatingContext, type UseFloatingOptions, useFloating } from "./use-floating"

//=======================================================================================
// 📌 Constants
//=======================================================================================

/** Injection key for the main tree context */
export const FLOATING_TREE_INJECTION_KEY = Symbol(
  "FloatingTreeContext"
) as InjectionKey<FloatingTreeContext>

/** Injection key for the parent node context */

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages a hierarchical tree of floating elements.
 * Handles cascading close behavior (closing a parent closes its descendants).
 *
 * @param options Options for the underlying `useTree` instance.
 * @returns Methods and state for managing the floating tree.
 */
export function useFloatingTree(
  reference: Ref<HTMLElement | null>,
  floating: Ref<HTMLElement | null>,
  floatingOptions: UseFloatingOptions = {},
  options: UseFloatingTreeOptions = {}
): UseFloatingTreeReturn {
  const floatingContext = useFloating(reference, floating, floatingOptions)

  const tree = useTree<FloatingNodeData>(floatingContext, {
    deleteStrategy: "recursive",
    useIdMap: true,
    ...options,
  })

  /** Map to store watcher stop handles for each node */
  const watcherStopHandlers = new Map<string, WatchStopHandle>()

  /** Closes all descendant nodes of a given node ID */
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

  const registerNode = (
    parentId: string | null,
    reference: Ref<HTMLElement | null>,
    floating: Ref<HTMLElement | null>,
    options: UseFloatingOptions = {}
  ): { nodeId: string; context: FloatingContext } | null => {
    if (parentId !== null && !tree.findNodeById(parentId)) {
      console.error(`[useFloatingTree] registerNode: Parent node with ID '${parentId}' not found.`)
      return null
    }

    const nodeData = useFloating(reference, floating, {
      ...options,
    })

    const treeNode = tree.addNode(nodeData, parentId)
    if (!treeNode) {
      console.error("[useFloatingTree] registerNode: Failed to add node to tree.")
      return null
    }

    const nodeId = treeNode.id

    // Watch the open state of this new node to close its descendants
    // Use { flush: 'post' } to ensure tree structure updates are processed before closing logic runs
    const stopOpenWatcher = watch(
      nodeData.open,
      (isOpen) => {
        if (!isOpen) {
          closeDescendants(nodeId)
        }
      },
      { flush: "post" }
    )

    watcherStopHandlers.set(nodeId, stopOpenWatcher)
    return { nodeId, context: nodeData }
  }

  const unregisterNode = (nodeId: string): void => {
    const nodeToRemove = tree.findNodeById(nodeId)
    if (!nodeToRemove) {
      // Node might have already been removed by parent's recursive delete or doesn't exist
      return
    }

    // Stop and remove the watcher associated with this node
    const stopHandle = watcherStopHandlers.get(nodeId)
    if (stopHandle) {
      stopHandle()
      watcherStopHandlers.delete(nodeId)
    }

    // Remove node from the tree (this will handle recursive cleanup based on options)
    const removed = tree.removeNode(nodeId)
    if (!removed) {
      // Node might have already been removed by parent's recursive delete
      // Or potentially failed for other reasons (e.g., trying to remove root - though checked in removeNode)
      // console.warn(`[useFloatingTree] unregisterNode: Failed to remove node ${nodeId} from tree structure.`);
    }
  }

  const getNodeContext = (nodeId: string): FloatingContext | undefined => {
    return tree.findNodeById(nodeId)?.data.value
  }

  const getTreeNode = (nodeId: string): TreeNode<FloatingNodeData> | null => {
    return tree.findNodeById(nodeId)
  }

  const treeContext: FloatingTreeContext = {
    tree,
    registerNode,
    unregisterNode,
    getNodeContext,
    getTreeNode,
  }
  provide(FLOATING_TREE_INJECTION_KEY, treeContext)

  onScopeDispose(() => {
    // Cleanup any remaining watchers
    for (const stopHandle of watcherStopHandlers.values()) {
      stopHandle()
    }
    watcherStopHandlers.clear()
  })

  return {
    ...treeContext,
    nodeMap: tree.nodeMap,
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface FloatingNodeData extends FloatingContext {}

/** Context provided by useFloatingTree */
export interface FloatingTreeContext {
  /** Tree management instance */
  tree: UseTreeReturn<FloatingNodeData>
  /** Registers a floating node with the tree */
  registerNode: (
    parentId: string | null,
    reference: Ref<HTMLElement | null>,
    floating: Ref<HTMLElement | null>,
    options?: UseFloatingOptions
  ) => { nodeId: string; context: FloatingContext } | null
  /** Unregister a floating node from the tree */
  unregisterNode: (nodeId: string) => void
  /** Retrieves the FloatingContext for a given node ID */
  getNodeContext: (nodeId: string) => FloatingNodeData | undefined
  /** Retrieves the TreeNode for a given node ID */
  getTreeNode: (nodeId: string) => TreeNode<FloatingNodeData> | null
}

/** Context provided by a node for its children */
export interface FloatingParentNodeContext {
  /** The ID of the parent floating node */
  parentId: string
}

export interface UseFloatingTreeOptions extends UseTreeOptions {}

export interface UseFloatingTreeReturn extends FloatingTreeContext {
  /** The tree's node map */
  nodeMap: Readonly<Ref<Map<string, TreeNode<FloatingNodeData>>>>
}
