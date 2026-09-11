import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  readonly,
  type Ref,
  ref,
  toValue,
  unref,
  watch,
} from "vue";
import type { FloatingNode } from "@/composables/floating-tree";
import { isTypeableElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Provides typeahead keyboard search functionality for list items.
 *
 * Captures typing sequences and jumps to matching enabled items in menus, select
 * lists, or dropdowns.
 *
 * @param node - The floating node object containing state and refs.
 * @param options - Configuration options for typeahead matching.
 * @returns State and cleanup helpers for typeahead navigation.
 *
 * @example
 * ```ts
 * useTypeahead(node, {
 *   list: ["Apple", "Banana", "Cherry"],
 *   onMatch: (index) => { activeIndex.value = index; },
 * });
 * ```
 */
export function useTypeahead(
  node: UseTypeaheadContext,
  options: UseTypeaheadOptions = {},
): UseTypeaheadReturn {
  const refs = node.refs;
  const { open } = node;

  const {
    list: listOption,
    activeIndex: activeIndexOption,
    selectedIndex: selectedIndexOption,
    onMatch,
    onTypingChange,
    enabled: enabledOption = true,
    resetMs: resetMsOption = 750,
    ignoreKeys: ignoreKeysOption = [],
    findMatch: findMatchOption = null,
    isValueDisabled: isValueDisabledOption,
  } = options;

  // --- Shared Options & Derived State -----------------------------------------

  const isEnabled = computed(() => toValue(enabledOption));
  const resetMs = computed(() => toValue(resetMsOption));
  const ignoreKeys = computed(() => toValue(ignoreKeysOption));
  const findMatch = computed(() => unref(findMatchOption));

  const list = computed<readonly (string | null)[]>(() => {
    if (listOption !== undefined) {
      return toValue(listOption);
    }
    return [];
  });

  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));
  const floatingEl = computed(() => refs.floatingEl.value);

  // --- Search Buffer & Match State -------------------------------------------

  const isTypingRef = ref(false);
  let typingBuffer = "";
  let resetTimeoutId = -1;
  let prevIndex: number | null = null;
  let matchIndex: number | null = null;

  const cleanupRegistry = createCleanupRegistry();

  // --- Buffer Reset & State Helpers ------------------------------------------

  function isItemDisabled(value: string): boolean {
    if (isValueDisabledOption?.(value)) return true;
    return false;
  }

  function setTypingState(value: boolean) {
    if (isTypingRef.value !== value) {
      isTypingRef.value = value;
      onTypingChange?.(value);
    }
  }

  function clearResetTimeout() {
    if (resetTimeoutId !== -1) {
      clearTimeout(resetTimeoutId);
      resetTimeoutId = -1;
    }
  }

  function resetTyping() {
    clearResetTimeout();
    typingBuffer = "";
    matchIndex = null;
    setTypingState(false);
  }

  // Keep prevIndex synchronized with active / selected index when not actively typing.
  function syncPrevIndex() {
    if (typingBuffer !== "") return;

    if (activeIndexOption !== undefined) {
      prevIndex = toValue(activeIndexOption);
    } else if (selectedIndexOption !== undefined) {
      prevIndex = toValue(selectedIndexOption);
    } else {
      prevIndex = null;
    }
  }

  // Synchronize prevIndex on active index / value changes
  watch(
    [
      () => (activeIndexOption !== undefined ? toValue(activeIndexOption) : undefined),
      () => (selectedIndexOption !== undefined ? toValue(selectedIndexOption) : undefined),
      list,
    ],
    () => {
      syncPrevIndex();
    },
    { immediate: true, flush: "sync" },
  );

  // Reset typeahead buffer and state whenever open state transitions
  watch(
    open,
    () => {
      resetTyping();
      syncPrevIndex();
    },
    { flush: "sync" },
  );

  // --- Key Event Listeners & Matching ----------------------------------------

  function onKeyDown(e: KeyboardEvent) {
    if (!isEnabled.value || !open.value) return;

    // Ignore composition / IME input
    if (e.isComposing) return;

    // Never interfere with native typing controls (inputs, textareas, contenteditable)
    if (isTypeableElement(e.target as Element | null)) return;

    // Ignore modifiers (except Shift which is natural for capitalized letters)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Ignore navigation keys
    if (
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Escape" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.key === "PageUp" ||
      e.key === "PageDown"
    ) {
      return;
    }

    // Ignore explicit user-ignored keys
    if (ignoreKeys.value.includes(e.key)) return;

    const currentList = list.value;
    if (currentList.length === 0) return;

    if (typingBuffer === "") {
      syncPrevIndex();
    }

    // Space key: if typing buffer is empty, space should not trigger typeahead
    // (allows natural button click / checkbox toggling). If typing, space appends.
    if (e.key === " " && typingBuffer === "") {
      return;
    }

    // Single character or append
    if (e.key.length !== 1) return;

    // Prevent scrolling on Space when actively typing a multi-word sequence
    if (e.key === " ") {
      e.preventDefault();
    }

    clearResetTimeout();
    resetTimeoutId = window.setTimeout(() => {
      resetTyping();
    }, resetMs.value);

    setTypingState(true);

    const isRepeatedSingleChar =
      typingBuffer.length > 0 &&
      typingBuffer.split("").every((ch) => ch.toLowerCase() === e.key.toLowerCase());

    if (isRepeatedSingleChar) {
      // User is pressing the same key repeatedly (e.g. 'c', 'c', 'c').
      // Cycle to the next item starting with that letter.
      typingBuffer += e.key;
    } else {
      typingBuffer += e.key;
    }

    // Determine starting search offset:
    // If repeated single char cycling, search from after matchIndex or prevIndex.
    let startIndex = 0;

    const isCycling =
      typingBuffer.length > 1 &&
      typingBuffer.split("").every((ch) => ch.toLowerCase() === typingBuffer[0]!.toLowerCase());

    if (isCycling) {
      const baseIdx = matchIndex ?? prevIndex ?? -1;
      startIndex = (baseIdx + 1) % currentList.length;
    } else if (matchIndex !== null && matchIndex >= 0) {
      // Continuing a multi-character query: try to match from currently matched item or beginning
      startIndex = 0;
    } else if (prevIndex !== null && prevIndex >= 0) {
      startIndex = (prevIndex + 1) % currentList.length;
    }

    // Create ordered candidate list wrapped from startIndex
    const orderedList: (string | null)[] = Array.from({ length: currentList.length });
    for (let i = 0; i < currentList.length; i++) {
      orderedList[i] = currentList[(startIndex + i) % currentList.length] ?? null;
    }

    const queryToSearch = isCycling ? typingBuffer[0]! : typingBuffer;

    const matchedIndex = findTypeaheadMatch(
      currentList,
      orderedList,
      queryToSearch,
      findMatch.value,
      (val) => isItemDisabled(val),
    );

    if (matchedIndex !== -1) {
      matchIndex = matchedIndex;

      const matchedValue = currentList[matchedIndex];
      onMatch?.(matchedIndex, matchedValue ?? "");
    } else if (e.key !== " ") {
      typingBuffer = "";
      setTypingState(false);
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === " " && typingBuffer === "") {
      setTypingState(false);
    }
  }

  // --- Target Event Listeners ------------------------------------------------

  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? anchorEl.value : null), "keydown", onKeyDown),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? anchorEl.value : null), "keyup", onKeyUp),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? floatingEl.value : null), "keydown", onKeyDown),
  );
  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? floatingEl.value : null), "keyup", onKeyUp),
  );

  cleanupRegistry.add(() => {
    resetTyping();
  });

  tryOnScopeDispose(cleanupRegistry.cleanup);

  return {
    isTyping: readonly(isTypingRef),
    reset: resetTyping,
    cleanup: cleanupRegistry.cleanup,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Searches for a matching string in the list.
 */
function findTypeaheadMatch(
  originalList: readonly (string | null)[],
  orderedList: readonly (string | null)[],
  typedString: string,
  customMatcher: TypeaheadFindMatchFn | null | undefined,
  isDisabled: (value: string) => boolean,
): number {
  if (customMatcher) {
    const candidate = customMatcher(orderedList, typedString);
    if (typeof candidate === "number") {
      return candidate >= 0 && candidate < originalList.length ? candidate : -1;
    }
    if (typeof candidate === "string") {
      const idx = originalList.indexOf(candidate);
      return idx !== -1 && !isDisabled(candidate) ? idx : -1;
    }
    return -1;
  }

  const query = typedString.toLocaleLowerCase();

  for (const item of orderedList) {
    if (!item) continue;
    const originalIndex = originalList.indexOf(item);
    if (originalIndex === -1 || isDisabled(item)) continue;

    if (item.toLocaleLowerCase().indexOf(query) === 0) {
      return originalIndex;
    }
  }

  return -1;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Custom finder function for resolving typeahead string matches.
 */
export type TypeaheadFindMatchFn = (
  orderedList: readonly (string | null)[],
  typedString: string,
) => string | number | null | undefined;

/**
 * Context required by `useTypeahead`.
 */
export interface UseTypeaheadContext extends Pick<FloatingNode, "refs" | "open"> {}

/**
 * Return shape for `useTypeahead`.
 */
export interface UseTypeaheadReturn {
  /**
   * Reactive boolean indicating whether a user typing session is actively in progress.
   */
  isTyping: Readonly<Ref<boolean>>;

  /**
   * Resets the active typing buffer and timeout.
   */
  reset: () => void;

  /**
   * Stops all listeners and watchers created by the composable.
   */
  cleanup: () => void;
}

/**
 * Configuration options for `useTypeahead`.
 */
export interface UseTypeaheadOptions {
  /**
   * An array of item label strings to search through.
   */
  list?: MaybeRefOrGetter<readonly (string | null)[]>;

  /**
   * The currently active item index in the list.
   */
  activeIndex?: MaybeRefOrGetter<number | null>;

  /**
   * The currently selected item index in the list.
   */
  selectedIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Callback invoked with the matched index and string value when a match is found.
   */
  onMatch?: (index: number, value: string) => void;

  /**
   * Callback invoked when typing state changes.
   */
  onTypingChange?: (isTyping: boolean) => void;

  /**
   * Whether the typeahead composable is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Duration in milliseconds before the typed buffer is reset.
   * @default 750
   */
  resetMs?: MaybeRefOrGetter<number>;

  /**
   * List of specific keys to ignore during typeahead typing.
   * @default []
   */
  ignoreKeys?: MaybeRefOrGetter<readonly string[]>;

  /**
   * Custom function to determine matching item.
   * @default prefix startsWith matcher
   */
  findMatch?:
    | Ref<TypeaheadFindMatchFn | null>
    | ComputedRef<TypeaheadFindMatchFn | null>
    | TypeaheadFindMatchFn
    | null;

  /**
   * Predicate for skipping disabled items during matching.
   */
  isValueDisabled?: (value: string) => boolean;
}
