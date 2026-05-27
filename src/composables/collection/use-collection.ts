import {
  type MaybeRefOrGetter,
  type Ref,
  type ComputedRef,
  computed,
  ref,
  toValue,
  watch,
} from "vue";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * A data-first structural manager for 1D flat lists or 2D tree collections.
 * This maintains the active and expanded state without interacting directly with the DOM.
 *
 * @param options - Configuration options for the collection.
 * @returns An object containing reactive states and control methods.
 *
 * @example Basic 1D collection
 * ```ts
 * const collection = useCollection({
 *   items: () => ['Apple', 'Banana', 'Orange'],
 *   itemValue: (item) => item,
 * });
 * ```
 *
 * @example Nested 2D/Tree collection
 * ```ts
 * interface MenuItem {
 *   id: string;
 *   label: string;
 *   children?: MenuItem[];
 * }
 * const collection = useCollection({
 *   items: () => menuItems,
 *   itemValue: (item) => item.id,
 *   itemChildren: (item) => item.children,
 * });
 * ```
 */
export function useCollection<T>(options: UseCollectionOptions<T>): UseCollectionReturn<T> {
  const { items: itemsOption, itemValue, itemDisabled, itemChildren } = options;

  //=====================================================================================
  // Collection State
  //=====================================================================================
  const activeValue = ref<string | null>(null);
  const expandedValues = ref<Set<string>>(new Set());

  const items = computed(() => toValue(itemsOption));
  const isDisabled = (item: T) => itemDisabled?.(item) ?? false;

  //=====================================================================================
  // Derived State
  //=====================================================================================
  const flattenedItems = computed(() => {
    const rawItems = items.value;
    if (!itemChildren) return rawItems;

    const result: T[] = [];
    const traverse = (itemList: T[]) => {
      for (const item of itemList) {
        result.push(item);
        const value = itemValue(item);
        if (expandedValues.value.has(value)) {
          const children = itemChildren(item);
          if (children && children.length > 0) {
            traverse(children);
          }
        }
      }
    };
    traverse(rawItems);
    return result;
  });

  const itemState = computed(() => {
    const rawItems = items.value;
    const parents = new Map<string, string>();
    const withChildren = new Set<string>();

    if (!itemChildren) return { parents, withChildren };

    const traverse = (itemList: T[], parentValue: string | null) => {
      for (const item of itemList) {
        const value = itemValue(item);
        if (parentValue != null) {
          parents.set(value, parentValue);
        }
        const children = itemChildren(item);
        if (children && children.length > 0) {
          withChildren.add(value);
          traverse(children, value);
        }
      }
    };
    traverse(rawItems, null);
    return { parents, withChildren };
  });

  const hasChildren = (value: string) => itemState.value.withChildren.has(value);
  const getParentValue = (value: string) => itemState.value.parents.get(value) ?? null;

  const getFocusableItems = () => flattenedItems.value.filter((item) => !isDisabled(item));
  const focusableValues = computed(() => getFocusableItems().map((item) => itemValue(item)));

  //=====================================================================================
  // Event / Navigation Handlers
  //=====================================================================================
  const expandBranch = (value: string) => {
    const newSet = new Set(expandedValues.value);
    newSet.add(value);
    expandedValues.value = newSet;
  };

  const collapseBranch = (value: string) => {
    const newSet = new Set(expandedValues.value);
    newSet.delete(value);
    expandedValues.value = newSet;
  };

  const collapseAll = () => {
    expandedValues.value = new Set();
  };

  const setActiveValue = (value: string | null) => {
    activeValue.value = value;
  };

  const setNext = (options: CollectionNavigationOptions = {}) => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;

    if (activeValue.value == null) {
      activeValue.value = itemValue(focusableItems[0]);
      return;
    }

    const currentIndex = focusableItems.findIndex((item) => itemValue(item) === activeValue.value);

    if (currentIndex === -1) {
      activeValue.value = itemValue(focusableItems[0]);
      return;
    }

    let nextIndex = currentIndex + 1;
    if (nextIndex >= focusableItems.length) {
      if (options.loop) {
        nextIndex = 0;
      } else {
        return; // do not change
      }
    }

    activeValue.value = itemValue(focusableItems[nextIndex]);
  };

  const setPrevious = (options: CollectionNavigationOptions = {}) => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;

    if (activeValue.value == null) {
      activeValue.value = itemValue(focusableItems[focusableItems.length - 1]);
      return;
    }

    const currentIndex = focusableItems.findIndex((item) => itemValue(item) === activeValue.value);

    if (currentIndex === -1) {
      activeValue.value = itemValue(focusableItems[focusableItems.length - 1]);
      return;
    }

    let previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      if (options.loop) {
        previousIndex = focusableItems.length - 1;
      } else {
        return;
      }
    }

    activeValue.value = itemValue(focusableItems[previousIndex]);
  };

  const setFirst = () => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;
    activeValue.value = itemValue(focusableItems[0]);
  };

  const setLast = () => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;
    activeValue.value = itemValue(focusableItems[focusableItems.length - 1]);
  };

  const getFirstEnabledDescendantValue = (value: string): string | null => {
    const rawItems = items.value;
    const item = findItemByValue(rawItems, value, itemValue, itemChildren);
    if (!item) return null;
    const descendant = findFirstEnabledDescendant(item, isDisabled, itemChildren);
    return descendant ? itemValue(descendant) : null;
  };

  //=====================================================================================
  // Wiring
  //=====================================================================================
  watch(
    [activeValue, focusableValues],
    ([value, values]) => {
      if (value != null && !values.includes(value)) {
        activeValue.value = null;
      }
    },
    { flush: "sync" },
  );

  return {
    activeValue,
    expandedValues,
    flattenedItems,
    expandBranch,
    collapseBranch,
    collapseAll,
    hasChildren,
    getParentValue,
    setActiveValue,
    setNext,
    setPrevious,
    setFirst,
    setLast,
    getFirstEnabledDescendantValue,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Recursively search a tree for an item matching the target value.
 */
function findItemByValue<T>(
  items: T[],
  value: string,
  itemValue: (item: T) => string,
  itemChildren?: (item: T) => T[] | null | undefined,
): T | null {
  for (const item of items) {
    if (itemValue(item) === value) {
      return item;
    }
    if (itemChildren) {
      const children = itemChildren(item);
      if (children && children.length > 0) {
        const found = findItemByValue(children, value, itemValue, itemChildren);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * Recursively find the first enabled descendant in a tree branch.
 */
function findFirstEnabledDescendant<T>(
  item: T,
  isDisabled: (item: T) => boolean,
  itemChildren?: (item: T) => T[] | null | undefined,
): T | null {
  if (!itemChildren) return null;
  const children = itemChildren(item);
  if (!children || children.length === 0) return null;

  for (const child of children) {
    if (!isDisabled(child)) {
      return child;
    }
    const descendant = findFirstEnabledDescendant(child, isDisabled, itemChildren);
    if (descendant) {
      return descendant;
    }
  }
  return null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseCollectionOptions<T> {
  /**
   * The flat list of items in the collection.
   */
  items: MaybeRefOrGetter<T[]>;
  /**
   * Function to extract a unique string identifier from an item.
   */
  itemValue: (item: T) => string;
  /**
   * Optional function to determine if an item is disabled (cannot be active).
   */
  itemDisabled?: (item: T) => boolean;
  /**
   * Function to extract children from an item, turning the 1D list into a 2D tree.
   */
  itemChildren?: (item: T) => T[] | null | undefined;
}

export interface CollectionNavigationOptions {
  /**
   * If true, traversal wraps around when reaching the start or end.
   */
  loop?: boolean;
}

export interface UseCollectionReturn<T> {
  /**
   * The currently active value in the collection.
   */
  activeValue: Ref<string | null>;
  /**
   * Set of item values whose branches are currently expanded.
   */
  expandedValues: Ref<Set<string>>;
  /**
   * A dynamically flattened array of currently visible items based on expansion state.
   */
  flattenedItems: ComputedRef<T[]>;
  /**
   * Expand a branch by its item value.
   */
  expandBranch: (value: string) => void;
  /**
   * Collapse a branch by its item value.
   */
  collapseBranch: (value: string) => void;
  /**
   * Collapse all branches.
   */
  collapseAll: () => void;
  /**
   * Check if a specific value has children.
   */
  hasChildren: (value: string) => boolean;
  /**
   * Get the parent value for a given item value.
   */
  getParentValue: (value: string) => string | null;
  /**
   * Set the active value directly.
   */
  setActiveValue: (value: string | null) => void;
  /**
   * Advance to the next focusable item.
   */
  setNext: (options?: CollectionNavigationOptions) => void;
  /**
   * Go back to the previous focusable item.
   */
  setPrevious: (options?: CollectionNavigationOptions) => void;
  /**
   * Go to the first focusable item.
   */
  setFirst: () => void;
  /**
   * Go to the last focusable item.
   */
  setLast: () => void;
  /**
   * Get the first enabled descendant value for a given branch value.
   */
  getFirstEnabledDescendantValue: (value: string) => string | null;
}
