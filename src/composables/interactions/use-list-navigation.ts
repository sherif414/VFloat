import {
  computed,
  type MaybeRefOrGetter,
  onWatcherCleanup,
  type Ref,
  ref,
  toValue,
  watch,
  watchPostEffect,
} from "vue";
import {
  type FloatingContext,
  getFloatingInternals,
  type FloatingTreeNodeBridge,
  patchFloatingInternals,
} from "@/composables/positioning/floating-context";
import { isTypeableElement } from "@/shared/dom";
import { createCleanupRegistry } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import { isUsingKeyboard } from "@/composables/interactions/internal/input-modality";
import { resolveTreeInteraction } from "./internal/tree-interaction";
import { useActiveDescendant } from "./list-navigation/active-descendant";
import {
  createNavigationStrategy,
  isMainOrientationKey,
  isMainOrientationToEndKey,
  isTreeChildOpenKey,
  type StrategyContext,
} from "./list-navigation/strategies";
import type { FloatingTreeNode } from "./use-floating-tree-node";

type TreeNavigationNode = FloatingTreeNode | FloatingTreeNodeBridge;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Coordinates keyboard and hover navigation for floating lists, grids, and nested branches.
 */
export function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions,
): UseListNavigationReturn {
  type OpenIntent = {
    key: string;
  };
  type PendingOpenNavigation = {
    previousIndex: number | null;
    requestedIndex: number;
    shouldFocus: boolean;
  };
  type PendingChildOpen = {
    childNode: FloatingTreeNode;
    index: number;
  };

  const refs = context.refs;
  const { open, setOpen } = context.state;
  const tree = resolveTreeInteraction(context);

  const {
    listRef,
    activeIndex,
    onNavigate,
    enabled = true,
    loop = false,
    orientation = "vertical",
    disabledIndices,
    focusDisabledItems = false,
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    scrollItemIntoView = true,
    selectedIndex = null,
    focusItemOnOpen = "auto",
    nested: nestedOption,
    rtl = false,
    virtual = false,
    virtualItemRef,
    cols = 1,
    allowEscape = false,
    closeOnTab = true,
  } = options;

  //=====================================================================================
  // Derived State
  //=====================================================================================

  const isEnabled = computed(() => toValue(enabled));
  const isNested = () => toValue(nestedOption) ?? tree.parentNode != null;
  const shouldOpenChildOnFocus = computed(() => !!toValue(options.openChildOnFocus));
  const anchorEl = computed(() => {
    const el = refs.anchorEl.value;
    if (el instanceof HTMLElement) return el;
    if (el && "contextElement" in el && el.contextElement instanceof HTMLElement) {
      return el.contextElement;
    }
    return null;
  });
  const floatingEl = computed(() => refs.floatingEl.value);
  const isVirtual = computed(() => !!toValue(virtual));
  const activeDescendantEl = computed(() => toValue(options.activeDescendantEl) ?? anchorEl.value);
  const isRtl = computed(() => !!toValue(rtl));
  const gridCols = computed(() => Math.max(1, Number(toValue(cols) ?? 1)));
  const canFocusDisabledItems = computed(() => !!toValue(focusDisabledItems));
  const shouldHandleHomeEndKeys = computed(() => {
    const explicitValue = toValue(options.handleHomeEndKeys);
    if (explicitValue != null) {
      return explicitValue;
    }

    return !isVirtual.value || toValue(options.activeDescendantEl) != null;
  });
  const isNestedTreeAnchorWithinParentBranch = () => {
    const currentAnchorEl = anchorEl.value;
    const parentNode = tree.parentNode;

    // A submenu trigger should only open itself when the pointer/key event is actually
    // operating from the parent list branch, not when the child list has already taken over.
    return !!currentAnchorEl && !!parentNode?.actions.isTargetWithinBranch(currentAnchorEl);
  };

  //=====================================================================================
  // Cleanup Registry
  //=====================================================================================

  const cleanupRegistry = createCleanupRegistry();
  const registerCleanup = cleanupRegistry.add;
  const runCleanups = cleanupRegistry.flush;
  const treeNodeReturnIndex = ref<number | null>(null);
  const treeNodeOpenedByTree = ref(false);
  let treeNodeReturnIndexBridge = treeNodeReturnIndex;
  let treeNodeOpenedByTreeBridge = treeNodeOpenedByTree;
  let pendingChildOpen: PendingChildOpen | null = null;

  //=====================================================================================
  // Index Helpers
  //=====================================================================================

  const getActiveIndex = () => (activeIndex !== undefined ? toValue(activeIndex) : null);
  const currentActiveIndex = computed(() => getActiveIndex());

  const isDisabled = (idx: number): boolean => {
    if (!disabledIndices) return false;
    return Array.isArray(disabledIndices) ? disabledIndices.includes(idx) : !!disabledIndices(idx);
  };

  const isFocusableIndex = (idx: number | null): boolean => {
    return (
      idx != null &&
      idx >= 0 &&
      idx < listRef.value.length &&
      !!listRef.value[idx] &&
      (canFocusDisabledItems.value || !isDisabled(idx))
    );
  };

  const getFirstEnabledIndex = (): number | null => {
    const items = listRef.value;
    for (let i = 0; i < items.length; i++) {
      if (isFocusableIndex(i)) return i;
    }
    return null;
  };

  const getLastEnabledIndex = (): number | null => {
    const items = listRef.value;
    for (let i = items.length - 1; i >= 0; i--) {
      if (isFocusableIndex(i)) return i;
    }
    return null;
  };

  const getSelectedEnabledIndex = (): number | null => {
    const idx = selectedIndex !== undefined ? toValue(selectedIndex) : null;
    return isFocusableIndex(idx) ? idx : null;
  };

  const resolveInitialOpenIndex = (key: string | null): number | null => {
    const selectedIdx = getSelectedEnabledIndex();
    if (selectedIdx != null) return selectedIdx;

    if (key && !isMainOrientationToEndKey(key, toValue(orientation), isRtl.value)) {
      return getLastEnabledIndex();
    }

    return getFirstEnabledIndex();
  };

  const findNextEnabled = (start: number, dir: 1 | -1, wrap: boolean): number | null => {
    const items = listRef.value;
    const len = items.length;
    let i = start;
    for (let step = 0; step < len; step++) {
      if (i < 0 || i >= len) {
        if (!wrap) return null;
        i = (i + len) % len;
      }
      if (isFocusableIndex(i)) return i;
      i += dir;
    }
    return null;
  };

  const syncTreeNodeBridge = () => {
    const treeNode = tree.treeNode;
    if (!treeNode) {
      return null;
    }

    // Keep the internal bridge updated so sibling composables can discover list-navigation state.
    treeNodeReturnIndexBridge = treeNode.listNavigation?.returnIndex ?? treeNodeReturnIndexBridge;
    treeNodeOpenedByTreeBridge =
      treeNode.listNavigation?.openedByTree ?? treeNodeOpenedByTreeBridge;

    treeNode.listNavigation = {
      returnIndex: treeNodeReturnIndexBridge,
      openedByTree: treeNodeOpenedByTreeBridge,
      onNavigate: (index: number | null) => onNavigate?.(index),
    };

    patchFloatingInternals(context, {
      treeNode,
    });

    return getFloatingInternals(context as object)?.treeNode ?? null;
  };

  const restoreParentListNavigation = () => {
    const returnIndex = treeNodeReturnIndexBridge.value;
    const parentNode = tree.parentNode;

    if (returnIndex == null || !parentNode?.context.state.open.value) {
      return;
    }

    parentNode.listNavigation?.onNavigate?.(returnIndex);
  };

  const ensureChildListNavigationBridge = (childNode: FloatingTreeNode | null, index: number) => {
    if (!childNode) {
      return null;
    }

    // Child lists inherit the index that opened them so Escape / ArrowLeft can return cleanly.
    const childTreeNode = getFloatingInternals(childNode.context as object)?.treeNode;
    if (!childTreeNode) {
      return null;
    }

    const returnIndex = childTreeNode.listNavigation?.returnIndex ?? ref<number | null>(null);
    const openedByTree = childTreeNode.listNavigation?.openedByTree ?? ref(false);
    returnIndex.value = index;
    openedByTree.value = true;

    childTreeNode.listNavigation = {
      returnIndex,
      openedByTree,
      onNavigate: childTreeNode.listNavigation?.onNavigate,
    };

    patchFloatingInternals(childNode.context as object, {
      treeNode: childTreeNode,
    });

    return getFloatingInternals(childNode.context as object)?.treeNode ?? null;
  };

  const isTreeNodeWithinBranch = (
    candidateNode: TreeNavigationNode | null,
    branchRootNode: TreeNavigationNode | null,
  ) => {
    const floatingTree = tree.tree;
    if (!candidateNode || !branchRootNode || !floatingTree) {
      return false;
    }

    const visited = new Set<string>();
    let currentNode: TreeNavigationNode | null = candidateNode;

    while (currentNode) {
      const currentId = currentNode.id.value;
      if (currentId === branchRootNode.id.value) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);

      const parentId: string | null = currentNode.parentId.value;
      currentNode = parentId ? floatingTree.actions.getNode(parentId) : null;
    }

    return false;
  };

  const clearDescendantReturnIndexes = (branchRootNode: TreeNavigationNode) => {
    const floatingTree = tree.tree;
    if (!floatingTree) {
      return;
    }

    const visited = new Set<string>();

    const visit = (node: TreeNavigationNode) => {
      const nodeId = node.id.value;
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);

      for (const childId of node.childIds.value) {
        const childNode = floatingTree.actions.getNode(childId);
        if (!childNode) {
          continue;
        }

        const returnIndex = childNode.listNavigation?.returnIndex;
        if (returnIndex) {
          returnIndex.value = null;
        }

        visit(childNode);
      }
    };

    visit(branchRootNode);
  };

  const closeStaleChildBranchesForNavigation = (nextIndex: number | null, event?: Event) => {
    const currentNode = tree.treeNode;
    const activeNode = tree.activeNode;

    if (!currentNode || !activeNode || activeNode.id.value === currentNode.id.value) {
      return;
    }

    if (!isTreeNodeWithinBranch(activeNode, currentNode)) {
      return;
    }

    const nextChildNode =
      nextIndex == null
        ? null
        : ensureChildListNavigationBridge(options.getChildNode?.(nextIndex) ?? null, nextIndex);

    if (nextChildNode && isTreeNodeWithinBranch(activeNode, nextChildNode)) {
      return;
    }

    clearDescendantReturnIndexes(currentNode);
    tree.closeCurrentChildren("programmatic", event);
  };

  const navigate = (index: number | null, event?: Event) => {
    closeStaleChildBranchesForNavigation(index, event);
    onNavigate?.(index);
  };

  const openChildNode = (childNode: FloatingTreeNode, index: number, event?: Event) => {
    ensureChildListNavigationBridge(childNode, index);
    childNode.context.state.setOpen(true, "keyboard-activate", event);
  };

  syncTreeNodeBridge();

  //=====================================================================================
  // Focus Management
  //=====================================================================================

  const focusItem = (index: number | null, forceScroll = false): void => {
    if (index == null) return;
    const el = listRef.value[index];
    if (!el) return;

    // In virtual mode, ARIA and virtualItemRef management is handled by useActiveDescendant
    if (isVirtual.value) return;

    el.focus({ preventScroll: true });
    const opts = scrollItemIntoView;
    const shouldScroll = !!opts && (forceScroll || isUsingKeyboard.value);
    if (shouldScroll) {
      el.scrollIntoView?.(
        typeof opts === "boolean" ? { block: "nearest", inline: "nearest" } : opts,
      );
    }
  };

  const restoreManagedAttributes = (
    attributes: Array<{ attribute: string; el: HTMLElement; previousValue: string | null }>,
  ) => {
    for (const { attribute, el, previousValue } of [...attributes].reverse()) {
      if (previousValue == null) {
        el.removeAttribute(attribute);
      } else {
        el.setAttribute(attribute, previousValue);
      }
    }

    attributes.length = 0;
  };

  const setManagedAttribute = (
    attributes: Array<{ attribute: string; el: HTMLElement; previousValue: string | null }>,
    el: HTMLElement,
    attribute: string,
    value: string,
  ) => {
    attributes.push({
      attribute,
      el,
      previousValue: el.getAttribute(attribute),
    });
    el.setAttribute(attribute, value);
  };

  //=====================================================================================
  // Event Handlers
  //=====================================================================================

  let openIntent: OpenIntent | null = null;
  let pendingOpenNavigation: PendingOpenNavigation | null = null;

  const clearOpenCycleState = () => {
    openIntent = null;
    pendingOpenNavigation = null;
    pendingChildOpen = null;
  };

  const handleAnchorKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;

    const target = e.target as Element | null;
    // Allow navigation if the target is the anchor (e.g. input)
    if (target && isTypeableElement(target) && target !== anchorEl.value) return;

    const key = e.key;
    const ori = toValue(orientation);
    const shouldOpenFromAnchor = isNested()
      ? isTreeChildOpenKey(key, ori, isRtl.value)
      : isMainOrientationKey(key, ori);

    // In virtual mode, delegate to floating handler
    if (open.value && isVirtual.value) {
      handleFloatingKeyDown(e);
      return;
    }

    if (!shouldOpenFromAnchor) return;
    if (open.value || !toValue(openOnArrowKeyDown)) return;
    if (isNestedTreeAnchorWithinParentBranch()) return;

    e.preventDefault();
    openIntent = { key };
    setOpen(true, "keyboard-activate", e);
  };

  const handleFloatingKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;

    syncTreeNodeBridge();

    const key = e.key;
    const ori = toValue(orientation);
    if (key === "Tab" && open.value && toValue(closeOnTab)) {
      if (tree.tree) {
        tree.tree.actions.closeAll("programmatic", e);
      } else {
        setOpen(false, "programmatic", e);
      }
      return;
    }

    const items = listRef.value;
    if (!items.length) return;
    const currentIndex = getActiveIndex();

    if (shouldHandleHomeEndKeys.value) {
      if (key === "Home") {
        e.preventDefault();
        const idx = getFirstEnabledIndex();
        if (idx != null) navigate(idx, e);
        return;
      }
      if (key === "End") {
        e.preventDefault();
        const idx = getLastEnabledIndex();
        if (idx != null) navigate(idx, e);
        return;
      }
    }

    if (
      currentIndex != null &&
      !isDisabled(currentIndex) &&
      (isTreeChildOpenKey(key, ori, isRtl.value) || key === "Enter" || key === " ")
    ) {
      const childNode = options.getChildNode?.(currentIndex) ?? null;
      if (childNode) {
        e.preventDefault();
        openChildNode(childNode, currentIndex, e);
        return;
      }
    }

    // Determine navigation strategy based on orientation
    const strategy = createNavigationStrategy(
      ori,
      gridCols.value,
      toValue(options.gridLoopDirection) ?? "row",
    );

    // Build strategy context
    const strategyContext: StrategyContext = {
      current: getActiveIndex(),
      items,
      isRtl: isRtl.value,
      loop: !!toValue(loop),
      allowEscape: !!toValue(allowEscape),
      isVirtual: isVirtual.value,
      cols: gridCols.value,
      nested: isNested(),
      isDisabled: (index: number) => !isFocusableIndex(index),
      findNextEnabled,
      getFirstEnabledIndex,
      getLastEnabledIndex,
    };

    const result = strategy.handleKey(key, strategyContext);
    if (!result) return;

    e.preventDefault();

    if (result.type === "navigate") {
      navigate(result.index, e);
      const nextIndex = result.index;
      if (nextIndex == null) {
        pendingChildOpen = null;
        return;
      }

      const childNode = options.getChildNode?.(nextIndex) ?? null;

      if (childNode && shouldOpenChildOnFocus.value) {
        if (nextIndex === currentIndex) {
          openChildNode(childNode, nextIndex, e);
        } else {
          pendingChildOpen = {
            childNode,
            index: nextIndex,
          };
        }
      } else {
        pendingChildOpen = null;
      }
    } else if (result.type === "close") {
      if (tree.isTree) {
        tree.closeCurrent("programmatic", e);
      } else {
        setOpen(false, "programmatic", e);
      }
    }
  };

  //=====================================================================================
  // Watchers & Event Listeners
  //=====================================================================================

  registerCleanup(
    watchPostEffect(() => {
      const managedAttributes: Array<{
        attribute: string;
        el: HTMLElement;
        previousValue: string | null;
      }> = [];

      onWatcherCleanup(() => {
        restoreManagedAttributes(managedAttributes);
      });

      if (!isEnabled.value || !open.value || isVirtual.value) {
        return;
      }

      const activeIndexValue = getActiveIndex();

      for (let index = 0; index < listRef.value.length; index++) {
        const itemEl = listRef.value[index];
        if (!itemEl) {
          continue;
        }

        setManagedAttribute(
          managedAttributes,
          itemEl,
          "tabindex",
          index === activeIndexValue ? "0" : "-1",
        );
      }
    }),
  );

  registerCleanup(
    watch(
      [open, currentActiveIndex],
      ([isOpen, idx], [wasOpen, previousIndex]) => {
        if (!isEnabled.value || !isOpen || !wasOpen || idx === previousIndex) {
          return;
        }

        closeStaleChildBranchesForNavigation(idx);
      },
      { flush: "pre" },
    ),
  );

  // Focus active item when it changes
  registerCleanup(
    watch(
      [open, currentActiveIndex],
      ([isOpen, idx], [wasOpen, previousIndex]) => {
        if (!isEnabled.value || !isOpen || idx == null) return;

        if (pendingOpenNavigation) {
          const isRequestedIndex = idx === pendingOpenNavigation.requestedIndex;
          const isStaleCarriedIndex =
            idx === pendingOpenNavigation.previousIndex && !isRequestedIndex;

          if (isStaleCarriedIndex) {
            return;
          }

          const shouldFocus = pendingOpenNavigation.shouldFocus;
          pendingOpenNavigation = null;

          if (shouldFocus) {
            focusItem(idx, true);
          }

          return;
        }

        if (pendingChildOpen) {
          if (idx === pendingChildOpen.index) {
            const childNode = pendingChildOpen.childNode;
            pendingChildOpen = null;
            // The pending child opens after the active index settles so focus lands on the right item.
            ensureChildListNavigationBridge(childNode, idx);
            childNode.context.state.setOpen(true, "keyboard-activate");
          } else {
            pendingChildOpen = null;
          }

          return;
        }

        if (wasOpen && idx !== previousIndex) {
          focusItem(idx);
        }
      },
      { flush: "post" },
    ),
  );

  // Keyboard navigation on anchor element
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? anchorEl.value : null),
      "keydown",
      handleAnchorKeyDown,
    ),
  );

  // Keyboard navigation on floating element
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? floatingEl.value : null),
      "keydown",
      handleFloatingKeyDown,
    ),
  );

  // Hover-to-focus behavior
  registerCleanup(
    watchPostEffect(() => {
      if (!isEnabled.value || !toValue(focusItemOnHover)) return;
      const container = floatingEl.value;
      if (!container) return;

      let lastX: number | null = null;
      let lastY: number | null = null;

      // "State-Driven Hover" pattern:
      // Only update selection if the mouse *actually moved*.
      // This prevents "ghost hovers" where the list scrolls/updates under a stationary mouse.
      const onMove = (evt: MouseEvent) => {
        if (lastX === evt.clientX && lastY === evt.clientY) return;
        lastX = evt.clientX;
        lastY = evt.clientY;

        const target = evt.target as Element | null;
        if (!target) return;

        const idx = findItemIndexFromTarget(target);
        if (isFocusableIndex(idx)) navigate(idx, evt);
      };

      container.addEventListener("mousemove", onMove);
      onWatcherCleanup(() => container.removeEventListener("mousemove", onMove));
    }),
  );

  // Focus item when list opens
  const prevOpen = ref(false);
  registerCleanup(
    watch(
      () => open.value,
      (isOpen, wasOpen) => {
        syncTreeNodeBridge();

        if (!isEnabled.value) {
          clearOpenCycleState();
          treeNodeReturnIndexBridge.value = null;
          treeNodeOpenedByTreeBridge.value = false;
          return;
        }

        if (!isOpen) {
          restoreParentListNavigation();
          clearOpenCycleState();
          treeNodeReturnIndexBridge.value = null;
          treeNodeOpenedByTreeBridge.value = false;
          prevOpen.value = false;
          return;
        }

        if (wasOpen || prevOpen.value) {
          prevOpen.value = true;
          return;
        }

        const currentOpenIntent = openIntent;
        openIntent = null;

        const focusMode = toValue(focusItemOnOpen);
        const treeOpened = treeNodeOpenedByTreeBridge.value;
        const shouldNavigate =
          currentOpenIntent != null || focusMode === true || (treeOpened && focusMode === "auto");
        const shouldFocus =
          focusMode === true || (focusMode === "auto" && (currentOpenIntent != null || treeOpened));

        if (!shouldNavigate) {
          pendingOpenNavigation = null;
          treeNodeOpenedByTreeBridge.value = false;
          prevOpen.value = true;
          return;
        }

        const idx = resolveInitialOpenIndex(currentOpenIntent?.key ?? null);
        if (idx != null) {
          const previousIndex = getActiveIndex();
          pendingOpenNavigation = {
            previousIndex,
            requestedIndex: idx,
            shouldFocus,
          };
          onNavigate?.(idx);

          if (idx === previousIndex) {
            pendingOpenNavigation = null;
            if (shouldFocus) {
              focusItem(idx, true);
            }
          }
        } else {
          pendingOpenNavigation = null;
        }

        treeNodeOpenedByTreeBridge.value = false;
        prevOpen.value = true;
      },
      { flush: "post", immediate: true },
    ),
  );

  const findItemIndexFromTarget = (target: Element): number => {
    const items = listRef.value;
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      if (el && (el === target || el.contains(target))) return i;
    }
    return -1;
  };

  //=====================================================================================
  // Active Descendant (Virtual Focus)
  //=====================================================================================

  const { activeItem, cleanup: cleanupActiveDescendant } = useActiveDescendant(
    activeDescendantEl,
    listRef,
    currentActiveIndex,
    { virtual, open },
  );
  registerCleanup(cleanupActiveDescendant);

  // Sync activeItem with user-provided virtualItemRef
  if (virtualItemRef) {
    registerCleanup(
      watch(
        activeItem,
        (item) => {
          virtualItemRef.value = item;
        },
        { flush: "post" },
      ),
    );
    registerCleanup(() => {
      virtualItemRef.value = null;
    });
  }

  return { cleanup: runCleanups };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring list-style keyboard/mouse navigation behavior.
 *
 * This interface drives how items in a floating list/grid are navigated,
 * focused, and announced (including support for virtual focus).
 */
