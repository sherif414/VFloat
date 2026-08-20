import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  nextTick,
  onWatcherCleanup,
  type Ref,
  shallowRef,
  toValue,
  watchPostEffect,
} from "vue";
import type { FloatingContext } from "@/composables/floating-context";
import { floatingTree } from "@/composables/floating-context/floating-context-tree";
import { isHTMLElement } from "@/shared/dom";
import { getAnchorElement as resolveAnchorElement } from "@/shared/elements";
import { getDocument } from "@/shared/env";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import type { OpenChangeReason } from "@/types";
import { createFocusGuards, type FocusGuardHandles } from "./focus-guards";
import { isolateOutsideElements } from "./inert-stack";
import {
  getFirstTabbableElement,
  getLastTabbableElement,
  getTabbableElements,
  isElementFocusable,
} from "./tabbable";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Manages surface focus orchestration for floating elements including initial focus,
 * modal and non-modal focus containment, portal focus guards, background isolation,
 * and return focus restoration.
 *
 * @param context - Floating context containing elements refs and open state.
 * @param options - Configuration options for focus management.
 * @returns Object with `isActive` status and manual `activate` / `deactivate` controls.
 *
 * @example
 * ```ts
 * const context = useFloatingContext({ anchorEl, floatingEl });
 * useFocusManager(context, {
 *   modal: true,
 *   returnFocus: true,
 * });
 * ```
 */
