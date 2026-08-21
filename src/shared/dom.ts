import { getWindow } from "@/shared/env";
import type { VirtualElement } from "@/types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Type guard for callable values.
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Returns true for real DOM nodes and false for non-DOM environments across window realms.
 */
export function isNode(value: unknown): value is Node {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  return typeof win?.Node !== "undefined" && value instanceof win.Node;
}

/**
 * Returns true for real HTML elements and false for SVG, non-element nodes, or non-DOM environments across window realms.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  return typeof win?.HTMLElement !== "undefined" && value instanceof win.HTMLElement;
}

/**
 * Returns true for real DOM elements and false for non-element nodes or non-DOM environments across window realms.
 */
export function isElement(value: unknown): value is Element {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  return typeof win?.Element !== "undefined" && value instanceof win.Element;
}

/**
 * Returns true for ShadowRoot instances across window realms.
 */
export function isShadowRoot(value: unknown): value is ShadowRoot {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  return typeof win?.ShadowRoot !== "undefined" && value instanceof win.ShadowRoot;
}

/**
 * Treats mouse and pen input as mouse-like unless strict mode narrows it to mouse only.
 */
export function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  if (pointerType === undefined) return false;
  const isMouse = pointerType === "mouse";
  return strict ? isMouse : isMouse || pointerType === "pen";
}

const NON_TYPEABLE_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/**
 * Returns true when text input handling should be left to the browser.
 */
export function isTypeableElement(element: Element | null): boolean {
  if (!isHTMLElement(element)) return false;
  const win = getWindow(element);
  if (typeof win?.HTMLInputElement !== "undefined" && element instanceof win.HTMLInputElement) {
    return !NON_TYPEABLE_INPUT_TYPES.has(element.type);
  }
  return (
    (typeof win?.HTMLTextAreaElement !== "undefined" &&
      element instanceof win.HTMLTextAreaElement) ||
    (element.isContentEditable && element.contentEditable !== "false")
  );
}

/**
 * Recognizes native button elements that natively dispatch synthetic click events on Space/Enter.
 */
export function isButtonTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!isHTMLElement(target)) return false;
  return (
    target.tagName === "BUTTON" ||
    (target.tagName === "INPUT" &&
      ["button", "submit", "reset", "image"].includes((target as HTMLInputElement).type)) ||
    target.tagName === "SUMMARY"
  );
}

/**
 * Recognizes native link elements that natively dispatch synthetic click events on Enter.
 */
export function isLinkTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!isHTMLElement(target)) return false;
  return target.tagName === "A" && target.hasAttribute("href");
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
  if (isElement(element)) {
    return path.includes(element);
  }

  if (isVirtualElement(element) && isElement(element.contextElement)) {
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
    if (isShadowRoot(current)) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }

  return path;
}
