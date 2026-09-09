import { getDomPath, isElement, isHTMLElement, isNode } from "@/shared/dom";
import { getDocument } from "@/shared/env";
import type { AnchorElement, FloatingElement } from "@/composables/floating-tree/use-floating-node";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Resolves the real DOM element behind either a DOM anchor or a virtual anchor.
 */
export function getAnchorElement(anchor: AnchorElement): HTMLElement | null {
  if (!anchor) {
    return null;
  }

  if (isHTMLElement(anchor)) {
    return anchor;
  }

  return isHTMLElement(anchor.contextElement) ? anchor.contextElement : null;
}

/**
 * Checks whether `target` is inside a single floating node's own anchor or floating elements.
 * Traverses Shadow DOM boundaries via `getDomPath()` to support Web Components.
 *
 * Pure and tree-independent: the floating tree reuses this for each family member,
 * and interaction composables reuse it as the standalone fallback when a node
 * is not registered in any tree.
 */
export function isTargetWithinElements(
  anchorEl: AnchorElement,
  floatingEl: FloatingElement,
  target: EventTarget | null,
): boolean {
  if (!isNode(target)) return false;

  const path = getDomPath(target);

  if (floatingEl) {
    if (floatingEl.contains(target) || path.includes(floatingEl)) {
      return true;
    }
    if (
      isElement(target) &&
      target.hasAttribute("data-vfloat-focus-guard") &&
      (target.nextElementSibling === floatingEl || target.previousElementSibling === floatingEl)
    ) {
      return true;
    }
  }

  if (anchorEl) {
    if (isElement(anchorEl)) {
      if (anchorEl.contains(target) || path.includes(anchorEl)) return true;
    } else if (
      isElement(anchorEl.contextElement) &&
      anchorEl.contextElement !== getDocument()?.documentElement &&
      anchorEl.contextElement !== getDocument()?.body
    ) {
      if (anchorEl.contextElement.contains(target) || path.includes(anchorEl.contextElement)) {
        return true;
      }
    }
  }

  return false;
}
