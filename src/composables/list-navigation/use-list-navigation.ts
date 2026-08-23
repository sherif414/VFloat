import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  nextTick,
  type Ref,
  toValue,
  watch,
} from "vue";
import type { FloatingContext } from "@/composables/floating-context";
import { isHTMLElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import { type NavigationIntent, resolveKeyboardIntent } from "./intent";
import { useRtl } from "./use-rtl";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Coordinates keyboard navigation for floating collections.
 *
 * @param context - The floating context object containing state and refs.
 * @param options - Configuration options for list navigation.
 * @returns An object containing a cleanup function.
 *
 * @example
 * ```ts
 * const collection = useCollection({ values: ["open", "edit", "delete"] });
 * useListNavigation(context, {
 *   collection,
 *   orientation: "vertical",
 *   loop: true
 * });
 * ```
 */
export function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions,
): UseListNavigationReturn {
  const refs = context.refs;
  const { open, setOpen } = context.state;
  const {
    collection,
    enabled: enabledOption = true,
    loop: loopOption = false,
    orientation: orientationOption = "vertical",
    rtl: rtlOption,
    openOnArrowKeyDown: openOnArrowKeyDownOption,
    closeOnTab: closeOnTabOption = true,
    onActivate,
    onEnter,
    onExit,
  } = options;

  //=====================================================================================
  // Derived State & Setup
  //=====================================================================================

  const anchorEl = computed(() => {
    return getAnchorElement(refs.anchorEl.value);
  });

  const floatingEl = computed(() => refs.floatingEl.value);

  const isEnabled = computed(() => toValue(enabledOption));
  const isLoop = computed(() => toValue(loopOption));
  const orientation = computed(() => toValue(orientationOption));
  const isRtl = useRtl(() => anchorEl.value ?? floatingEl.value, { rtl: rtlOption });
  const isOpenOnArrowKeyDown = computed(() => {
    return openOnArrowKeyDownOption !== undefined
      ? toValue(openOnArrowKeyDownOption)
      : context.isRoot;
  });
  const isCloseOnTab = computed(() => toValue(closeOnTabOption));

  const cleanupRegistry = createCleanupRegistry();

  //=====================================================================================
  // Navigation Handler
  //=====================================================================================

  function navigateByIntent(intent: NavigationIntent | null, e: KeyboardEvent) {
    if (intent === "close" && e.key === "Tab" && isCloseOnTab.value) {
      setOpen(false, "tab-key", e);
      return;
    }

    if (!intent || intent === "close") return;

    let handled = false;
    const navOptions = { loop: isLoop.value };

    switch (intent) {
      case "next":
        collection.setNext(navOptions);
        handled = true;
        break;
      case "previous":
        collection.setPrevious(navOptions);
        handled = true;
        break;
      case "first":
        collection.setFirst();
        handled = true;
        break;
      case "last":
        collection.setLast();
        handled = true;
        break;
      case "activate":
        handled = dispatchItemAction(collection, onActivate, e);
        break;
      case "enter":
        handled = dispatchItemAction(collection, onEnter, e);
        break;
      case "exit":
        handled = dispatchItemAction(collection, onExit, e);
        if (!handled && !context.isRoot) {
          closeSubmenuAndFocusAnchor(context, anchorEl.value, e);
          handled = true;
        }
        break;
    }

    if (handled) {
      e.preventDefault();
    }
  }

  //=====================================================================================
  // Event Handlers
  //=====================================================================================

  function onAnchorKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented || !isEnabled.value) return;

    const intent = resolveKeyboardIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });

    if (!intent) return;

    if (!open.value) {
      if ((intent === "next" || intent === "previous") && isOpenOnArrowKeyDown.value) {
        e.preventDefault();
        setOpen(true, "keyboard-activate", e);
        setInitialItemOnOpen(collection, intent, open);
      }
      return;
    }

    navigateByIntent(intent, e);
  }

  function onFloatingKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented || !isEnabled.value) return;
    if (!open.value) return;

    const intent = resolveKeyboardIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });

    if (!intent) return;

    navigateByIntent(intent, e);
  }

  //=====================================================================================
  // Wiring & State Watchers
  //=====================================================================================

  cleanupRegistry.add(
    useEventListener(() => (isEnabled.value ? anchorEl.value : null), "keydown", onAnchorKeyDown),
  );
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value ? floatingEl.value : null),
      "keydown",
      onFloatingKeyDown,
    ),
  );

  // Sync flush ensures activeValue is cleared before downstream watchers see the closed state,
  // preventing stale active-item references during the close transition.
  cleanupRegistry.add(
    watch(
      () => open.value,
      (isOpen) => {
        if (!isOpen) {
          collection.setActiveValue(null);
        }
      },
      { flush: "sync" },
    ),
  );

  tryOnScopeDispose(cleanupRegistry.cleanup);

  return { cleanup: cleanupRegistry.cleanup };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Sets the initial active item when opening via arrow keys, retrying on next tick if items mount asynchronously.
 */
