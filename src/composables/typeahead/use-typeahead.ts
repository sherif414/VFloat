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
import type { FloatingContext } from "@/composables/floating-context";
import { isTypeableElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Provides typeahead keyboard search functionality for collections and list items.
 *
 * Captures typing sequences and jumps to matching enabled items in menus, select
 * lists, or dropdowns.
 *
 * @param context - The floating context object containing state and refs.
 * @param options - Configuration options for typeahead matching.
 * @returns State and cleanup helpers for typeahead navigation.
 *
 * @example With useCollection
 * ```ts
 * const collection = useCollection({ values: ["Apple", "Banana", "Cherry"] });
 * useTypeahead(context, { collection });
 * ```
 *
 * @example With custom list and onMatch
 * ```ts
 * useTypeahead(context, {
 *   list: ["Apple", "Banana", "Cherry"],
 *   onMatch: (index) => { activeIndex.value = index; },
 * });
 * ```
 */
export function useTypeahead(
  context: UseTypeaheadContext,
  options: UseTypeaheadOptions = {},
): UseTypeaheadReturn {
  const refs = context.refs;
  const { open } = context.state;

  const {
    collection,
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

  //=====================================================================================
  // Reactive Options & Derived State
  //=====================================================================================
  const isEnabled = computed(() => toValue(enabledOption));
  const resetMs = computed(() => toValue(resetMsOption));
  const ignoreKeys = computed(() => toValue(ignoreKeysOption));
  const findMatch = computed(() => unref(findMatchOption));

  const list = computed<readonly (string | null)[]>(() => {
    if (listOption !== undefined) {
      return toValue(listOption);
    }
    if (collection?.values) {
      return toValue(collection.values);
    }
    return [];
  });

  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));
  const floatingEl = computed(() => refs.floatingEl.value);

  //=====================================================================================
  // Internal State
  //=====================================================================================
  const isTypingRef = ref(false);
  let typingBuffer = "";
  let resetTimeoutId = -1;
  let prevIndex: number | null = null;
  let matchIndex: number | null = null;

  const cleanupRegistry = createCleanupRegistry();

  //=====================================================================================
  // State Helpers
  //=====================================================================================
  function isItemDisabled(value: string): boolean {
    if (collection?.isItemDisabled?.(value)) return true;
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

    const currentList = list.value;
    if (collection?.activeValue.value !== undefined && collection.activeValue.value !== null) {
      const idx = currentList.indexOf(collection.activeValue.value);
      prevIndex = idx !== -1 ? idx : null;
    } else if (activeIndexOption !== undefined) {
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
      () => collection?.activeValue.value,
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

  //=====================================================================================
  // Event Handlers
  //=====================================================================================
  function onKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented || !isEnabled.value) return;

    const target = e.target as Element | null;
    if (target && isTypeableElement(target)) {
      return;
    }

    const currentList = list.value;
    if (currentList.length === 0) return;

    if (typingBuffer === "") {
      syncPrevIndex();
    }

    // Space key handling: If typing buffer is active, capture space to allow multi-word searches.
    if (typingBuffer.length > 0 && typingBuffer[0] !== " ") {
      const match = findTypeaheadMatch(
        currentList,
        currentList,
        typingBuffer,
        findMatch.value,
        (val) => isItemDisabled(val),
      );
      if (match === -1) {
        setTypingState(false);
      } else if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Ignore non-printable, modifier, or explicit ignore keys
    if (
      ignoreKeys.value.includes(e.key) ||
      e.key.length !== 1 ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }

    // Capture non-space characters when open to prevent window scrolling
    if (open.value && e.key !== " ") {
      e.preventDefault();
      e.stopPropagation();
      setTypingState(true);
    }

    // Repeated character cycling: when the user types the same single character repeatedly
    // in rapid succession (e.g. "a" -> "a"), rotate search to the next matching item.
    const isRepeatedChar =
      typingBuffer.length > 0 &&
      typingBuffer
        .split("")
        .every((char) => char.toLocaleLowerCase() === e.key.toLocaleLowerCase());

    if (isRepeatedChar) {
      typingBuffer = "";
      prevIndex = matchIndex;
    }

    typingBuffer += e.key;

    clearResetTimeout();
    resetTimeoutId = window.setTimeout(() => {
      typingBuffer = "";
      prevIndex = matchIndex;
      setTypingState(false);
    }, resetMs.value);

    // Build rotated search list starting after the previous match
    const startIndex = prevIndex !== null && prevIndex >= 0 ? prevIndex + 1 : 0;
    const orderedList = [...currentList.slice(startIndex), ...currentList.slice(0, startIndex)];

    const matchedIndex = findTypeaheadMatch(
      currentList,
      orderedList,
      typingBuffer,
      findMatch.value,
      (val) => isItemDisabled(val),
    );

    if (matchedIndex !== -1) {
      matchIndex = matchedIndex;

      const matchedValue = currentList[matchedIndex];
      if (matchedValue !== null && matchedValue !== undefined) {
        collection?.setActiveValue(matchedValue);
      }

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

  //=====================================================================================
  // Wiring: Register listeners
  //=====================================================================================
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
 * Searches for a matching string in the collection list.
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
export interface UseTypeaheadContext {
  /**
   * The reactive element refs exposed by the floating context.
   */
  refs: FloatingContext["refs"];
  /**
   * The reactive state exposed by the floating context.
   */
  state: FloatingContext["state"];
}

/**
 * Configuration options for `useTypeahead`.
 */
export interface UseTypeaheadOptions {
  /**
   * Optional collection manager instance to synchronize with typeahead search.
   */
  collection?: {
    activeValue: Ref<string | null>;
    setActiveValue: (value: string | null) => void;
    isItemDisabled?: (value: string) => boolean;
    values?: ComputedRef<readonly string[]> | Ref<readonly string[]> | readonly string[];
  };

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
