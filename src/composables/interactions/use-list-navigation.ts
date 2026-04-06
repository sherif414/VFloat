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
import type { FloatingContext } from "@/composables/positioning/floating-context";
import { isTypeableElement } from "@/shared/dom";
import { createCleanupRegistry } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import { isUsingKeyboard } from "@/composables/interactions/internal/input-modality";
import { useActiveDescendant } from "./list-navigation/active-descendant";
import {
  createNavigationStrategy,
  isMainOrientationKey,
  isMainOrientationToEndKey,
  type StrategyContext,
} from "./list-navigation/strategies";

// ============================================================================
// List Navigation Composable
// ============================================================================

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
   * Indices that should be treated as disabled and skipped by navigation.
   * Can be an array of indices or a predicate.
   */
  disabledIndices?: Array<number> | ((index: number) => boolean);

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
   * Right-to-left layout flag affecting horizontal arrow semantics.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Enables virtual focus mode (aria-activedescendant) instead of DOM focus.
   */
  virtual?: MaybeRefOrGetter<boolean>;

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
   * Defines the wrapping behavior for grid navigation when moving horizontally past the end of a row.
   * - "row": Wraps to the start of the *same* row (default).
   * - "next": Moves to the start of the *next* row (or previous row if moving left).
   */
  gridLoopDirection?: MaybeRefOrGetter<"row" | "next">;
}

export interface UseListNavigationReturn {
  cleanup: () => void;
}

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

  const refs = context.refs;
  const { open, setOpen } = context.state;

  const {
    listRef,
    activeIndex,
    onNavigate,
    enabled = true,
    loop = false,
    orientation = "vertical",
    disabledIndices,
    focusItemOnHover = true,
    openOnArrowKeyDown = true,
    scrollItemIntoView = true,
    selectedIndex = null,
    focusItemOnOpen = "auto",
    nested = false,
    rtl = false,
    virtual = false,
    virtualItemRef,
    cols = 1,
    allowEscape = false,
  } = options;

  // --------------------------------------------------------------------------
  // Derived State
  // --------------------------------------------------------------------------

  const isEnabled = computed(() => toValue(enabled));
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
  const isRtl = computed(() => !!toValue(rtl));
  const gridCols = computed(() => Math.max(1, Number(toValue(cols) ?? 1)));

  // --------------------------------------------------------------------------
  // Cleanup Registry
  // --------------------------------------------------------------------------

  const cleanupRegistry = createCleanupRegistry();
  const registerCleanup = cleanupRegistry.add;
  const runCleanups = cleanupRegistry.flush;

  // --------------------------------------------------------------------------
  // Index Helpers
  // --------------------------------------------------------------------------

  const getActiveIndex = () => (activeIndex !== undefined ? toValue(activeIndex) : null);
  const currentActiveIndex = computed(() => getActiveIndex());

  const isDisabled = (idx: number): boolean => {
    if (!disabledIndices) return false;
    return Array.isArray(disabledIndices) ? disabledIndices.includes(idx) : !!disabledIndices(idx);
  };

  const isNavigableIndex = (idx: number | null): idx is number => {
    return (
      idx != null &&
      idx >= 0 &&
      idx < listRef.value.length &&
      !!listRef.value[idx] &&
      !isDisabled(idx)
    );
  };

  const getFirstEnabledIndex = (): number | null => {
    const items = listRef.value;
    for (let i = 0; i < items.length; i++) {
      if (items[i] && !isDisabled(i)) return i;
    }
    return null;
  };

  const getLastEnabledIndex = (): number | null => {
    const items = listRef.value;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i] && !isDisabled(i)) return i;
    }
    return null;
  };

  const getSelectedEnabledIndex = (): number | null => {
    const idx = selectedIndex !== undefined ? toValue(selectedIndex) : null;
    return isNavigableIndex(idx) ? idx : null;
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
      if (items[i] && !isDisabled(i)) return i;
      i += dir;
    }
    return null;
  };

  // --------------------------------------------------------------------------
  // Focus Management
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  let openIntent: OpenIntent | null = null;
  let pendingOpenNavigation: PendingOpenNavigation | null = null;

  const clearOpenCycleState = () => {
    openIntent = null;
    pendingOpenNavigation = null;
  };

  const handleAnchorKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;

    const target = e.target as Element | null;
    // Allow navigation if the target is the anchor (e.g. input)
    if (target && isTypeableElement(target) && target !== anchorEl.value) return;

    const key = e.key;
    const ori = toValue(orientation);

    // In virtual mode, delegate to floating handler
    if (open.value && isVirtual.value) {
      handleFloatingKeyDown(e);
      return;
    }

    if (!isMainOrientationKey(key, ori)) return;
    if (open.value || !toValue(openOnArrowKeyDown)) return;

    e.preventDefault();
    openIntent = { key };
    setOpen(true, "keyboard-activate", e);
  };

  const handleFloatingKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;

    const key = e.key;
    const ori = toValue(orientation);
    const items = listRef.value;
    if (!items.length) return;

    // Handle Home/End (skip in virtual mode to allow text cursor navigation)
    if (!isVirtual.value) {
      if (key === "Home") {
        e.preventDefault();
        const idx = getFirstEnabledIndex();
        if (idx != null) onNavigate?.(idx);
        return;
      }
      if (key === "End") {
        e.preventDefault();
        const idx = getLastEnabledIndex();
        if (idx != null) onNavigate?.(idx);
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
      nested: !!toValue(nested),
      isDisabled,
      findNextEnabled,
      getFirstEnabledIndex,
      getLastEnabledIndex,
    };

    const result = strategy.handleKey(key, strategyContext);
    if (!result) return;

    e.preventDefault();

    if (result.type === "navigate") {
      onNavigate?.(result.index);
    } else if (result.type === "close") {
      setOpen(false, "programmatic", e);
    }
  };

  // --------------------------------------------------------------------------
  // Watchers & Event Listeners
  // --------------------------------------------------------------------------

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
        if (idx >= 0 && !isDisabled(idx)) onNavigate?.(idx);
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
        if (!isEnabled.value) {
          clearOpenCycleState();
          return;
        }

        if (!isOpen) {
          clearOpenCycleState();
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
        const shouldNavigate = currentOpenIntent != null || focusMode === true;
        const shouldFocus =
          focusMode === true || (focusMode === "auto" && currentOpenIntent != null);

        if (!shouldNavigate) {
          pendingOpenNavigation = null;
          prevOpen.value = true;
          return;
        }

        const idx = resolveInitialOpenIndex(currentOpenIntent?.key ?? null);
        if (idx != null) {
          pendingOpenNavigation = {
            previousIndex: getActiveIndex(),
            requestedIndex: idx,
            shouldFocus,
          };
          onNavigate?.(idx);
        } else {
          pendingOpenNavigation = null;
        }

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

  // --------------------------------------------------------------------------
  // Active Descendant (Virtual Focus)
  // --------------------------------------------------------------------------

  const { activeItem, cleanup: cleanupActiveDescendant } = useActiveDescendant(
    anchorEl,
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