function setInitialItemOnOpen(
  collection: NavigableCollection,
  intent: "next" | "previous",
  open: Ref<boolean>,
): void {
  const selectItem =
    intent === "previous" ? () => collection.setLast() : () => collection.setFirst();

  selectItem();
  if (collection.activeValue.value === null) {
    nextTick(() => {
      if (open.value && collection.activeValue.value === null) {
        selectItem();
      }
    });
  }
}

/**
 * Invokes an item callback for the active collection item if it exists and is enabled.
 */
function dispatchItemAction(
  collection: NavigableCollection,
  callback: ((activeValue: string, e: KeyboardEvent) => void) | undefined,
  e: KeyboardEvent,
): boolean {
  const activeValue = collection.activeValue.value;
  if (!activeValue || collection.isItemDisabled?.(activeValue) || !callback) {
    return false;
  }
  callback(activeValue, e);
  return true;
}

/**
 * Closes a nested submenu context and returns focus to its anchor element.
 */
function closeSubmenuAndFocusAnchor(
  context: FloatingContext,
  anchorEl: Element | null,
  e: KeyboardEvent,
): void {
  context.state.setOpen(false, "keyboard-exit", e);
  if (isHTMLElement(anchorEl)) {
    anchorEl.focus();
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface NavigableCollection {
  /**
   * The currently active value in the collection.
   */
  activeValue: Ref<string | null>;
  /**
   * Set the active value directly.
   */
  setActiveValue: (value: string | null) => void;
  /**
   * Advance to the next focusable item.
   */
  setNext: (options?: { loop?: boolean }) => void;
  /**
   * Go back to the previous focusable item.
   */
  setPrevious: (options?: { loop?: boolean }) => void;
  /**
   * Go to the first focusable item.
   */
  setFirst: () => void;
  /**
   * Go to the last focusable item.
   */
  setLast: () => void;
  /**
   * Check if a specific value is disabled.
   */
  isItemDisabled?: (value: string) => boolean;
  /**
   * Optional ordered list of all collection values.
   */
  values?: ComputedRef<readonly string[]> | Ref<readonly string[]> | readonly string[];
  /**
   * Optional ordered list of enabled (non-disabled) collection values.
   */
  enabledValues?: ComputedRef<readonly string[]> | Ref<readonly string[]> | readonly string[];
}

export interface UseListNavigationOptions {
  /**
   * The collection manager to navigate.
   */
  collection: NavigableCollection;

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
   * - "vertical": Up/Down to navigate, Left/Right for enter/exit (tree)
   * - "horizontal": Left/Right to navigate, Down for enter (menubar)
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal">;

  /**
   * If true, pressing an arrow key when closed opens and sets the active value.
   * @default context.isRoot (true for root contexts, false for nested submenus)
   */
  openOnArrowKeyDown?: MaybeRefOrGetter<boolean>;

  /**
   * Right-to-left layout flag affecting horizontal arrow semantics.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * If true, Tab closes the current floating tree/list without preventing page focus movement.
   * @default true
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Callback triggered when an item is activated with Enter or Space.
   */
  onActivate?: (activeValue: string, e: KeyboardEvent) => void;

  /**
   * Callback triggered when a branch "enter" intent is detected from an enabled item (e.g. ArrowRight in LTR).
   */
  onEnter?: (activeValue: string, e: KeyboardEvent) => void;

  /**
   * Callback triggered when a branch "exit" intent is detected from an enabled item (e.g. ArrowLeft in LTR).
   */
  onExit?: (activeValue: string, e: KeyboardEvent) => void;
}

export interface UseListNavigationReturn {
  /**
   * Stops all listeners and watchers created by the composable.
   */
  cleanup: () => void;
}

export type { NavigationOrientation } from "./intent";
