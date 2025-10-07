export type AnyFn<T extends unknown[] = unknown[], U = unknown> = (...args: T) => U
export type Fn = () => void

/**
 * Minimal VirtualElement interface compatible with Floating UI expectations.
 * Provides a bounding client rect and an optional context element for layout.
 */
export interface VirtualElement {
  getBoundingClientRect: () => DOMRect
  /**
   * Optional context element used by Floating UI to resolve layout metrics.
   */
  contextElement?: Element
}
