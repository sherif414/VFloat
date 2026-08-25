//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Maps a raw KeyboardEvent to a semantic navigation intent based on the
 * current orientation and reading direction.
 *
 * This mapping is stateless, headless, and purely declarative.
 *
 * @param event - The native KeyboardEvent triggered during navigation.
 * @param options - Configuration options for orientation and RTL reading direction.
 * @returns The resolved semantic NavigationIntent, or null if the key is unhandled.
 *
 * @example
 * ```ts
 * const intent = resolveKeyboardIntent(event, { orientation: "vertical", rtl: false });
 * ```
 */
export function resolveKeyIntent(
  event: KeyboardEvent,
  options: KeyboardIntentOptions = {},
): NavigationIntent | null {
  // ignore IME.
  if (event.isComposing || event.key === "Process") return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const { orientation = "vertical", rtl = false } = options;
  const key = event.key;

  if (key === "Home") return "first";
  if (key === "End") return "last";
  if (key === "Enter" || key === " ") return "select";

  if (orientation === "vertical") {
    if (key === "ArrowDown") return "next";
    if (key === "ArrowUp") return "previous";
    if (key === "ArrowRight") return rtl ? "exit" : "enter";
    if (key === "ArrowLeft") return rtl ? "enter" : "exit";
  } else if (orientation === "horizontal") {
    if (key === "ArrowRight") return rtl ? "previous" : "next";
    if (key === "ArrowLeft") return rtl ? "next" : "previous";
    if (key === "ArrowDown") return "enter";
  }

  return null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export type NavigationIntent = "first" | "last" | "next" | "previous" | "enter" | "exit" | "select";

export interface KeyboardIntentOptions {
  /**
   * Layout orientation of the navigable items.
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal";

  /**
   * Whether the layout follows a Right-to-Left (RTL) reading order.
   * @default false
   */
  rtl?: boolean;
}
