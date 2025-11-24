import { createFocusTrap, type FocusTrap } from "focus-trap"
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { TreeNode } from "@/composables/positioning/use-floating-tree"
import { getContextFromParameter } from "@/utils"

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseFocusTrapContext extends Pick<FloatingContext, "open" | "setOpen"> {
  refs: Pick<FloatingContext["refs"], "floatingEl">
}

export interface UseFocusTrapOptions {
  /**
   * Determines if the focus trap should be enabled.
   * When `true`, the focus trap is active.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>
  /**
   * When `true`, content outside the trap will be hidden from accessibility
   * trees (via `aria-hidden`) and potentially made inert (via `inert` attribute
   * if `outsideElementsInert` is `true` and supported).
   * This mimics modal behavior.
   * @default false
   */
  modal?: MaybeRefOrGetter<boolean>
  /**
   * Specifies the element that should receive initial focus when the trap is activated.
   * - `undefined` or omitted: Focuses the first tabbable element within the trap.
   * - CSS selector string: Queries and focuses the first matching element.
   * - `HTMLElement`: Focuses the specific provided HTML element.
   * - `Function`: A function that returns an `HTMLElement` or `false`. The returned
   *   element will receive focus.
   * - `false`: Prevents any initial focus from being set by the trap.
   */
  initialFocus?: HTMLElement | (() => HTMLElement | false) | string | false
  /**
   * When `true`, focus will be returned to the element that was focused
   * immediately before the trap was activated, upon deactivation.
   * @default true
   */
  returnFocus?: MaybeRefOrGetter<boolean>
  /**
   * When `true` and the trap is not `modal`, the trap will deactivate (and potentially close
   * the associated component) if focus moves outside the defined trap elements.
   * @default false
   */
  closeOnFocusOut?: MaybeRefOrGetter<boolean>
  /**
   * Controls whether the browser should scroll to the focused element.
   * Passed directly to the `focus()` method's `preventScroll` option.
   * @default true
   */
  preventScroll?: MaybeRefOrGetter<boolean>
  /**
   * When `true` and `modal` is `true`, applies the `inert` attribute (if supported
   * by the browser) to elements outside the focus trap to prevent user interaction
   * and assistive technology access.
   * @default false
   */
  outsideElementsInert?: MaybeRefOrGetter<boolean>
  /**
   * An optional error handler function that will be called if there's an
   * issue during the focus trap activation process.
   * @param error - The error object.
   */
  onError?: (error: unknown) => void
}

export interface UseFocusTrapReturn {
  /** Check if the focus trap is currently active */
  isActive: ComputedRef<boolean>
  /** Manually activate the focus trap (if enabled and open) */
  activate: () => void
  /** Manually deactivate the focus trap */
  deactivate: () => void
}

//=======================================================================================
// 📌 Constants & State Management
//=======================================================================================

// WeakMap for storing element state
const ariaHiddenStateMap = new WeakMap<HTMLElement, string | null>()
const inertStateMap = new WeakMap<HTMLElement, boolean | null>()

// Check for inert support
const supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

/**
 * Creates a focus trap for a floating element using focus-trap library.
 * Manages focus containment, modal behavior, and accessibility features.
 *
 * @param context - FloatingContext or TreeNode containing floating element refs
 * @param options - Configuration options for the focus trap
 * @returns Object with isActive state, and manual control methods
 */
