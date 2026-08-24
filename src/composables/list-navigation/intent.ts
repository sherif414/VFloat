import type { NavigationOrientation } from "./navigation-strategies";

export type NavigationIntent = "first" | "last" | "next" | "previous" | "enter" | "exit" | "select";

export interface KeyboardIntentOptions {
  orientation?: NavigationOrientation;
  rtl?: boolean;
}

/**
 * Maps a raw KeyboardEvent to a semantic navigation intent based on the
 * current orientation and reading direction.
 *
 * This mapping is stateless and purely declarative. It does not know about
 * DOM focus state or whether an item is disabled.
 */
export function resolveKeyboardIntent(
  event: KeyboardEvent,
  options: KeyboardIntentOptions = {},
): NavigationIntent | null {
  const { orientation = "vertical", rtl = false } = options;
  const key = event.key;

  // We ignore events with Alt/Ctrl/Meta modifiers for navigation keys.
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

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
