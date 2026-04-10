import type { VirtualElement } from "@/types";

/**
 * Type guard for callable values.
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Returns true for real HTML elements and false for SVG or non-element nodes.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof Element && value instanceof HTMLElement;
}

/**
 * Treats mouse and pen input as mouse-like unless strict mode narrows it to mouse only.
 */
export function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false;
  const isMouse = pointerType === "mouse";
  return strict ? isMouse : isMouse || pointerType === "pen";
}

/**
 * Returns true when text input handling should be left to the browser.
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
 * Recognizes button-like keyboard targets so Space/Enter handling stays consistent.
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
 * Skips custom Space handling when the focused element already behaves like a text field.
 */
export function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element);
}

/**
 * Returns true for VFloat's virtual anchor shape.
 */
export function isVirtualElement(el: unknown): el is VirtualElement {
  return typeof el === "object" && el !== null && "contextElement" in el;
}

/**
 * Uses `composedPath()` when available so Shadow DOM interactions stay reliable.
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
 * Detects clicks on the scrollbar gutter so pointer logic can ignore drag-like gestures.
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
 * Mirrors `contains()` while keeping nullable targets in the helper signature.
 */
export function contains(el: HTMLElement, target: Element | null): boolean {
  return el.contains(target);
}

/**
 * Normalizes mouse and touch events to their target element.
 */
export function getTarget(event: MouseEvent | TouchEvent): Element | null {
  return event.target as Element | null;
}

/**
 * Uses a monotonic clock when available and falls back to `Date.now()` in non-browser contexts.
 */
export function getCurrentTime(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Treats `-1` as the sentinel for "no timeout scheduled" and clears only real timer ids.
 */
export function clearTimeoutIfSet(timeoutId: number): void {
  if (timeoutId !== -1) {
    clearTimeout(timeoutId);
  }
}

/**
 * Matches either a real element or a virtual anchor's context element against a composed path.
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
 * Builds a composed path that walks through Shadow DOM hosts as well as regular parents.
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
