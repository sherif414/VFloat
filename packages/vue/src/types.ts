//=======================================================================================
// 📌 Types
//=======================================================================================

/** Generic callable alias for helpers that forward arbitrary arguments. */
export type AnyFn<T extends unknown[] = unknown[], U = unknown> = (...args: T) => U;

/** Void callback alias for simple event handlers and cleanup hooks. */
export type Fn = () => void;

/**
 * Minimal VirtualElement interface for custom positioning targets.
 * Provides a bounding client rect and an optional context element for layout.
 */
export interface VirtualElement {
  getBoundingClientRect: () => DOMRect;
  /**
   * Optional context element used to resolve layout metrics.
   */
  contextElement?: Element;
  /**
   * Optional client rect list used by inline() middleware.
   */
  getClientRects?: () => DOMRectList | Array<DOMRect>;
}
