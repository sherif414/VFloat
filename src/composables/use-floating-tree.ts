import type { InjectionKey, Ref } from "vue"
import { inject, provide, ref } from "vue"
import type { FloatingContext } from "./use-floating"

//=======================================================================================
// 📌 Constants
//=======================================================================================

export const FLOATING_TREE_INJECTION_KEY = Symbol() as InjectionKey<FloatingTreeData>

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Composable function that manages a tree structure for floating elements
 *
 * This composable provides functionality to manage a hierarchical structure of floating elements.
 * It uses Vue's provide/inject system to share floating tree data across components.
 *
 * @returns The floating tree data object containing:
 * - nodesRef: Reference to an array of floating nodes with their IDs, parent IDs, and contexts
 * - parent: Reference to the parent HTML element
 * - nodeId: Optional string identifier for the current node
 *
 * @example
 * ```ts
 * const tree = useFloatingTree()
 * // Access tree data
 * tree.nodesRef.value
 * tree.parent.value
 * ```
 */
export function useFloatingTree(): FloatingTreeData | null {
  const tree = inject(FLOATING_TREE_INJECTION_KEY, null)
  if (tree) return tree

  const treeData: FloatingTreeData = {
    nodesRef: ref([]),
    parent: ref(null),
  }

  provide(FLOATING_TREE_INJECTION_KEY, treeData)

  return treeData
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Interface representing a floating node in the tree
 */
export interface FloatingNode {
  /**
   * The unique identifier for the floating node
   */
  id: string
  /**
   * The identifier of the parent node
   */
  parentId: string | null
  /**
   * The context of the floating node
   */
  context: FloatingContext | null
}

/**
 * Data structure for a floating tree.
 */
export interface FloatingTreeData {
  /**
   * Reference to an array of floating nodes
   */
  nodesRef: Ref<Array<FloatingNode>>

  /**
   * Reference to the parent HTML element
   */
  parent: Ref<HTMLElement | null>

  /**
   * Optional identifier for the current node
   */
  nodeId?: string
}
