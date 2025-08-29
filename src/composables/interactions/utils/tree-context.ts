/**
 * @fileoverview Tree-aware context utilities for floating UI composables
 *
 * Provides utilities for handling tree-aware floating element contexts,
 * parameter extraction, and hierarchical element detection.
 */

import type { FloatingContext } from "@/composables"
import type { TreeNode } from "@/composables/use-tree"

/**
 * Type guard to determine if the context parameter is a TreeNode.
 * @param context - The context parameter to check
 * @returns True if the context is a TreeNode
 */
export function isTreeNode(
  context: FloatingContext | TreeNode<FloatingContext>
): context is TreeNode<FloatingContext> {
  return (
    context !== null &&
    typeof context === "object" &&
    "data" in context &&
    "id" in context &&
    "children" in context &&
    "parent" in context
  )
}

/**
 * Extracts floating context and tree context from the parameter.
 * @param context - Either a FloatingContext or TreeNode<FloatingContext>
 * @returns Object containing both floating context and optional tree context
 */
export function getContextFromParameter(context: FloatingContext | TreeNode<FloatingContext>): {
  floatingContext: FloatingContext
  treeContext: TreeNode<FloatingContext> | null
} {
  if (isTreeNode(context)) {
    return {
      floatingContext: context.data,
      treeContext: context,
    }
  }
  return {
    floatingContext: context,
    treeContext: null,
  }
}

/**
 * Checks if a target node is within an anchor or floating element, handling VirtualElement.
 * @param target - The target node to check
 * @param element - The element to check containment against (can be VirtualElement or null)
 * @returns True if the target is within the element
 */
export function isTargetWithinElement(target: Node, element: unknown): boolean {
  if (!element) return false

  // Handle VirtualElement (has contextElement)
  if (typeof element === "object" && element !== null && "contextElement" in element) {
    const contextElement = element.contextElement
    if (contextElement instanceof Element) {
      return contextElement.contains(target)
    }
    return false
  }

  // Handle regular Element
  if (element instanceof Element) {
    return element.contains(target)
  }

  return false
}

/**
 * Finds a descendant node that contains the target element.
 * @param node - The parent node to search from
 * @param target - The target element to find
 * @returns The descendant node containing the target, or null
 */
export function findDescendantContainingTarget(
  node: TreeNode<FloatingContext>,
  target: Node
): TreeNode<FloatingContext> | null {
  for (const child of node.children.value) {
    if (child.data.open.value) {
      if (
        isTargetWithinElement(target, child.data.refs.anchorEl.value) ||
        isTargetWithinElement(target, child.data.refs.floatingEl.value)
      ) {
        return child
      }

      // Recursively check descendants
      const descendant = findDescendantContainingTarget(child, target)
      if (descendant) return descendant
    }
  }
  return null
}
