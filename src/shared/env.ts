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
 * Returns the global Window instance if available, or null in SSR / non-DOM environments.
 */
export function getWindow(): Window | null {
  return typeof window !== "undefined" ? window : null;
}