export function useFocusTrap(
  context: UseFocusTrapContext | TreeNode<UseFocusTrapContext>,
  options: UseFocusTrapOptions = {}
): UseFocusTrapReturn {
  const { floatingContext } = getContextFromParameter(context)
  const {
    refs: { floatingEl },
    open,
    setOpen,
  } = floatingContext

  // Normalize options with defaults
  const {
    enabled = true,
    modal = false,
    initialFocus,
    returnFocus = true,
    closeOnFocusOut = false,
    preventScroll = true,
    outsideElementsInert = false,
    onError,
  } = options

  // Lazy-evaluated computed values (only created once)
  const isEnabled = computed(() => !!toValue(enabled))
  const isModal = computed(() => !!toValue(modal))
  const shouldCloseOnFocusOut = computed(() => !isModal.value && !!toValue(closeOnFocusOut))
  const shouldInertOutside = computed(() => !!toValue(outsideElementsInert))

  // Use shallowRef for trap instance (don't need deep reactivity)
  const trapRef = shallowRef<FocusTrap | null>(null)
  const isActive = computed(() => trapRef.value !== null)

  // State restoration callback
  let restoreOutsideState: (() => void) | null = null

  // Guard to prevent double-deactivation
  let isDeactivating = false

  /**
   * Applies modal state to outside elements (inert or aria-hidden).
   * Returns a cleanup function to restore original state.
   */
  function applyOutsideState(container: HTMLElement): () => void {
    if (!isModal.value) return () => {}

    const body = (container.ownerDocument ?? document).body

    // Cache body children to avoid repeated queries
    const allChildren = Array.from(body.children) as HTMLElement[]

    // Filter outside elements efficiently
    const outsideElements = allChildren.filter((el) => {
      // Check if element is the container or contains/is contained by the container
      if (el === container) return false
      if (container.contains(el) || el.contains(container)) return false
      return true
    })

    // Apply state based on inert support
    const useInert = shouldInertOutside.value && supportsInert

    for (const el of outsideElements) {
      if (useInert) {
        inertStateMap.set(el, el.inert ?? null)
        el.inert = true
      } else {
        ariaHiddenStateMap.set(el, el.getAttribute("aria-hidden"))
        el.setAttribute("aria-hidden", "true")
      }
    }

    // Return cleanup function
    return () => {
      for (const el of outsideElements) {
        if (useInert) {
          const originalInert = inertStateMap.get(el)
          el.inert = originalInert ?? false
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
   * Deactivates the focus trap and cleans up state.
   */
  const deactivateTrap = () => {
    if (isDeactivating || !trapRef.value) return

    isDeactivating = true
    try {
      trapRef.value.deactivate()
      trapRef.value = null
    } finally {
      isDeactivating = false
    }
  }

  /**
   * Creates and activates the focus trap.
   */
  const createTrap = () => {
    // Deactivate existing trap first
    deactivateTrap()

    const container = floatingEl.value
    if (!container) {
      if (import.meta.env.DEV) {
        console.warn("[useFocusTrap] No floating element available for focus trap")
      }
      return
    }

    // Create the focus trap instance
    trapRef.value = createFocusTrap(container, {
      onActivate: () => {
        restoreOutsideState = applyOutsideState(container)
      },
      onDeactivate: () => {
        // Restore outside element state
        if (restoreOutsideState) {
          restoreOutsideState()
          restoreOutsideState = null
        }

        // Close on focus out (only in non-modal mode)
        if (shouldCloseOnFocusOut.value) {
          setOpen(false)
        }
      },
      initialFocus: () => (typeof initialFocus === "function" ? initialFocus() : initialFocus),
      fallbackFocus: () => container,
      returnFocusOnDeactivate: toValue(returnFocus),
      clickOutsideDeactivates: shouldCloseOnFocusOut.value,
      allowOutsideClick: !isModal.value,
      escapeDeactivates: false,
      preventScroll: toValue(preventScroll),
      tabbableOptions: { displayCheck: "none" },
    })

    // Activate with proper error handling
    try {
      trapRef.value.activate()
    } catch (error) {
      // Ensure state is cleaned up even on error
      if (restoreOutsideState) {
        restoreOutsideState()
        restoreOutsideState = null
      }
      trapRef.value = null

      // Call custom error handler if provided
      if (onError) {
        onError(error)
      } else if (import.meta.env.DEV) {
        console.error("[useFocusTrap] Failed to activate focus trap:", error)
      }
    }
  }

  // Single watcher to manage trap lifecycle
  watchPostEffect(() => {
    if (isEnabled.value && open.value && floatingEl.value) {
      createTrap()
    } else {
      deactivateTrap()
    }
  })

  // Cleanup on scope disposal
  onScopeDispose(() => {
    deactivateTrap()
  })

  return {
    isActive,
    activate: createTrap,
    deactivate: deactivateTrap,
  }
}
