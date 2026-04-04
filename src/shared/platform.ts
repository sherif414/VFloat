import { useId as vueUseId } from "vue";

let idCounter = 0;

/**
 * Wrapper around Vue's useId that provides a fallback counter-based ID generator.
 * This ensures unique IDs even when useId() returns empty strings (e.g., in test environments).
 */
export function useId(): string {
  const id = vueUseId();
  return id || `id-${++idCounter}`;
}

/**
 * Checks if the user agent is on a Mac.
 */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Checks if the browser is Safari.
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * A simple utility to check if an element matches `:focus-visible`.
 */
export function matchesFocusVisible(element: Element): boolean {
  if (typeof (element as Element)?.matches !== "function") return false;
  return element.matches(":focus-visible");
}
