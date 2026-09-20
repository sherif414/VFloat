import { isHTMLElement } from "@/shared/dom";
import { getWindow } from "@/shared/env";

const CANDIDATE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled):not([type='hidden'])",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[tabindex]",
  "audio[controls]",
  "video[controls]",
  "iframe",
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
 * 3. Radio groups with matching `name` only include the checked radio (or first if none checked),
 *    scoped to the supplied containers so outside groups cannot suppress inside radios.
 */
export function getTabbableElements(container: HTMLElement | HTMLElement[]): HTMLElement[] {
  const containers = Array.isArray(container) ? container : [container];
  const results: HTMLElement[] = [];

  for (const root of containers) {
    if (!root || !root.isConnected) continue;

    const candidates = collectCandidates(root);
    const positiveTabindex: HTMLElement[] = [];
    const zeroTabindex: HTMLElement[] = [];

    for (const el of candidates) {
      if (!isElementFocusable(el)) continue;
      if (getTabIndexValue(el) < 0) continue;

      if (
        isHTMLElement(el) &&
        el.tagName === "INPUT" &&
        (el as HTMLInputElement).type === "radio"
      ) {
        if (!isRadioTabbable(el as HTMLInputElement, containers)) continue;
      }

      if (getTabIndexValue(el) > 0) {
        positiveTabindex.push(el);
      } else {
        zeroTabindex.push(el);
      }
    }

    positiveTabindex.sort((a, b) => getTabIndexValue(a) - getTabIndexValue(b));
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

    const candidates = collectCandidates(root);
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
  if (getTabIndexValue(htmlEl) < 0) return false;
  if (
    isHTMLElement(htmlEl) &&
    htmlEl.tagName === "INPUT" &&
    (htmlEl as HTMLInputElement).type === "radio"
  ) {
    const scope = findScopeRoot(htmlEl);
    return isRadioTabbable(htmlEl as HTMLInputElement, scope ? [scope] : undefined);
  }
  return true;
}

/**
 * Checks if a given element is focusable (either programmatically or via keyboard).
 */
export function isElementFocusable(el: Element | null): boolean {
  if (!isHTMLElement(el) || !el.isConnected) return false;
  if (isElementInert(el)) return false;
  if (isDisabledByFieldset(el)) return false;
  if (isInsideClosedDetails(el)) return false;
  if (!matchesCandidate(el) && !hasPositiveTabIndexProperty(el)) return false;
  if (!isElementVisible(el)) return false;
  return getTabIndexValue(el) >= -1;
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

  // Fallback for environments without checkVisibility (e.g. older jsdom).
  // checkVisibility walks ancestors; mirror that so an ancestor with
  // display:none or visibility:hidden does not leak through.
  if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0) {
    return false;
  }

  const win = el.ownerDocument.defaultView ?? getWindow(el);
  let current: HTMLElement | null = el;
  while (current && win) {
    const style = win.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    const next: HTMLElement | null = current.parentElement;
    if (!next || next === current) break;
    current = next;
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

function matchesCandidate(el: HTMLElement): boolean {
  try {
    return el.matches(CANDIDATE_SELECTOR);
  } catch {
    return false;
  }
}

function hasPositiveTabIndexProperty(el: HTMLElement): boolean {
  // querySelectorAll("[tabindex]") misses tabindex set via property
  // (el.tabIndex = 0) without an attribute. Honor explicit non-negative
  // values on elements that are not natively tabbable.
  try {
    if (typeof el.tabIndex !== "number" || el.tabIndex < 0) return false;
    if (el.hasAttribute("tabindex")) return false;
    return isNativelyNontabbable(el);
  } catch {
    return false;
  }
}

function isNativelyNontabbable(el: HTMLElement): boolean {
  if (!isHTMLElement(el)) return false;
  const tag = el.tagName;
  return (
    tag !== "A" && tag !== "BUTTON" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA"
  );
}

function getTabIndexValue(el: HTMLElement): number {
  const raw = el.getAttribute?.("tabindex");
  if (raw !== null && raw !== undefined) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) return parsed;
    return isNativelyFocusableWithoutTabindex(el) ? 0 : -1;
  }
  try {
    return typeof el.tabIndex === "number" ? el.tabIndex : -1;
  } catch {
    return -1;
  }
}

function isNativelyFocusableWithoutTabindex(el: HTMLElement): boolean {
  if (!isHTMLElement(el)) return false;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "SELECT" || tag === "TEXTAREA") return true;
  if (tag === "A") return el.hasAttribute("href");
  if (tag === "INPUT") return (el as HTMLInputElement).type !== "hidden";
  if (tag === "AUDIO" || tag === "VIDEO") return el.hasAttribute("controls");
  if (tag === "IFRAME" || tag === "SUMMARY") return true;
  return false;
}

function isDisabledByFieldset(el: HTMLElement): boolean {
  // :disabled matching misses descendants of disabled fieldsets, except for
  // content inside the first legend child which stays enabled per spec.
  let current: HTMLElement | null = el;
  while (current) {
    if (current.tagName === "FIELDSET" && (current as HTMLFieldSetElement).disabled) {
      const firstLegend = current.querySelector(":scope > legend:first-of-type");
      return !(firstLegend && firstLegend.contains(el));
    }
    const next: HTMLElement | null = current.parentElement;
    if (!next || next === current) break;
    current = next;
  }
  return false;
}

function isInsideClosedDetails(el: HTMLElement): boolean {
  // Content of a closed details (except its summary) is not rendered.
  let current: HTMLElement | null = el;
  while (current) {
    if (current.tagName === "DETAILS" && !(current as HTMLDetailsElement).open) {
      const summary = current.querySelector(":scope > summary:first-of-type");
      if (!summary || !summary.contains(el)) return true;
    }
    const next: HTMLElement | null = current.parentElement;
    if (!next || next === current) break;
    current = next;
  }
  return false;
}

function findScopeRoot(el: HTMLElement): HTMLElement | null {
  // Prefer the closest marked trap container; traps mark their floating
  // element so radio groups stay scoped instead of leaking document-wide.
  let current: Node | null = el;
  while (current) {
    if (isHTMLElement(current) && current.hasAttribute("data-vfloat-trap-scope")) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function collectCandidates(root: HTMLElement): HTMLElement[] {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR));
  // Include the root itself when focusable (floating panel with tabindex).
  if (isElementFocusable(root) && !candidates.includes(root)) {
    candidates.unshift(root);
  }
  return candidates;
}

function isRadioTabbable(radio: HTMLInputElement, scope?: HTMLElement[]): boolean {
  if (!radio.name) return true;

  const win = radio.ownerDocument.defaultView ?? getWindow(radio);
  const CSSObj = win?.CSS ?? (typeof CSS !== "undefined" ? CSS : undefined);
  const escapedName =
    typeof CSSObj !== "undefined" && CSSObj.escape ? CSSObj.escape(radio.name) : radio.name;
  const selector = `input[type="radio"][name="${escapedName}"]`;
  const roots: Array<HTMLElement | Document> =
    scope && scope.length > 0 ? scope : [radio.form ?? radio.ownerDocument];
  const radioGroup: HTMLInputElement[] = [];
  for (const root of roots) {
    for (const candidate of Array.from(root.querySelectorAll<HTMLInputElement>(selector))) {
      if (isElementFocusable(candidate) && getTabIndexValue(candidate) >= 0) {
        radioGroup.push(candidate);
      }
    }
  }

  if (radioGroup.length === 0) return true;

  const checkedRadio = radioGroup.find((r) => r.checked);
  if (checkedRadio) {
    return checkedRadio === radio;
  }

  return radioGroup[0] === radio;
}
