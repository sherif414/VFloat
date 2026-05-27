export type NavigationIntent =
  | "first"
  | "last"
  | "next"
  | "previous"
  | "enter"
  | "exit"
  | "activate"
  | "close";

export type NavigationOrientation = "vertical" | "horizontal";

export interface KeyboardIntentOptions {
  orientation?: NavigationOrientation;
  rtl?: boolean;
}

/**
 * Maps a raw KeyboardEvent to a semantic navigation intent based on the
 * current orientation and reading direction.
 *
 * This mapping is stateless and purely declarative. It does not know about
 * tree structures, DOM state, or whether an item is disabled.
 */
export function resolveKeyboardIntent(
  event: KeyboardEvent,
  options: KeyboardIntentOptions = {},
): NavigationIntent | null {
  const { orientation = "vertical", rtl = false } = options;
  const key = event.key;

  // We ignore events with modifiers (except Shift, which might be needed for some navigation
  // but generally arrow keys shouldn't have Alt/Ctrl/Meta for basic navigation).
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

  if (key === "Home") return "first";
  if (key === "End") return "last";
  if (key === "Tab") return "close";
  if (key === "Enter" || key === " ") return "activate";

  if (orientation === "vertical") {
    if (key === "ArrowDown") return "next";
    if (key === "ArrowUp") return "previous";
    if (key === "ArrowRight") return rtl ? "exit" : "enter";
    if (key === "ArrowLeft") return rtl ? "enter" : "exit";
  } else if (orientation === "horizontal") {
    if (key === "ArrowRight") return rtl ? "previous" : "next";
    if (key === "ArrowLeft") return rtl ? "next" : "previous";
    // Up/Down do not map to cross-axis in pure horizontal by default,
    // though in a menubar they might map to "enter".
    // For now, keep it strictly main-axis.
    if (key === "ArrowDown") return "enter";
  }

  return null;
}
