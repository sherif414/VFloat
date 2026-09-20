import {
  computed,
  type MaybeRefOrGetter,
  nextTick,
  readonly,
  type Ref,
  shallowRef,
  toValue,
  watch,
  watchPostEffect,
} from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { isImeComposing, useComposition } from "@/shared/composition-state";
import { isElement, isHTMLElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { getDocument, getWindow } from "@/shared/env";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import { createFocusGuards, type FocusGuardHandles } from "./focus-guards";
import type { FocusTrapEntry } from "./focus-trap-stack";
import { isTopModalTrap, pushTrapEntry, removeTrapEntry } from "./focus-trap-stack";
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

  const { open, refs } = node;

  // --- Shared Options & Root State --------------------------------------------

  const isEnabled = computed(() => !!toValue(options.enabled ?? true));
  const isModal = computed(() => !!toValue(options.modal ?? true));
  const shouldCloseOnFocusOut = computed(
    () => !isModal.value && !!toValue(options.closeOnFocusOut ?? false),
  );
  const shouldCloseOnTab = computed(() => !!toValue(options.closeOnTab ?? false));
  const shouldInertOutside = computed(() => {
    if (options.outsideElementsInert !== undefined) {
      return !!toValue(options.outsideElementsInert);
    }
    return isModal.value;
  });
  const shouldReturnFocus = computed(() => !!toValue(options.returnFocus ?? true));
  const shouldPreventScroll = computed(() => !!toValue(options.preventScroll ?? true));
  const shouldApplyGuards = computed(() => !!toValue(options.guards ?? true));

  const targetDocument = computed(
    () =>
      refs.floatingEl.value?.ownerDocument ??
      getAnchorElement(refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );
  const ownerWindow = computed(() => targetDocument.value?.defaultView ?? getWindow());
  const trapIsActive = shallowRef(false);

  const cleanupRegistry = createCleanupRegistry();

  // --- Focus Trapping & Tab Navigation ----------------------------------------

  function onDocumentKeyDown(event: KeyboardEvent) {
    if (
      event.key !== "Tab" ||
      event.defaultPrevented ||
      !isEnabled.value ||
      !open.value ||
      isImeComposing(event)
    ) {
      return;
    }

    const floating = refs.floatingEl.value;
    const doc = targetDocument.value;
    if (!floating || !doc) return;

    // Document-level wrap: catches Tab even after focus escaped to body or
    // the address bar, which a floating-only listener never sees.
    const tabbables = getTabbableElements(floating);
    if (tabbables.length === 0) {
      event.preventDefault();
      ensureFloatingFocusable(floating);
      floating.focus({ preventScroll: shouldPreventScroll.value });
      return;
    }

    const firstTabbable = tabbables[0];
    const lastTabbable = tabbables[tabbables.length - 1];
    const currentActive = doc.activeElement;

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

    open.value = false;
  }

  // Floating keydown listener for non-modal closeOnTab.
  cleanupRegistry.add(
    useEventListener(
      () =>
        isEnabled.value && open.value && !isModal.value && shouldCloseOnTab.value
          ? refs.floatingEl.value
          : null,
      "keydown",
      onFloatingKeyDown,
    ),
  );

  // --- Focus Containment & Recovery -------------------------------------------

  function pullFocusInside() {
    queueMicrotask(() => {
      if (!isEnabled.value || !open.value || !isModal.value) return;

      const currentFloating = refs.floatingEl.value;
      if (!currentFloating) return;

      const doc = targetDocument.value;
      if (!doc || !isTopModalTrap(doc, trapEntry)) return;
      const currentActive = doc.activeElement;

      if (currentActive === doc.body || !currentActive || !node.contains(currentActive)) {
        if (isPointerDownOutside) return;

        const firstTabbable = getFirstTabbableElement(currentFloating);
        if (firstTabbable) {
          firstTabbable.focus({ preventScroll: shouldPreventScroll.value });
        } else {
          ensureFloatingFocusable(currentFloating);
          currentFloating.focus({ preventScroll: shouldPreventScroll.value });
        }
      }
    });
  }

  function onFloatingFocusOut(event: FocusEvent) {
    if (!isEnabled.value || !open.value || !isModal.value) return;

    const floating = refs.floatingEl.value;
    if (!floating) return;

    const doc = targetDocument.value;
    if (!doc || !isTopModalTrap(doc, trapEntry)) return;

    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && node.contains(relatedTarget)) {
      return;
    }

    pullFocusInside();
  }

  function onModalFocusPullback(event: FocusEvent) {
    // Synchronous backstop for programmatic focus jumps that never produce
    // a floating focusout (e.g. outsideEl.focus() while open). The stack
    // dispatcher guarantees only the topmost modal receives document focusin.
    if (!isEnabled.value || !open.value || !isModal.value) return;

    const floating = refs.floatingEl.value;
    if (!floating) return;

    const target = event.target as Node | null;
    if (!target || node.contains(target)) {
      // Keyboard navigation back inside clears the outside-pointer flag so a
      // fast Tab after an outside press is never swallowed by the 100ms window.
      isPointerDownOutside = false;
      return;
    }
    if (isPointerDownOutside) return;

    pullFocusInside();
  }

  // Floating focusout listener recovers focus if the active child is removed inside a modal.
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value && isModal.value ? refs.floatingEl.value : null),
      "focusout",
      onFloatingFocusOut,
    ),
  );

  // --- Non-Modal Outside Dismissal --------------------------------------------

  function onNonModalFocusOut(event: FocusEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (node.contains(target)) {
      return;
    }

    if (options.ignoreFocusOut?.(target)) {
      return;
    }

    if (shouldCloseOnFocusOut.value) {
      open.value = false;
    }
  }

  function onNonModalPointerDown(event: PointerEvent | MouseEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (node.contains(target)) {
      return;
    }

    if (options.ignoreFocusOut?.(target)) {
      return;
    }

    if (shouldCloseOnFocusOut.value) {
      open.value = false;
    }
  }

  // Document focusin listener closes non-modal surfaces when focus escapes to outside elements.
  cleanupRegistry.add(
    useEventListener(
      () =>
        isEnabled.value && open.value && shouldCloseOnFocusOut.value && !isModal.value
          ? targetDocument.value
          : null,
      "focusin",
      onNonModalFocusOut,
      { capture: true },
    ),
  );

  // Document pointerdown listener closes non-modal surfaces when clicking outside.
  cleanupRegistry.add(
    useEventListener(
      () =>
        isEnabled.value && open.value && shouldCloseOnFocusOut.value && !isModal.value
          ? targetDocument.value
          : null,
      "pointerdown",
      onNonModalPointerDown,
      { capture: true },
    ),
  );

  // --- Portal Focus Guards ----------------------------------------------------

  let guardHandles: FocusGuardHandles | null = null;

  function onGuardFocus(type: "start" | "end", event: FocusEvent) {
    if (!isEnabled.value || !open.value) return;

    const floating = refs.floatingEl.value;
    if (!floating) return;

    if (isModal.value) {
      event.preventDefault();
      ensureFloatingFocusable(floating);
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

  // Dynamically synchronize guards when `guards` option updates while active.
  cleanupRegistry.add(
    watch(
      shouldApplyGuards,
      (guardsEnabled) => {
        if (!trapIsActive.value) return;
        if (!guardsEnabled) {
          cleanupGuards();
          return;
        }
        const floating = refs.floatingEl.value;
        if (floating) {
          setupGuards(floating);
        }
      },
      { flush: "post" },
    ),
  );

  // --- Background Inert Isolation ---------------------------------------------

  let isolationRestore: (() => void) | null = null;

  function getOpenFloatingElements(): HTMLElement[] {
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

  function setupIsolation() {
    cleanupIsolation();
    if (!shouldInertOutside.value) return;

    const containers = getOpenFloatingElements();
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

  // Dynamically synchronize isolation when `outsideElementsInert` option updates while active.
  cleanupRegistry.add(
    watch(
      shouldInertOutside,
      (inertEnabled) => {
        if (!trapIsActive.value) return;
        if (!inertEnabled) {
          cleanupIsolation();
          return;
        }
        setupIsolation();
      },
      { flush: "post" },
    ),
  );

  // --- Initial & Return Focus -------------------------------------------------

  let previouslyActiveElement: HTMLElement | null = null;
  // Captured synchronously on open so a focus move before nextTick cannot
  // overwrite the true trigger.
  let pendingTriggerElement: HTMLElement | null = null;
  // Temporary tabindex added to an otherwise unfocusable return target.
  // Removed on deactivate so triggers never keep a mutated tabindex.
  let temporaryTabindexTarget: HTMLElement | null = null;
  // Fallback container tabindex added when no tabbable child exists.
  // Removed on deactivate/re-focus so the panel DOM stays untouched when idle.
  let temporaryFloatingTabindex = false;

  let isPointerDownOutside = false;
  let pointerDownOutsideTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let retryInitialFocusRafId: number | undefined;

  function clearPointerDownOutsideTimeout() {
    if (pointerDownOutsideTimeoutId != null) {
      ownerWindow.value?.clearTimeout(pointerDownOutsideTimeoutId);
      pointerDownOutsideTimeoutId = undefined;
    }
  }

  function cancelRetryInitialFocus() {
    if (retryInitialFocusRafId != null) {
      ownerWindow.value?.cancelAnimationFrame(retryInitialFocusRafId);
      retryInitialFocusRafId = undefined;
    }
  }

  function capturePendingTrigger() {
    // Synchronous save: nextTick activation would otherwise record whatever
    // grabbed focus in between instead of the true opener.
    const activeEl = targetDocument.value?.activeElement ?? null;
    if (isHTMLElement(activeEl) && !refs.floatingEl.value?.contains(activeEl)) {
      pendingTriggerElement = activeEl;
    }
  }

  function onDocumentPointerDownTracker(event: PointerEvent | MouseEvent) {
    if (!isEnabled.value || !open.value) return;

    const target = event.target as Node | null;
    if (!target) return;

    // If the interaction is outside this floating tree, prevent focus hijacking
    if (!node.contains(target)) {
      isPointerDownOutside = true;
      // Schedule/clear the debounce on the target's owner window so cross-realm (iframe)
      // targets resolve correctly and we never touch the global `window` (SSR-safe).
      const win = getWindow(target) ?? ownerWindow.value;
      if (pointerDownOutsideTimeoutId != null) {
        win?.clearTimeout(pointerDownOutsideTimeoutId);
      }
      pointerDownOutsideTimeoutId = win?.setTimeout(() => {
        isPointerDownOutside = false;
        pointerDownOutsideTimeoutId = undefined;
      }, 100);
    }
  }

  // Always track pointer down events when open to handle returnFocus correctly
  cleanupRegistry.add(
    useEventListener(
      () => (isEnabled.value && open.value ? targetDocument.value : null),
      "pointerdown",
      onDocumentPointerDownTracker,
      { capture: true },
    ),
  );

  function applyInitialFocus(floating: HTMLElement) {
    const rawTarget = toValue(options.initialFocus);
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

    if (target?.isConnected && typeof target.focus === "function") {
      target.focus({ preventScroll: shouldPreventScroll.value });
      retryInitialFocus(target);
      return;
    }

    // Default: first tabbable element, fallback to floating container
    const firstTabbable = getFirstTabbableElement(floating);
    if (firstTabbable) {
      firstTabbable.focus({ preventScroll: shouldPreventScroll.value });
      retryInitialFocus(firstTabbable);
    } else {
      ensureFloatingFocusable(floating);
      floating.focus({ preventScroll: shouldPreventScroll.value });
      retryInitialFocus(floating);
    }
  }

  function retryInitialFocus(target: HTMLElement) {
    // Animated mounts (dialog fade, transform) are often not focusable on the
    // first tick. Retry once next frame instead of adding async options or deps.
    const win = targetDocument.value?.defaultView ?? getWindow(target);
    if (!win) return;
    if (retryInitialFocusRafId != null) {
      win.cancelAnimationFrame(retryInitialFocusRafId);
    }
    retryInitialFocusRafId = win.requestAnimationFrame(() => {
      retryInitialFocusRafId = undefined;
      if (!isEnabled.value || !open.value || !trapIsActive.value) return;
      if (targetDocument.value?.activeElement === target) return;
      if (!target.isConnected || !isElementFocusable(target)) return;
      target.focus({ preventScroll: shouldPreventScroll.value });
    });
  }

  function ensureFloatingFocusable(floating: HTMLElement) {
    if (floating.hasAttribute("tabindex") || temporaryFloatingTabindex) return;
    floating.setAttribute("tabindex", "-1");
    temporaryFloatingTabindex = true;
  }

  function clearTemporaryFloatingTabindex(floating: HTMLElement | null) {
    if (!temporaryFloatingTabindex || !floating) {
      temporaryFloatingTabindex = false;
      return;
    }
    temporaryFloatingTabindex = false;
    floating.removeAttribute("tabindex");
  }

  function restoreFocus() {
    if (!shouldReturnFocus.value) {
      previouslyActiveElement = null;
      return;
    }

    const doc = targetDocument.value;
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

    const customReturn = toValue(options.returnFocus);
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
      const anchor = getAnchorElement(refs.anchorEl.value);
      if (anchor?.isConnected) {
        targetElement = anchor;
      } else if (previouslyActiveElement?.isConnected) {
        targetElement = previouslyActiveElement;
      }
    }

    previouslyActiveElement = null;

    if (targetElement?.isConnected) {
      // Make unfocusable triggers focusable temporarily, then clean up so the
      // trigger DOM never keeps a mutated tabindex after the trap closes.
      const needsTemporaryTabindex =
        !isElementFocusable(targetElement) && !targetElement.hasAttribute("tabindex");
      if (needsTemporaryTabindex) {
        targetElement.setAttribute("tabindex", "-1");
        temporaryTabindexTarget = targetElement;
      }
      targetElement.focus({ preventScroll: shouldPreventScroll.value });
      if (needsTemporaryTabindex) {
        // Remove after focus: programmatic focus already landed, the attribute
        // only needed to make focus() succeed on div/span triggers.
        targetElement.removeAttribute("tabindex");
        temporaryTabindexTarget = null;
      }
    }
  }

  function clearTemporaryReturnTabindex() {
    if (temporaryTabindexTarget) {
      temporaryTabindexTarget.removeAttribute("tabindex");
      temporaryTabindexTarget = null;
    }
  }

  // --- Modal Stack & Trap Coordination ----------------------------------------

  const trapEntry: FocusTrapEntry = {
    id: Symbol("vfloat-focus-trap"),
    onKeyDown: onDocumentKeyDown,
    onFocusIn: onModalFocusPullback,
  };

  // Tracks guards/floating tabindex marked for this trap instance.
  let trapScopeMarked = false;
  // Whether this trap currently occupies the document modal stack.
  let isModalStacked = false;

  function markTrapScope(floating: HTMLElement) {
    if (trapScopeMarked) return;
    // Marks the trap root so radio group tabbability scopes to the trap
    // instead of the whole document (see tabbable.ts findScopeRoot).
    floating.setAttribute("data-vfloat-trap-scope", "");
    trapScopeMarked = true;
  }

  function unmarkTrapScope() {
    if (!trapScopeMarked) return;
    trapScopeMarked = false;
    refs.floatingEl.value?.removeAttribute("data-vfloat-trap-scope");
  }

  function registerModalStack() {
    // Only strict modals join the document stack; non-modals never compete.
    if (!isModal.value || isModalStacked) return;
    const doc = targetDocument.value;
    if (doc) {
      pushTrapEntry(doc, trapEntry);
      isModalStacked = true;
    }
  }

  function unregisterModalStack() {
    if (!isModalStacked) return;
    isModalStacked = false;
    const doc = targetDocument.value;
    if (doc) {
      removeTrapEntry(doc, trapEntry);
    }
  }

  function activate() {
    if (!isEnabled.value || !open.value) {
      return;
    }

    const floating = refs.floatingEl.value;
    if (!floating) {
      trapIsActive.value = false;
      return;
    }

    try {
      // Prefer the synchronously captured trigger; fall back to whatever holds
      // focus now. Deferred capture alone loses the opener when focus moves
      // between open=true and nextTick.
      const doc = targetDocument.value;
      const activeEl = doc?.activeElement ?? null;
      if (!trapIsActive.value && isHTMLElement(activeEl) && !floating.contains(activeEl)) {
        previouslyActiveElement = pendingTriggerElement ?? activeEl;
      }
      pendingTriggerElement = null;

      markTrapScope(floating);
      setupGuards(floating);
      setupIsolation();
      applyInitialFocus(floating);
      registerModalStack();

      trapIsActive.value = true;
    } catch (error) {
      trapIsActive.value = false;
      cleanupGuards();
      cleanupIsolation();
      unmarkTrapScope();

      if (options.onError) {
        options.onError(error);
      } else if (import.meta.env.DEV) {
        console.error("[useFocusTrap] Activation failed:", error);
      }
    }
  }

  function deactivate(returnFocus = true) {
    unregisterModalStack();
    cleanupGuards();
    cleanupIsolation();
    unmarkTrapScope();
    clearTemporaryFloatingTabindex(refs.floatingEl.value);
    clearTemporaryReturnTabindex();
    clearPointerDownOutsideTimeout();
    cancelRetryInitialFocus();
    trapIsActive.value = false;

    if (returnFocus) {
      restoreFocus();
    } else {
      previouslyActiveElement = null;
    }
  }

  // Synchronously capture opener trigger when open becomes true before any intermediate focus jumps
  cleanupRegistry.add(
    watch(
      () => isEnabled.value && open.value,
      (isOpen) => {
        if (isOpen) {
          capturePendingTrigger();
        }
      },
      { flush: "sync" },
    ),
  );

  // Watch open, enabled, and floatingEl states to coordinate surface activation lifecycle.
  cleanupRegistry.add(
    watchPostEffect((onCleanup) => {
      if (isEnabled.value && open.value) {
        if (refs.floatingEl.value) {
          capturePendingTrigger();
          void nextTick(() => {
            if (isEnabled.value && open.value && !trapIsActive.value) {
              activate();
            }
          });
        } else if (trapIsActive.value) {
          deactivate(false);
        }
      } else {
        pendingTriggerElement = null;
        if (trapIsActive.value) {
          deactivate(shouldReturnFocus.value);
        }
      }

      onCleanup(() => {
        if (!isEnabled.value || !open.value) {
          unregisterModalStack();
          cleanupGuards();
          cleanupIsolation();
          unmarkTrapScope();
          clearTemporaryFloatingTabindex(refs.floatingEl.value);
        }
      });
    }),
  );

  // Dynamically synchronize modal stack membership when `modal` option updates while active.
  cleanupRegistry.add(
    watch(
      isModal,
      (modalEnabled) => {
        if (!trapIsActive.value) return;
        if (modalEnabled) {
          registerModalStack();
        } else {
          unregisterModalStack();
        }
      },
      { flush: "post" },
    ),
  );

  tryOnScopeDispose(() => {
    const doc = targetDocument.value;
    if (doc) {
      removeTrapEntry(doc, trapEntry);
    }
    clearPointerDownOutsideTimeout();
    cancelRetryInitialFocus();
    cleanupRegistry.cleanup();
    deactivate(false);
  });

  return {
    isActive: readonly(trapIsActive),
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
  isActive: Readonly<Ref<boolean>>;

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
