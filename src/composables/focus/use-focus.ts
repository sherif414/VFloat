import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue";
import type { FloatingNode, FloatingTree } from "@/composables/floating-tree";
import { isUsingKeyboard } from "@/composables/focus/input-modality";
import { isHTMLElement, isTypeableElement } from "@/shared/dom";
import { getAnchorElement, isTargetWithinElements } from "@/shared/elements";
import { getDocument, getWindow } from "@/shared/env";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { isMac, isSafari, matchesFocusVisible } from "@/shared/platform";
import { useEventListener } from "@/shared/use-event-listener";

/**
 * Delay in milliseconds for checking active element after blur event.
 * Using 0ms ensures check happens in next event loop tick, which is more
 * reliable than relatedTarget for Shadow DOM and programmatic focus changes.
 */
const BLUR_CHECK_DELAY = 0;

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when the reference element receives or loses focus.
 *
 * Keyboard-only interaction hook. Compose with `useClick`, `useHover`, `useEscapeKey` for a complete UX.
 *
 * @param node - The floating node with open state and change handler
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * const ctx = useFloatingNode(...)
 * useFocus(ctx)
 * ```
 */
export function useFocus(node: UseFocusContext, options: UseFocusOptions = {}): UseFocusReturn {
  const { open, setOpen } = node;
  const { anchorEl: anchorElOption } = node.refs;

  const {
    enabled: enabledOption = true,
    requireFocusVisible: requireFocusVisibleOption = true,
    ignoreFocusOut: ignoreFocusOutOption,
    tree: treeOption,
  } = options;
  const globalDocument = getDocument();
  const globalWindow = getWindow();

  /**
   * Computed anchor element that handles both HTMLElement and virtual element references.
   * Virtual elements (from libraries like Floating UI) use a `contextElement` property
   * to reference the actual DOM element for positioning calculations.
   */
  const anchorEl = computed(() => {
    return getAnchorElement(anchorElOption.value);
  });
  const ownerDocument = computed(() => anchorEl.value?.ownerDocument ?? globalDocument);
  const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? globalWindow);
  const isEnabled = computed(() => toValue(enabledOption));

  // Family check scoped to the explicitly passed tree; standalone nodes fall
  // back to their own anchor and floating elements.
  function isWithinFamily(target: EventTarget | null): boolean {
    return (
      toValue(treeOption)?.isTargetWithin(node, target) ??
      isTargetWithinElements(anchorElOption.value, node.refs.floatingEl.value, target)
    );
  }

  let isFocusBlocked = false;
  const isSafariOnMac = isMac() && isSafari();
  let blurTimeoutId: ReturnType<typeof setTimeout> | number | undefined;
  const cleanupRegistry = createCleanupRegistry();
  const registerCleanup = cleanupRegistry.add;
  const cleanup = cleanupRegistry.cleanup;

  function clearBlurTimeout() {
    clearTimeout(blurTimeoutId);
    blurTimeoutId = undefined;
  }

  // --- Window Focus Coordination --------------------------------------------

  // 1. Blocks the floating element from opening when a user switches back to a
  //    tab where the reference element was focused but the popover was closed.
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? ownerWindow.value : null),
      "blur",
      () => {
        if (
          !open.value &&
          anchorEl.value &&
          ownerDocument.value?.activeElement === anchorEl.value
        ) {
          isFocusBlocked = true;
        }
      },
    ),
  );

  // 2. Resets the block when the window regains focus.
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? ownerWindow.value : null),
      "focus",
      () => {
        isFocusBlocked = false;
      },
    ),
  );

  // When disabled, clear any pending state so re-enabling starts cleanly.
  registerCleanup(
    watchPostEffect(() => {
      if (isEnabled.value) return;

      isFocusBlocked = false;
      clearBlurTimeout();
    }),
  );

  // --- Focus & Blur Handlers -------------------------------------------------

  function onFocus(event: FocusEvent): void {
    if (!isEnabled.value) return;

    if (isFocusBlocked) {
      isFocusBlocked = false;
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    if (toValue(requireFocusVisibleOption) && target) {
      // Safari fails to match `:focus-visible` if focus was initially outside
      // the document. This is a workaround.
      if (isSafariOnMac && !event.relatedTarget) {
        if (!isUsingKeyboard.value && !isTypeableElement(target)) {
          return; // Do not open if interaction was pointer-based on a non-typeable element.
        }
      } else if (!matchesFocusVisible(target)) {
        return; // Standard check for other browsers.
      }
    }

    setOpen(true, "focus", event);
  }

  function onBlur(event: FocusEvent): void {
    if (!isEnabled.value || !open.value) {
      clearBlurTimeout();
      return;
    }

    // Clear any existing timeout from a previous blur event.
    clearBlurTimeout();

    const currentWindow = ownerWindow.value;
    if (!currentWindow) return;

    // Use a timeout to check the activeElement in the next event loop tick.
    // This is more reliable than `event.relatedTarget` for complex cases
    // like Shadow DOM or when focus is programmatically moved.
    blurTimeoutId = currentWindow.setTimeout(() => {
      if (!open.value) return;

      const currentDocument = ownerDocument.value;
      const activeEl = currentDocument?.activeElement ?? null;

      // Case 1: Focus has left the window entirely, but the browser is tricky
      // and hasn't blurred the window yet. If `relatedTarget` is null but focus
      // is still on the anchor, we assume focus is about to leave, so don't close.
      if (!event.relatedTarget && activeEl === anchorEl.value) {
        return;
      }

      if (isWithinFamily(activeEl)) {
        return;
      }

      if (activeEl instanceof Element && ignoreFocusOutOption && ignoreFocusOutOption(activeEl)) {
        return;
      }

      // If neither of the above conditions are met, focus has moved elsewhere.
      setOpen(false, "blur", event);
    }, BLUR_CHECK_DELAY);
  }

  // In addition to element-level blur, observe focus changes at the document level
  // to handle cases where focus moves between descendants and outside elements
  // without triggering another blur on the original anchor.
  registerCleanup(
    useEventListener(
      () => (isEnabled.value ? ownerDocument.value : null),
      "focusin",
      (e: FocusEvent) => {
        if (!open.value) return;

        const target = e.target;
        if (!(target instanceof Element)) return;

        if (isWithinFamily(target)) return;

        if (ignoreFocusOutOption && ignoreFocusOutOption(target)) return;

        setOpen(false, "blur", e);
      },
      { capture: true },
    ),
  );

  // --- Anchor Event Listeners ------------------------------------------------

  registerCleanup(
    watchPostEffect(() => {
      if (!isEnabled.value) return;
      const el = anchorEl.value;
      if (!isHTMLElement(el)) return;

      el.addEventListener("focus", onFocus);
      el.addEventListener("blur", onBlur);

      onWatcherCleanup(() => {
        el.removeEventListener("focus", onFocus);
        el.removeEventListener("blur", onBlur);
        clearBlurTimeout();
      });
    }),
  );

  registerCleanup(() => {
    isFocusBlocked = false;
    clearBlurTimeout();
  });

  // Ensure the cleanup runs if the component unmounts.
  tryOnScopeDispose(() => {
    cleanup();
  });

  return {
    /**
     * Cleanup function that removes all event listeners and clears pending timeouts.
     * Useful for manual cleanup in testing scenarios.
     */
    cleanup,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useFocus`.
 */
export interface UseFocusContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

/**
 * Cleanup handle returned by `useFocus`.
 */
export interface UseFocusReturn {
  /**
   * Cleanup function that removes all event listeners and clears pending timeouts.
   * Useful for manual cleanup in testing scenarios.
   */
  cleanup: () => void;
}

/**
 * Options that control focus-based open and close behavior.
 */
export interface UseFocusOptions {
  /**
   * Whether focus event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Explicit floating tree for family-aware focus checks across nested surfaces.
   * When omitted, only the node's own anchor and floating elements count as inside.
   */
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;

  /**
   * Whether the open state only changes if the focus event is considered
   * visible (`:focus-visible` CSS selector).
   * @default true
   */
  requireFocusVisible?: MaybeRefOrGetter<boolean>;

  /**
   * Predicate to determine if focus moving to a specific outside target should be ignored.
   * @param target - The event target receiving focus
   * @returns true if the focus out should be ignored
   */
  ignoreFocusOut?: (target: EventTarget | null) => boolean;
}
