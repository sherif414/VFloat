import type { VirtualElement } from "@floating-ui/dom"
import { type InjectionKey, type Ref, inject, onScopeDispose, provide } from "vue"
import type { FloatingContext, UseFloatingOptions } from "./use-floating"
import { FLOATING_TREE_INJECTION_KEY, type FloatingParentNodeContext } from "./use-floating-tree"

//=======================================================================================
// 📌 Constants
//=======================================================================================

/**
 * Injection key for providing floating parent node context to children
 */
export const FLOATING_PARENT_NODE_INJECTION_KEY = Symbol(
  "FloatingParentNodeContext"
) as InjectionKey<FloatingParentNodeContext>

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Return value of the useFloatingNode composable
 */
export interface UseFloatingNodeReturn {
  /**
   * Unique ID for this floating node
   */
  nodeId: string

  /**
   * Floating context for this node
   */
  context: FloatingContext
}

//=======================================================================================
// 📌 Main Logic / Primary Export(s)
//=======================================================================================

/**
 * Helper composable to be used within a component representing a single floating element
 * within a `useFloatingTree`. It handles registration, unregistration, and context provision.
 *
 * @param reference The reference element Ref for this floating node.
 * @param floating The floating element Ref for this node.
 * @param options Options for the `useFloating` instance specific to this node.
 * @returns The nodeId and context for this specific floating node.
 * @throws Error if not used within a useFloatingTree context.
 */
export function useFloatingNode(
  reference: Ref<HTMLElement | VirtualElement | null>,
  floating: Ref<HTMLElement | null>,
  options: UseFloatingOptions = {}
): UseFloatingNodeReturn {
  const tree = inject(FLOATING_TREE_INJECTION_KEY, null)
  const parentNode = inject(FLOATING_PARENT_NODE_INJECTION_KEY, null)

  if (!tree) {
    throw new Error("[useFloatingNode] must be a descendant of useFloatingTree.")
  }

  const parentId = parentNode?.parentId ?? tree.tree.root.id
  const node = tree.registerNode(parentId, reference, floating, options)

  if (!node) {
    throw new Error("[useFloatingNode] Failed to register node with the tree.")
  }

  const { context, nodeId } = node

  provide(FLOATING_PARENT_NODE_INJECTION_KEY, { parentId: nodeId })

  onScopeDispose(() => {
    tree.unregisterNode(nodeId)
  })

  return {
    nodeId,
    context,
  }
}
