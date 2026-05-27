import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";
import type { FloatingContext } from "@/composables/floating";
import { useEventListener } from "@/shared/use-event-listener";
import { createCleanupRegistry } from "@/shared/lifecycle";
import type { UseCollectionReturn } from "../collection/use-collection";
import { isTypeableElement } from "@/shared/dom";
import { resolveKeyboardIntent } from "./intent";

export interface UseListNavigationOptions {
  /**
   * The collection manager to navigate.
   */
  collection: UseCollectionReturn<any>;

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
}

export interface UseListNavigationReturn {
  /**
   * Stops all listeners and watchers created by the composable.
   */
  cleanup: () => void;
}

/**
 * Coordinates keyboard navigation for floating collections.
 */
export function useListNavigation(
  context: FloatingContext,
  options: UseListNavigationOptions,
): UseListNavigationReturn {
  const refs = context.refs;
  const { open, setOpen } = context.state;
  const collection = options.collection;

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const isLoop = computed(() => toValue(options.loop) ?? false);
  const orientation = computed(() => toValue(options.orientation) ?? "vertical");
  const isRtl = computed(() => toValue(options.rtl) ?? false);
  const isOpenOnArrowKeyDown = computed(() => toValue(options.openOnArrowKeyDown) ?? true);
  const isCloseOnTab = computed(() => toValue(options.closeOnTab) ?? true);

  const cleanupRegistry = createCleanupRegistry();
  const registerCleanup = cleanupRegistry.add;
  const cleanup = cleanupRegistry.cleanup;

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

    if (intent === "first") {
      collection.setFirst();
      handled = true;
    } else if (intent === "last") {
      collection.setLast();
      handled = true;
    } else if (intent === "next") {
      collection.setNext(navOptions);
      handled = true;
    } else if (intent === "previous") {
      collection.setPrevious(navOptions);
      handled = true;
    } else if (intent === "enter") {
      const activeValue = collection.activeValue.value;
      if (activeValue && collection.hasChildren(activeValue)) {
        collection.expandBranch(activeValue);
        const firstEnabled = collection.getFirstEnabledDescendantValue(activeValue);
        if (firstEnabled) {
          collection.setActiveValue(firstEnabled);
        }
        handled = true;
      }
    } else if (intent === "exit") {
      const activeValue = collection.activeValue.value;
      if (activeValue) {
        const parentValue = collection.getParentValue(activeValue);
        if (parentValue) {
          collection.setActiveValue(parentValue);
          collection.collapseBranch(parentValue);
          handled = true;
        }
      }
    }

    if (handled) {
      e.preventDefault();
    }
  };

  registerCleanup(
    useEventListener(() => (isEnabled.value ? anchorEl.value : null), "keydown", onAnchorKeyDown),
  );
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? floatingEl.value : null),
      "keydown",
      onFloatingKeyDown,
    ),
  );

  // Sync flush ensures activeValue is cleared before downstream watchers see the closed state,
  // preventing stale active-item references during the close transition.
  registerCleanup(
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

  return { cleanup };
}