export interface UseListNavigationOptions {
  /**
   * Reactive collection of list item elements in DOM order.
   * Null entries are allowed while items mount/unmount.
   */
  listRef: Ref<Array<HTMLElement | null>>;

  /**
   * The currently active (navigated) index. Null means no active item.
   */
  activeIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Callback invoked when navigation sets a new active index.
   */
  onNavigate?: (index: number | null) => void;

  /**
   * Whether navigation behavior is enabled.
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * If true, arrow-key navigation wraps from end-to-start and vice versa.
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Primary navigation orientation.
   * - "vertical": Up/Down to navigate
   * - "horizontal": Left/Right to navigate
   * - "both": Grid navigation (supports cols/itemSizes)
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;

  /**
   * Indices that should be treated as disabled.
   * Can be an array of indices or a predicate.
   */
  disabledIndices?: Array<number> | ((index: number) => boolean);

  /**
   * If true, disabled items can still receive focus during navigation.
   * This matches APG-style menu behavior where disabled commands are announced
   * but cannot be activated by the consumer's item handlers.
   */
  focusDisabledItems?: MaybeRefOrGetter<boolean>;

  /**
   * If true, hovering an item moves the active index to that item.
   */
  focusItemOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * If true, pressing an arrow key when closed opens and moves focus.
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>;

