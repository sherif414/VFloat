import { useEventListener } from "@vueuse/core"
import {
  computed,
  type MaybeRefOrGetter,
  onMounted,
  onScopeDispose,
  onWatcherCleanup,
  toValue,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables"
import type { TreeNode } from "@/composables/use-tree"
import {
  getContextFromParameter,
  isMac,
  isSafari,
  isTargetWithinElement,
  isTypeableElement,
  matchesFocusVisible,
} from "./utils"

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

/**
 * Enables showing/hiding the floating element when focusing the reference element.
 *
 * This composable is responsible for KEYBOARD-ONLY interactions. For a complete user experience,
 * it should be composed with other hooks like `useClick`, `useHover`, and `useEscapeKey`.
 *
 * The composable supports both standalone usage with FloatingContext and tree-aware
 * usage with TreeNode<FloatingContext> for complex nested floating UI structures.
 *
 * @param context - The floating context or tree node with open state and change handler.
 * @param options - Configuration options for focus behavior.
 *
 * @example Basic standalone usage
 * ```ts
 * const context = useFloating(...)
 * useFocus(context, {
 *   enabled: true,
 *   requireFocusVisible: true
 * })
 * ```
 *
 * @example Tree-aware usage for nested floating elements
 * ```ts
 * const tree = useFloatingTree(rootContext)
 * const parentNode = tree.root
 * const childNode = tree.addNode(childContext, parentNode.id)
 *
 * // Tree-aware behavior: parent stays open when focus moves to child,
 * // but closes when focus moves outside hierarchy
 * useFocus(parentNode, { requireFocusVisible: true })
 * useFocus(childNode, { requireFocusVisible: true })
 * ```
 */
export function useFocus(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseFocusOptions = {}
): UseFocusReturn {
  // Extract floating context from either standalone context or tree node
  const { floatingContext, treeContext } = getContextFromParameter(context)
  const {
    open,
    setOpen,
    refs: { floatingEl, anchorEl: _anchorEl },
  } = floatingContext

  const { enabled = true, requireFocusVisible = true } = options
  const anchorEl = computed(() => {
    if (!_anchorEl.value) return null
    return _anchorEl.value instanceof HTMLElement ? _anchorEl.value : _anchorEl.value.contextElement
  })

  let isFocusBlocked = false
  let keyboardModality = true // Assume keyboard modality initially.
  let timeoutId: number

  // --- Window Event Listeners for Edge Cases ---

  // 1. Blocks the floating element from opening when a user switches back to a
  //    tab where the reference element was focused but the popover was closed.
  useEventListener(window, "blur", () => {
    if (!open.value && anchorEl.value && anchorEl.value === document.activeElement) {
      isFocusBlocked = true
    }
  })

  // 2. Resets the block when the window regains focus.
  useEventListener(window, "focus", () => {
    isFocusBlocked = false
  })

  // 3. Safari `:focus-visible` polyfill. Tracks if the last interaction was
  //    from a keyboard or a pointer to correctly apply focus-visible logic.
  onMounted(() => {
    if (isMac() && isSafari()) {
      useEventListener(
        window,
        "keydown",
        () => {
          keyboardModality = true
        },
        { capture: true }
      )
      useEventListener(
        window,
        "pointerdown",
        () => {
          keyboardModality = false
        },
        { capture: true }
      )
    }
  })

  // --- Element Event Handlers ---
  function onFocus(event: FocusEvent): void {
    if (isFocusBlocked) {
      isFocusBlocked = false
      return
    }

    const target = event.target as Element | null
    if (toValue(requireFocusVisible) && target) {
      // Safari fails to match `:focus-visible` if focus was initially outside
      // the document. This is a workaround.
      if (isMac() && isSafari() && !event.relatedTarget) {
        if (!keyboardModality && !isTypeableElement(target)) {
          return // Do not open if interaction was pointer-based on a non-typeable element.
        }
      } else if (!matchesFocusVisible(target)) {
        return // Standard check for other browsers.
      }
    }

    setOpen(true)
  }

  function onBlur(event: FocusEvent): void {
    // Clear any existing timeout from a previous blur event.
    clearTimeout(timeoutId)

    // Use a timeout to check the activeElement in the next event loop tick.
    // This is more reliable than `event.relatedTarget` for complex cases
    // like Shadow DOM or when focus is programmatically moved.
    timeoutId = window.setTimeout(() => {
      const ownerDocument = anchorEl.value?.ownerDocument ?? document
      const activeEl = ownerDocument.activeElement

      // Case 1: Focus has left the window entirely, but the browser is tricky
      // and hasn't blurred the window yet. If `relatedTarget` is null but focus
      // is still on the anchor, we assume focus is about to leave, so don't close.
      if (!event.relatedTarget && activeEl === anchorEl.value) {
        return
      }

      // Tree-aware focus checking
      if (treeContext) {
        if (activeEl && isFocusWithinNodeHierarchy(treeContext, activeEl)) {
          return // Focus is within hierarchy - keep open
        }
      } else {
        // Case 2: Focus has moved to an element within the floating element.
        // This is the primary way we keep it open during keyboard navigation.
        if (floatingEl.value && activeEl && floatingEl.value.contains(activeEl)) {
          return
        }
      }

      // If neither of the above conditions are met, focus has moved elsewhere,
      // so it's safe to close the floating element.
      setOpen(false)
    }, 0)
  }

  // --- Attach Listeners to the Anchor Element ---
  watchPostEffect(() => {
    if (!toValue(enabled)) return
    const el = anchorEl.value
    if (!el || !(el instanceof HTMLElement)) return

    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)

    onWatcherCleanup(() => {
      el.removeEventListener("focus", onFocus)
      el.removeEventListener("blur", onBlur)
    })
  })

  // Ensure the timeout is cleared if the component unmounts.
  onScopeDispose(() => {
    clearTimeout(timeoutId)
  })
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseFocusOptions {
  /**
   * Whether focus event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether the open state only changes if the focus event is considered
   * visible (`:focus-visible` CSS selector).
   * @default true
   */
  requireFocusVisible?: MaybeRefOrGetter<boolean>
}

/**
 * Return value of the useFocus composable
 */
export type UseFocusReturn = undefined

//=======================================================================================
// 📌 Tree-Aware Logic Helpers
//=======================================================================================

/**
 * Determines if focus is within the current node's hierarchy.
 *
 * Returns true if focus is on the current node or any of its descendants,
 * false if focus is outside the hierarchy.
 *
 * @param currentNode - The tree node to check against
 * @param target - The focused element
 * @returns True if focus is within the node hierarchy
 */
function isFocusWithinNodeHierarchy(
  currentNode: TreeNode<FloatingContext>,
  target: Element
): boolean {
  // Check if focus is within current node's elements
  if (
    isTargetWithinElement(target, currentNode.data.refs.anchorEl.value) ||
    isTargetWithinElement(target, currentNode.data.refs.floatingEl.value)
  ) {
    return true // Focus on current node
  }

  // Check if focus is within any descendant
  const descendantNode = findDescendantContainingFocus(currentNode, target)
  return descendantNode !== null
}

/**
 * Finds a descendant node that contains the focused element.
 * @param node - The parent node to search from
 * @param target - The focused element to find
 * @returns The descendant node containing the target, or null
 */
function findDescendantContainingFocus(
  node: TreeNode<FloatingContext>,
  target: Element
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
      const descendant = findDescendantContainingFocus(child, target)
      if (descendant) return descendant
    }
  }
  return null
}
