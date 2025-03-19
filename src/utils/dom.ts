/**
 * Rounds a value based on the device pixel ratio
 */
export function roundByDPR(el: HTMLElement, value: number) {
  const dpr = getDPR(el);
  return Math.round(value * dpr) / dpr;
}

/**
 * Gets the device pixel ratio for an element
 */
export function getDPR(el: HTMLElement) {
  if (typeof window === "undefined") return 1;
  const win = el.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}