import { isHTMLElement } from "@/shared/dom";
import type { AnchorElement } from "@/composables/floating-context/use-floating-context";

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
