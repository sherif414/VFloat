import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from "vue";
import type { UseFloatingReturn } from "../use-floating";

export interface UseTypeaheadOptions {
  /**
   * Whether typeahead is enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Ref to the list container element
   */
  listRef: Ref<HTMLElement | null>;

  /**
   * The active index in the list
   */
  activeIndex: MaybeRefOrGetter<number | null>;

  /**
   * Callback for when typeahead matches an index
   */
  onMatch?: (index: number) => void;

  /**
   * Custom function to find a match based on the typeahead string
   */
  findMatch?: (list: Array<HTMLElement | null>, typedString: string) => number | null;

  /**
   * Amount of time in ms to reset the typeahead string
   * @default 1000
   */
  resetMs?: MaybeRefOrGetter<number>;

  /**
   * Array of keys to ignore for typeahead
   */
  ignoreKeys?: MaybeRefOrGetter<string[]>;

  /**
   * Currently selected index (if different from active)
   */
  selectedIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Callback for when the typing state changes
   */
  onTypingChange?: (isTyping: boolean) => void;
}

export interface UseTypeaheadReturn {
  /**
   * Reference element props for typeahead
   */
  getReferenceProps: () => {
    onKeyDown: (event: KeyboardEvent) => void;
  };

  /**
   * Floating element props for typeahead
   */
  getFloatingProps: () => {
    onKeyDown: (event: KeyboardEvent) => void;
  };

  /**
   * The current typeahead string
   */
  typedString: Ref<string>;

  /**
   * The amount of time to reset the typeahead string
   */
  resetMs: MaybeRefOrGetter<number>;
}

/**
 * Enables typeahead search within a floating list element
 */
export function useTypeahead(
  context: UseFloatingReturn & {
    open: Ref<boolean>;
  },
  options: UseTypeaheadOptions
): UseTypeaheadReturn {
  const { open, refs } = context;

  const {
    listRef,
    activeIndex,
    selectedIndex = null,
    onMatch,
    enabled = true,
    findMatch,
    resetMs = 1000,
    ignoreKeys = [],
    onTypingChange,
  } = options;

  const isEnabled = computed(() => toValue(enabled));
  const typedString = ref("");
  let timeoutId: number | null = null;

  onScopeDispose(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  });

  // Reset timeout for the typed string
  const resetTypedStringAfterDelay = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (onTypingChange && typedString.value) {
      onTypingChange(true);
    }

    timeoutId = window.setTimeout(() => {
      typedString.value = "";
      if (onTypingChange) {
        onTypingChange(false);
      }
    }, toValue(resetMs));
  };

  // Handle keypresses for typeahead
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      !open.value ||
      !isEnabled.value ||
      event.defaultPrevented ||
      !event.key ||
      event.key.length !== 1 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }

    // Ignore specific keys
    const ignoreKeysValue = toValue(ignoreKeys);
    if (ignoreKeysValue.includes(event.key)) {
      return;
    }

    // Keys that clearly aren't typeahead
    if (
      event.key === " " ||
      event.key === "Enter" ||
      event.key === "Escape" ||
      event.key === "Tab" ||
      event.key.startsWith("Arrow")
    ) {
      return;
    }

    // Update typed string
    event.preventDefault();
    typedString.value += event.key.toLowerCase();

    // Reset timeout
    resetTypedStringAfterDelay();

    // Find a match in the list
    if (!listRef.value) return;

    const listItems = Array.from(
      listRef.value.querySelectorAll<HTMLElement>("[data-floating-index]")
    ) as HTMLElement[];

    if (listItems.length === 0) return;

    // Sort the items by their index
    listItems.sort((a, b) => {
      return Number(a.dataset.floatingIndex || 0) - Number(b.dataset.floatingIndex || 0);
    });

    let matchedIndex: number | null = null;

    // Use custom match finder if provided
    if (findMatch) {
      matchedIndex = findMatch(listItems, typedString.value);
    } else {
      // Default matching logic
      const startingIndex = toValue(activeIndex) !== null ? toValue(activeIndex)! + 1 : 0;
      const wrappedIndex = startingIndex % listItems.length;

      // First, try to find a match starting from the current active index
      for (let i = 0; i < listItems.length; i++) {
        const index = (wrappedIndex + i) % listItems.length;
        const item = listItems[index];

        if (!item) continue;

        const text = getItemText(item).toLowerCase();

        if (text.startsWith(typedString.value)) {
          matchedIndex = index;
          break;
        }
      }

      // If no match was found, and we have multiple letters typed,
      // try to find a match from the beginning
      if (matchedIndex === null && typedString.value.length === 1) {
        for (let i = 0; i < listItems.length; i++) {
          const item = listItems[i];

          if (!item) continue;

          const text = getItemText(item).toLowerCase();

          if (text.startsWith(typedString.value)) {
            matchedIndex = i;
            break;
          }
        }
      }
    }

    // Call the onMatch callback if we found a match
    if (matchedIndex !== null && onMatch) {
      onMatch(matchedIndex);
    }
  };

  return {
    getReferenceProps: () => ({
      onKeyDown: handleKeyDown,
    }),
    getFloatingProps: () => ({
      onKeyDown: handleKeyDown,
    }),
    typedString,
    resetMs,
  };
}

// Helper to get text content from a list item
function getItemText(item: HTMLElement): string {
  // Try to find text content in elements with common text attributes
  const label = item.querySelector("[aria-label]");
  if (label?.getAttribute("aria-label")) {
    return label.getAttribute("aria-label") || "";
  }

  // Look for a label ID
  const labelledby = item.getAttribute("aria-labelledby");
  if (labelledby) {
    const labelElement = document.getElementById(labelledby);
    if (labelElement) {
      return labelElement.textContent || "";
    }
  }

  // Default to the element's text content
  return item.textContent || "";
}
