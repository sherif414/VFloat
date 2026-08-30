import type { NavigationIntent } from "./intent";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Finds the next enabled element index from a starting position in a given direction.
 *
 * Walks the collection one step at a time from `startIdx` in the direction of `delta`,
 * skipping indices where `isElementDisabled` returns true. Optionally wraps around
 * at boundaries when `loop` is enabled.
 *
 * @param startIdx - The index to start searching from (exclusive — the first probe is `startIdx + delta`).
 * @param delta - Search direction: `1` for forward, `-1` for backward.
 * @param totalSize - Total number of items in the collection.
 * @param isElementDisabled - Predicate returning `true` for indices that should be skipped.
 * @param loop - Whether to wrap around at collection boundaries.
 * @returns The next navigable index, or `null` if none is found.
 */
export function findNextNavigableIndex(
  startIdx: number,
  delta: 1 | -1,
  totalSize: number,
  isElementDisabled: (idx: number) => boolean,
  loop: boolean,
): number | null {
  if (totalSize === 0) return null;

  let current = startIdx;

  for (let step = 0; step < totalSize; step++) {
    current += delta;

    if (current >= totalSize) {
      if (!loop) return null;
      current = 0;
    } else if (current < 0) {
      if (!loop) return null;
      current = totalSize - 1;
    }

    if (!isElementDisabled(current)) {
      return current;
    }
  }

  return null;
}

/**
 * Resolves the target index for a given semantic navigation intent.
 *
 * Maps high-level intents (`next`, `previous`, `first`, `last`) to concrete index
 * lookups using {@link findNextNavigableIndex}. `first` and `last` always search
 * without looping so they land on the true boundary element.
 *
 * @param intent - The semantic navigation intent to resolve.
 * @param currentIdx - The currently active index (may be `null` or negative when no item is active).
 * @param totalSize - Total number of items in the collection.
 * @param isNavigableElement - Predicate returning `true` for indices that should be skipped.
 * @param loop - Whether `next`/`previous` should wrap at boundaries.
 * @returns The resolved target index, or `null` if no navigable item is found.
 */
export function resolveNavigableIndexByIntent(
  intent: NavigationIntent,
  currentIdx: number | null,
  totalSize: number,
  isNavigableElement: (idx: number) => boolean,
  loop: boolean,
): number | null {
  if (totalSize === 0) return null;

  switch (intent) {
    case "next": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : -1;
      return findNextNavigableIndex(start, 1, totalSize, isNavigableElement, loop);
    }
    case "previous": {
      const start = currentIdx !== null && currentIdx >= 0 ? currentIdx : totalSize;
      return findNextNavigableIndex(start, -1, totalSize, isNavigableElement, loop);
    }
    case "first":
      return findNextNavigableIndex(-1, 1, totalSize, isNavigableElement, false);
    case "last":
      return findNextNavigableIndex(totalSize, -1, totalSize, isNavigableElement, false);
    default:
      return null;
  }
}
