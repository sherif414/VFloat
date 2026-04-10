import { useId as vueUseId } from "vue";

let idCounter = 0;

/**
 * Wraps Vue's `useId()` and falls back to a counter when SSR or tests return an empty string.
 */
export function useId(): string {
  const id = vueUseId();
  return id || `id-${++idCounter}`;
}

/**
 * Returns true when the current platform reports macOS.
 */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Returns true for Safari user agents and false for Chromium-based browsers.
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Probes `:focus-visible` support through `matches()` so focus styling can stay native.
 */
export function matchesFocusVisible(element: Element): boolean {
  if (typeof (element as Element)?.matches !== "function") return false;
  return element.matches(":focus-visible");
}
