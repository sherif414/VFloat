import { createFocusTrap, type FocusTrap } from "focus-trap"
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  ref,
  toValue,
  watch,
  watchPostEffect,
} from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { TreeNode } from "@/composables/positioning/use-floating-tree"
import { getContextFromParameter, isHTMLElement, isVirtualElement } from "@/utils"

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
  initialFocus?: MaybeRefOrGetter<HTMLElement | (() => HTMLElement | null) | "first" | false>
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

// WeakMap for storing element state
const ariaHiddenStateMap = new WeakMap<HTMLElement, string | null>()
const inertStateMap = new WeakMap<HTMLElement, boolean | null>()

// Check for inert support
const supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

export function useFocusTrap(
  context: FloatingContext | TreeNode<FloatingContext>,
  options: UseFocusTrapOptions = {}
): UseFocusTrapReturn {
  const { floatingContext } = getContextFromParameter(context)
  const {
    refs: { floatingEl, anchorEl },
    open,
    setOpen,
  } = floatingContext

  // Normalize options
  const {
    enabled = true,
    modal = false,
    order = ["content"],
    initialFocus = "first",
    returnFocus = true,
    closeOnFocusOut = false,
    preventScroll = true,
    outsideElementsInert = false,
  } = options

  const isEnabled = computed(() => !!toValue(enabled))
  const isModal = computed(() => !!toValue(modal))
  const wrapOrder = computed(() => {
    const val = toValue(order)
    return Array.isArray(val) ? val : ["content"]
  })
  const shouldCloseOnFocusOut = computed(() => !!toValue(closeOnFocusOut))
  const shouldInertOutside = computed(() => !!toValue(outsideElementsInert))
  const focusPreventScroll = computed(() => !!toValue(preventScroll))

  const trapRef = ref<FocusTrap | null>(null)
  let restoreOutsideState: (() => void) | null = null

  // Helper to resolve containers based on order
  const getContainers = () => {
    const containers: HTMLElement[] = []
    const reference = anchorEl.value
    const content = floatingEl.value

    if (!content) return []

    for (const segment of wrapOrder.value) {
      if (segment === "content" || segment === "floating") {
        if (content && !containers.includes(content)) containers.push(content)
      } else if (segment === "reference") {
        if (isHTMLElement(reference) && !containers.includes(reference)) {
          containers.push(reference)
        } else if (isVirtualElement(reference) && reference.contextElement instanceof HTMLElement) {
          if (!containers.includes(reference.contextElement)) {
            containers.push(reference.contextElement)
          }
        }
      }
    }

    if (containers.length === 0 && content) {
      containers.push(content)
    }

    return containers
  }

  /**
   * Applies modal state to outside elements (inert or aria-hidden).
   */
  function applyOutsideState(containers: HTMLElement[]): () => void {
    if (!isModal.value) return () => {}

    const doc = containers[0]?.ownerDocument || document
    const body = doc.body
    const outsideElements = Array.from(body.children).filter(
      (el) => !containers.some((c) => c === el || c.contains(el) || el.contains(c))
    ) as HTMLElement[]

    for (const el of outsideElements) {
      if (shouldInertOutside.value && supportsInert) {
        const currentInert = el.inert ?? null
        inertStateMap.set(el, currentInert)
        el.inert = true
      } else {
        const currentAriaHidden = el.getAttribute("aria-hidden")
        ariaHiddenStateMap.set(el, currentAriaHidden)
        el.setAttribute("aria-hidden", "true")
      }
    }

    return () => {
      for (const el of outsideElements) {
        if (shouldInertOutside.value && supportsInert) {
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

  const deactivateTrap = () => {
    if (trapRef.value) {
      trapRef.value.deactivate()
      trapRef.value = null
    }
  }

  const createTrap = () => {
    deactivateTrap()

    const containers = getContainers()
    if (containers.length === 0) return

    trapRef.value = createFocusTrap(containers, {
      onActivate: () => {
        restoreOutsideState = applyOutsideState(containers)
      },
      onDeactivate: () => {
        if (restoreOutsideState) {
          restoreOutsideState()
          restoreOutsideState = null
        }

        if (!isModal.value && shouldCloseOnFocusOut.value) {
          setOpen(false)
        }
      },
      initialFocus: () => {
        const init = toValue(initialFocus)
        if (init === "first") return undefined // focus-trap default
        if (isHTMLElement(init)) return init
        if (typeof init === "function") return init() || false
        if (init === false) return false

        return undefined
      },
      fallbackFocus: () => {
        return containers[0]
      },
      returnFocusOnDeactivate: toValue(returnFocus),
      clickOutsideDeactivates: !isModal.value && shouldCloseOnFocusOut.value,
      allowOutsideClick: !isModal.value,
      escapeDeactivates: true,
      preventScroll: focusPreventScroll.value,
      tabbableOptions: { displayCheck: "none" },
    })

    try {
      trapRef.value.activate()
    } catch (e) {
      console.error("Failed to activate focus trap", e)
    }
  }

  // Watchers
  watchPostEffect(() => {
    if (isEnabled.value && open.value && floatingEl.value) {
      createTrap()
    } else {
      deactivateTrap()
    }
  })

  watch(open, (isOpen) => {
    if (!isOpen) {
      deactivateTrap()
    }
  })

  onScopeDispose(() => {
    deactivateTrap()
  })

  return {
    cleanup: deactivateTrap,
  }
}
