import { useEventListener } from "@vueuse/core"
import { type MaybeRefOrGetter, computed, ref, toValue } from "vue"
import type { FloatingContext } from "../use-floating"
import type { VirtualElement } from "@floating-ui/dom"

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseOutsideClickProps {
  /**
   * Whether outside press listeners are enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Whether to use capture phase for document outside press listener.
   * @default true
   */
  capture?: boolean

  /**
   * The event to use for outside press.
   * @default 'pointerdown'
   */
  eventName?: "pointerdown" | "mousedown" | "click"

  /**
   * Custom function to handle outside clicks.
   * If provided, this function will be called instead of the default behavior.
   * The function receives the event and context as parameters.
   * @param event - The mouse event that triggered the outside click
   * @param context - The floating context containing refs and state
   */
  onOutsideClick?: (event: MouseEvent, context: FloatingContext) => void
}

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Adds an outside-click listener that closes the floating element when the user
 * clicks outside of both the anchor and floating elements.
 */
export function useOutsideClick(
  context: FloatingContext,
  options: UseOutsideClickProps = {}
): void {
  const {
    enabled = true,
    eventName: outsidePressEvent = "pointerdown",
    capture,
    onOutsideClick,
  } = options

  const isEnabled = computed(() => toValue(enabled))
  const floatingEl = context.refs.floatingEl
  const anchorEl = computed(() => {
    const el = context.refs.anchorEl.value
    if (!el) return null
    if (el instanceof HTMLElement) return el
    if ((el as VirtualElement).contextElement instanceof HTMLElement) return el.contextElement
    return null
  })

  useEventListener(
    document,
    outsidePressEvent,
    (event: MouseEvent) => {
      if (!isEnabled.value || !context.open.value) {
        return
      }

      // A `mousedown` or `pointerdown` event started inside and ended outside.
      if (outsidePressEvent === "click" && endedOrStartedInside) {
        endedOrStartedInside = false
        return
      }

      const target = event.target as Node | null
      if (!target) return

      // Clicked on a scrollbar
      if (isHTMLElement(target) && floatingEl.value && isClickOnScrollbar(event, target)) {
        return
      }

      // Ignore if target is within anchor or floating elements
      if (
        isEventTargetWithin(event, anchorEl.value) ||
        isEventTargetWithin(event, floatingEl.value)
      ) {
        return
      }

      // Use custom handler if provided, otherwise use default behavior
      if (onOutsideClick) {
        onOutsideClick(event, context)
      } else {
        context.setOpen(false)
      }
    },
    capture
  )

  let endedOrStartedInside = false

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
// 📌 Helpers
//=======================================================================================

function isHTMLElement(node: unknown | null): node is HTMLElement {
  return node instanceof Element && node instanceof HTMLElement
}

function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false

  if ("composedPath" in event && typeof event.composedPath === "function") {
    return (event.composedPath() as Node[]).includes(element)
  }

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
