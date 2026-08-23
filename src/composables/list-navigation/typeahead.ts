import { type MaybeRefOrGetter, toValue } from "vue";
import { isTypeableElement } from "@/shared/dom";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a typeahead search controller for matching item labels via keyboard typing.
 *
 * Supports single-character repeat cycling (e.g., typing "g", "g", "g" rotates through
 * items starting with "G") as well as multi-character sequence matching (e.g., typing
 * "n", "e", "w" matches "New York").
 */
export function createTypeahead(options: TypeaheadOptions = {}): TypeaheadController {
  const { timeout: timeoutOption = 500, enabled: enabledOption = true } = options;

  let buffer = "";
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function reset() {
    clearTimer();
    buffer = "";
  }

  function handleKey(event: KeyboardEvent, context: TypeaheadSearchContext): number | null {
    if (!toValue(enabledOption)) {
      return null;
    }

    const target = event.target as Element | null;
    if (target && isTypeableElement(target)) {
      return null;
    }

    const { items, activeIndex, isItemDisabled, getItemLabel } = context;
    if (items.length === 0) {
      return null;
    }

    const key = event.key;

    // Ignore non-character keys or modified keys (Ctrl, Meta, Alt)
    if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return null;
    }

    // Space key: only accept into buffer if we are already in an active search string
    if (key === " " && buffer.length === 0) {
      return null;
    }

    clearTimer();

    buffer += key.toLowerCase();

    timeoutId = setTimeout(() => {
      reset();
    }, toValue(timeoutOption));

    const matchIndex = findTypeaheadMatch(items, buffer, activeIndex, isItemDisabled, getItemLabel);

    return matchIndex;
  }

  return {
    handleKey,
    reset,
    cleanup: clearTimer,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Searches for the next matching item index based on the typed buffer.
 */
export function findTypeaheadMatch<T>(
  items: readonly T[],
  buffer: string,
  activeIndex: number,
  isItemDisabled: (item: T, index: number) => boolean,
  getItemLabel: (item: T, index: number) => string,
): number | null {
  if (items.length === 0 || !buffer) {
    return null;
  }

  const query = buffer.toLowerCase();

  // Single character repeat cycling (e.g. "ggg" -> cycle items starting with "g")
  const isSingleCharRepeat = query.length > 1 && query.split("").every((char) => char === query[0]);

  if (isSingleCharRepeat) {
    const searchChar = query[0];
    const startIndex = activeIndex >= 0 ? activeIndex : 0;

    for (let i = 1; i <= items.length; i++) {
      const idx = (startIndex + i) % items.length;
      const item = items[idx];
      if (isItemDisabled(item, idx)) continue;

      const label = getItemLabel(item, idx).toLowerCase();
      if (label.startsWith(searchChar)) {
        return idx;
      }
    }

    return null;
  }

  // Multi-character sequence match (or initial single character):
  // Search forward starting from activeIndex, wrapping around to the beginning.
  const startIndex = activeIndex >= 0 ? activeIndex : 0;

  for (let i = 0; i < items.length; i++) {
    const idx = (startIndex + i) % items.length;
    const item = items[idx];
    if (isItemDisabled(item, idx)) continue;

    const label = getItemLabel(item, idx).toLowerCase();
    if (label.startsWith(query)) {
      return idx;
    }
  }

  return null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface TypeaheadOptions {
  /**
   * Timeout in milliseconds before the search buffer clears.
   * @default 500
   */
  timeout?: MaybeRefOrGetter<number>;

  /**
   * Whether typeahead searching is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
}

export interface TypeaheadSearchContext<T = any> {
  items: readonly T[];
  activeIndex: number;
  isItemDisabled: (item: T, index: number) => boolean;
  getItemLabel: (item: T, index: number) => string;
}

export interface TypeaheadController {
  /**
   * Process a keydown event and return the matched item index, or `null` if no match.
   */
  handleKey: (event: KeyboardEvent, context: TypeaheadSearchContext) => number | null;

  /**
   * Clears the active typing buffer and timer.
   */
  reset: () => void;

  /**
   * Cleans up running timers.
   */
  cleanup: () => void;
}
