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
// 📌 Main Composable
//=======================================================================================

/**
 * Traps keyboard focus within the floating element, optionally in a modal manner.
 *
 * Supports nested traps; only the deepest open node activates trapping when used with a tree.
 * Provides optional focus guards, initial focus, focus return, and close-on-escape behavior.
 *
 * @param context - FloatingContext or TreeNode<FloatingContext> to trap within
 * @param options - Configuration options controlling trap behavior
 * @returns Cleanup API
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
  const wrapOrder = computed<Array<"content" | "reference" | "floating">>(() =>
    Array.isArray(toValue(order)) ? (toValue(order) as any) : ["content"]
  )
  const shouldReturnFocus = computed(() => !!toValue(returnFocus))
  const shouldRestoreFocus = computed(() => !!toValue(restoreFocus))
  const shouldCloseOnFocusOut = computed(() => !!toValue(closeOnFocusOut))
  const focusPreventScroll = computed(() => !!toValue(preventScroll))
  const shouldInertOutside = computed(() => !!toValue(outsideElementsInert))

  const containerEl = computed<HTMLElement | null>(() => floatingEl.value)

  const previouslyFocused = ref<HTMLElement | null>(null)
  let restoreContainerTabindex: (() => void) | null = null
  let restoreAriaHiddenOutside: (() => void) | null = null
  let restoreOutsideInert: (() => void) | null = null

  let beforeGuard: HTMLElement | null = null
  let afterGuard: HTMLElement | null = null
  let beforeGuardCleanup: (() => void) | null = null
  let afterGuardCleanup: (() => void) | null = null

  const tabbableIndexRef = ref(-1)
  let isPointerDown = false
  let skipReturnFocus = false

  const supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype

  const previouslyFocusedStack: HTMLElement[] = []

  function pushPreviouslyFocusedElement(element: HTMLElement | null) {
    if (!element || !element.isConnected) return
    if (element === element.ownerDocument.body) return
    previouslyFocusedStack.push(element)
    if (previouslyFocusedStack.length > 20) {
      previouslyFocusedStack.shift()
    }
  }

  function popPreviouslyFocusedElement(): HTMLElement | null {
    while (previouslyFocusedStack.length) {
      const el = previouslyFocusedStack.pop()!
      if (el.isConnected) return el
    }
    return null
  }

  function isCurrentNodeDeepestOpen(): boolean {
    if (!treeContext) return true
    const hasOpenDescendant = (node: TreeNode<FloatingContext>): boolean => {
      for (const child of node.children.value) {
        if (child.data.open.value) return true
        if (hasOpenDescendant(child)) return true
      }
      return false
    }
    return !hasOpenDescendant(treeContext)
  }

  function ensureContainerFocusable(el: HTMLElement): () => void {
    const hadTabindex = el.hasAttribute("tabindex")
    const prevValue = el.getAttribute("tabindex")
    if (!hadTabindex) el.setAttribute("tabindex", "-1")
    return () => {
      if (!hadTabindex) el.removeAttribute("tabindex")
      else if (prevValue != null) el.setAttribute("tabindex", prevValue)
    }
  }

  function getTabbableElements(root: HTMLElement): HTMLElement[] {
    try {
      return tabbable(root, { displayCheck: "full", includeContainer: false }) as HTMLElement[]
    } catch {
      return []
    }
  }

  function getOrderElements(container: HTMLElement): HTMLElement[] {
    const content = getTabbableElements(container)
    const reference = anchorEl.value
    return wrapOrder.value
      .map((segment) => {
        if (segment === "floating") {
          return container
        }
        if (segment === "reference") {
          return isHTMLElement(reference)
            ? reference
            : (reference as any)?.contextElement instanceof HTMLElement
              ? ((reference as any).contextElement as HTMLElement)
              : null
        }
        return content
      })
      .flat()
      .filter((item): item is HTMLElement => !!item)
  }

  function createGuard(): HTMLElement {
    const g = document.createElement("div")
    g.setAttribute("tabindex", "0")
    g.setAttribute("aria-hidden", "true")
    g.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;"
    return g
  }

  function insertGuards(container: HTMLElement): void {
    if (!useGuards.value) return
    if (beforeGuard || afterGuard) return
    beforeGuard = createGuard()
    afterGuard = createGuard()
    container.insertBefore(beforeGuard, container.firstChild)
    container.appendChild(afterGuard)
    beforeGuardCleanup = attachGuardBehavior(beforeGuard, "before", container)
    afterGuardCleanup = attachGuardBehavior(afterGuard, "after", container)
  }

  function removeGuards(): void {
    beforeGuardCleanup?.()
    afterGuardCleanup?.()
    beforeGuardCleanup = null
    afterGuardCleanup = null
    if (beforeGuard && beforeGuard.parentNode) beforeGuard.parentNode.removeChild(beforeGuard)
    if (afterGuard && afterGuard.parentNode) afterGuard.parentNode.removeChild(afterGuard)
    beforeGuard = null
    afterGuard = null
  }

  function attachGuardBehavior(guard: HTMLElement, location: "before" | "after", container: HTMLElement) {
    const handler = (event: FocusEvent) => {
      event.preventDefault()
      const orderElements = getOrderElements(container)
      if (!orderElements.length) {
        focusElement(container)
        return
      }
      if (location === "before") {
        focusElement(orderElements[orderElements.length - 1])
      } else {
        focusElement(orderElements[0])
      }
    }
    guard.addEventListener("focus", handler)
    return () => guard.removeEventListener("focus", handler)
  }

  function applyAriaHiddenOutside(container: HTMLElement): () => void {
    if (!isModal.value) return () => {}
    const affected: Array<HTMLElement> = []
    const root = container.ownerDocument.body
    const children = Array.from(root.children) as HTMLElement[]
    for (const child of children) {
      if (!child.contains(container)) {
        const prev = child.getAttribute("aria-hidden")
        affected.push(child)
        child.setAttribute("aria-hidden", "true")
        ;(child as any).__prevAriaHidden = prev
      }
    }
    return () => {
      for (const el of affected) {
        const prev = (el as any).__prevAriaHidden as string | null
        if (prev == null) el.removeAttribute("aria-hidden")
        else el.setAttribute("aria-hidden", prev)
        delete (el as any).__prevAriaHidden
      }
    }
  }

  function applyInertOutside(container: HTMLElement): () => void {
    if (!isModal.value || !shouldInertOutside.value) return () => {}
    const doc = container.ownerDocument
    const body = doc.body
    const toInert = Array.from(body.children).filter((el) => !el.contains(container)) as (HTMLElement & {
      inert?: boolean
    })[]
    const snapshots = toInert.map((el) => ({
      el,
      ariaHidden: el.getAttribute("aria-hidden"),
      inert: (el as any).inert ?? null,
    }))
    for (const { el } of snapshots) {
      if (supportsInert) {
        ;(el as HTMLElement & { inert?: boolean }).inert = true
      } else {
        el.setAttribute("aria-hidden", "true")
      }
    }
    return () => {
      for (const snapshot of snapshots) {
        if (supportsInert) {
          const inertElement = snapshot.el as HTMLElement & { inert?: boolean }
          if (snapshot.inert == null) {
            inertElement.inert = false
            inertElement.removeAttribute?.("inert")
          } else {
            inertElement.inert = snapshot.inert
          }
        }

        if (snapshot.ariaHidden == null) {
          snapshot.el.removeAttribute("aria-hidden")
        } else {
          snapshot.el.setAttribute("aria-hidden", snapshot.ariaHidden)
        }
      }
    }
  }

  function focusElement(el: HTMLElement | null, opts?: FocusOptions): void {
    if (!el) return
    try {
      el.focus(opts ?? { preventScroll: focusPreventScroll.value })
    } catch {}
  }

  function focusInitial(container: HTMLElement): void {
    const init = toValue(initialFocus)
    const tabbables = getTabbableElements(container)
    if (typeof init === "number") {
      const target = tabbables[init] ?? null
      focusElement(target)
      return
    }
    if (typeof init === "function") {
      focusElement(init(), { preventScroll: focusPreventScroll.value })
      return
    }
    if (isHTMLElement(init)) {
      focusElement(init, { preventScroll: focusPreventScroll.value })
      return
    }
    if (init === "last") {
      focusElement(tabbables[tabbables.length - 1] ?? null)
      return
    }
    if (tabbables.length > 0) {
      focusElement(tabbables[0])
    } else {
      restoreContainerTabindex = ensureContainerFocusable(container)
      focusElement(container)
    }
  }

  function handleTabKey(e: KeyboardEvent, container: HTMLElement): void {
    if (e.key !== "Tab") return
    const ordered = getOrderElements(container)
    if (!ordered.length) {
      restoreContainerTabindex ??= ensureContainerFocusable(container)
      e.preventDefault()
      focusElement(container)
      return
    }
    const current = document.activeElement as HTMLElement | null
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (e.shiftKey) {
      if (!current || current === first) {
        e.preventDefault()
        focusElement(last)
      }
    } else {
      if (!current || current === last) {
        e.preventDefault()
        focusElement(first)
      }
    }
  }

  function isFocusInsideNodeHierarchy(target: Element): boolean {
    if (!treeContext) return !!containerEl.value && containerEl.value.contains(target)
    if (isTargetWithinElement(target, treeContext.data.refs.anchorEl.value)) return true
    if (isTargetWithinElement(target, treeContext.data.refs.floatingEl.value)) return true
    return !!findDescendantContainingTarget(treeContext, target)
  }

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

  const stopFocusin = useEventListener(
    () => (isEnabled.value && open.value ? document : null),
    "focusin",
    (evt: FocusEvent) => {
      const container = containerEl.value
      const target = evt.target as Element | null
      if (!container || !target) return
      if (!isCurrentNodeDeepestOpen()) return
      if (container.contains(target)) return
      if (isFocusInsideNodeHierarchy(target)) return
      if (isModal.value) {
        const ordered = getOrderElements(container)
        const fallback = ordered[0] ?? container
        focusElement(fallback)
      } else if (shouldCloseOnFocusOut.value) {
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

  useEventListener(
    () => (isEnabled.value && open.value ? containerEl.value : null),
    "focusin",
    (evt: FocusEvent) => {
      const container = containerEl.value
      if (!container) return
      const tabbables = getTabbableElements(container)
      const target = evt.target
      if (!(target instanceof HTMLElement)) {
        tabbableIndexRef.value = -1
        return
      }
      tabbableIndexRef.value = tabbables.indexOf(target)
    }
  )

  useEventListener(
    () => (isEnabled.value && open.value ? containerEl.value : null),
    "focusout",
    (evt: FocusEvent) => {
      if (!shouldRestoreFocus.value) return
      const container = containerEl.value
      if (!container) return
      queueMicrotask(() => {
        const doc = container.ownerDocument
        const active = doc.activeElement
        if (active && container.contains(active)) return
        if (active && active !== doc.body) return
        const tabbables = getTabbableElements(container)
        const fallback =
          tabbables[tabbableIndexRef.value] ??
          tabbables[tabbables.length - 1] ??
          container
        focusElement(fallback)
      })
    }
  )

  useEventListener(
    () => (isEnabled.value && open.value ? document : null),
    "pointerdown",
    () => {
      isPointerDown = true
      queueMicrotask(() => {
        isPointerDown = false
      })
    },
    { capture: true }
  )

  const removeWatcher = watchPostEffect(() => {
    if (!isEnabled.value || !open.value) return
    const container = containerEl.value
    if (!container) return
    const doc = container.ownerDocument
    const active = doc.activeElement as HTMLElement | null
    previouslyFocused.value = active
    pushPreviouslyFocusedElement(active)
    insertGuards(container)
    restoreAriaHiddenOutside = applyAriaHiddenOutside(container)
    restoreOutsideInert = applyInertOutside(container)
    queueMicrotask(() => focusInitial(container))
    onWatcherCleanup(() => {
      removeGuards()
      if (restoreContainerTabindex) {
        restoreContainerTabindex()
        restoreContainerTabindex = null
      }
      if (restoreAriaHiddenOutside) {
        restoreAriaHiddenOutside()
        restoreAriaHiddenOutside = null
      }
      if (restoreOutsideInert) {
        restoreOutsideInert()
        restoreOutsideInert = null
      }
    })
  })

  watch(
    () => open.value,
    (isOpen, prev) => {
      if (!isOpen && prev) {
        const prev = previouslyFocused.value
        previouslyFocused.value = null
        if (shouldReturnFocus.value && !skipReturnFocus) {
          const target = popPreviouslyFocusedElement() ?? prev ?? resolveAnchorElement()
          if (target) {
            const tabbables = getTabbableElements(target)
            focusElement(tabbables[0] ?? target, { preventScroll: true })
          }
        }
        skipReturnFocus = false
      }
    },
    { flush: "post" }
  )

  function resolveAnchorElement(): HTMLElement | null {
    const anchor = anchorEl.value
    if (anchor instanceof HTMLElement) return anchor
    if ((anchor as any)?.contextElement instanceof HTMLElement) {
      return (anchor as any).contextElement as HTMLElement
    }
    return null
  }

  onScopeDispose(() => {
    stopKeydown()
    stopFocusin()
    removeGuards()
    if (restoreContainerTabindex) restoreContainerTabindex()
    if (restoreAriaHiddenOutside) restoreAriaHiddenOutside()
    if (restoreOutsideInert) restoreOutsideInert()
  })

  return {
    cleanup: () => {
      stopKeydown()
      stopFocusin()
      removeWatcher()
      removeGuards()
      if (restoreContainerTabindex) restoreContainerTabindex()
      if (restoreAriaHiddenOutside) restoreAriaHiddenOutside()
      if (restoreOutsideInert) restoreOutsideInert()
    },
  }
}

//=======================================================================================
// 📌 Exports
//=======================================================================================

export type { FloatingContext }