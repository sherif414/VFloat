export function normalizeProp(
  normalizable?: boolean | { escapeKey?: boolean; outsidePress?: boolean }
) {
  return {
    escapeKey:
      typeof normalizable === "boolean" ? normalizable : (normalizable?.escapeKey ?? false),
    outsidePress:
      typeof normalizable === "boolean" ? normalizable : (normalizable?.outsidePress ?? true),
  }
}

export function isHTMLElement(node: unknown | null): node is HTMLElement {
  return node instanceof Element && node instanceof HTMLElement
}

export function isEventTargetWithin(event: Event, element: Element | null | undefined): boolean {
  if (!element) return false

  // Modern, Shadow DOM-aware approach
  if ("composedPath" in event && typeof event.composedPath === "function") {
    return (event.composedPath() as Node[]).includes(element)
  }

  // Fallback for older browsers or non-Shadow DOM contexts
  return element.contains(event.target as Node)
}

export function isClickOnScrollbar(event: MouseEvent, target: HTMLElement): boolean {
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
