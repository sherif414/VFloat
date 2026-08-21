import { isHTMLElement } from "@/shared/dom";
import { getWindow } from "@/shared/env";

//=======================================================================================
// 📌 Constants & Selectors
//=======================================================================================

const CANDIDATE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled):not([type='hidden'])",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[tabindex]",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "details > summary:first-of-type",
].join(",");

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Returns all tabbable elements within container(s) sorted in sequential HTML tab order.
 * Follows the HTML specification:
 * 1. Elements with positive `tabindex > 0` sorted in ascending numerical order.
 * 2. Elements with `tabindex === 0` in DOM tree order.
 * 3. Radio groups with matching `name` only include the checked radio (or first if none checked).
 */
export function getTabbableElements(container: HTMLElement | HTMLElement[]): HTMLElement[] {
  const containers = Array.isArray(container) ? container : [container];
  const results: HTMLElement[] = [];

  for (const root of containers) {
    if (!root || !root.isConnected) continue;

    const candidates = Array.from(root.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR));
    const positiveTabindex: HTMLElement[] = [];
    const zeroTabindex: HTMLElement[] = [];

    for (const el of candidates) {
      if (!isElementFocusable(el)) continue;
      if (el.tabIndex < 0) continue;

      if (
        isHTMLElement(el) &&
        el.tagName === "INPUT" &&
        (el as HTMLInputElement).type === "radio"
      ) {
        if (!isRadioTabbable(el as HTMLInputElement)) continue;
      }

      if (el.tabIndex > 0) {
        positiveTabindex.push(el);
      } else {
        zeroTabindex.push(el);
      }
    }

    positiveTabindex.sort((a, b) => a.tabIndex - b.tabIndex);
    results.push(...positiveTabindex, ...zeroTabindex);
  }

  return results;
}

/**
 * Returns all focusable elements (including elements with tabindex="-1") within container(s).
 */
export function getFocusableElements(container: HTMLElement | HTMLElement[]): HTMLElement[] {
  const containers = Array.isArray(container) ? container : [container];
  const results: HTMLElement[] = [];

  for (const root of containers) {
    if (!root || !root.isConnected) continue;

    const candidates = Array.from(root.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR));
    for (const el of candidates) {
      if (isElementFocusable(el)) {
        results.push(el);
      }
    }
  }

  return results;
}

/**
 * Finds the first tabbable element in the container.
 */
export function getFirstTabbableElement(
  container: HTMLElement | HTMLElement[],
): HTMLElement | null {
  const elements = getTabbableElements(container);
  return elements.length > 0 ? elements[0] : null;
}

/**
 * Finds the last tabbable element in the container.
 */
export function getLastTabbableElement(container: HTMLElement | HTMLElement[]): HTMLElement | null {
  const elements = getTabbableElements(container);
  return elements.length > 0 ? elements[elements.length - 1] : null;
}

/**
 * Checks if a given element is tabbable in the sequential keyboard tab sequence.
 */
export function isElementTabbable(el: Element | null): boolean {
  if (!isElementFocusable(el)) return false;
  const htmlEl = el as HTMLElement;
  if (htmlEl.tabIndex < 0) return false;
  if (
    isHTMLElement(htmlEl) &&
    htmlEl.tagName === "INPUT" &&
    (htmlEl as HTMLInputElement).type === "radio"
  ) {
    return isRadioTabbable(htmlEl as HTMLInputElement);
  }
  return true;
}

/**
 * Checks if a given element is focusable (either programmatically or via keyboard).
 */
export function isElementFocusable(el: Element | null): boolean {
  if (!isHTMLElement(el) || !el.isConnected) return false;
  if (isElementInert(el)) return false;
  if (!el.matches(CANDIDATE_SELECTOR)) return false;
  if (!isElementVisible(el)) return false;
  return el.tabIndex >= -1;
}

/**
 * Determines if an element is visible in the layout.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === "function") {
    return el.checkVisibility({
      checkOpacity: false,
      checkVisibilityCSS: true,
    });
  }

  // Fallback for environments without checkVisibility (e.g. older jsdom)
  if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0) {
    return false;
  }

  const win = el.ownerDocument.defaultView ?? getWindow(el);
  if (win) {
    const style = win.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
  }

  return true;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function isElementInert(el: HTMLElement): boolean {
  if ("inert" in el && (el as HTMLElement & { inert: boolean }).inert) return true;
  return Boolean(el.closest?.("[inert]"));
}

function isRadioTabbable(radio: HTMLInputElement): boolean {
  if (!radio.name) return true;

  const root: HTMLElement | Document = radio.form ?? radio.ownerDocument;
  const win = radio.ownerDocument.defaultView ?? getWindow(radio);
  const CSSObj = win?.CSS ?? (typeof CSS !== "undefined" ? CSS : undefined);
  const escapedName =
    typeof CSSObj !== "undefined" && CSSObj.escape ? CSSObj.escape(radio.name) : radio.name;
  const radioGroup = Array.from(
    root.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${escapedName}"]`),
  ).filter((r) => isElementFocusable(r) && r.tabIndex >= 0);

  if (radioGroup.length === 0) return true;

  const checkedRadio = radioGroup.find((r) => r.checked);
  if (checkedRadio) {
    return checkedRadio === radio;
  }

  return radioGroup[0] === radio;
}