  /**
   * Controls automatic scrolling when the active item changes.
   * true for default "nearest" behavior or a custom ScrollIntoViewOptions.
   */
  scrollItemIntoView?: boolean | ScrollIntoViewOptions;

  /**
   * Index to prefer when opening (e.g., currently selected option).
   */
  selectedIndex?: MaybeRefOrGetter<number | null>;

  /**
   * Controls focusing an item when the list opens.
   * - true: always focus an item
   * - false: never focus an item
   * - "auto": focus based on input modality/heuristics
   */
  focusItemOnOpen?: MaybeRefOrGetter<boolean | "auto">;

  /**
   * Whether this list is nested inside another navigable list.
   * Affects cross-orientation close/open key handling.
   */
  nested?: MaybeRefOrGetter<boolean>;

  /**
   * Returns the child tree node for a given list index.
   * When provided, list navigation can open and restore nested floating children.
   */
  getChildNode?: (index: number) => FloatingTreeNode | null;

  /**
   * When true, keyboard navigation landing on a child item opens it automatically.
   * @default false
   */
  openChildOnFocus?: MaybeRefOrGetter<boolean>;

  /**
   * Right-to-left layout flag affecting horizontal arrow semantics.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Enables virtual focus mode (aria-activedescendant) instead of DOM focus.
   */
  virtual?: MaybeRefOrGetter<boolean>;

