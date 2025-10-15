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
import type { Tree, TreeNode } from "@/composables/use-floating-tree"
import { isMac, isSafari, isTargetWithinElement, isTypeableElement, matchesFocusVisible } from "@/utils"

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
 * Enables showing/hiding the floating element when the reference element receives or loses focus.
 *
 * Keyboard-only interaction hook. Compose with `useClick`, `useHover`, `useEscapeKey` for a complete UX.
 *
 * Tree-aware behavior is enabled by providing a `tree` option and passing the corresponding
 * FloatingContext (i.e., the node's `.data`). IDs are only relevant for tree-aware usage and are
 * automatically assigned when using `useFloatingTree().addNode(...)`.
 *
 * @param context - The floating context for this element (not a TreeNode).
 * @param options - Configuration options. Provide `tree` to enable tree-aware behavior.
 *
 * @example Standalone
 * ```ts
 * const ctx = useFloating(...)
 * useFocus(ctx)
 * ```
 *
 * @example Tree-aware
 * ```ts
 * const tree = useFloatingTree(rootAnchor, rootFloating)
 * const parent = tree.root
 * const child = tree.addNode(childAnchor, childFloating, { parentId: parent.id })
 *
 * useFocus(parent.data, { tree })
 * useFocus(child.data, { tree })
 * ```
 */

export function useFocus(
  context: FloatingContext,
  options: UseFocusOptions = {}
): UseFocusReturn {
  const {
    open,
    setOpen,
    refs: { floatingEl, anchorEl: _anchorEl },
  } = context

  const { enabled = true, requireFocusVisible = true, tree } = options

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

  // Select focus strategy based on explicit tree option
  let focusStrategy: FocusStrategy = new StandaloneFocusStrategy(floatingEl)
  if (tree) {
    let node: TreeNode<FloatingContext> | null = null
    // Prefer lookup by id when provided
    if (context.id) {
      node = tree.findNodeById(context.id)
    }
    // Fallback: resolve by reference equality if id is missing or not found
    if (!node) {
      for (const candidate of tree.nodeMap.values()) {
        if (candidate.data === context) {
          node = candidate
          break
        }
      }
    }
    if (node) {
      focusStrategy = new TreeAwareFocusStrategy(node)
    } else if (import.meta.env?.DEV) {
      console.warn(
        `[useFocus] 'tree' provided but could not resolve node for the given context. Falling back to standalone behavior.`
      )
    }
  }

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
      setOpen(true, "focus", event)
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
        if (activeEl instanceof Element) {
          const ancestorsToClose = focusStrategy.getAncestorsToClose(activeEl)
          for (const node of ancestorsToClose) {
            try {
              node.data.setOpen(false, "tree-ancestor-close", event)
            } catch (e) {
              console.error("[useFocus] Error closing ancestor on blur:", e)
            }
          }
        }
        setOpen(false, "blur", event)
      } catch (error) {
        console.error("[useFocus] Error in onBlur handler:", error)
      }
    }, BLUR_CHECK_DELAY)
  }

  // In addition to element-level blur, observe focus changes at the document level
  // to handle cases where focus moves between descendants and outside elements
  // without triggering another blur on the original anchor.
  useEventListener(
    document,
    "focusin",
    (evt: FocusEvent) => {
      if (!toValue(enabled)) return
      const target = evt.target
      if (!(target instanceof Element)) return

      // Ignore focus entering the anchor itself
      const anchor = anchorEl.value
      if (anchor && isTargetWithinElement(target, anchor)) return

      if (focusStrategy.shouldRemainOpen(target)) return

      try {
        const ancestorsToClose = focusStrategy.getAncestorsToClose(target)
        for (const node of ancestorsToClose) {
          try {
            node.data.setOpen(false, "tree-ancestor-close", evt)
          } catch (e) {
            console.error("[useFocus] Error closing ancestor on focusin:", e)
          }
        }
        setOpen(false, "blur", evt)
      } catch (error) {
        console.error("[useFocus] Error in document focusin handler:", error)
      }
    },
    { capture: true }
  )

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
   * When provided, enables tree-aware focus handling.
   */
  tree?: Tree<FloatingContext>
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
