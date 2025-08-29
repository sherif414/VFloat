/**
 * @fileoverview Element detection and input type utilities
 *
 * Provides utilities for pointer type detection, element type checking,
 * input validation, and UI interaction logic.
 */

import type { VirtualElement } from "@floating-ui/dom"

/**
 * Checks if the pointer type is mouse-like (mouse or pen).
 * @param pointerType - The pointer type string.
 * @param strict - If true, only considers "mouse".
 * @returns True if the pointer type is mouse-like.
 */
export function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false
  const isMouse = pointerType === "mouse"
  return strict ? isMouse : isMouse || pointerType === "pen"
}

/**
 * Checks if the element is an input, textarea, or contenteditable element.
 * @param element - The element to check.
 * @returns True if the element is typeable.
 */
export function isTypeableElement(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element.isContentEditable && element.contentEditable !== "false")
  )
}

/**
 * Checks if the event target is a button-like element.
 * @param event - The KeyboardEvent.
 * @returns True if the target is a button.
 */
export function isButtonTarget(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false

  return (
    target.tagName === "BUTTON" ||
    (target.tagName === "INPUT" && target.getAttribute("type") === "button") ||
    target.getAttribute("role") === "button"
  )
}

/**
 * Checks if the Space key press should be ignored for the given element.
 * @param element - The element to check.
 * @returns True if Space should be ignored.
 */
export function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element)
}

/**
 * Checks if the value is an HTML element.
 * @param node - The value to check.
 * @returns True if the value is an HTML element.
 */
export function isHTMLElement(node: unknown | null): node is HTMLElement {
  return node instanceof Element && node instanceof HTMLElement
}

/**
 * Checks if the value is a VirtualElement.
 * @param el - The value to check.
 * @returns True if the value is a VirtualElement.
 */
export function isVirtualElement(el: unknown): el is VirtualElement {
  return typeof el === "object" && el !== null && "contextElement" in el
}

/**
 * Checks if the event target is within the given element.
 * @param event - The event to check.
 * @param element - The element to check containment against.
 * @returns True if the event target is within the element.
 */
export function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false

  if ("composedPath" in event && typeof event.composedPath === "function") {
    return (event.composedPath() as Node[]).includes(element)
  }

  return element.contains(event.target as Node)
}

/**
 * Checks if a click event occurred on a scrollbar.
 * @param event - The mouse event.
 * @param target - The target HTML element.
 * @returns True if the click was on a scrollbar.
 */
export function isClickOnScrollbar(event: MouseEvent, target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect()
  const scrollbarWidth = target.offsetWidth - target.clientWidth
  const scrollbarHeight = target.offsetHeight - target.clientHeight

  // Convert event coordinates to element-relative coordinates
  const elementX = event.clientX - rect.left
  const elementY = event.clientY - rect.top

  // Check vertical scrollbar (typically on the right)
  if (scrollbarWidth > 0) {
    const scrollbarStart = target.clientWidth
    if (elementX >= scrollbarStart && elementX <= target.offsetWidth) {
      return true
    }
  }

  // Check horizontal scrollbar (typically on the bottom)
  if (scrollbarHeight > 0) {
    const scrollbarStart = target.clientHeight
    if (elementY >= scrollbarStart && elementY <= target.offsetHeight) {
      return true
    }
  }

  return false
}
