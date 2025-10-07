import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, ref, toValue } from "vue"
import type { FloatingContext } from "@/composables"
import type { TreeNode } from "@/composables/use-floating-tree"
import { getContextFromParameter } from "@/utils"

// =======================================================================================
// 📌 Types
// =======================================================================================

export interface UseEscapeKeyOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to use capture phase for document event listeners.
   * @default false
   */
  capture?: boolean

  /**
   * Custom callback function to be executed when the escape key is pressed.
   * When provided, overrides default behavior.
   */
  onEscape?: (event: KeyboardEvent) => void
}

// =======================================================================================
// 📌 Composition
// =======================================================================================

/**
 * A composable to handle the escape key press with tree-aware behavior and composition event handling.
 *
 * When passed a FloatingContext, it will close that floating element by setting open to false.
 * When passed a TreeNode<FloatingContext>, it will find and close the topmost open node in the tree.
 *
 * @param context - The floating context or tree node with open state and change handler.
 * @param options - {@link UseEscapeKeyOptions}
 *
 * @example Basic standalone usage
 * ```ts
 * const context = useFloating(...)
 * useEscapeKey(context) // Closes the floating element on escape
 * ```
 *
 * @example Tree-aware usage
 * ```ts
 * const tree = useFloatingTree(...)
 * const childNode = tree.addNode(...)
 * useEscapeKey(childNode) // Closes the topmost open node in the tree
 * ```
 *
 * @example Custom handler
 * ```ts
 * useEscapeKey(context, {
 *   onEscape: (event) => {
 *     if (hasUnsavedChanges.value) {
 *       showConfirmDialog.value = true
 *     } else {
 *       context.setOpen(false)
 *     }
 *   }
 * })
 * ```
 */
export function useEscapeKey(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseEscapeKeyOptions = {}
): void {
  // Extract context information
  const { floatingContext, treeContext } = getContextFromParameter(context)
  const { enabled = true, capture = false, onEscape } = options
  const { isComposing } = useComposition()

  // Enhanced escape handler with tree-aware logic
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !toValue(enabled) || isComposing()) {
      return
    }

    // Use custom handler if provided
    if (onEscape) {
      onEscape(event)
      return
    }

    // Default behavior based on context type
    if (treeContext) {
      // Tree-aware behavior: close topmost open node
      const topmostNode = getTopmostOpenNodeInTree(treeContext)
      if (topmostNode) {
        topmostNode.data.setOpen(false)
      }
    } else {
      // Standalone behavior: close current context
      floatingContext.setOpen(false)
    }
  }

  // Event listener setup
  useEventListener(document, "keydown", handleEscape, capture)
}

// =======================================================================================
// 📌 Helper Functions
// =======================================================================================

/**
 * Finds the topmost open node from any node in the tree by navigating to root
 * and then traversing to find the deepest open node.
 */
function getTopmostOpenNodeInTree(
  node: TreeNode<FloatingContext>
): TreeNode<FloatingContext> | null {
  // Navigate to root of the tree
  let rootNode = node
  while (rootNode.parent.value && !rootNode.isRoot) {
    rootNode = rootNode.parent.value
  }

  // Find topmost (deepest) open node from root
  let topmostNode: TreeNode<FloatingContext> | null = null
  let maxLevel = -1

  const traverseNode = (currentNode: TreeNode<FloatingContext>) => {
    if (currentNode.data.open.value) {
      const level = currentNode.getPath().length
      if (level > maxLevel) {
        maxLevel = level
        topmostNode = currentNode
      }
    }

    for (const child of currentNode.children.value) {
      traverseNode(child)
    }
  }

  traverseNode(rootNode)
  return topmostNode
}

function useComposition() {
  const isComposing = ref(false)

  useEventListener(document, "compositionstart", () => {
    isComposing.value = true
  })

  useEventListener(document, "compositionend", () => {
    isComposing.value = false
  })

  return {
    isComposing: () => isComposing.value,
  }
}
