/**
 * @fileoverview Event handling and timing utilities
 *
 * Provides utilities for event handling, timing operations,
 * and DOM element containment checks.
 */

/**
 * Simple element containment wrapper.
 * @param el - The container element
 * @param target - The target element to check
 * @returns True if the container contains the target
 */
export function contains(el: HTMLElement, target: Element | null): boolean {
  return el.contains(target)
}

/**
 * Event target extraction utility.
 * @param event - The mouse or touch event
 * @returns The event target as an Element or null
 */
export function getTarget(event: MouseEvent | TouchEvent): Element | null {
  return event.target as Element | null
}

/**
 * Safe performance timing that handles environments without performance API.
 * @returns Current timestamp in milliseconds
 */
export function getCurrentTime(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

/**
 * Centralized timeout management to prevent memory leaks.
 * @param timeoutId - The timeout ID to clear
 */
export function clearTimeoutIfSet(timeoutId: number): void {
  if (timeoutId !== -1) {
    clearTimeout(timeoutId)
  }
}
