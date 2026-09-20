import { getDocument, getWindow } from "@/shared/env";
import type { VirtualElement } from "@/types";

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
  return (
    (typeof Node !== "undefined" && value instanceof Node) ||
    (typeof win?.Node !== "undefined" && value instanceof win.Node) ||
    (typeof (value as Node).nodeType === "number" && typeof (value as Node).nodeName === "string")
  );
}

/**
 * Returns true for real HTML elements and false for SVG, non-element nodes, or non-DOM environments across window realms.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  if (
    (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) ||
    (typeof win?.HTMLElement !== "undefined" && value instanceof win.HTMLElement)
  ) {
    return true;
  }
  return (
    isElement(value) &&
    !("ownerSVGElement" in value) &&
    (value.namespaceURI === "http://www.w3.org/1999/xhtml" || !value.namespaceURI)
  );
}

/**
 * Returns true for real DOM elements and false for non-element nodes or non-DOM environments across window realms.
 */
export function isElement(value: unknown): value is Element {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  return (
    (typeof Element !== "undefined" && value instanceof Element) ||
    (typeof win?.Element !== "undefined" && value instanceof win.Element) ||
    ((value as Element).nodeType === 1 && typeof (value as Element).tagName === "string")
  );
}

/**
 * Returns true for ShadowRoot instances across window realms.
 */
export function isShadowRoot(value: unknown): value is ShadowRoot {
  if (!value || typeof value !== "object") return false;
  const win = getWindow(value);
  return (
    (typeof ShadowRoot !== "undefined" && value instanceof ShadowRoot) ||
    (typeof win?.ShadowRoot !== "undefined" && value instanceof win.ShadowRoot) ||
    ((value as Node).nodeType === 11 && "host" in value)
  );
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
  if (!isHTMLElement(element)) return false;
  const tag = element.tagName;
  if (tag === "INPUT") {
    return !NON_TYPEABLE_INPUT_TYPES.has((element as HTMLInputElement).type);
  }
  if (tag === "TEXTAREA") {
    return true;
  }
  return Boolean(element.isContentEditable && element.contentEditable !== "false");
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
 * Resolves the true event source across Shadow DOM boundaries via `composedPath`.
 *
 * Inside a shadow root, `event.target` is retargeted to the host element when the
 * event reaches the light-DOM document listener. The first entry of
 * `composedPath()` is the original inner dispatch target, so passing it to
 * `node.contains()` attributes the event to the overlay whose family actually
 * encloses the source. `contains()` itself walks Shadow DOM parents via
 * `getDomPath()`, keeping `composedPath()[0]` and `event.target` equivalent for
 * open shadow roots. Falls back to `event.target` when `composedPath` is
 * unavailable or empty (synthetic events, legacy browsers).
 */
export function getEventTarget(event: Event): EventTarget | null {
  if (
    "composedPath" in event &&
    typeof (event as Event & { composedPath?: () => EventTarget[] }).composedPath === "function"
  ) {
    const path = (event as Event & { composedPath: () => EventTarget[] }).composedPath();
    if (path.length > 0) {
      return path[0];
    }
  }
  return event.target;
}

/**
 * Detects clicks on the scrollbar gutter so pointer logic can ignore drag-like gestures.
 * Handles both LTR and RTL directions and accounts for border widths to prevent false positives.
 * Supports both root viewport scrollbars and nested scrollable containers.
 */
export function isClickOnScrollbar(event: MouseEvent, target: HTMLElement): boolean {
  const doc = target.ownerDocument ?? getDocument();
  const win = doc?.defaultView ?? getWindow(target);
  const isRoot = Boolean(doc && (target === doc.documentElement || target === doc.body));

  if (isRoot && doc) {
    const root = doc.documentElement;
    const style = win?.getComputedStyle ? win.getComputedStyle(root) : null;
    const isRTL = style?.direction === "rtl" || root.dir === "rtl";

    // Viewport vertical scrollbar
    const rootScrollbarWidth = (win?.innerWidth ?? 0) - root.clientWidth;
    if (rootScrollbarWidth > 0) {
      // In RTL, browsers that move the root scrollbar to the left shift the root bounding rect right.
      const isScrollbarOnLeft = isRTL && root.getBoundingClientRect().left > 0;
      if (isScrollbarOnLeft) {
        if (event.clientX <= rootScrollbarWidth) return true;
      } else if (event.clientX >= root.clientWidth && event.clientX <= (win?.innerWidth ?? 0)) {
        return true;
      }
    }

    // Viewport horizontal scrollbar
    const rootScrollbarHeight = (win?.innerHeight ?? 0) - root.clientHeight;
    if (rootScrollbarHeight > 0) {
      if (event.clientY >= root.clientHeight && event.clientY <= (win?.innerHeight ?? 0)) {
        return true;
      }
    }

    return false;
  }

  const style = win?.getComputedStyle ? win.getComputedStyle(target) : null;

  const borderLeft = style ? Number.parseFloat(style.borderLeftWidth) || 0 : 0;
  const borderRight = style ? Number.parseFloat(style.borderRightWidth) || 0 : 0;
  const borderTop = style ? Number.parseFloat(style.borderTopWidth) || 0 : 0;
  const borderBottom = style ? Number.parseFloat(style.borderBottomWidth) || 0 : 0;

  const scrollbarWidth = target.offsetWidth - target.clientWidth - borderLeft - borderRight;
  const scrollbarHeight = target.offsetHeight - target.clientHeight - borderTop - borderBottom;

  const isRTL = style?.direction === "rtl" || target.dir === "rtl";

  const rect = target.getBoundingClientRect();
  const elementX = event.clientX - rect.left;
  const elementY = event.clientY - rect.top;

  if (scrollbarWidth > 0) {
    if (isRTL) {
      const scrollbarStart = borderLeft;
      const scrollbarEnd = borderLeft + scrollbarWidth;
      if (elementX >= scrollbarStart && elementX <= scrollbarEnd) {
        return true;
      }
    } else {
      const scrollbarStart = borderLeft + target.clientWidth;
      const scrollbarEnd = target.offsetWidth - borderRight;
      if (elementX >= scrollbarStart && elementX <= scrollbarEnd) {
        return true;
      }
    }
  }

  if (scrollbarHeight > 0) {
    const scrollbarStart = borderTop + target.clientHeight;
    const scrollbarEnd = target.offsetHeight - borderBottom;
    if (elementY >= scrollbarStart && elementY <= scrollbarEnd) {
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
