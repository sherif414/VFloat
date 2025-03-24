import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onMounted,
  onScopeDispose,
  toValue,
  ref,
} from "vue"
import type { FloatingContext } from "../use-floating"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables dismissing the floating element
 *
 * This composable provides event handlers for dismissal behaviors including
 * outside clicks, escape key press, reference press, and ancestor scroll.
 *
 * @param context - The floating context with open state and change handler
 * @param options - Configuration options for dismissal behavior
 * @returns Event handler props for reference and floating elements
 *
 * @example
 * ```ts
 * const { getReferenceProps, getFloatingProps } = useDismiss({
 *   open: floating.open,
 *   onOpenChange: floating.onOpenChange,
 *   escapeKey: true,
 *   outsidePress: true
 * })
 * ```
 */
export function useDismiss(
  context: FloatingContext,
  options: UseDismissOptions = {}
): UseDismissReturn {
  const {
    open,
    onOpenChange,
    refs: { floating, reference },
  } = context

  const {
    enabled = true,
    escapeKey = true,
    outsidePress = true,
    referencePress = false,
    ancestorScroll = false,
    bubbles,
    capture = true,
    referencePressEvent = "pointerdown",
    outsidePressEvent = "pointerdown",
  } = options

  const isEnabled = computed(() => toValue(enabled))
  const isComposing = ref(false)
  const endedOrStartedInside = ref(false)

  // Event handlers
  const dismissOnEscapeKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value || !toValue(escapeKey) || !open.value) return

    // Wait until IME is settled
    if (isComposing.value) {
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      onOpenChange(false)
    }
  }

  const dismissOnPressOutside = (event: MouseEvent) => {
    if (
      !isEnabled.value ||
      !toValue(outsidePress) ||
      !open.value ||
      !floating.value ||
      !reference.value
    )
      return

    // When click outside is lazy (`click` event), handle dragging
    if (toValue(outsidePressEvent) === "click" && endedOrStartedInside.value) {
      endedOrStartedInside.value = false
      return
    }

    const target = event.target as Node | null

    if (target && floating.value?.contains(target)) {
      return
    }

    const outsidePressValue = toValue(outsidePress)

    if (typeof outsidePressValue === "function" && !outsidePressValue(event)) {
      return
    }

    // Check for potential bubbling
    if (reference.value?.contains(target)) {
      return
    }

    // Check if the click occurred on the scrollbar
    if (isHTMLElement(target) && floating.value) {
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

      if (pressedVerticalScrollbar || pressedHorizontalScrollbar) {
        return
      }
    }

    // Handle event bubbling
    if (toValue(bubbles) === false) {
      event.stopPropagation()
    }

    onOpenChange(false)
    endedOrStartedInside.value = false
  }

  const dismissOnReferencePress = (_event: MouseEvent | PointerEvent | Event) => {
    if (!isEnabled.value || !toValue(referencePress) || !open.value) return

    onOpenChange(false)
  }

  const dismissOnScroll = () => {
    if (!isEnabled.value || !toValue(ancestorScroll) || !open.value) return

    onOpenChange(false)
  }

  // Setup document event listeners
  let cleanup: (() => void) | undefined
  let compositionTimeout: number | undefined

  const handleCompositionStart = () => {
    window.clearTimeout(compositionTimeout)
    isComposing.value = true
  }

  const handleCompositionEnd = () => {
    // Safari fires `compositionend` before `keydown`, wait until next tick
    compositionTimeout = window.setTimeout(() => {
      isComposing.value = false
    }, 5)
  }

  const addDocumentEvents = () => {
    if (!isEnabled.value || !floating.value) return

    const doc = floating.value?.ownerDocument
    // Ensure useCapture is strictly a boolean
    const useCapture = typeof toValue(capture) === "boolean" ? (toValue(capture) as boolean) : true

    doc.addEventListener("keydown", dismissOnEscapeKeyDown)

    // Cast the event type to string to avoid type issues
    doc.addEventListener(
      toValue(outsidePressEvent) as string,
      dismissOnPressOutside as EventListener,
      { capture: useCapture }
    )

    // Add composition event handlers
    doc.addEventListener("compositionstart", handleCompositionStart)
    doc.addEventListener("compositionend", handleCompositionEnd)

    if (toValue(ancestorScroll)) {
      for (const ancestor of scrollAncestors(floating.value)) {
        ancestor.addEventListener("scroll", dismissOnScroll, { passive: true })
      }

      if (reference.value) {
        for (const ancestor of scrollAncestors(reference.value)) {
          ancestor.addEventListener("scroll", dismissOnScroll, { passive: true })
        }
      }
    }

    return () => {
      doc.removeEventListener("keydown", dismissOnEscapeKeyDown)

      // Cast the event type to string to avoid type issues
      doc.removeEventListener(
        toValue(outsidePressEvent) as string,
        dismissOnPressOutside as EventListener,
        { capture: useCapture }
      )

      // Remove composition event handlers
      doc.removeEventListener("compositionstart", handleCompositionStart)
      doc.removeEventListener("compositionend", handleCompositionEnd)

      if (toValue(ancestorScroll)) {
        if (floating.value) {
          for (const ancestor of scrollAncestors(floating.value)) {
            ancestor.removeEventListener("scroll", dismissOnScroll)
          }
        }

        if (reference.value) {
          for (const ancestor of scrollAncestors(reference.value)) {
            ancestor.removeEventListener("scroll", dismissOnScroll)
          }
        }
      }

      window.clearTimeout(compositionTimeout)
    }
  }

  onMounted(() => {
    cleanup = addDocumentEvents()
  })

  onScopeDispose(() => {
    cleanup?.()
  })

  return {
    getReferenceProps: () => {
      const eventName = toVueEventHandler(toValue(referencePressEvent))
      return {
        [eventName]: dismissOnReferencePress,
      }
    },
    getFloatingProps: () => ({
      onMousedown: () => {
        endedOrStartedInside.value = true
      },
      onMouseup: () => {
        endedOrStartedInside.value = true
      },
    }),
  }
}