  /**
   * Element that receives `aria-activedescendant` in virtual focus mode.
   * Defaults to the anchor element, which is useful for combobox-like inputs.
   * Pass the floating element for container-focus menus, listboxes, grids, or trees.
   */
  activeDescendantEl?: MaybeRefOrGetter<HTMLElement | null | undefined>;

  /**
   * Whether Home/End should move to the first/last item.
   * Defaults to true for roving focus and for virtual focus when `activeDescendantEl` is provided.
   */
  handleHomeEndKeys?: MaybeRefOrGetter<boolean>;

  /**
   * Receives the HTMLElement corresponding to the virtual active item.
   * Used for aria-activedescendant and screen reader announcement.
   */
  virtualItemRef?: Ref<HTMLElement | null>;

  /**
   * Column count for grid navigation when orientation is "both".
   */
  cols?: MaybeRefOrGetter<number>;

  /**
   * If true, allows escaping to a null active index via keyboard (e.g., ArrowDown on last).
   */
  allowEscape?: MaybeRefOrGetter<boolean>;

  /**
   * If true, Tab and Shift+Tab close the current floating tree/list without preventing page focus movement.
   * @default true
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Defines the wrapping behavior for grid navigation when moving horizontally past the end of a row.
   * - "row": Wraps to the start of the *same* row (default).
   * - "next": Moves to the start of the *next* row (or previous row if moving left).
   */
  gridLoopDirection?: MaybeRefOrGetter<"row" | "next">;
}

export interface UseListNavigationReturn {
  /**
   * Stops all listeners and watchers created by the composable.
   */
  cleanup: () => void;
}
