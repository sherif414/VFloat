import { onClickOutside, useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, computed, onScopeDispose, toValue } from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables dismissing the floating element
 *
 * This composable provides event handlers for dismissal behaviors including
 * outside clicks, escape key press, anchor press, and ancestor scroll.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for dismissal behavior
 * @returns Event handler props for anchor and floating elements
 *
 * @example
 * ```ts
 * useDismiss({
 *   open: floating.open,
 *   setOpen: floating.setOpen,
 *   escapeKey: true,
 *   outsidePress: true
 * })
 * ```
 */
export function useDismiss(context: FloatingContext, options: UseDismissOptions = {}): void {
  const {
    enabled = true,
    escapeKey = true,
    outsidePress = true,
    anchorPress = false,
    ancestorScroll = false,
    bubbles,
    capture = true,
    anchorPressEvent = "pointerdown",
    outsidePressEvent = "pointerdown",
  } = options

  const anchorEl = computed(() =>
    context.refs.anchorEl.value instanceof HTMLElement ? context.refs.anchorEl.value : null
  )
  const isEnabled = computed(() => toValue(enabled))
  const { isComposing } = useComposition()
  let endedOrStartedInside = false

  // Event handlers
  const dismissOnEscapeKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value || !toValue(escapeKey) || !context.open.value) return

    // Wait until IME is settled
    if (isComposing()) {
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      context.setOpen(false)
    }
  }

  useEventListener(document, "keydown", dismissOnEscapeKeyDown)

  onClickOutside(
    context.refs.floatingEl,
    (e: PointerEvent) => {
      if (!isEnabled.value || !toValue(outsidePress) || !context.open.value) {
        return
      }

      if (toValue(outsidePressEvent) === "click" && endedOrStartedInside) {
        endedOrStartedInside = false
        return
      }

      if (isHTMLElement(e.target) && context.refs.floatingEl.value && isClickOnScrollbar(e)) {
        return
      }

      const shouldBubble = toValue(bubbles)
      if (typeof shouldBubble === "boolean" ? shouldBubble : shouldBubble?.outsidePress) {
        e.stopPropagation()
      }
      context.setOpen(false)
      endedOrStartedInside = false
    },
    {
      ignore: [anchorEl],
      capture: typeof capture === "boolean" ? capture : capture.outsidePress,
    }
  )

  useEventListener(anchorEl, anchorPressEvent, () => {
    if (isEnabled.value && toValue(anchorPress) && context.open.value) {
      context.setOpen(false)
    }
  })

  useEventListener(
    "scroll",
    () => {
      if (isEnabled.value && toValue(ancestorScroll) && context.open.value) {
        context.setOpen(false)
      }
    },
    { passive: true }
  )

  useEventListener(context.refs.floatingEl.value, "mousedown", () => {
    endedOrStartedInside = true
  })

  useEventListener(context.refs.floatingEl.value, "mouseup", () => {
    endedOrStartedInside = true
  })
}

//=======================================================================================
// 📌 Utilities
//=======================================================================================

// TODO: find a usage for it
/**
 * Gets all scroll ancestor elements for a given element
 */
// biome-ignore lint/correctness/noUnusedVariables: will be used later
function scrollAncestors(element: Element): Element[] {
  const result: Element[] = []

  function getScrollParent(node: Node | null): Element | null {
    if (!node || node === document.body) return document.body

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const { overflow, overflowX, overflowY } = window.getComputedStyle(el)
      if (/auto|scroll|overlay/.test(overflow + overflowY + overflowX)) {
        return el
      }
    }

    return getScrollParent(node.parentNode)
  }

  let parent = getScrollParent(element)
  while (parent && parent !== document.body) {
    result.push(parent)
    parent = getScrollParent(parent.parentNode)
  }

  // Always add window
  result.push(window as unknown as Element)

  return result
}

/**
 * Checks if a node is an HTML element
 */
function isHTMLElement(node: unknown | null): node is HTMLElement {
  return (
    node !== null &&
    typeof node === "object" &&
    "nodeType" in node &&
    node.nodeType === Node.ELEMENT_NODE
  )
}

/**
 * Helper to handle IME composition state
 * @returns Object containing isComposing state and cleanup function
 */
function useComposition() {
  let isComposing = false
  let compositionTimeout: number | undefined

  useEventListener(document, "compositionstart", () => {
    window.clearTimeout(compositionTimeout)
    isComposing = true
  })

  useEventListener(document, "compositionend", () => {
    // Safari fires `compositionend` before `keydown`, wait until next tick
    compositionTimeout = window.setTimeout(() => {
      isComposing = false
    }, 5)
  })

  const cleanup = () => {
    window.clearTimeout(compositionTimeout)
  }

  onScopeDispose(cleanup)

  return {
    isComposing: () => isComposing,
    cleanup,
  }
}

/**
 * Checks if a click occurred on a scrollbar
 * @param event - The pointer event
 * @param target - The target element
 * @returns True if the click occurred on a scrollbar, false otherwise
 */
function isClickOnScrollbar(event: PointerEvent): boolean {
  const target = event.target as HTMLElement
  const style = window.getComputedStyle(target)
  const scrollRe = /auto|scroll/
  const isScrollableX = scrollRe.test(style.overflowX)
  const isScrollableY = scrollRe.test(style.overflowY)

  const canScrollX =
    isScrollableX && target.clientWidth > 0 && target.scrollWidth > target.clientWidth
  const canScrollY =
    isScrollableY && target.clientHeight > 0 && target.scrollHeight > target.clientHeight

  const isRTL = style.direction === "rtl"

  // Check click position relative to scrollbar
  const pressedVerticalScrollbar =
    canScrollY &&
    (isRTL
      ? event.offsetX <= target.offsetWidth - target.clientWidth
      : event.offsetX > target.clientWidth)

  const pressedHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight

  return pressedVerticalScrollbar || pressedHorizontalScrollbar
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring dismissal behavior
 */
export interface UseDismissOptions {
  /**
   * Whether dismiss event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when the escape key is pressed
   * @default true
   */
  escapeKey?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when the anchor element is pressed
   * @default false
   */
  anchorPress?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when clicking outside the floating and anchor element
   * @default true
   */
  outsidePress?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when scrolling outside the floating element
   * @default false
   */
  ancestorScroll?: MaybeRefOrGetter<boolean>

  /**
   * Whether click events should bubble
   */
  bubbles?: boolean | { escapeKey?: boolean; outsidePress?: boolean }

  /**
   * Whether to use capture phase for document event listeners
   * @default true
   */
  capture?: boolean | { escapeKey?: boolean; outsidePress?: boolean }

  /**
   /**
    * The event name to use for anchor press
   * @default 'pointerdown'
   */
  anchorPressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">

  /**
   * The event name to use for outside press
   * @default 'pointerdown'
   */
  outsidePressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">
}