//=======================================================================================
// 📌 Utilities
//=======================================================================================

/**
 * Converts a DOM event name to the corresponding Vue event handler prop name
 */
function toVueEventHandler(eventType: string): string {
  return `on${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}`
}

/**
 * Gets all scroll ancestor elements for a given element
 */
function scrollAncestors(element: Element): Element[] {
  const result: Element[] = []

  function getScrollParent(node: Node | null): Element | null {
    if (!node || node === document.body) return document.body

    if (node.nodeType === 1) {
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
function isHTMLElement(node: Node | null): node is HTMLElement {
  return node !== null && node.nodeType === 1
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
   * Whether to dismiss when the reference element is pressed
   * @default false
   */
  referencePress?: MaybeRefOrGetter<boolean>

  /**
   * Whether to dismiss when clicking outside the floating element
   * @default true
   */
  outsidePress?: MaybeRefOrGetter<boolean | ((event: MouseEvent) => boolean)>

  /**
   * Whether to dismiss when scrolling outside the floating element
   * @default false
   */
  ancestorScroll?: MaybeRefOrGetter<boolean>

  /**
   * Whether click events should bubble
   */
  bubbles?: MaybeRefOrGetter<boolean | { escapeKey?: boolean; outsidePress?: boolean }>

  /**
   * Whether to use capture phase for document event listeners
   * @default true
   */
  capture?: MaybeRefOrGetter<boolean | { escapeKey?: boolean; outsidePress?: boolean }>

  /**
   * The event name to use for reference press
   * @default 'pointerdown'
   */
  referencePressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">

  /**
   * The event name to use for outside press
   * @default 'pointerdown'
   */
  outsidePressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">
}

/**
 * Return value of the useDismiss composable
 */
export interface UseDismissReturn {
  /**
   * Reference element props related to dismissal
   */
  getReferenceProps: () => Record<string, (event: MouseEvent | PointerEvent | Event) => void>

  /**
   * Floating element props related to dismissal
   */
  getFloatingProps: () => Record<string, (event: PointerEvent | MouseEvent | Event) => void>
}
