import { useEventListener } from "@vueuse/core"
import { tabbable } from "tabbable"
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  onWatcherCleanup,
  ref,
  toValue,
  watch,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { TreeNode } from "@/composables/positioning/use-floating-tree"
import {
  findDescendantContainingTarget,
  getContextFromParameter,
  isHTMLElement,
  isTargetWithinElement,
  isVirtualElement,
} from "@/utils"

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseFocusTrapOptions {
  /** Enables the focus trap when true. @default true */
  enabled?: MaybeRefOrGetter<boolean>
  /** When true, hides/inerts content outside the trap. @default false */
  modal?: MaybeRefOrGetter<boolean>
  /** When true, inserts hidden focus guards to aid wrap-around. @default true */
  guards?: MaybeRefOrGetter<boolean>
  /** Wrap order preference when cycling with Tab. @default ['content'] */
  order?: MaybeRefOrGetter<Array<"content" | "reference" | "floating">>
  /** Initial focus target policy on activation. @default 'first' */
  initialFocus?: MaybeRefOrGetter<
    number | HTMLElement | (() => HTMLElement | null) | "first" | "last"
  >
  /** Returns focus to previously focused element on deactivate. @default true */
  returnFocus?: MaybeRefOrGetter<boolean>
  /** Restores focus to nearest tabbable if active node disappears. @default false */
  restoreFocus?: MaybeRefOrGetter<boolean>
  /** On non-modal, close when focus escapes the trap. @default false */
  closeOnFocusOut?: MaybeRefOrGetter<boolean>
  /** Pass preventScroll to focus operations. @default true */
  preventScroll?: MaybeRefOrGetter<boolean>
  /** Apply `inert` (when supported) to outside elements while modal. @default false */
  outsideElementsInert?: MaybeRefOrGetter<boolean>
}

export interface UseFocusTrapReturn {
  cleanup: () => void
}

//=======================================================================================
// 📌 Constants & State Management
//=======================================================================================

// WeakMap for storing element state - better performance and memory management
const ariaHiddenStateMap = new WeakMap<HTMLElement, string | null>()
const inertStateMap = new WeakMap<HTMLElement, boolean | null>()

// Check for inert support once
const supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype

//=======================================================================================
// 📌 Helper Functions
//=======================================================================================

/**
 * Safely gets tabbable elements from a root element.
 * Catches errors from the tabbable library to prevent crashes.
 */
function getTabbableElements(root: HTMLElement): HTMLElement[] {
  try {
    return tabbable(root, { displayCheck: "full", includeContainer: false }) as HTMLElement[]
  } catch {
    return []
  }
}

/**
 * Safely focuses an element with consistent preventScroll handling.
 */
function focusElement(
  el: HTMLElement | null,
  preventScroll: boolean
): void {
  if (!el || !el.isConnected) return
  try {
    el.focus({ preventScroll })
  } catch {
    // Element might not be focusable or in a bad state
  }
}

/**
 * Ensures a container element is focusable by setting tabindex="-1" if needed.
 * Returns a cleanup function that restores the original state.
 */
function ensureContainerFocusable(el: HTMLElement): () => void {
  const hadTabindex = el.hasAttribute("tabindex")
  const prevValue = el.getAttribute("tabindex")
  
  if (!hadTabindex) {
    el.setAttribute("tabindex", "-1")
  }
  
  return () => {
    if (!hadTabindex) {
      el.removeAttribute("tabindex")
    } else if (prevValue != null) {
      el.setAttribute("tabindex", prevValue)
    }
  }
}

/**
 * Creates a hidden focus guard element for tab wrapping.
 */
function createGuard(): HTMLElement {
  const g = document.createElement("div")
  g.setAttribute("tabindex", "0")
  g.setAttribute("aria-hidden", "true")
  g.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;"
  return g
}

/**
 * Checks if an element is valid and connected to the DOM.
 */
function isElementValid(el: HTMLElement | null): boolean {
  return !!el && el.isConnected && el.ownerDocument.contains(el)
}

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

/**
 * Traps keyboard focus within the floating element, optionally in a modal manner.
 *
 * @param context - FloatingContext or TreeNode<FloatingContext> to trap within
 * @param options - Configuration options controlling trap behavior
 * @returns Cleanup API
 *
 * @example Basic usage
 * ```ts
 * const context = useFloating(anchorEl, floatingEl)
 * useFocusTrap(context, { modal: true })
 * ```
 *
 * @example With useListNavigation
 * ```ts
 * const context = useFloating(anchorEl, floatingEl)
 * useListNavigation(context, { listRef: items, activeIndex })
 * useFocusTrap(context) // Focus trap wraps the list navigation
 * ```
 *
 * @example Tree-aware nested traps
 * ```ts
 * const tree = useFloatingTree()
 * const node = tree.addNode(anchorEl, floatingEl)
 * useFocusTrap(node, { modal: true }) // Only deepest open node traps focus
 * ```
 */
