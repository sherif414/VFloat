import type { VirtualElement } from "@/types";

/**
 * Checks if a value is a function.
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Checks if a value is an HTMLElement.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof Element && value instanceof HTMLElement;
}

/**
 * Checks if the pointer type is mouse-like (mouse or pen).
 */
export function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false;
  const isMouse = pointerType === "mouse";
  return strict ? isMouse : isMouse || pointerType === "pen";
}

/**
 * Checks if the element is an input, textarea, or contenteditable element.
 */
export function isTypeableElement(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element.isContentEditable && element.contentEditable !== "false")
  );
}

/**
 * Checks if the event target is a button-like element.
 */
export function isButtonTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "BUTTON" ||
    (target.tagName === "INPUT" && target.getAttribute("type") === "button") ||
    target.getAttribute("role") === "button"
  );
}

/**
 * Checks if the Space key press should be ignored for the given element.
 */
export function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element);
}

/**
 * Checks if the value is a VirtualElement.
 */
export function isVirtualElement(el: unknown): el is VirtualElement {
  return typeof el === "object" && el !== null && "contextElement" in el;
}

/**
 * Checks if the event target is within the given element.
 */
export function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false;
  if (
    "composedPath" in event &&
    typeof (event as Event & { composedPath?: () => EventTarget[] }).composedPath === "function"
  ) {
    return (event as Event & { composedPath: () => Node[] }).composedPath().includes(element);
  }
  return element.contains(event.target as Node);
}

/**
 * Checks if a click event occurred on a scrollbar.
 */
export function isClickOnScrollbar(event: MouseEvent, target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect();
  const scrollbarWidth = target.offsetWidth - target.clientWidth;
  const scrollbarHeight = target.offsetHeight - target.clientHeight;

  const elementX = event.clientX - rect.left;
  const elementY = event.clientY - rect.top;

  if (scrollbarWidth > 0) {
    const scrollbarStart = target.clientWidth;
    if (elementX >= scrollbarStart && elementX <= target.offsetWidth) {
      return true;
    }
  }

  if (scrollbarHeight > 0) {
    const scrollbarStart = target.clientHeight;
    if (elementY >= scrollbarStart && elementY <= target.offsetHeight) {
      return true;
    }
  }

  return false;
}

/**
 * Simple element containment wrapper.
 */
export function contains(el: HTMLElement, target: Element | null): boolean {
  return el.contains(target);
}

/**
 * Event target extraction utility.
 */
export function getTarget(event: MouseEvent | TouchEvent): Element | null {
  return event.target as Element | null;
}

/**
 * Safe performance timing that handles environments without performance API.
 */
export function getCurrentTime(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Centralized timeout management to prevent memory leaks.
 */
export function clearTimeoutIfSet(timeoutId: number): void {
  if (timeoutId !== -1) {
    clearTimeout(timeoutId);
  }
}

/**
 * Checks if an element (or virtual element's context) is present in the event path.
 */
export function isElementInEventPath(element: unknown, path: EventTarget[]): boolean {
  if (element instanceof Element) {
    return path.includes(element);
  }

  if (isVirtualElement(element) && element.contextElement instanceof Element) {
    return path.includes(element.contextElement);
  }

  return false;
}

/**
 * Returns the composed path of a node, handling Shadow DOM.
 */
export function getDomPath(node: Node | null): EventTarget[] {
  const path: EventTarget[] = [];
  let current: Node | null = node;

  while (current) {
    path.push(current);
    if (current instanceof ShadowRoot) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }

  return path;
}
