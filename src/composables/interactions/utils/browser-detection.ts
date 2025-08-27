/**
 * @fileoverview Browser environment detection utilities
 *
 * Provides utilities for detecting browser types, platforms, and
 * environment-specific polyfills for focus-visible behavior.
 */

/**
 * Checks if the user agent is on a Mac.
 * @returns True if running on macOS
 */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0
}

/**
 * Checks if the browser is Safari.
 * @returns True if the browser is Safari
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

/**
 * A simple utility to check if an element matches `:focus-visible`.
 * @param element - The element to check
 * @returns True if the element matches :focus-visible
 */
export function matchesFocusVisible(element: Element): boolean {
  if (typeof element?.matches !== "function") return false
  return element.matches(":focus-visible")
}
