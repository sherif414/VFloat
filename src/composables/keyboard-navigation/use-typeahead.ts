import { computed, type MaybeRefOrGetter, readonly, type Ref, ref, toValue, watch } from "vue";
import type { FloatingNode } from "@/composables/floating-tree";
import { isTypeableElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import type { NavigationTarget } from "./types";

// File-private navigation keys owned by sibling behaviors (roving focus,
// selection, dismissal). Typeahead never claims them.
const TYPEAHEAD_NAVIGATION_KEYS: ReadonlySet<string> = new Set([
  "Tab",
  "Enter",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Provides ARIA APG typeahead search for popup lists owned by a floating node.
 *
 * Buffers rapid printable keystrokes typed inside the floating panel and emits
 * the index of the first enabled item matching the query. Typing the same
 * character repeatedly cycles through items starting with that character,
 * per the APG menu and listbox patterns.
 *
 * The keyboard scope covers the floating panel and the anchor trigger.
 * The panel is where APG places typeahead for menus, listboxes, trees, and
 * grids; the trigger stays searchable while the popup is closed so collapsed
 * selects can preselect. The engine never changes open state and never
 * claims trigger activation keys (Enter, idle Space, arrows).
 *
 * @param node - The floating node with open state and panel refs.
 * @param options - Item labels, active index offset, target protocol, and matcher overrides.
 * @returns The live search buffer and a manual reset action.
 *
 * @example Pairing with roving focus using target option
 * ```ts
 * const context = useFloatingNode({ anchorEl, floatingEl });
 * const elementsList = ref<Array<HTMLElement | null>>([]);
 * const roving = useRovingFocus(context, { elementsList });
 *
 * const { searchQuery } = useTypeahead(context, {
 *   target: roving,
 *   items: ["Apple", "Banana", "Cherry"],
 * });
 * ```
 */
export function useTypeahead(
  node: UseTypeaheadContext,
  options: UseTypeaheadOptions = {},
): UseTypeaheadReturn {
  const { open } = node;
  const target = options.target;

  // --- Shared Options & Root State --------------------------------------------------

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const items = computed<readonly (string | null)[]>(() => toValue(options.items) ?? []);
  const activeIndex = computed<number>(() => {
    if (options.activeIndex !== undefined) {
      return toValue(options.activeIndex);
    }
    if (target) {
      return target.activeIndex.value;
    }
    return -1;
  });
  const containerEl = computed(() => toValue(options.containerEl) ?? node.refs.floatingEl.value);
  const anchorTarget = computed(() => getAnchorElement(node.refs.anchorEl.value));

  const searchQuery = ref("");
  let resetTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let prevIndex: number | null = null;
  let matchIndex: number | null = null;

  // --- Search Buffer & Match Resolution ---------------------------------------------

  function clearResetTimeout() {
    if (resetTimeoutId === undefined) return;
    clearTimeout(resetTimeoutId);
    resetTimeoutId = undefined;
  }

  function reset() {
    clearResetTimeout();
    searchQuery.value = "";
    matchIndex = null;
  }

  // Tracks the caller's active index while idle so repeat-character cycling
  // resumes after the current item instead of restarting at the list head.
  function syncPrevIndex() {
    if (searchQuery.value !== "") return;
    const current = activeIndex.value;
    prevIndex = current >= 0 ? current : null;
  }

  watch([activeIndex, items], syncPrevIndex);

  watch(open, () => {
    reset();
    syncPrevIndex();
  });

  tryOnScopeDispose(clearResetTimeout);

  // --- Container Keyboard Search ----------------------------------------------------

  function onKeyDown(e: KeyboardEvent) {
    if (!isEnabled.value || e.defaultPrevented) return;

    // Navigation, selection, and dismissal keys hand control to sibling
    // behaviors, so any pending query is abandoned instead of extended by
    // the next keystroke.
    if (TYPEAHEAD_NAVIGATION_KEYS.has(e.key)) {
      reset();
      return;
    }

    if (isIgnoredKey(e, toValue(options.ignoreKeys) ?? [])) return;

    const currentItems = items.value;
    if (currentItems.length === 0) return;

    if (searchQuery.value === "") syncPrevIndex();

    // An idle Space preserves native trigger and option activation.
    if (e.key === " " && searchQuery.value === "") return;

    // Prevent page scroll while extending a multi-word query.
    if (e.key === " ") e.preventDefault();

    clearResetTimeout();
    resetTimeoutId = setTimeout(reset, toValue(options.resetMs) ?? 750);

    searchQuery.value += e.key;
    const matched = resolveSearchIndex(
      currentItems,
      searchQuery.value,
      activeIndex.value,
      prevIndex,
      matchIndex,
      options.findMatch,
      (idx) => options.isItemDisabled?.(idx) ?? false,
    );

    if (matched !== -1) {
      // Claim matched keystrokes so they can't trigger competing defaults
      // (page scroll, find-as-you-type) in exotic containers.
      e.preventDefault();
      matchIndex = matched;
      if (options.onMatch) {
        options.onMatch(matched);
      } else if (target) {
        target.focusIndex(matched);
      }
    } else {
      // A failed query would poison the next keystroke, so drop it and idle.
      reset();
    }
  }

  // The panel can only receive focus while open; stray events on a
  // mounted-but-hidden panel must not search. The trigger is always
  // focusable, so it stays searchable in both states without ever
  // affecting open state.
  function onContainerKeyDown(e: KeyboardEvent) {
    if (!open.value) return;
    onKeyDown(e);
  }

  useEventListener(containerEl, "keydown", onContainerKeyDown);
  useEventListener(anchorTarget, "keydown", onKeyDown);

  return {
    searchQuery: readonly(searchQuery),
    reset,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Whether a keydown can never extend a typeahead query: IME composition,
 * native typing targets such as combobox inputs, shortcut modifiers (Shift
 * stays allowed for capitalized letters), user-ignored keys, and
 * non-printable keys.
 */
function isIgnoredKey(e: KeyboardEvent, ignoreKeys: readonly string[]): boolean {
  if (e.isComposing) return true;
  if (isTypeableElement(e.target as Element | null)) return true;
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (ignoreKeys.includes(e.key)) return true;
  return e.key.length !== 1;
}

/**
 * Resolves a typing buffer to an item index. Repeat-character buffers cycle
 * from after the latest match; fresh prefixes restart from the list head so
 * the earliest match wins and multi-character queries stay put instead of
 * alternating. Returns `-1` when nothing matches.
 */
function resolveSearchIndex(
  itemsList: readonly (string | null)[],
  buffer: string,
  activeIndexValue: number,
  prevIndexValue: number | null,
  matchIndexValue: number | null,
  customMatcher: TypeaheadFindMatchFn | null | undefined,
  isDisabled: (index: number) => boolean,
): number {
  const isCycling = isSingleCharRepeat(buffer);
  const query = isCycling ? buffer[0]! : buffer;

  if (customMatcher) {
    const candidate = customMatcher(itemsList, query, activeIndexValue);
    const isUsable =
      Number.isInteger(candidate) &&
      candidate >= 0 &&
      candidate < itemsList.length &&
      !isDisabled(candidate);
    return isUsable ? candidate : -1;
  }

  let startIndex = 0;
  if (isCycling) {
    startIndex = ((matchIndexValue ?? prevIndexValue ?? -1) + 1) % itemsList.length;
  } else if (matchIndexValue === null && prevIndexValue !== null && prevIndexValue >= 0) {
    startIndex = (prevIndexValue + 1) % itemsList.length;
  }

  return resolvePrefixMatch(itemsList, query, startIndex, isDisabled);
}

/**
 * Whether the buffer is one character repeated (e.g. "aaa"), which per APG
 * cycles through same-letter items instead of extending the prefix.
 */
function isSingleCharRepeat(query: string): boolean {
  if (query.length <= 1) return false;
  const first = query[0]!.toLocaleLowerCase();
  for (let idx = 1; idx < query.length; idx++) {
    if (query[idx]!.toLocaleLowerCase() !== first) return false;
  }
  return true;
}

/**
 * Finds the first enabled item whose label starts with the query,
 * scanning forward from `startIndex` and wrapping around the list.
 */
function resolvePrefixMatch(
  itemsList: readonly (string | null)[],
  query: string,
  startIndex: number,
  isDisabled: (index: number) => boolean,
): number {
  const total = itemsList.length;
  if (total === 0) return -1;

  const lowered = query.toLocaleLowerCase();
  for (let step = 0; step < total; step++) {
    const idx = (startIndex + step) % total;
    const label = itemsList[idx];
    if (!label || isDisabled(idx)) continue;

    if (label.toLocaleLowerCase().startsWith(lowered)) {
      return idx;
    }
  }

  return -1;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useTypeahead`.
 */
export interface UseTypeaheadContext extends Pick<FloatingNode, "refs" | "open"> {}

/**
 * Return shape for `useTypeahead`.
 */
export interface UseTypeaheadReturn {
  /**
   * The live typing buffer. Empty when idle; useful for rendering a query badge.
   */
  searchQuery: Readonly<Ref<string>>;

  /**
   * Clears the typing buffer immediately and cancels the pending reset timer.
   */
  reset: () => void;
}

/**
 * Custom matcher resolving a query to an item index (or `-1` when nothing
 * matches). Receives the full item list, the query to search for (a single
 * character while cycling, the whole buffer otherwise), and the caller's
 * active index for offset decisions.
 */
export type TypeaheadFindMatchFn = (
  items: readonly (string | null)[],
  query: string,
  activeIndex: number,
) => number;

/**
 * Configuration options for `useTypeahead`.
 */
export interface UseTypeaheadOptions {
  /**
   * Text labels to match against. `null` entries are skipped.
   */
  items?: MaybeRefOrGetter<readonly (string | null)[]>;

  /**
   * Keyboard scope for typeahead search. Defaults to the floating panel,
   * where APG places typeahead for menus, listboxes, trees, and grids.
   * The anchor trigger stays searchable alongside it in both open states.
   * Override for inline widgets whose list lives outside the panel.
   */
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Optional navigation target (such as the return of `useRovingFocus` or `useAriaActivedescendant`).
   * When provided, `activeIndex` defaults to `target.activeIndex` and `onMatch`
   * defaults to `(index) => target.focusIndex(index)` unless explicitly overridden.
   */
  target?: NavigationTarget;

  /**
   * Currently active item index (`-1` when none). Read when a new query
   * starts to position repeat-character cycling after the current item.
   * Never written; forward matches via `onMatch`.
   * When omitted and `target` is supplied, defaults to `target.activeIndex`.
   * @default -1
   */
  activeIndex?: MaybeRefOrGetter<number>;

  /**
   * Callback invoked with the matched item index.
   * When omitted and `target` is supplied, defaults to `(index) => target.focusIndex(index)`.
   */
  onMatch?: (index: number) => void;

  /**
   * Whether typeahead search is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Inactivity delay in milliseconds before the typing buffer clears.
   * @default 750
   */
  resetMs?: MaybeRefOrGetter<number>;

  /**
   * Additional keys to ignore during typeahead search.
   * @default []
   */
  ignoreKeys?: MaybeRefOrGetter<readonly string[]>;

  /**
   * Custom matcher taking precedence over the default prefix search.
   * Plain function only: matchers are static logic, so reactivity is
   * unnecessary. Out-of-range, non-integer, or disabled results count
   * as no match.
   */
  findMatch?: TypeaheadFindMatchFn | null | undefined;

  /**
   * Predicate determining if the item at an index is disabled.
   * Disabled items are never matched.
   */
  isItemDisabled?: (index: number) => boolean;
}
