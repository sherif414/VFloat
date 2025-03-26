import {
  type InjectionKey,
  type Ref,
  inject,
  onScopeDispose,
  provide,
  readonly,
  shallowReactive,
  shallowRef,
  watch,
} from "vue"
import { type TreeNode, type UseTreeOptions, type UseTreeReturn, useTree } from "./tree"
import { type FloatingContext, type UseFloatingOptions, useFloating } from "./use-floating"

//=======================================================================================
// 📌 Types & Injection Keys
//=======================================================================================

/** Data associated with each floating node */
// biome-ignore lint/suspicious/noEmptyInterface: empty for now. but is required on the tree interface
export interface FloatingNodeData {}

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
  getNodeContext: (nodeId: string) => FloatingContext | undefined
  /** Retrieves the TreeNode for a given node ID */
  getTreeNode: (nodeId: string) => TreeNode<FloatingNodeData> | null
}

/** Context provided by a node for its children */
export interface FloatingParentNodeContext {
  /** The ID of the parent floating node */
  parentId: string
}

/** Injection key for the main tree context */
export const FLOATING_TREE_CONTEXT_KEY = Symbol(
  "FloatingTreeContext"
) as InjectionKey<FloatingTreeContext>

/** Injection key for the parent node context */
export const FLOATING_PARENT_NODE_CONTEXT_KEY = Symbol(
  "FloatingParentNodeContext"
) as InjectionKey<FloatingParentNodeContext>

//=======================================================================================
// 📌 useFloatingTree Composable
//=======================================================================================

/**
 * Manages a hierarchical tree of floating elements.
 * Handles cascading close behavior (closing a parent closes its descendants).
 *
 * @param options Options for the underlying `useTree` instance.
 * @returns Methods and state for managing the floating tree.
 */
export function useFloatingTree(options: UseTreeOptions = {}) {
  const tree = useTree<FloatingNodeData>(
    {},
    {
      deleteStrategy: "recursive",
      useIdMap: true,
      ...options,
    }
  )

  const nodesMap = shallowReactive<Map<string, FloatingContext>>(new Map())

  /** Closes all descendant nodes of a given node ID */
  const closeDescendants = (nodeId: string) => {
    const node = tree.findNodeById(nodeId)
    if (!node) return

    const descendants = tree.traverse("dfs", node)

    for (const descendant of descendants) {
      if (descendant.id === nodeId) continue

      const context = nodesMap.get(descendant.id)
      if (context?.open.value) {
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

    const treeNode = tree.addNode({}, parentId)
    if (!treeNode) {
      console.error("[useFloatingTree] registerNode: Failed to add node to tree.")
      return null
    }

    const nodeId = treeNode.id

    const context = useFloating(reference, floating, {
      ...options,
      nodeId,
    })

    nodesMap.set(nodeId, context)

    // Watch the open state of this new node to close its descendants
    // Use { flush: 'post' } to ensure tree structure updates are processed before closing logic runs
    const stopOpenWatcher = watch(
      context.open,
      (isOpen) => {
        if (!isOpen) {
          closeDescendants(nodeId)
        }
      },
      { flush: "post" }
    )

    // Add cleanup for this specific node's watcher
    // This might be better handled within unregisterNode or a dedicated cleanup map
    // For now, associate cleanup with the context itself (might be slightly hacky)
    ;(context as any)._stopOpenWatcher = stopOpenWatcher

    return { nodeId, context }
  }

  const unregisterNode = (nodeId: string): void => {
    const context = nodesMap.get(nodeId)

    // Stop any watchers associated with this node
    if (context && (context as any)._stopOpenWatcher) {
      ;(context as any)._stopOpenWatcher()
      ;(context as any)._stopOpenWatcher = undefined
    }

    // Remove from the map *before* removing from the tree
    // This prevents potential issues if tree removal triggers other reactive effects
    nodesMap.delete(nodeId)

    // Remove node from the tree (this will handle recursive cleanup based on options)
    const removed = tree.removeNode(nodeId)
    if (!removed) {
      // Node might have already been removed by parent's recursive delete
    }
  }

  const getNodeContext = (nodeId: string): FloatingContext | undefined => {
    return nodesMap.get(nodeId)
  }

  const getTreeNode = (nodeId: string): TreeNode<FloatingNodeData> | null => {
    return tree.findNodeById(nodeId)
  }

  // --- Provide Context ---

  const treeContext: FloatingTreeContext = {
    tree,
    registerNode,
    unregisterNode,
    getNodeContext,
    getTreeNode,
  }
  provide(FLOATING_TREE_CONTEXT_KEY, treeContext)

  onScopeDispose(() => {
    for (const context of nodesMap) {
      ;(context as any)._stopOpenWatcher?.()
    }
    nodesMap.clear()
  })

  return {
    ...treeContext,
    nodes: readonly(nodesMap),
  }
}

//=======================================================================================
// 📌 useFloatingNode
//=======================================================================================

/**
 * Helper composable to be used within a component representing a single floating element
 * within a `useFloatingTree`. It handles registration, unregistration, and context provision.
 *
 * @param reference The reference element Ref for this floating node.
 * @param floating The floating element Ref for this node.
 * @param options Options for the `useFloating` instance specific to this node.
 * @returns The `FloatingContext` for this specific node, or null if registration fails.
 */
export function useFloatingNode(
  reference: Ref<HTMLElement | null>,
  floating: Ref<HTMLElement | null>,
  options: UseFloatingOptions = {}
): { nodeId: string; context: FloatingContext } {
  const treeContext = inject(FLOATING_TREE_CONTEXT_KEY, null)
  const parentContext = inject(FLOATING_PARENT_NODE_CONTEXT_KEY, null)

  if (!treeContext) {
    throw new Error("[useFloatingNode] must be a descendant of useFloatingTree.")
  }

  // Register the node

  const parentId = parentContext?.parentId ?? treeContext.tree.root.id
  const registrationResult = treeContext.registerNode(parentId, reference, floating, options)

  if (!registrationResult) {
    throw new Error("[useFloatingNode] Failed to register node with the tree.")
  }

  const { context, nodeId } = registrationResult

  // Provide context for children
  provide(FLOATING_PARENT_NODE_CONTEXT_KEY, { parentId: nodeId })

  // Unregister on scope dispose
  onScopeDispose(() => {
    treeContext.unregisterNode(nodeId)
  })

  return {
    nodeId,
    context,
  }
}
