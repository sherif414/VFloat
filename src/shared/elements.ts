import type { Ref } from "vue";
import type { VirtualElement } from "@/types";

/**
 * Accepts either a real anchor element or a virtual anchor produced by pointer tracking.
 */
export type AnchorDomElement = HTMLElement | VirtualElement | null;

/**
 * Floating elements are always real DOM elements when mounted.
 */
export type FloatingDomElement = HTMLElement | null;

/**
 * Resolves the real DOM element behind either a DOM anchor or a virtual anchor.
 */
export function resolveAnchorElement(anchor: AnchorDomElement): HTMLElement | null {
  if (!anchor) {
    return null;
  }

  if (anchor instanceof HTMLElement) {
    return anchor;
  }

  return anchor.contextElement instanceof HTMLElement ? anchor.contextElement : null;
}

/**
 * Creates a stable setter function for a Vue ref so refs can be wired through callbacks.
 */
export function createRefSetter<T>(target: Ref<T>) {
  return (value: T) => {
    target.value = value;
  };
}
