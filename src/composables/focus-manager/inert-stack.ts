import { isServer } from "@/shared/env";

//=======================================================================================
// 📌 Main
//=======================================================================================

const supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;

export interface InertIsolationHandle {
  restore: () => void;
}

/**
 * Isolates all DOM elements outside the allowed target elements by setting `inert`
 * (or `aria-hidden="true"` fallback).
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

  const useInert = preferInert && supportsInert;
  const attributeToSet = useInert ? "inert" : "aria-hidden";
  const elementsToIsolate: Array<{ el: HTMLElement; previousValue: string | null }> = [];

  const allowedRoots = new Set<HTMLElement>(allowedElements.filter((el) => el.isConnected));
  const ancestorSet = new Set<Node>();

  for (const root of allowedRoots) {
    let current: Node | null = root.parentNode;
    while (current) {
      ancestorSet.add(current);
      current = current.parentNode;
    }
  }

  const body = document.body;
  if (!body) {
    return { restore: () => {} };
  }

  function traverse(parent: HTMLElement) {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (!(child instanceof HTMLElement)) continue;
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
        applyIsolation(child, attributeToSet, elementsToIsolate);
      }
    }
  }

  traverse(body);

  return {
    restore: () => {
      for (const { el, previousValue } of elementsToIsolate) {
        if (!el.isConnected) continue;
        if (previousValue === null) {
          el.removeAttribute(attributeToSet);
          if (attributeToSet === "inert" && "inert" in el) {
            (el as HTMLElement & { inert: boolean }).inert = false;
          }
        } else {
          el.setAttribute(attributeToSet, previousValue);
          if (attributeToSet === "inert" && "inert" in el) {
            (el as HTMLElement & { inert: boolean }).inert = true;
          }
        }
      }
      elementsToIsolate.length = 0;
    },
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function applyIsolation(
  el: HTMLElement,
  attribute: string,
  outList: Array<{ el: HTMLElement; previousValue: string | null }>,
): void {
  const previousValue = el.getAttribute(attribute);
  outList.push({ el, previousValue });

  if (attribute === "inert") {
    el.setAttribute("inert", "");
    if ("inert" in el) {
      (el as HTMLElement & { inert: boolean }).inert = true;
    }
  } else {
    el.setAttribute("aria-hidden", "true");
  }
}
