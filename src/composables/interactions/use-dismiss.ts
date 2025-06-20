import { getOverflowAncestors } from "@floating-ui/dom"
import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, computed, onScopeDispose, toValue, watchEffect, ref } from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Types
//=======================================================================================

export type DismissReason = "escape-key" | "outside-press" | "anchor-press" | "ancestor-scroll"

export interface UseDismissProps {
  /**
   * Whether dismiss event listeners are enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when the escape key is pressed.
   * @default true
   */
  escapeKey?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when the anchor element is pressed.
   * @default false
   */
  anchorPress?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when clicking outside the floating and anchor element.
   * Can be a function to allow custom logic.
   * @default true
   */
  outsidePress?: MaybeRefOrGetter<boolean | ((event: MouseEvent) => boolean)>

  /**
   * Whether to dismiss when a scrollable ancestor of the floating element is scrolled.
   * @default false
   */
  ancestorScroll?: MaybeRefOrGetter<boolean>

  /**
   * Whether to use capture phase for document event listeners.
   * @default { escapeKey: false, outsidePress: true }
   */
  capture?: boolean | { escapeKey?: boolean; outsidePress?: boolean }

  /**
   * The event name to use for anchor press.
   * @default 'pointerdown'
   */
  anchorPressEvent?: "pointerdown" | "mousedown" | "click"

  /**
   * The event name to use for outside press.
   * @default 'pointerdown'
   */
  outsidePressEvent?: "pointerdown" | "mousedown" | "click"
}

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes the floating element when a dismissal is requested.
 *
 * This composable provides event handlers for dismissal behaviors including
 * outside clicks, escape key press, anchor element press, and ancestor scroll.
 *
 * @param context - The floating context with open state and change handler.
 * @param options - Configuration options for dismissal behavior.
 *
 * @example
 * ```ts
 * useDismiss(context, {
 *   escapeKey: true,
 *   outsidePress: (event) => !event.target.closest('.toast'),
 * })
 * ```
 */
export function useDismiss(context: FloatingContext, options: UseDismissProps = {}): void {
  const {
    enabled = true,
    escapeKey = true,
    outsidePress = true,
    outsidePressEvent = "pointerdown",
    anchorPress = false,
    anchorPressEvent = "pointerdown",
    ancestorScroll = false,
    capture,
  } = options

  const isEnabled = computed(() => toValue(enabled))
  const floatingEl = context.refs.floatingEl
  const anchorEl = computed(() => {
    const el = context.refs.anchorEl.value
    if (!el) return null
    if (el instanceof HTMLElement) return el
    if (el.contextElement instanceof HTMLElement) return el.contextElement
    return null
  })
  

  const { isComposing } = useComposition()

  const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp(capture)

  let endedOrStartedInside = false

  // --- Escape Key Press ---
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value || !context.open.value || !toValue(escapeKey) || event.key !== "Escape") {
      return
    }

    if (isComposing()) return

    context.setOpen(false)
  }

  // --- Outside Press ---
  const onOutsidePress = (event: MouseEvent) => {
    if (!isEnabled.value || !context.open.value) {
      return
    }

    // A `mousedown` or `pointerdown` event started inside and ended outside.
    if (outsidePressEvent === "click" && endedOrStartedInside) {
      endedOrStartedInside = false
      return
    }

    // If the outside press check is a function, call it.
    const _outsidePress = toValue(outsidePress)
    if (!_outsidePress || (typeof _outsidePress === "function" && !_outsidePress(event))) {
      return
    }

    const target = event.target as Node | null
    if (!target) return

    // Clicked on a scrollbar
    if (isHTMLElement(target) && floatingEl.value && isClickOnScrollbar(event, target)) {
      return
    }

    // Check if the event target is inside the anchor or floating element.
    if (
      isEventTargetWithin(event, anchorEl.value) ||
      isEventTargetWithin(event, floatingEl.value)
    ) {
      return
    }

    context.setOpen(false)
  }

  // --- Anchor Press ---
  const onAnchorPress = () => {
    if (isEnabled.value && context.open.value && toValue(anchorPress)) {
      context.setOpen(false)
    }
  }

  // --- Ancestor Scroll ---
  watchEffect((onCleanup) => {
    if (!isEnabled.value || !context.open.value || !toValue(ancestorScroll)) {
      return
    }

    const onScroll = () => {
      if (context.open.value) context.setOpen(false)
    }

    const ancestors: HTMLElement[] = []
    if (anchorEl.value) {
      ancestors.push(...getOverflowAncestors(anchorEl.value).filter(isHTMLElement))
    }
    if (floatingEl.value) {
      ancestors.push(...getOverflowAncestors(floatingEl.value).filter(isHTMLElement))
    }

    for (const ancestor of ancestors) {
      ancestor.addEventListener("scroll", onScroll, { passive: true })
    }

    onCleanup(() => {
      for (const ancestor of ancestors) {
        ancestor.removeEventListener("scroll", onScroll)
      }
    })
  })

  // Add and remove event listeners.
  useEventListener(document, "keydown", onKeyDown, toValue(escapeKeyCapture))
  useEventListener(document, outsidePressEvent, onOutsidePress, toValue(outsidePressCapture))
  useEventListener(anchorEl, anchorPressEvent, onAnchorPress)
  useEventListener(
    floatingEl,
    "mousedown",
    () => {
      endedOrStartedInside = true
    },
    { capture: true }
  )
  useEventListener(
    floatingEl,
    "mouseup",
    () => {
      endedOrStartedInside = true
    },
    { capture: true }
  )
}

//=======================================================================================
// 📌 Helper Functions
//=======================================================================================
function normalizeProp(
  normalizable?: boolean | { escapeKey?: boolean; outsidePress?: boolean }
) {
  return {
    escapeKey:
      typeof normalizable === "boolean" ? normalizable : (normalizable?.escapeKey ?? false),
    outsidePress:
      typeof normalizable === "boolean" ? normalizable : (normalizable?.outsidePress ?? true),
  }
}

function isHTMLElement(node: unknown | null): node is HTMLElement {
  return node instanceof Element && node instanceof HTMLElement
}

function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false

  // Modern, Shadow DOM-aware approach
  if ("composedPath" in event && typeof event.composedPath === "function") {
    return (event.composedPath() as Node[]).includes(element)
  }

  // Fallback for older browsers or non-Shadow DOM contexts
  return element.contains(event.target as Node)
}

function isClickOnScrollbar(event: MouseEvent, target: HTMLElement): boolean {
  const scrollbarWidth = target.offsetWidth - target.clientWidth
  const scrollbarHeight = target.offsetHeight - target.clientHeight

  if (scrollbarWidth > 0 && event.clientX > target.clientWidth) {
    return true
  }

  if (scrollbarHeight > 0 && event.clientY > target.clientHeight) {
    return true
  }

  return false
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
