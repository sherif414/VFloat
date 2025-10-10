import { useEventListener } from "@vueuse/core"
import {
  computed,
  type MaybeRefOrGetter,
  onMounted,
  onScopeDispose,
  onWatcherCleanup,
  type Ref,
  toValue,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables"
import type { TreeNode } from "@/composables/use-floating-tree"
import {
  getContextFromParameter,
  isMac,
  isSafari,
  isTargetWithinElement,
  isTypeableElement,
  matchesFocusVisible,
} from "@/utils"

//=======================================================================================
// 📌 Constants
//=======================================================================================

/**
 * Delay in milliseconds for checking active element after blur event.
 * Using 0ms ensures check happens in next event loop tick, which is more
 * reliable than relatedTarget for Shadow DOM and programmatic focus changes.
 */
const BLUR_CHECK_DELAY = 0

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

  const {
    enabled = true,
    requireFocusVisible = true,
    closeAncestorsOnOutsideFocus = true,
  } = options

  /**
   * Computed anchor element that handles both HTMLElement and virtual element references.
   * Virtual elements (from libraries like Floating UI) use a `contextElement` property
   * to reference the actual DOM element for positioning calculations.
   */
  const anchorEl = computed(() => {
    if (!_anchorEl.value) return null
    return _anchorEl.value instanceof HTMLElement ? _anchorEl.value : _anchorEl.value.contextElement
  })

  let isFocusBlocked = false
  let keyboardModality = true // Assume keyboard modality initially.
  const isSafariOnMac = isMac() && isSafari()
  let timeoutId: number

  // Select focus strategy based on context type
  const focusStrategy: FocusStrategy = treeContext
    ? new TreeAwareFocusStrategy(treeContext)
    : new StandaloneFocusStrategy(floatingEl)

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
    if (isSafariOnMac) {
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

    const target = event.target instanceof Element ? event.target : null
    if (toValue(requireFocusVisible) && target) {
      // Safari fails to match `:focus-visible` if focus was initially outside
      // the document. This is a workaround.
      if (isSafariOnMac && !event.relatedTarget) {
        if (!keyboardModality && !isTypeableElement(target)) {
          return // Do not open if interaction was pointer-based on a non-typeable element.
        }
      } else if (!matchesFocusVisible(target)) {
        return // Standard check for other browsers.
      }
    }

    try {
      setOpen(true)
    } catch (error) {
      console.error("[useFocus] Error in onFocus handler:", error)
    }
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

      // Case 2: Delegate to focus strategy to determine if we should remain open
      if (focusStrategy.shouldRemainOpen(activeEl)) {
        return
      }

      // If neither of the above conditions are met, focus has moved elsewhere.
      try {
        // Close ancestors that do not contain the new focus (strategy-provided)
        if (activeEl instanceof Element && toValue(closeAncestorsOnOutsideFocus)) {
          const ancestorsToClose = focusStrategy.getAncestorsToClose(activeEl)
          for (const node of ancestorsToClose) {
            try {
              node.data.setOpen(false)
            } catch (e) {
              console.error("[useFocus] Error closing ancestor on blur:", e)
            }
          }
        }
        setOpen(false)
      } catch (error) {
        console.error("[useFocus] Error in onBlur handler:", error)
      }
    }, BLUR_CHECK_DELAY)
  }

  // --- Attach Listeners to the Anchor Element ---
  const removeWatcher = watchPostEffect(() => {
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

  return {
    /**
     * Cleanup function that removes all event listeners and clears pending timeouts.
     * Useful for manual cleanup in testing scenarios.
     */
    cleanup: () => {
      clearTimeout(timeoutId)
      removeWatcher()
    },
  }
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

  /**
   * In tree-aware mode, also close ancestors whose subtree does not contain the new focus
   * when focus moves outside the current node's hierarchy.
   * @default true
   */
  closeAncestorsOnOutsideFocus?: MaybeRefOrGetter<boolean>
}

/**
 * Return value of the useFocus composable
 */
export interface UseFocusReturn {
  /**
   * Cleanup function that removes all event listeners and clears pending timeouts.
   * Useful for manual cleanup in testing scenarios.
   */
  cleanup: () => void
}

//=======================================================================================
// 📌 Focus Strategy Pattern
//=======================================================================================

/**
 * Strategy interface for determining if focus should remain on the floating element
 */
interface FocusStrategy {
  shouldRemainOpen(activeEl: Element | null): boolean
  getAncestorsToClose(target: Element): TreeNode<FloatingContext>[]
}

/**
 * Standalone focus strategy - checks if focus is within the floating element only
 */
class StandaloneFocusStrategy implements FocusStrategy {
  constructor(private floatingEl: Ref<HTMLElement | null>) {}

  shouldRemainOpen(activeEl: Element | null): boolean {
    if (!activeEl || !this.floatingEl.value) return false
    return this.floatingEl.value.contains(activeEl)
  }

  getAncestorsToClose(_target: Element): TreeNode<FloatingContext>[] {
    return []
  }
}

/**
 * Tree-aware focus strategy - checks if focus is within the node hierarchy
 */
class TreeAwareFocusStrategy implements FocusStrategy {
  constructor(private treeContext: TreeNode<FloatingContext>) {}

  shouldRemainOpen(activeEl: Element | null): boolean {
    if (!activeEl) return false
    return this.isFocusWithinNodeHierarchy(this.treeContext, activeEl)
  }

  /**
   * Returns a list of ancestors (starting from the immediate parent upward) that do not
   * contain the provided target within their subtree. Useful for closing ancestors when
   * focus moves outside the current branch.
   */
  getAncestorsToClose(target: Element): TreeNode<FloatingContext>[] {
    const toClose: TreeNode<FloatingContext>[] = []
    let ancestor = this.treeContext.parent.value
    while (ancestor) {
      const contains = this.isFocusWithinNodeHierarchy(ancestor, target)
      if (!contains) {
        toClose.push(ancestor)
        ancestor = ancestor.parent.value
        continue
      }
      break // Stop once we find an ancestor whose subtree contains the target
    }
    return toClose
  }

  private isFocusWithinNodeHierarchy(
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
    const descendantNode = this.findDescendantContainingFocus(currentNode, target)
    return descendantNode !== null
  }

  private findDescendantContainingFocus(
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
        const descendant = this.findDescendantContainingFocus(child, target)
        if (descendant) return descendant
      }
    }
    return null
  }
}
