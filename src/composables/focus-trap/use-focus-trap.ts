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
import type { FloatingNode } from "@/composables/floating-node";
import { isImeComposing, useComposition } from "@/shared/composition-state";
import { isElement, isHTMLElement } from "@/shared/dom";
import { getAnchorElement as resolveAnchorElement } from "@/shared/elements";
import { getDocument, getWindow } from "@/shared/env";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
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
 * @param node - Floating node containing elements refs and open state.
 * @param options - Configuration options for focus management.
 * @returns Object with `isActive` status and manual `activate` / `deactivate` controls.
 *
 * @example
 * ```ts
 * const node = useFloatingNode({ anchorEl, floatingEl });
 * useFocusTrap(node, {
 *   modal: true,
 *   returnFocus: true,
 * });
 * ```
 */
export function useFocusTrap(
  node: FloatingNode,
  options: UseFocusTrapOptions = {},
): UseFocusTrapReturn {
  useComposition();

  const { anchorEl: anchorElOption, floatingEl: floatingElOption } = node.refs;
  const { open } = node;

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

  const trapIsActive = shallowRef(false);
  const isActive = computed(() => trapIsActive.value);

  let previouslyActiveElement: HTMLElement | null = null;
  let guardHandles: FocusGuardHandles | null = null;
  let isolationRestore: (() => void) | null = null;

  const cleanupRegistry = createCleanupRegistry();

  function getAnchorElement(): HTMLElement | null {
    return resolveAnchorElement(anchorElOption.value);
  }

  function getFloatingElement(): HTMLElement | null {
    return floatingElOption.value;
  }

  function getTargetDocument(): Document | null {
    const el = getFloatingElement() ?? getAnchorElement();
    return el?.ownerDocument ?? getDocument();
  }

  function getFamilyElements(): HTMLElement[] {
    const elements: HTMLElement[] = [];
    node.traverse((current) => {
      if (!current.open.value) return "skip";
      const el = current.refs.floatingEl.value;
      if (el) {
        elements.push(el);
      }
    });
    return elements;
  }

  // --- Focus Trapping & Keydown Navigation -----------------------------------

  function onFloatingKeyDown(event: KeyboardEvent) {
    if (
      event.key !== "Tab" ||
      event.defaultPrevented ||
      !isEnabled.value ||
      !open.value ||
      isImeComposing(event)
    ) {
      return;
    }

    const floating = getFloatingElement();
    if (!floating) return;

    // Handle non-modal closeOnTab
    if (!isModal.value && shouldCloseOnTab.value) {
      open.value = false;
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
    const doc = floating.ownerDocument ?? getDocument();
    const currentActive = doc?.activeElement;

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

  function onFloatingFocusOut(event: FocusEvent) {
    if (!isEnabled.value || !open.value || !isModal.value) return;

    const floating = getFloatingElement();
    if (!floating) return;

    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && node.contains(relatedTarget)) {
      return;
    }

    queueMicrotask(() => {
      if (!isEnabled.value || !open.value || !isModal.value) return;

      const currentFloating = getFloatingElement();
      if (!currentFloating) return;

      const doc = currentFloating.ownerDocument ?? getDocument();
      const currentActive = doc?.activeElement;

      if (currentActive === doc?.body || !currentActive || !node.contains(currentActive)) {
        if (isPointerDownOutside) return;

        const firstTabbable = getFirstTabbableElement(currentFloating);
        if (firstTabbable) {
          firstTabbable.focus({ preventScroll: shouldPreventScroll.value });
        } else {
          if (!currentFloating.hasAttribute("tabindex")) {
            currentFloating.setAttribute("tabindex", "-1");
          }
          currentFloating.focus({ preventScroll: shouldPreventScroll.value });
        }
      }
    });
  }

  // --- Focus Guards ----------------------------------------------------------

  function onGuardFocus(type: "start" | "end", event: FocusEvent) {
    if (!isEnabled.value || !open.value) return;

    const floating = getFloatingElement();
    if (!floating) return;

    if (isModal.value) {
      event.preventDefault();
      // The floating container may not be natively focusable, so fall back to it only
      // after ensuring it can receive programmatic focus (consistent with initial focus).
      if (!floating.hasAttribute("tabindex")) {
        floating.setAttribute("tabindex", "-1");
      }
      if (type === "start") {
        const last = getLastTabbableElement(floating) ?? floating;
        last.focus({ preventScroll: shouldPreventScroll.value });
      } else {
        const first = getFirstTabbableElement(floating) ?? floating;
        first.focus({ preventScroll: shouldPreventScroll.value });
      }
    } else if (shouldCloseOnTab.value) {
      open.value = false;
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

  // --- Background Isolation --------------------------------------------------

  function setupIsolation() {
    cleanupIsolation();
    if (!shouldInertOutside.value) return;

    const containers = getFamilyElements();
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

  // --- Initial & Return Focus ------------------------------------------------

  let isPointerDownOutside = false;
  let pointerDownOutsideTimeoutId: ReturnType<typeof setTimeout> | number | undefined;

  function onDocumentPointerDownTracker(event: PointerEvent | MouseEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    // If the interaction is outside this floating tree, prevent focus hijacking
    if (!node.contains(target)) {
      isPointerDownOutside = true;
      // Schedule/clear the debounce on the target's owner window so cross-realm (iframe)
      // targets resolve correctly and we never touch the global `window` (SSR-safe).
      const ownerWindow = getWindow(target);
      if (pointerDownOutsideTimeoutId != null) {
        ownerWindow?.clearTimeout(pointerDownOutsideTimeoutId);
      }
      pointerDownOutsideTimeoutId = ownerWindow?.setTimeout(() => {
        isPointerDownOutside = false;
      }, 100);
    }
  }

  // Always track pointer down events when open to handle returnFocus correctly
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value ? getTargetDocument() : null),
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
    if (typeof rawTarget === "function") {
      const resolved = (rawTarget as () => unknown)();
      if (resolved === false) return;
      if (isElement(resolved)) {
        target = resolved as HTMLElement;
      }
    } else if (rawTarget && typeof rawTarget === "object") {
      if ("value" in rawTarget) {
        // Ref-like: unwrap `.value` and accept it if it resolves to a real element.
        const unwrapped: unknown = (rawTarget as Record<"value", unknown>).value;
        if (isElement(unwrapped)) {
          target = unwrapped as HTMLElement;
        }
      } else if (isElement(rawTarget)) {
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

    const doc = getTargetDocument();
    const activeEl = doc?.activeElement ?? null;
    const isFocusOnBody = activeEl === doc?.body;
    const isFocusInside = activeEl ? node.contains(activeEl) : false;

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
    } else {
      const anchor = getAnchorElement();
      if (anchor && anchor.isConnected) {
        targetElement = anchor;
      } else if (previouslyActiveElement && previouslyActiveElement.isConnected) {
        targetElement = previouslyActiveElement;
      }
    }

    previouslyActiveElement = null;

    if (targetElement && targetElement.isConnected) {
      if (!isElementFocusable(targetElement) && !targetElement.hasAttribute("tabindex")) {
        targetElement.setAttribute("tabindex", "-1");
      }
      targetElement.focus({ preventScroll: shouldPreventScroll.value });
    }
  }

  // --- Document Event Listeners (Non-Modal Mode) -----------------------------

  function onDocumentFocusIn(event: FocusEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (node.contains(target)) {
      return;
    }

    if (ignoreFocusOut && ignoreFocusOut(target)) {
      return;
    }

    if (shouldCloseOnFocusOut.value) {
      open.value = false;
    }
  }

  function onDocumentPointerDown(event: PointerEvent | MouseEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (node.contains(target)) {
      return;
    }

    if (ignoreFocusOut && ignoreFocusOut(target)) {
      return;
    }

    if (shouldCloseOnFocusOut.value) {
      open.value = false;
    }
  }

  // --- Lifecycle & Activation ------------------------------------------------

  function activate() {
    if (!isEnabled.value || !open.value) {
      return;
    }

    const floating = getFloatingElement();
    if (!floating) {
      trapIsActive.value = false;
      return;
    }

    try {
      // Save previously focused element before applying initial focus
      const activeEl = (floating.ownerDocument ?? getDocument())?.activeElement ?? null;
      if (isHTMLElement(activeEl) && !floating.contains(activeEl)) {
        previouslyActiveElement = activeEl;
      }

      setupGuards(floating);
      setupIsolation();
      applyInitialFocus(floating);

      trapIsActive.value = true;
    } catch (error) {
      trapIsActive.value = false;
      cleanupGuards();
      cleanupIsolation();

      if (onError) {
        onError(error);
      } else if (import.meta.env.DEV) {
        console.error("[useFocusTrap] Activation failed:", error);
      }
    }
  }

  function deactivate(returnFocus = true) {
    cleanupGuards();
    cleanupIsolation();
    trapIsActive.value = false;

    if (returnFocus) {
      restoreFocus();
    } else {
      previouslyActiveElement = null;
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
          void nextTick(() => {
            activate();
          });
        }
      } else {
        deactivate(shouldReturnFocus.value);
      }

      onWatcherCleanup(() => {
        cleanupGuards();
        cleanupIsolation();
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

  // Focusout listener on floating element to recover focus if active child is removed in modal
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value && isModal.value ? getFloatingElement() : null),
      "focusout",
      onFloatingFocusOut,
    ),
  );

  // Document focus and pointer listeners for non-modal dismissal
  cleanupRegistry.add(
    useEventListener(
      () =>
        isEnabled.value && open.value && shouldCloseOnFocusOut.value ? getTargetDocument() : null,
      "focusin",
      onDocumentFocusIn,
      { capture: true },
    ),
  );

  cleanupRegistry.add(
    useEventListener(
      () =>
        isEnabled.value && open.value && shouldCloseOnFocusOut.value ? getTargetDocument() : null,
      "pointerdown",
      onDocumentPointerDown,
      { capture: true },
    ),
  );

  tryOnScopeDispose(() => {
    cleanupRegistry.cleanup();
    deactivate(false);
  });

  return {
    isActive,
    activate: () => {
      if (open.value) {
        activate();
      }
    },
    deactivate: () => {
      open.value = false;
      deactivate(shouldReturnFocus.value);
    },
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useFocusTrap`.
 */
export type UseFocusTrapContext = FloatingNode;

/**
 * Return shape for `useFocusTrap`.
 */
export interface UseFocusTrapReturn {
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

/**
 * Configuration options for `useFocusTrap`.
 */
export interface UseFocusTrapOptions {
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
