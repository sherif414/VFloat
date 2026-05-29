import {
  type MaybeRefOrGetter,
  type Ref,
  type ComputedRef,
  computed,
  readonly,
  ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { TreeModel } from "./tree-model";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * A data-first structural mediator for flat lists and hierarchical tree collections.
 * Manages active, expanded, and selected state without DOM coupling.
 *
 * For flat lists, omit `getItemChildren`. For trees, provide it to enable
 * branch-scoped navigation, expansion, and parent/child traversal.
 *
 * Each branch is a self-contained navigable slice satisfying the
 * `NavigableCollection` shape, allowing composables like `useListNavigation`
 * to navigate within a single depth level without cross-branch contamination.
 *
 * @param options - Configuration options for the tree.
 * @returns The tree context with state, branches, and query methods.
 */
export function useTree<T>(options: UseTreeOptions<T>): UseTreeReturn<T> {
  const {
    items: itemsOption,
    getItemId,
    isItemDisabled: isItemDisabledOpt,
    getItemChildren,
  } = options;

  const activeValue = ref<string | null>(null);
  const expandedValues = shallowRef<Set<string>>(new Set());

  const model = computed(() => {
    return new TreeModel(toValue(itemsOption), {
      getItemId,
      isItemDisabled: isItemDisabledOpt,
      getItemChildren,
    });
  });

  /** DFS-order flattening of items visible under the current expansion state. */
  const flattenedItems = computed(() => {
    return model.value.getFlattenedItems(expandedValues.value);
  });

  const isItemDisabled = (value: string): boolean => {
    return model.value.isItemDisabled(value);
  };

  const setActiveValue = (value: string | null) => {
    if (value != null && isItemDisabled(value)) return;
    activeValue.value = value;
  };

  //=====================================================================================
  // Expansion
  //=====================================================================================

  const hasChildren = (value: string) => model.value.hasChildren(value);
  const isExpanded = (value: string) => expandedValues.value.has(value);

  const expandBranch = (value: string) => {
    if (!hasChildren(value) || isExpanded(value)) return;
    const next = new Set(expandedValues.value);
    next.add(value);
    expandedValues.value = next;
  };

  const collapseBranch = (value: string) => {
    if (!isExpanded(value)) return;
    const next = new Set(expandedValues.value);
    next.delete(value);
    expandedValues.value = next;
  };

  const collapseAll = () => {
    if (expandedValues.value.size === 0) return;
    expandedValues.value = new Set();
  };

  //=====================================================================================
  // Queries
  //=====================================================================================

  const getItem = (value: string): T | null => model.value.getItem(value);

  const getParentValue = (value: string) => model.value.getParentValue(value);

  const getDepth = (value: string) => model.value.getDepth(value);

  const getAncestorValues = (value: string): string[] => {
    return model.value.getAncestorValues(value);
  };

  const getSiblingValues = (value: string): string[] => {
    return model.value.getSiblingValues(value);
  };

  const getFirstEnabledDescendantValue = (value: string): string | null => {
    return model.value.getFirstEnabledDescendantValue(value);
  };

  //=====================================================================================
  // Branch Factory
  //=====================================================================================

  const branchCache = new Map<string | null, TreeBranch<T>>();

  const createBranch = (parentVal: string | null): TreeBranch<T> => {
    const branchItems = computed(() => model.value.childrenItemsMap.get(parentVal) ?? []);
    const enabledValues = computed(() =>
      branchItems.value.reduce<string[]>((acc, item) => {
        const id = getItemId(item);
        if (!model.value.isItemDisabled(id)) {
          acc.push(id);
        }
        return acc;
      }, []),
    );

    /**
     * Projected active value — only non-null when the tree's global active
     * value belongs to this specific branch. Writing delegates to the tree.
     */
    const branchActiveValue = computed({
      get() {
        const active = activeValue.value;
        if (active == null) return null;
        const parent = model.value.getParentValue(active);
        return parent === parentVal ? active : null;
      },
      set(value: string | null) {
        setActiveValue(value);
      },
    });

    const navigate = (direction: "next" | "prev", loop = false) => {
      const enabled = enabledValues.value;
      if (enabled.length === 0) return;
      const currentActive = branchActiveValue.value;

      if (currentActive == null || enabled.indexOf(currentActive) === -1) {
        if (direction === "next") setFirst();
        else setLast();
        return;
      }

      let nextIdx = enabled.indexOf(currentActive) + (direction === "next" ? 1 : -1);
      if (direction === "next" && nextIdx >= enabled.length) {
        if (loop) nextIdx = 0;
        else return;
      }

      if (direction === "prev" && nextIdx < 0) {
        if (loop) nextIdx = enabled.length - 1;
        else return;
      }
      branchActiveValue.value = enabled[nextIdx];
    };

    const setNext = (navOptions: { loop?: boolean } = {}) => {
      navigate("next", navOptions.loop);
    };

    const setPrevious = (navOptions: { loop?: boolean } = {}) => {
      navigate("prev", navOptions.loop);
    };

    const setFirst = () => {
      const enabled = enabledValues.value;
      if (enabled.length === 0) return;
      branchActiveValue.value = enabled[0];
    };

    const setLast = () => {
      const enabled = enabledValues.value;
      if (enabled.length === 0) return;
      branchActiveValue.value = enabled[enabled.length - 1];
    };

    return {
      parentValue: parentVal,
      items: branchItems,
      activeValue: branchActiveValue,
      setActiveValue,
      setNext,
      setPrevious,
      setFirst,
      setLast,
      isItemDisabled,
    };
  };

  const rootBranch = createBranch(null);
  branchCache.set(null, rootBranch);

  const getBranch = (parentVal: string): TreeBranch<T> | null => {
    let branch = branchCache.get(parentVal);
    if (branch) return branch;
    if (!hasChildren(parentVal)) return null;
    branch = createBranch(parentVal);
    branchCache.set(parentVal, branch);
    return branch;
  };

  //=====================================================================================
  // Wiring
  //=====================================================================================

  const cleanupRegistry = createCleanupRegistry();

  // Clear active value when the active item is removed from the dataset or becomes disabled.
  // Does NOT clear when an item is merely hidden by a collapsed branch (unopinionated).
  // Uses direct O(1) checks against the compiled model maps to maintain integrity.
  const stopActiveWatcher = watch(
    [activeValue, model],
    ([val, m]) => {
      if (val != null) {
        const item = m.itemMap.get(val);
        if (!item || m.disabledValues.has(val)) {
          activeValue.value = null;
        }
      }
    },
    { flush: "sync" },
  );

  cleanupRegistry.add(stopActiveWatcher);

  // Prune expandedValues when the tree model changes
  const stopPruneWatcher = watch(
    model,
    (newModel) => {
      const nextExpanded = new Set<string>();
      for (const val of expandedValues.value) {
        if (newModel.branchParents.has(val)) {
          nextExpanded.add(val);
        }
      }
      if (nextExpanded.size !== expandedValues.value.size) {
        expandedValues.value = nextExpanded;
      }
    },
    { flush: "sync" },
  );

  cleanupRegistry.add(stopPruneWatcher);

  tryOnScopeDispose(cleanupRegistry.cleanup);

  return {
    activeValue,
    expandedValues: readonly(expandedValues) as unknown as Ref<ReadonlySet<string>>,
    flattenedItems,
    setActiveValue,
    expandBranch,
    collapseBranch,
    collapseAll,
    isExpanded,
    getItem,
    hasChildren,
    isItemDisabled,
    getParentValue,
    getDepth,
    getAncestorValues,
    getSiblingValues,
    getFirstEnabledDescendantValue,
    rootBranch,
    getBranch,
    cleanup: cleanupRegistry.cleanup,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseTreeOptions<T> {
  /**
   * The root items in the tree.
   */
  items: MaybeRefOrGetter<T[]>;
  /**
   * Function to extract a unique string identifier from an item.
   */
  getItemId: (item: T) => string;
  /**
   * Optional function to determine if an item is disabled (cannot be activated).
   */
  isItemDisabled?: (item: T) => boolean;
  /**
   * Function to extract children from an item, enabling hierarchical tree structure.
   * Omit for flat lists.
   */
  getItemChildren?: (item: T) => T[] | null | undefined;
}

/**
 * A scoped navigable slice of the tree representing one depth level.
 *
 * Each branch contains the direct children of a parent node (or the root items
 * for the root branch). Its `activeValue` is a projected view that is only
 * non-null when the tree's global active value belongs to this branch.
 *
 * Structurally satisfies the `NavigableCollection` shape expected by
 * `useListNavigation`, enabling scope-aware keyboard navigation without
 * cross-branch contamination.
 */
export interface TreeBranch<T> {
  /**
   * The parent node's value, or `null` for the root branch.
   */
  parentValue: string | null;
  /**
   * The direct children items at this branch level.
   */
  items: ComputedRef<T[]>;
  /**
   * Projected active value — only non-null when the tree's active value
   * belongs to this specific branch.
   */
  activeValue: Ref<string | null>;
  /**
   * Set the active value. Delegates to the tree's `setActiveValue`.
   */
  setActiveValue: (value: string | null) => void;
  /**
   * Navigate to the next enabled item within this branch.
   */
  setNext: (options?: { loop?: boolean }) => void;
  /**
   * Navigate to the previous enabled item within this branch.
   */
  setPrevious: (options?: { loop?: boolean }) => void;
  /**
   * Navigate to the first enabled item within this branch.
   */
  setFirst: () => void;
  /**
   * Navigate to the last enabled item within this branch.
   */
  setLast: () => void;
  /**
   * Check if a specific value is disabled.
   */
  isItemDisabled: (value: string) => boolean;
}

export interface UseTreeReturn<T> {
  // --- State ---

  /**
   * The currently active value across the entire tree.
   */
  activeValue: Ref<string | null>;
  /**
   * Set of item values whose branches are currently expanded.
   */
  expandedValues: Ref<ReadonlySet<string>>;
  /**
   * DFS-order flattened array of currently visible items based on expansion state.
   */
  flattenedItems: ComputedRef<T[]>;

  // --- Active ---

  /**
   * Set the active value directly. Rejects disabled items.
   */
  setActiveValue: (value: string | null) => void;

  // --- Expansion ---

  /**
   * Expand a branch by its parent item value. No-op for leaf nodes.
   */
  expandBranch: (value: string) => void;
  /**
   * Collapse a branch by its parent item value.
   */
  collapseBranch: (value: string) => void;
  /**
   * Collapse all branches.
   */
  collapseAll: () => void;
  /**
   * Check if a specific value's branch is currently expanded.
   */
  isExpanded: (value: string) => boolean;

  // --- Queries ---

  /**
   * Look up the original item by its value. Returns `null` if not found.
   */
  getItem: (value: string) => T | null;
  /**
   * Check if a node has children (i.e., is a branch parent).
   */
  hasChildren: (value: string) => boolean;
  /**
   * Check if a specific value is disabled.
   */
  isItemDisabled: (value: string) => boolean;
  /**
   * Get the parent value for a given item value. Returns `null` for root items.
   */
  getParentValue: (value: string) => string | null;
  /**
   * Get the depth of a node in the tree. Root items are depth 0.
   * Returns -1 if the value is not found.
   */
  getDepth: (value: string) => number;
  /**
   * Get all ancestor values from parent to root (closest first).
   */
  getAncestorValues: (value: string) => string[];
  /**
   * Get sibling values (same-level items, excluding the item itself).
   */
  getSiblingValues: (value: string) => string[];
  /**
   * Get the first enabled descendant value via DFS. Returns `null` if none found.
   */
  getFirstEnabledDescendantValue: (value: string) => string | null;

  // --- Branch ---

  /**
   * The root-level branch containing all top-level items.
   */
  rootBranch: TreeBranch<T>;
  /**
   * Get the branch for a specific parent node. Returns `null` for leaf nodes.
   * Branch instances are cached — same parent always returns the same reference.
   */
  getBranch: (parentValue: string) => TreeBranch<T> | null;
  /**
   * Stop all internal watchers created by the composable.
   */
  cleanup: () => void;
}
