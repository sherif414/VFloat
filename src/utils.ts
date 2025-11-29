import { useId as vueUseId } from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import type { TreeNode } from "@/composables/positioning/use-floating-tree"
import type { AnyFn, VirtualElement } from "@/types"

let idCounter = 0

/**
 * Wrapper around Vue's useId that provides a fallback counter-based ID generator.
 * This ensures unique IDs even when useId() returns empty strings (e.g., in test environments).
 */
export function useId(): string {
  const id = vueUseId()
  // If Vue's useId returns an empty string, use a counter-based fallback
  return id || `id-${++idCounter}`
}

//=======================================================================================
// 📌 General Utilities
//=======================================================================================

/**
 * Checks if a value is a function
 */
export function isFunction(value: unknown): value is AnyFn {
  return typeof value === "function"
}

/**
 * Type guard for HTMLElement
 */
export function isHTMLElement(value: unknown | null): value is HTMLElement {
  return value instanceof Element && value instanceof HTMLElement
}

//=======================================================================================
// 📌 Browser Environment Detection
//=======================================================================================

/**
 * Checks if the user agent is on a Mac.
 */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0
}

/**
 * Checks if the browser is Safari.
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/**
 * A simple utility to check if an element matches `:focus-visible`.
 */
export function matchesFocusVisible(element: Element): boolean {
  if (typeof (element as Element)?.matches !== "function") return false
  return element.matches(":focus-visible")
}

//=======================================================================================
// 📌 Element & Input Detection
//=======================================================================================

/**
 * Checks if the pointer type is mouse-like (mouse or pen).
 */
export function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false
  const isMouse = pointerType === "mouse"
  return strict ? isMouse : isMouse || pointerType === "pen"
}

/**
 * Checks if the element is an input, textarea, or contenteditable element.
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
 */
export function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element)
}

/**
 * Checks if the value is a VirtualElement.
 */
export function isVirtualElement(el: unknown): el is VirtualElement {
  return typeof el === "object" && el !== null && "contextElement" in el
}

/**
 * Checks if the event target is within the given element.
 */
export function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false
  if (
    "composedPath" in event &&
    typeof (event as Event & { composedPath?: () => EventTarget[] }).composedPath === "function"
  ) {
    return (event as Event & { composedPath: () => Node[] }).composedPath().includes(element)
  }
  return element.contains(event.target as Node)
}

/**
 * Checks if a click event occurred on a scrollbar.
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

//=======================================================================================
// 📌 Event Handling & Timing
//=======================================================================================

/**
 * Simple element containment wrapper.
 */
export function contains(el: HTMLElement, target: Element | null): boolean {
  return el.contains(target)
}

/**
 * Event target extraction utility.
 */
export function getTarget(event: MouseEvent | TouchEvent): Element | null {
  return event.target as Element | null
}

/**
 * Safe performance timing that handles environments without performance API.
 */
export function getCurrentTime(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

/**
 * Centralized timeout management to prevent memory leaks.
 */
export function clearTimeoutIfSet(timeoutId: number): void {
  if (timeoutId !== -1) {
    clearTimeout(timeoutId)
  }
}

//=======================================================================================
// 📌 Tree-Aware Context Utilities
//=======================================================================================

/**
 * Type guard to determine if the context parameter is a TreeNode.
 */
export function isTreeNode<T>(context: T | TreeNode<T>): context is TreeNode<T> {
  return (
    context !== null &&
    typeof context === "object" &&
    "data" in context &&
    "id" in context &&
    "children" in context &&
    "parent" in context
  )
}

/**
 * Extracts floating context and tree context from the parameter.
 */
export function getContextFromParameter<T>(context: T | TreeNode<T>): {
  floatingContext: T
  node: TreeNode<T> | null
} {
  if (isTreeNode(context)) {
    return {
      floatingContext: context.data,
      node: context,
    }
  }
  return {
    floatingContext: context,
    node: null,
  }
}



/**
 * Finds a descendant node that is in the event path.
 */
export function findDescendantInEventPath<T extends Pick<FloatingContext, "refs" | "open">>(
  node: TreeNode<T>,
  path: EventTarget[]
): TreeNode<T> | null {
  for (const child of node.children.value) {
    if (child.data.open.value) {
      if (
        isElementInEventPath(child.data.refs.anchorEl.value, path) ||
        isElementInEventPath(child.data.refs.floatingEl.value, path)
      ) {
        return child
      }

      // Recursively check descendants
      const descendant = findDescendantInEventPath(child, path)
      if (descendant) return descendant
    }
  }
  return null
}

/**
 * Checks if an element (or virtual element's context) is present in the event path.
 */
export function isElementInEventPath(element: unknown, path: EventTarget[]): boolean {
  if (element instanceof Element) {
    return path.includes(element)
  }
  if (isVirtualElement(element) && element.contextElement instanceof Element) {
    return path.includes(element.contextElement)
  }
  return false
}

/**
 * Returns the composed path of a node, handling Shadow DOM.
 */
export function getDomPath(node: Node | null): EventTarget[] {
  const path: EventTarget[] = []
  let current: Node | null = node
  while (current) {
    path.push(current)
    if (current instanceof ShadowRoot) {
      current = current.host
    } else {
      current = current.parentNode
    }
  }
  return path
}
