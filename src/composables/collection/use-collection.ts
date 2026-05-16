import { type MaybeRefOrGetter, type Ref, type ComputedRef, computed, ref, toValue } from "vue";

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
}

/**
 * A data-first structural manager for 1D flat lists.
 * This maintains the active state without interacting directly with the DOM.
 */
export function useCollection<T>(options: UseCollectionOptions<T>): UseCollectionReturn<T> {
  const activeValue = ref<string | null>(null);
  const expandedValues = ref<Set<string>>(new Set());

  const getItems = () => toValue(options.items);
  const isDisabled = (item: T) => options.itemDisabled?.(item) ?? false;

  const flattenedItems = computed(() => {
    const rawItems = getItems();
    const itemChildren = options.itemChildren;
    if (!itemChildren) return rawItems;

    const result: T[] = [];
    const traverse = (items: T[]) => {
      for (const item of items) {
        result.push(item);
        const val = options.itemValue(item);
        if (expandedValues.value.has(val)) {
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
    const rawItems = getItems();
    const parents = new Map<string, string>();
    const withChildren = new Set<string>();
    const itemChildren = options.itemChildren;

    if (!itemChildren) return { parents, withChildren };

    const traverse = (items: T[], parentVal: string | null) => {
      for (const item of items) {
        const val = options.itemValue(item);
        if (parentVal != null) {
          parents.set(val, parentVal);
        }
        const children = itemChildren(item);
        if (children && children.length > 0) {
          withChildren.add(val);
          traverse(children, val);
        }
      }
    };
    traverse(rawItems, null);
    return { parents, withChildren };
  });

  const hasChildren = (value: string) => itemState.value.withChildren.has(value);
  const getParentValue = (value: string) => itemState.value.parents.get(value) ?? null;

  const getFocusableItems = () => flattenedItems.value.filter((item) => !isDisabled(item));

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

  const setNext = (navOptions: CollectionNavigationOptions = {}) => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;

    if (activeValue.value == null) {
      activeValue.value = options.itemValue(focusableItems[0]);
      return;
    }

    const currentIndex = focusableItems.findIndex(
      (item) => options.itemValue(item) === activeValue.value,
    );

    if (currentIndex === -1) {
      activeValue.value = options.itemValue(focusableItems[0]);
      return;
    }

    let nextIndex = currentIndex + 1;
    if (nextIndex >= focusableItems.length) {
      if (navOptions.loop) {
        nextIndex = 0;
      } else {
        return; // do not change
      }
    }

    activeValue.value = options.itemValue(focusableItems[nextIndex]);
  };

  const setPrevious = (navOptions: CollectionNavigationOptions = {}) => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;

    if (activeValue.value == null) {
      activeValue.value = options.itemValue(focusableItems[focusableItems.length - 1]);
      return;
    }

    const currentIndex = focusableItems.findIndex(
      (item) => options.itemValue(item) === activeValue.value,
    );

    if (currentIndex === -1) {
      activeValue.value = options.itemValue(focusableItems[focusableItems.length - 1]);
      return;
    }

    let previousIndex = currentIndex - 1;
    if (previousIndex < 0) {
      if (navOptions.loop) {
        previousIndex = focusableItems.length - 1;
      } else {
        return;
      }
    }

    activeValue.value = options.itemValue(focusableItems[previousIndex]);
  };

  const setFirst = () => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;
    activeValue.value = options.itemValue(focusableItems[0]);
  };

  const setLast = () => {
    const focusableItems = getFocusableItems();
    if (focusableItems.length === 0) return;
    activeValue.value = options.itemValue(focusableItems[focusableItems.length - 1]);
  };

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
  };
}
