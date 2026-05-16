import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";
import type { FloatingContext } from "@/composables/floating/floating-context";
import { useEventListener } from "@/shared/use-event-listener";
import { createCleanupRegistry } from "@/shared/lifecycle";
import type { UseCollectionReturn } from "../collection/use-collection";
import { isTypeableElement } from "@/shared/dom";

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
   * - "vertical": Up/Down to navigate
   * - "horizontal": Left/Right to navigate
   * - "both": Grid navigation
   */
  orientation?: MaybeRefOrGetter<"vertical" | "horizontal" | "both">;

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

    const key = e.key;
    const currentOrientation = orientation.value;

    let isMainOrientation = false;
    let isBackward = false;

    if (currentOrientation === "vertical" || currentOrientation === "both") {
      if (key === "ArrowDown") isMainOrientation = true;
      if (key === "ArrowUp") {
        isMainOrientation = true;
        isBackward = true;
      }
    }
    if (currentOrientation === "horizontal" || currentOrientation === "both") {
      if (key === "ArrowRight") {
        isMainOrientation = true;
        isBackward = isRtl.value;
      }
      if (key === "ArrowLeft") {
        isMainOrientation = true;
        isBackward = !isRtl.value;
      }
    }

    if (!isMainOrientation) return;
    if (open.value || !isOpenOnArrowKeyDown.value) return;

    e.preventDefault();
    setOpen(true, "keyboard-activate", e);

    if (isBackward) {
      collection.setLast();
    } else {
      collection.setFirst();
    }
  };

  const onFloatingKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || !isEnabled.value) return;

    const key = e.key;

    if (key === "Tab" && open.value && isCloseOnTab.value) {
      setOpen(false, "tab-key", e);
      return;
    }

    let handled = false;
    const navOptions = { loop: isLoop.value };

    if (key === "Home") {
      collection.setFirst();
      handled = true;
    } else if (key === "End") {
      collection.setLast();
      handled = true;
    } else if (orientation.value === "vertical") {
      // Tree expand/collapse (ArrowRight/Left) is only supported in vertical orientation.
      // In "both" mode, ArrowRight/Left are consumed for flat grid navigation.
      if (key === "ArrowDown") {
        collection.setNext(navOptions);
        handled = true;
      } else if (key === "ArrowUp") {
        collection.setPrevious(navOptions);
        handled = true;
      } else if (key === "ArrowRight" || key === "ArrowLeft") {
        const isExpandKey = isRtl.value ? key === "ArrowLeft" : key === "ArrowRight";
        const activeValue = collection.activeValue.value;
        if (isExpandKey) {
          if (activeValue && collection.hasChildren(activeValue)) {
            collection.expandBranch(activeValue);
            collection.setNext();
          }
        } else {
          if (activeValue) {
            const parentValue = collection.getParentValue(activeValue);
            if (parentValue) {
              collection.setActiveValue(parentValue);
              collection.collapseBranch(parentValue);
            }
          }
        }
        handled = true;
      }
    } else if (orientation.value === "horizontal") {
      if (key === "ArrowRight") {
        isRtl.value ? collection.setPrevious(navOptions) : collection.setNext(navOptions);
        handled = true;
      } else if (key === "ArrowLeft") {
        isRtl.value ? collection.setNext(navOptions) : collection.setPrevious(navOptions);
        handled = true;
      }
    } else if (orientation.value === "both") {
      if (key === "ArrowDown") {
        collection.setNext(navOptions);
        handled = true;
      } else if (key === "ArrowUp") {
        collection.setPrevious(navOptions);
        handled = true;
      } else if (key === "ArrowRight") {
        isRtl.value ? collection.setPrevious(navOptions) : collection.setNext(navOptions);
        handled = true;
      } else if (key === "ArrowLeft") {
        isRtl.value ? collection.setNext(navOptions) : collection.setPrevious(navOptions);
        handled = true;
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