export function useFocusManager(
  context: UseFocusManagerContext,
  options: UseFocusManagerOptions = {},
): UseFocusManagerReturn {
  const { anchorEl: anchorElOption, floatingEl: floatingElOption } = context.refs;
  const { open, setOpen } = context.state;

  const {
    enabled: enabledOption = true,
    modal: modalOption = true,
    initialFocus: initialFocusOption,
    returnFocus: returnFocusOption = true,
    guards: guardsOption = true,
    closeOnFocusOut: closeOnFocusOutOption = false,
    closeOnTab: closeOnTabOption = false,
    outsideElementsInert: outsideElementsInertOption,
    preventScroll: preventScrollOption = true,
    ignoreFocusOut,
    onError,
  } = options;

  const isEnabled = computed(() => !!toValue(enabledOption));
  const isModal = computed(() => !!toValue(modalOption));
  const shouldCloseOnFocusOut = computed(() => !isModal.value && !!toValue(closeOnFocusOutOption));
  const shouldCloseOnTab = computed(() => !!toValue(closeOnTabOption));
  const shouldInertOutside = computed(() => {
    if (outsideElementsInertOption !== undefined) {
      return !!toValue(outsideElementsInertOption);
    }
    return isModal.value;
  });
  const shouldReturnFocus = computed(() => !!toValue(returnFocusOption));
  const shouldPreventScroll = computed(() => !!toValue(preventScrollOption));
  const shouldApplyGuards = computed(() => !!toValue(guardsOption));

  const managerIsActive = shallowRef(false);
  const isActive = computed(() => managerIsActive.value);

  let previouslyActiveElement: HTMLElement | null = null;
  let guardHandles: FocusGuardHandles | null = null;
  let isolationRestore: (() => void) | null = null;
  let blurTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const cleanupRegistry = createCleanupRegistry();

  function clearBlurTimeout() {
    if (blurTimeoutId != null) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = undefined;
    }
  }

  function getAnchorElement(): HTMLElement | null {
    return resolveAnchorElement(anchorElOption.value);
  }

  function getFloatingElement(): HTMLElement | null {
    return floatingElOption.value;
  }

  //=====================================================================================
  // Focus Trapping & Keydown Navigation
  //=====================================================================================

  function onFloatingKeyDown(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.defaultPrevented || !isEnabled.value || !open.value) {
      return;
    }

    const floating = getFloatingElement();
    if (!floating) return;

    // Handle non-modal closeOnTab
    if (!isModal.value && shouldCloseOnTab.value) {
      setOpen(false, "tab-key", event);
      return;
    }

    if (!isModal.value) {
      return;
    }

    // Modal trap: wrap focus between first and last tabbable elements
    const tabbables = getTabbableElements(floating);
    if (tabbables.length === 0) {
      event.preventDefault();
      floating.focus({ preventScroll: shouldPreventScroll.value });
      return;
    }

    const firstTabbable = tabbables[0];
    const lastTabbable = tabbables[tabbables.length - 1];
    const currentActive = document.activeElement;

    if (event.shiftKey) {
      // Shift+Tab on first element wraps to last element
      if (currentActive === firstTabbable || currentActive === floating) {
        event.preventDefault();
        lastTabbable.focus({ preventScroll: shouldPreventScroll.value });
      }
    } else {
      // Tab on last element wraps to first element
      if (currentActive === lastTabbable) {
        event.preventDefault();
        firstTabbable.focus({ preventScroll: shouldPreventScroll.value });
      }
    }
  }

  //=====================================================================================
  // Focus Guards (Sentinels)
  //=====================================================================================

  function onGuardFocus(type: "start" | "end", event: FocusEvent) {
    if (!isEnabled.value || !open.value) return;

    const floating = getFloatingElement();
    if (!floating) return;

    if (isModal.value) {
      event.preventDefault();
      if (type === "start") {
        const last = getLastTabbableElement(floating) ?? floating;
        last.focus({ preventScroll: shouldPreventScroll.value });
      } else {
        const first = getFirstTabbableElement(floating) ?? floating;
        first.focus({ preventScroll: shouldPreventScroll.value });
      }
    } else if (shouldCloseOnTab.value) {
      setOpen(false, "tab-key", event);
    }
  }

  function setupGuards(floating: HTMLElement) {
    if (!shouldApplyGuards.value) return;
    cleanupGuards();
    guardHandles = createFocusGuards(floating, onGuardFocus);
  }

  function cleanupGuards() {
    if (guardHandles) {
      guardHandles.remove();
      guardHandles = null;
    }
  }

  //=====================================================================================
  // Background Isolation
  //=====================================================================================

  function setupIsolation() {
    cleanupIsolation();
    if (!shouldInertOutside.value) return;

    const containers = floatingTree.getFloatingElements(context);
    if (containers.length === 0) return;

    const handle = isolateOutsideElements(containers, true);
    isolationRestore = handle.restore;
  }

  function cleanupIsolation() {
    if (isolationRestore) {
      isolationRestore();
      isolationRestore = null;
    }
  }

  //=====================================================================================
  // Initial & Return Focus
  //=====================================================================================

  let isPointerDownOutside = false;
  let pointerDownOutsideTimeoutId: ReturnType<typeof setTimeout> | undefined;

  function onDocumentPointerDownTracker(event: PointerEvent | MouseEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    // If the interaction is outside this floating tree, prevent focus hijacking
    if (!floatingTree.isTargetWithin(context, target)) {
      isPointerDownOutside = true;
      if (pointerDownOutsideTimeoutId) clearTimeout(pointerDownOutsideTimeoutId);
      pointerDownOutsideTimeoutId = setTimeout(() => {
        isPointerDownOutside = false;
      }, 100);
    }
  }

  // Always track pointer down events when open to handle returnFocus correctly
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value ? getDocument() : null),
      "pointerdown",
      onDocumentPointerDownTracker,
      { capture: true },
    ),
  );

  function applyInitialFocus(floating: HTMLElement) {
    const rawTarget = toValue(initialFocusOption);
    if (rawTarget === false) {
      return;
    }

    let target: HTMLElement | null = null;
    if (rawTarget && typeof rawTarget === "object") {
      if ("value" in rawTarget && (rawTarget as any).value instanceof Element) {
        target = (rawTarget as any).value;
      } else if (rawTarget instanceof Element) {
        target = rawTarget as HTMLElement;
      }
    }

    if (target && target.isConnected && typeof target.focus === "function") {
      target.focus({ preventScroll: shouldPreventScroll.value });
      return;
    }

    // Default: first tabbable element, fallback to floating container
    const firstTabbable = getFirstTabbableElement(floating);
    if (firstTabbable) {
      firstTabbable.focus({ preventScroll: shouldPreventScroll.value });
    } else {
      if (!floating.hasAttribute("tabindex")) {
        floating.setAttribute("tabindex", "-1");
      }
      floating.focus({ preventScroll: shouldPreventScroll.value });
    }
  }

  function restoreFocus() {
    if (!shouldReturnFocus.value) {
      previouslyActiveElement = null;
      return;
    }

    const activeEl = getDocument()?.activeElement ?? null;
    const isFocusOnBody = activeEl === getDocument()?.body;
    const isFocusInside = activeEl ? floatingTree.isTargetWithin(context, activeEl) : false;

    // If focus has naturally moved to an outside element, don't steal it back.
    const focusMovedOutside = activeEl && !isFocusOnBody && !isFocusInside;

    // If a pointer down is actively happening on an outside element, don't hijack focus.
    if (focusMovedOutside || isPointerDownOutside) {
      previouslyActiveElement = null;
      return;
    }

    let targetElement: HTMLElement | null = null;

    const customReturn = toValue(returnFocusOption);
    if (isHTMLElement(customReturn) && customReturn.isConnected) {
      targetElement = customReturn;
    } else if (
      customReturn &&
      typeof customReturn === "object" &&
      "value" in customReturn &&
      isHTMLElement(customReturn.value) &&
      customReturn.value.isConnected
    ) {
      targetElement = customReturn.value;
    } else if (previouslyActiveElement && previouslyActiveElement.isConnected) {
      targetElement = previouslyActiveElement;
    } else {
      targetElement = getAnchorElement();
    }

    previouslyActiveElement = null;

    if (targetElement && targetElement.isConnected) {
      if (!isElementFocusable(targetElement) && !targetElement.hasAttribute("tabindex")) {
        targetElement.setAttribute("tabindex", "-1");
      }
      targetElement.focus({ preventScroll: shouldPreventScroll.value });
    }
  }

  //=====================================================================================
  // Outside Focus Detection (for non-modal dismissal)
  //=====================================================================================

  function onDocumentFocusIn(event: FocusEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (floatingTree.isTargetWithin(context, target)) {
      return;
    }

    if (ignoreFocusOut && ignoreFocusOut(target)) {
      return;
    }

    if (shouldCloseOnFocusOut.value) {
      setOpen(false, "blur", event);
    }
  }

  function onDocumentPointerDown(event: PointerEvent | MouseEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (floatingTree.isTargetWithin(context, target)) {
      return;
    }

    if (ignoreFocusOut && ignoreFocusOut(target)) {
      return;
    }

    if (shouldCloseOnFocusOut.value) {
      setOpen(false, "outside-pointer", event);
    }
  }

  //=====================================================================================
  // Lifecycle & Activation
  //=====================================================================================

  function activate() {
    if (!isEnabled.value || !open.value) {
      return;
    }

    const floating = getFloatingElement();
    if (!floating) {
      managerIsActive.value = false;
      return;
    }

    try {
      // Save previously focused element before applying initial focus
      const activeEl = getDocument()?.activeElement ?? null;
      if (isHTMLElement(activeEl) && !floating.contains(activeEl)) {
        previouslyActiveElement = activeEl;
      }

      setupGuards(floating);
      setupIsolation();
      applyInitialFocus(floating);

      managerIsActive.value = true;
    } catch (error) {
      managerIsActive.value = false;
      cleanupGuards();
      cleanupIsolation();

      if (onError) {
        onError(error);
      } else if (import.meta.env.DEV) {
        console.error("[useFocusManager] Activation failed:", error);
      }
    }
  }

  function deactivate(reason?: OpenChangeReason, returnFocus = true) {
    cleanupGuards();
    cleanupIsolation();
    clearBlurTimeout();
    managerIsActive.value = false;

    if (returnFocus) {
      restoreFocus();
    } else {
      previouslyActiveElement = null;
    }

    if (reason && open.value) {
      setOpen(false, reason);
    }
  }

  // Watch open and enabled states
  cleanupRegistry.add(
    watchPostEffect(() => {
      // Subscribe to reactive options
      void isEnabled.value;
      void isModal.value;
      void shouldInertOutside.value;
      void shouldApplyGuards.value;
      void shouldReturnFocus.value;
      void shouldPreventScroll.value;

      if (isEnabled.value && open.value) {
        if (floatingElOption.value) {
          nextTick(() => {
            activate();
          });
        }
      } else {
        deactivate(undefined, shouldReturnFocus.value);
      }

      onWatcherCleanup(() => {
        cleanupGuards();
        cleanupIsolation();
        clearBlurTimeout();
      });
    }),
  );

  // Keydown listener for focus trapping
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value ? getFloatingElement() : null),
      "keydown",
      onFloatingKeyDown,
    ),
  );

  // Document focus and pointer listeners for non-modal dismissal
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value && shouldCloseOnFocusOut.value ? document : null),
      "focusin",
      onDocumentFocusIn,
      { capture: true },
    ),
  );

  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value && shouldCloseOnFocusOut.value ? document : null),
      "pointerdown",
      onDocumentPointerDown,
      { capture: true },
    ),
  );

  tryOnScopeDispose(() => {
    cleanupRegistry.cleanup();
    deactivate("programmatic", false);
  });

  return {
    isActive,
    activate: () => {
      if (open.value) {
        activate();
      }
    },
    deactivate: () => {
      deactivate("programmatic", shouldReturnFocus.value);
    },
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useFocusManager`.
 */
export interface UseFocusManagerContext {
  /**
   * Floating elements refs.
   */
  refs: FloatingContext["refs"];
  /**
   * Floating open state and setter.
   */
  state: FloatingContext["state"];
}

/**
 * Configuration options for `useFocusManager`.
 */
export interface UseFocusManagerOptions {
  /**
   * Whether focus management is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether the floating surface acts as a modal dialog, strictly trapping focus inside
   * and isolating outside DOM elements.
   * @default true
   */
  modal?: MaybeRefOrGetter<boolean>;

  /**
   * Specifies the element to receive initial focus on open.
   * - `HTMLElement` | `Ref<HTMLElement | null>`: Focuses the provided element.
   * - `() => HTMLElement | false | null`: Dynamic function returning the element to focus.
   * - `false`: Prevents initial focus from being set.
   * - `undefined`: Focuses the first tabbable child (falling back to the floating container).
   */
  initialFocus?: HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null | false) | false;

  /**
   * Whether (and where) to restore focus upon closing.
   * - `true`: Restores focus to the trigger element that was active before opening.
   * - `HTMLElement` | `Ref<HTMLElement | null>`: Restores focus to a specific element.
   * - `false`: Does not restore focus.
   * @default true
   */
  returnFocus?: MaybeRefOrGetter<boolean | HTMLElement | Ref<HTMLElement | null>>;

  /**
   * Whether to inject and manage off-screen focus guard sentinels around the floating element
   * to catch portal boundary focus leaks.
   * @default true
   */
  guards?: MaybeRefOrGetter<boolean>;

  /**
   * When `modal` is false, closes the floating element when focus moves outside its family.
   * @default false
   */
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;

  /**
   * When `modal` is false, closes the floating element when the user presses Tab to leave.
   * @default false
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Isolates background DOM elements using `inert` (or `aria-hidden="true"` fallback).
   * Defaults to `true` when `modal: true`, and `false` otherwise.
   */
  outsideElementsInert?: MaybeRefOrGetter<boolean>;

  /**
   * Whether browser scrolling is prevented when focusing elements.
   * @default true
   */
  preventScroll?: MaybeRefOrGetter<boolean>;

  /**
   * Custom predicate to ignore focus loss to specific target elements.
   */
  ignoreFocusOut?: (target: EventTarget | null) => boolean;

  /**
   * Optional error callback when focus management activation encounters an error.
   */
  onError?: (error: unknown) => void;
}

/**
 * Return shape for `useFocusManager`.
 */
export interface UseFocusManagerReturn {
  /**
   * Whether focus management is currently active.
   */
  isActive: ComputedRef<boolean>;

  /**
   * Manually activates focus management.
   */
  activate: () => void;

  /**
   * Manually deactivates focus management and closes/restores focus.
   */
  deactivate: () => void;
}
