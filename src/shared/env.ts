//=======================================================================================
// 📌 Environment Flags
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
 * Indicates whether the Navigator API is available in the current environment.
 */
export const hasNavigator = typeof navigator !== "undefined";

/**
 * Indicates whether the Performance API is available in the current environment.
 */
export const hasPerformance = typeof performance !== "undefined";
