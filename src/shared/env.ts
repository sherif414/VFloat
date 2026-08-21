//=======================================================================================
// 📌 Environment Flags & Accessors
//=======================================================================================

/**
 * Indicates whether execution is running in a client (browser) environment with DOM APIs.
 */
export const isClient = typeof window !== "undefined" && typeof document !== "undefined";

/**
 * Indicates whether execution is running in a server-side rendering (SSR) environment.
 */
export const isServer = !isClient;

/**
 * Returns the global Document instance if available, or null in SSR / non-DOM environments.
 */
export function getDocument(): Document | null {
  return typeof document !== "undefined" ? document : null;
}

/**
 * Returns the Window instance for the given node/document or the global Window instance in browser environments.
 */
export function getWindow(node?: unknown): (Window & typeof globalThis) | null {
  if (node && typeof node === "object") {
    if ("ownerDocument" in node && (node as Node).ownerDocument?.defaultView) {
      return (node as Node).ownerDocument!.defaultView!;
    }
    if ("defaultView" in node && (node as Document).defaultView) {
      return (node as Document).defaultView!;
    }
    if ("window" in node && (node as Window).window === node) {
      return node as Window & typeof globalThis;
    }
  }
  return typeof window !== "undefined" ? window : null;
}
