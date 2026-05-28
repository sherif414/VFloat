import { computed, type MaybeRefOrGetter, type Ref, toValue, watch } from "vue";
import type { FloatingContext } from "@/composables/floating";
import { useEventListener } from "@/shared/use-event-listener";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { isTypeableElement } from "@/shared/dom";
import { resolveKeyboardIntent } from "./intent";

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
 * const tree = useTree({ items, getItemId: i => i.id });
 * useListNavigation(context, {
 *   collection: tree.rootBranch,
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
    rtl: rtlOption = false,
    openOnArrowKeyDown: openOnArrowKeyDownOption = true,
    closeOnTab: closeOnTabOption = true,
    onEnter,
    onExit,
  } = options;

  const isEnabled = computed(() => toValue(enabledOption));
  const isLoop = computed(() => toValue(loopOption));
  const orientation = computed(() => toValue(orientationOption));
  const isRtl = computed(() => toValue(rtlOption));
  const isOpenOnArrowKeyDown = computed(() => toValue(openOnArrowKeyDownOption));
  const isCloseOnTab = computed(() => toValue(closeOnTabOption));

  const cleanupRegistry = createCleanupRegistry();

  const anchorEl = computed(() => {
    const el = refs.anchorEl.value;
    if (el instanceof HTMLElement) return el;
    if (el && "contextElement" in el && el.contextElement instanceof HTMLElement) {
      return el.contextElement;
    }
    return null;
  });

  const floatingEl = computed(() => refs.floatingEl.value);

  const onAnchorKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || !isEnabled.value) return;

    const target = e.target as Element | null;
    if (target && isTypeableElement(target) && target !== anchorEl.value) return;

    const intent = resolveKeyboardIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });

    if (intent !== "next" && intent !== "previous") return;
    if (open.value || !isOpenOnArrowKeyDown.value) return;

    e.preventDefault();
    setOpen(true, "keyboard-activate", e);

    if (intent === "previous") {
      collection.setLast();
    } else {
      collection.setFirst();
    }
  };

  const onFloatingKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || !isEnabled.value) return;
    if (!open.value) return;

    const intent = resolveKeyboardIntent(e, {
      orientation: orientation.value,
      rtl: isRtl.value,
    });

    if (intent === "close" && e.key === "Tab" && isCloseOnTab.value) {
      setOpen(false, "tab-key", e);
      return;
    }

    if (!intent || intent === "activate" || intent === "close") return;

    let handled = false;
    const navOptions = { loop: isLoop.value };

    switch (intent) {
      case "first":
        collection.setFirst();
        handled = true;
        break;
      case "last":
        collection.setLast();
        handled = true;
        break;
      case "next":
        collection.setNext(navOptions);
        handled = true;
        break;
      case "previous":
        collection.setPrevious(navOptions);
        handled = true;
        break;
      case "enter": {
        const activeValue = collection.activeValue.value;
        if (activeValue && !collection.isItemDisabled?.(activeValue) && onEnter) {
          onEnter(activeValue, e);
          handled = true;
        }
        break;
      }
      case "exit": {
        const activeValue = collection.activeValue.value;
        if (activeValue && !collection.isItemDisabled?.(activeValue) && onExit) {
          onExit(activeValue, e);
          handled = true;
        }
        break;
      }
    }

    if (handled) {
      e.preventDefault();
    }
  };

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
