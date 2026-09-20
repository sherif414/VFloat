import { isHTMLElement } from "@/shared/dom";
import { getWindow, isServer } from "@/shared/env";

interface IsolatedEntry {
  el: HTMLElement;
  attribute: string;
  previousValue: string | null;
  previousInertProperty: boolean | null;
  count: number;
}

interface DocumentIsolationState {
  entries: Map<HTMLElement, IsolatedEntry>;
}

const documentStates = new WeakMap<Document, DocumentIsolationState>();

//=======================================================================================
// 📌 Main
//=======================================================================================

export interface InertIsolationHandle {
  restore: () => void;
}

/**
 * Isolates all DOM elements outside the allowed target elements by setting `inert`
 * (or `aria-hidden="true"` fallback).
 *
 * Isolation is reference-counted per document, so overlapping modal traps can
 * coexist: the last restore wins and earlier traps never strip a sibling's
 * isolation. `inert` support resolves per owner realm instead of once globally.
 *
 * @param allowedElements - Array of elements (and their subtrees) that should remain interactive.
 * @param preferInert - Whether to use the `inert` attribute when supported.
 * @returns Handle to restore the previous isolation state.
 */
export function isolateOutsideElements(
  allowedElements: HTMLElement[],
  preferInert = true,
): InertIsolationHandle {
  if (isServer || allowedElements.length === 0) {
    return { restore: () => {} };
  }

  const firstConnected = allowedElements.find((el) => el.isConnected);
  const doc = firstConnected?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
  const body = doc?.body;
  if (!doc || !body) {
    return { restore: () => {} };
  }

  const supportsInert = supportsInertIn(doc);
  const useInert = preferInert && supportsInert;
  const attributeToSet = useInert ? "inert" : "aria-hidden";
  const owned: HTMLElement[] = [];

  const docRef: Document = doc;

  const allowedRoots = new Set<HTMLElement>(allowedElements.filter((el) => el.isConnected));
  const ancestorSet = new Set<Node>();

  for (const root of allowedRoots) {
    let current: Node | null = root.parentNode;
    while (current) {
      ancestorSet.add(current);
      current = current.parentNode;
    }
  }

  function traverse(parent: HTMLElement) {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (!isHTMLElement(child)) continue;
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE") continue;
      if (child.hasAttribute("data-vfloat-focus-guard")) continue;

      if (allowedRoots.has(child)) {
        // Child is an allowed root: its entire subtree remains active, do not recurse or isolate
        continue;
      }

      if (ancestorSet.has(child)) {
        // Child is an ancestor of an allowed root: walk deeper
        traverse(child);
      } else {
        // Child is completely outside all allowed subtrees: isolate it
        acquireIsolation(docRef, child, attributeToSet, owned);
      }
    }
  }

  traverse(body);

  let restored = false;

  return {
    restore: () => {
      if (restored) return;
      restored = true;
      releaseIsolation(docRef, owned);
      owned.length = 0;
    },
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function getDocumentState(doc: Document): DocumentIsolationState {
  let state = documentStates.get(doc);
  if (!state) {
    state = { entries: new Map() };
    documentStates.set(doc, state);
  }
  return state;
}

function supportsInertIn(doc: Document): boolean {
  // Resolve per owner realm: a global check lies inside iframes whose
  // realm lacks inert, or during SSR hydration across realms.
  const view = doc.defaultView ?? getWindow(doc);
  const HTMLElementCtor = view?.HTMLElement as typeof HTMLElement | undefined;
  if (typeof HTMLElementCtor !== "undefined" && "inert" in HTMLElementCtor.prototype) {
    return true;
  }
  return typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
}

function acquireIsolation(
  doc: Document,
  el: HTMLElement,
  attribute: string,
  owned: HTMLElement[],
): void {
  const state = getDocumentState(doc);
  const existing = state.entries.get(el);
  if (existing) {
    // Shared background node: bump the count instead of re-applying, so
    // overlapping traps never clobber each other's saved state.
    existing.count += 1;
    owned.push(el);
    return;
  }

  const previousValue = el.getAttribute(attribute);
  const previousInertProperty =
    attribute === "inert" && "inert" in el
      ? Boolean((el as HTMLElement & { inert: boolean }).inert)
      : null;

  if (attribute === "inert") {
    el.setAttribute("inert", "");
    if ("inert" in el) {
      (el as HTMLElement & { inert: boolean }).inert = true;
    }
  } else {
    el.setAttribute("aria-hidden", "true");
  }

  state.entries.set(el, {
    el,
    attribute,
    previousValue,
    previousInertProperty,
    count: 1,
  });
  owned.push(el);
}

function releaseIsolation(doc: Document, owned: HTMLElement[]): void {
  const state = documentStates.get(doc);
  if (!state) return;

  for (const el of owned) {
    const entry = state.entries.get(el);
    if (!entry) continue;
    entry.count -= 1;
    if (entry.count > 0) continue;

    state.entries.delete(el);
    // Restore the exact pre-trap value; disconnected nodes can still be
    // cleaned since removal keeps attributes until GC.
    if (entry.previousValue === null) {
      el.removeAttribute(entry.attribute);
    } else {
      el.setAttribute(entry.attribute, entry.previousValue);
    }
    if (entry.attribute === "inert" && "inert" in el && entry.previousInertProperty !== null) {
      (el as HTMLElement & { inert: boolean }).inert = entry.previousInertProperty;
    }
  }

  if (state.entries.size === 0) {
    documentStates.delete(doc);
  }
}