export function useFocusTrap(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseFocusTrapOptions = {}
): UseFocusTrapReturn {
  const { floatingContext, treeContext } = getContextFromParameter(context)
  const {
    refs: { floatingEl, anchorEl },
    open,
    setOpen,
  } = floatingContext

  // Normalize options to computed refs for reactivity
  const {
    enabled = true,
    modal = false,
    guards = true,
    order = ["content"],
    initialFocus = "first",
    returnFocus = true,
    restoreFocus = false,
    closeOnFocusOut = false,
    preventScroll = true,
    outsideElementsInert = false,
  } = options

  const isEnabled = computed(() => !!toValue(enabled))
  const isModal = computed(() => !!toValue(modal))
  const useGuards = computed(() => !!toValue(guards))
  const wrapOrder = computed<Array<"content" | "reference" | "floating">>(() => {
    const val = toValue(order)
    return Array.isArray(val) ? val : ["content"]
  })
  const shouldReturnFocus = computed(() => !!toValue(returnFocus))
  const shouldRestoreFocus = computed(() => !!toValue(restoreFocus))
  const shouldCloseOnFocusOut = computed(() => !!toValue(closeOnFocusOut))
  const focusPreventScroll = computed(() => !!toValue(preventScroll))
  const shouldInertOutside = computed(() => !!toValue(outsideElementsInert))

  const containerEl = computed<HTMLElement | null>(() => floatingEl.value)

  // State management
  const previouslyFocused = ref<HTMLElement | null>(null)
  const tabbableIndexRef = ref(-1)
  let skipReturnFocus = false

  // Guard elements (persistent, created once)
  let beforeGuard: HTMLElement | null = null
  let afterGuard: HTMLElement | null = null
  let beforeGuardCleanup: (() => void) | null = null
  let afterGuardCleanup: (() => void) | null = null

  // Cleanup functions
  let restoreContainerTabindex: (() => void) | null = null
  let restoreOutsideState: (() => void) | null = null

  // Cached tree check - only recompute when tree structure changes
  const isDeepestOpen = computed(() => {
    if (!treeContext) return true
    return !hasOpenDescendant(treeContext)
  })

  /**
   * Recursively checks if a node has any open descendants.
   */
  function hasOpenDescendant(node: TreeNode<FloatingContext>): boolean {
    for (const child of node.children.value) {
      if (child.data.open.value) return true
      if (hasOpenDescendant(child)) return true
    }
    return false
  }

  /**
   * Checks if focus is within the node hierarchy (for tree-aware behavior).
   */
  function isFocusInsideNodeHierarchy(target: Element): boolean {
    if (!treeContext) {
      return !!containerEl.value && containerEl.value.contains(target)
    }
    
    if (isTargetWithinElement(target, treeContext.data.refs.anchorEl.value)) return true
    if (isTargetWithinElement(target, treeContext.data.refs.floatingEl.value)) return true
    return !!findDescendantContainingTarget(treeContext, target)
  }

  /**
   * Gets elements in the configured tab order.
   */
  function getOrderElements(container: HTMLElement): HTMLElement[] {
    const content = getTabbableElements(container)
    const reference = anchorEl.value

    return wrapOrder.value
      .flatMap((segment) => {
        if (segment === "floating") return container
        if (segment === "reference") {
          if (isHTMLElement(reference)) return reference
          if (isVirtualElement(reference) && reference.contextElement instanceof HTMLElement) {
            return reference.contextElement
          }
          return null
        }
        return content
      })
      .filter((item): item is HTMLElement => 
        !!item && item !== beforeGuard && item !== afterGuard
      )
  }

  /**
   * Inserts focus guards before and after container for tab wrapping.
   */
  function insertGuards(container: HTMLElement): void {
    if (!useGuards.value || (beforeGuard && afterGuard)) return

    beforeGuard = createGuard()
    afterGuard = createGuard()

    container.insertBefore(beforeGuard, container.firstChild)
    container.appendChild(afterGuard)

    beforeGuardCleanup = attachGuardBehavior(beforeGuard, "before", container)
    afterGuardCleanup = attachGuardBehavior(afterGuard, "after", container)
  }

  /**
   * Removes focus guards from the container.
   */
  function removeGuards(): void {
    beforeGuardCleanup?.()
    afterGuardCleanup?.()
    beforeGuardCleanup = null
    afterGuardCleanup = null

    if (beforeGuard?.parentNode) beforeGuard.parentNode.removeChild(beforeGuard)
    if (afterGuard?.parentNode) afterGuard.parentNode.removeChild(afterGuard)

    beforeGuard = null
    afterGuard = null
  }

  /**
   * Attaches focus behavior to a guard element.
   */
  function attachGuardBehavior(
    guard: HTMLElement,
    location: "before" | "after",
    container: HTMLElement
  ): () => void {
    const handler = () => {
      try {
        const orderElements = getOrderElements(container)
        if (!orderElements.length) {
          focusElement(container, focusPreventScroll.value)
          return
        }

        if (location === "before") {
          focusElement(orderElements[orderElements.length - 1], focusPreventScroll.value)
        } else {
          focusElement(orderElements[0], focusPreventScroll.value)
        }
      } catch (error) {
        console.error("[useFocusTrap] Error in guard focus handler:", error)
      }
    }

    guard.addEventListener("focus", handler)
    return () => guard.removeEventListener("focus", handler)
  }

  /**
   * Applies modal state to outside elements (inert or aria-hidden).
   * Uses WeakMap for state storage to prevent memory leaks.
   */
  function applyOutsideState(container: HTMLElement): () => void {
    if (!isModal.value) return () => {}

    const doc = container.ownerDocument
    const body = doc.body
    const outsideElements = Array.from(body.children).filter(
      (el) => !el.contains(container)
    ) as HTMLElement[]

    // Store original state in WeakMaps
    for (const el of outsideElements) {
      if (shouldInertOutside.value && supportsInert) {
        // Store and apply inert
        const currentInert = el.inert ?? null
        inertStateMap.set(el, currentInert)
        el.inert = true
      } else {
        // Store and apply aria-hidden
        const currentAriaHidden = el.getAttribute("aria-hidden")
        ariaHiddenStateMap.set(el, currentAriaHidden)
        el.setAttribute("aria-hidden", "true")
      }
    }

    // Return cleanup function
    return () => {
      for (const el of outsideElements) {
        if (shouldInertOutside.value && supportsInert) {
          const originalInert = inertStateMap.get(el)
          if (originalInert == null) {
            el.inert = false
          } else {
            el.inert = originalInert
          }
          inertStateMap.delete(el)
        } else {
          const originalAriaHidden = ariaHiddenStateMap.get(el)
          if (originalAriaHidden == null) {
            el.removeAttribute("aria-hidden")
          } else {
            el.setAttribute("aria-hidden", originalAriaHidden)
          }
          ariaHiddenStateMap.delete(el)
        }
      }
    }
  }

  /**
   * Focuses the initial element based on configuration.
   */
  function focusInitial(container: HTMLElement): void {
    const init = toValue(initialFocus)
    const prevent = focusPreventScroll.value

    // Get tabbables once
    const tabbables = getTabbableElements(container)

    if (typeof init === "number") {
      const target = tabbables[init] ?? null
      focusElement(target, prevent)
      return
    }

    if (typeof init === "function") {
      const target = init()
      focusElement(target, prevent)
      return
    }

    if (isHTMLElement(init)) {
      focusElement(init, prevent)
      return
    }

    if (init === "last") {
      focusElement(tabbables[tabbables.length - 1] ?? null, prevent)
      return
    }

    // Default: "first"
    if (tabbables.length > 0) {
      focusElement(tabbables[0], prevent)
    } else {
      // Fallback: make container focusable
      restoreContainerTabindex = ensureContainerFocusable(container)
      focusElement(container, prevent)
    }
  }

  /**
   * Handles Tab key for wrapping behavior.
   */
  function handleTabKey(e: KeyboardEvent, container: HTMLElement): void {
    if (e.key !== "Tab") return

    const ordered = getOrderElements(container)
    
    if (!ordered.length) {
      // No tabbable elements: keep focus on container
      if (!restoreContainerTabindex) {
        restoreContainerTabindex = ensureContainerFocusable(container)
      }
      e.preventDefault()
      focusElement(container, focusPreventScroll.value)
      return
    }

    const current = document.activeElement as HTMLElement | null
    const first = ordered[0]
    const last = ordered[ordered.length - 1]

    if (e.shiftKey) {
      // Shift+Tab: wrap from first to last
      if (!current || current === first) {
        e.preventDefault()
        focusElement(last, focusPreventScroll.value)
      }
    } else {
      // Tab: wrap from last to first
      if (!current || current === last) {
        e.preventDefault()
        focusElement(first, focusPreventScroll.value)
      }
    }
  }

  //=======================================================================================
  // 📌 Event Listeners
  //=======================================================================================

  // Keydown listener for Tab handling
  const stopKeydown = useEventListener(
    () => (isEnabled.value && open.value ? containerEl.value : null),
    "keydown",
    (e: KeyboardEvent) => {
      const container = containerEl.value
      if (!container) return
      handleTabKey(e, container)
    },
    { capture: true }
  )

  // Global focusin listener for modal behavior and focus out detection
  const stopFocusin = useEventListener(
    () => (isEnabled.value && open.value ? document : null),
    "focusin",
    (evt: FocusEvent) => {
      const container = containerEl.value
      const target = evt.target as Element | null
      
      if (!container || !target) return
      if (!isDeepestOpen.value) return
      if (container.contains(target)) return
      if (isFocusInsideNodeHierarchy(target)) return

      if (isModal.value) {
        // Modal: force focus back inside
        const ordered = getOrderElements(container)
        const fallback = ordered[0] ?? container
        focusElement(fallback, focusPreventScroll.value)
      } else if (shouldCloseOnFocusOut.value) {
        // Non-modal with closeOnFocusOut: close the floating element
        skipReturnFocus = true
        try {
          setOpen(false, "blur", evt)
        } catch (error) {
          console.error("[useFocusTrap] Error closing on focus out:", error)
        }
      }
    },
    { capture: true }
  )

  // Track active tabbable index for focus restoration
  useEventListener(
    () => (isEnabled.value && open.value ? containerEl.value : null),
    "focusin",
    (evt: FocusEvent) => {
      const container = containerEl.value
      if (!container) return

      const target = evt.target
      if (!(target instanceof HTMLElement)) {
        tabbableIndexRef.value = -1
        return
      }

      const tabbables = getTabbableElements(container)
      tabbableIndexRef.value = tabbables.indexOf(target)
    }
  )

  // Focusout listener for focus restoration
  useEventListener(
    () => (isEnabled.value && open.value ? containerEl.value : null),
    "focusout",
    () => {
      if (!shouldRestoreFocus.value) return
      
      const container = containerEl.value
      if (!container) return

      queueMicrotask(() => {
        const doc = container.ownerDocument
        const active = doc.activeElement

        // Only restore if focus left the container
        if (active && container.contains(active)) return
        if (active && active !== doc.body) return

        const tabbables = getTabbableElements(container)
        const fallback = tabbables[tabbableIndexRef.value] ?? tabbables[tabbables.length - 1] ?? container
        focusElement(fallback, focusPreventScroll.value)
      })
    }
  )

  //=======================================================================================
  // 📌 Lifecycle Management
  //=======================================================================================

  // Watch for open state changes to activate/deactivate trap
  const removeWatcher = watchPostEffect(() => {
    if (!isEnabled.value || !open.value) return

    const container = containerEl.value
    if (!container) return

    const doc = container.ownerDocument
    const active = doc.activeElement as HTMLElement | null

    // Store previously focused element
    if (isElementValid(active) && active !== doc.body) {
      previouslyFocused.value = active
    }

    // Setup trap
    insertGuards(container)
    restoreOutsideState = applyOutsideState(container)

    // Focus initial element after DOM updates
    queueMicrotask(() => focusInitial(container))

    // Cleanup when trap deactivates
    onWatcherCleanup(() => {
      removeGuards()
      
      if (restoreContainerTabindex) {
        restoreContainerTabindex()
        restoreContainerTabindex = null
      }
      
      if (restoreOutsideState) {
        restoreOutsideState()
        restoreOutsideState = null
      }
    })
  })

  // Watch for close to return focus
  watch(
    () => open.value,
    (isOpen, wasOpen) => {
      if (!isOpen && wasOpen) {
        const prev = previouslyFocused.value
        previouslyFocused.value = null

        if (shouldReturnFocus.value && !skipReturnFocus && isElementValid(prev)) {
          // Return focus to the previously focused element
          focusElement(prev, true) // Always preventScroll on return focus
        }

        skipReturnFocus = false
      }
    },
    { flush: "post" }
  )

  // Cleanup on scope disposal
  onScopeDispose(() => {
    stopKeydown()
    stopFocusin()
    removeWatcher()
    removeGuards()
    
    if (restoreContainerTabindex) restoreContainerTabindex()
    if (restoreOutsideState) restoreOutsideState()
  })

  //=======================================================================================
  // 📌 Return API
  //=======================================================================================

  return {
    cleanup: () => {
      stopKeydown()
      stopFocusin()
      removeWatcher()
      removeGuards()
      
      if (restoreContainerTabindex) restoreContainerTabindex()
      if (restoreOutsideState) restoreOutsideState()
    },
  }
}

//=======================================================================================
// 📌 Exports
//=======================================================================================

export type { FloatingContext }
