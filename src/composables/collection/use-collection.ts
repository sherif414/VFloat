import { computed, type MaybeRefOrGetter, type Ref, ref, toValue, watch } from "vue";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a flat navigable collection over stable string values.
 *
 * @param options - Collection values and disabled-value predicate.
 * @returns Active value state and movement helpers for list navigation.
 *
 * @example
 * ```ts
 * const collection = useCollection({
 *   values: ["open", "rename", "delete"],
 *   isValueDisabled: value => value === "delete",
 * });
 * ```
 */
export function useCollection(options: UseCollectionOptions): UseCollectionReturn {
  const { values: valuesOption, isValueDisabled: isValueDisabledOption } = options;

  const activeValue = ref<string | null>(null);
  const values = computed(() => toValue(valuesOption));
  const enabledValues = computed(() => values.value.filter((value) => !isValueDisabled(value)));

  const isValueKnown = (value: string) => values.value.includes(value);

  const isValueDisabled = (value: string): boolean => {
    return isValueDisabledOption?.(value) ?? false;
  };

  const setActiveValue = (value: string | null) => {
    if (value !== null && (!isValueKnown(value) || isValueDisabled(value))) return;
    activeValue.value = value;
  };

  const setFirst = () => {
    activeValue.value = enabledValues.value[0] ?? null;
  };

  const setLast = () => {
    activeValue.value = enabledValues.value[enabledValues.value.length - 1] ?? null;
  };

  const setNext = (navOptions: CollectionNavigationOptions = {}) => {
    setRelativeValue(1, navOptions.loop);
  };

  const setPrevious = (navOptions: CollectionNavigationOptions = {}) => {
    setRelativeValue(-1, navOptions.loop);
  };

  function setRelativeValue(delta: 1 | -1, loop = false) {
    const enabled = enabledValues.value;
    if (enabled.length === 0) {
      activeValue.value = null;
      return;
    }

    const currentIdx = activeValue.value === null ? -1 : enabled.indexOf(activeValue.value);
    if (currentIdx === -1) {
      activeValue.value = delta === 1 ? enabled[0] : enabled[enabled.length - 1];
      return;
    }

    let nextIdx = currentIdx + delta;
    if (nextIdx < 0) {
      if (!loop) return;
      nextIdx = enabled.length - 1;
    } else if (nextIdx >= enabled.length) {
      if (!loop) return;
      nextIdx = 0;
    }

    activeValue.value = enabled[nextIdx];
  }

  watch(
    [activeValue, values],
    ([value]) => {
      if (value !== null && (!isValueKnown(value) || isValueDisabled(value))) {
        activeValue.value = null;
      }
    },
    { flush: "sync" },
  );

  return {
    activeValue,
    setActiveValue,
    setNext,
    setPrevious,
    setFirst,
    setLast,
    isItemDisabled: isValueDisabled,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseCollectionOptions {
  /**
   * Ordered values in the collection.
   */
  values: MaybeRefOrGetter<readonly string[]>;

  /**
   * Predicate for values that should be skipped by navigation.
   */
  isValueDisabled?: (value: string) => boolean;
}

export interface CollectionNavigationOptions {
  /**
   * Whether movement should wrap at the collection boundaries.
   */
  loop?: boolean;
}

export interface UseCollectionReturn {
  /**
   * The currently active value.
   */
  activeValue: Ref<string | null>;

  /**
   * Set the active value directly.
   */
  setActiveValue: (value: string | null) => void;

  /**
   * Move to the next enabled value.
   */
  setNext: (options?: CollectionNavigationOptions) => void;

  /**
   * Move to the previous enabled value.
   */
  setPrevious: (options?: CollectionNavigationOptions) => void;

  /**
   * Move to the first enabled value.
   */
  setFirst: () => void;

  /**
   * Move to the last enabled value.
   */
  setLast: () => void;

  /**
   * Check whether a value is disabled.
   */
  isItemDisabled: (value: string) => boolean;
}
