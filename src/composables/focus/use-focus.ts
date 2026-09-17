import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { isUsingKeyboard } from "@/composables/focus/input-modality";
import { isTypeableElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { getDocument, getWindow } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
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
 * Keyboard-only interaction hook. Compose with `useClick`, `useHover`, `useDismiss` for a complete UX.
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
export function useFocus(node: FloatingNode, options: UseFocusOptions = {}): void {
  const { open, refs } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));
  const ownerDocument = computed(() => anchorEl.value?.ownerDocument ?? getDocument());
  const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow());

  // --- Window Focus Coordination --------------------------------------------

  // Edge case: "Ghost Reopen" on Tab/Window Switch
  // Scenario: An anchor receives focus (opening the floating element), and then the floating
  // element is closed (e.g., via Escape) while the anchor remains the active
  // DOM element (`activeElement === anchorEl`).
  // When the user switches to another browser tab or OS window, the window fires `blur`.
  // When switching back, the window fires `focus`, and browsers automatically re-dispatch
  // a `focus` event on `document.activeElement`.
  // Without this guard, returning to the window would erroneously re-open the dismissed popover.
  let isFocusBlocked = false;

  useEventListener(
    () => (isEnabled.value ? ownerWindow.value : null),
    "blur",
    () => {
      if (!open.value && anchorEl.value && ownerDocument.value?.activeElement === anchorEl.value) {
        isFocusBlocked = true;
      }
    },
  );

  useEventListener(
    () => (isEnabled.value ? ownerWindow.value : null),
    "focus",
    () => {
      isFocusBlocked = false;
    },
  );

  watch(isEnabled, (enabled) => {
    if (!enabled) {
      isFocusBlocked = false;
    }
  });

  tryOnScopeDispose(() => {
    isFocusBlocked = false;
  });

  // --- Focus-Based Activation -----------------------------------------------

  const isSafariOnMac = isMac() && isSafari();

  function onFocus(e: FocusEvent): void {
    if (!isEnabled.value) return;

    // If focus was re-triggered purely by returning to the browser window/tab,
    // consume the block and prevent the popover from ghost-reopening.
    if (isFocusBlocked) {
      isFocusBlocked = false;
      return;
    }

    const target = e.target instanceof Element ? e.target : null;
    if (toValue(options.requireFocusVisible ?? true) && target) {
      // -----------------------------------------------------------------------
      // WebKit Bug #233465: https://bugs.webkit.org/show_bug.cgi?id=233465
      // WebKit Bug #229895: https://bugs.webkit.org/show_bug.cgi?id=229895
      //
      // The Problem:
      // When `requireFocusVisible` is true, `useFocus` should only open the
      // floating element on keyboard navigation, leaving mouse clicks to `useClick`.
      // Normally, `matchesFocusVisible(target)` handles this distinction.
      //
      // However, on Safari (macOS), when focus enters the document from outside
      // (e.g. tabbing into the page from the address bar or browser chrome),
      // `e.relatedTarget` is `null`. In this situation, WebKit's internal
      // heuristic fails and `element.matches(':focus-visible')` falsely returns
      // `false` even though the user navigated using the Tab key.
      //
      // Why a naive bypass fails:
      // In Safari on macOS, clicking non-typeable elements (like buttons) also
      // produces `e.relatedTarget === null` due to macOS focus conventions (#229895).
      // Blindly opening whenever `!e.relatedTarget` would erroneously cause mouse
      // clicks to trigger `useFocus`.
      //
      // The Solution:
      // When on Safari macOS with `e.relatedTarget === null`, bypass native
      // `matches(':focus-visible')` and manually evaluate the W3C `:focus-visible`
      // specification criteria:
      //   1. Did the user navigate via keyboard? (`isUsingKeyboard.value === true`)
      //      -> Qualifies as visible focus.
      //   2. Is the element a text field? (`isTypeableElement(target) === true`)
      //      -> Per spec, text inputs always receive visible focus on any modality.
      // If NEITHER criterion is met, the interaction was a pointer click on a
      // non-typeable element, so we return early without opening.
      // -----------------------------------------------------------------------
      if (isSafariOnMac && !e.relatedTarget) {
        if (!isUsingKeyboard.value && !isTypeableElement(target)) {
          return;
        }
      } else if (!matchesFocusVisible(target)) {
        return;
      }
    }

    open.value = true;
  }

  useEventListener(() => (isEnabled.value ? anchorEl.value : null), "focus", onFocus);

  // --- Focus Blur & Outside Dismissal ----------------------------------------

  let blurTimeoutId: ReturnType<typeof setTimeout> | number | undefined;

  function clearBlurTimeout() {
    clearTimeout(blurTimeoutId);
    blurTimeoutId = undefined;
  }

  function shouldIgnoreDismiss(target: Element | null): boolean {
    if (!target) return false;
    if (node.contains(target)) return true;
    return Boolean(options.ignoreFocusOut?.(target));
  }

  function onBlur(event: FocusEvent): void {
    if (!isEnabled.value || !open.value) {
      clearBlurTimeout();
      return;
    }

    // Cancel any previous pending blur check to avoid duplicate or stale evaluations.
    clearBlurTimeout();

    const currentWindow = ownerWindow.value;
    if (!currentWindow) return;

    // Why defer with a macrotask timeout (BLUR_CHECK_DELAY = 0ms)?
    // Citations:
    // - WHATWG HTML Focus Processing Model (§ 7.4.3):
    //   https://html.spec.whatwg.org/multipage/interaction.html#focus-processing-model
    // - W3C UI Events FocusEvent.relatedTarget (§ 5.2.2):
    //   https://www.w3.org/TR/uievents/#dom-focusevent-relatedtarget
    // - WebKit Bug #229895 (macOS button click focus heuristics):
    //   https://bugs.webkit.org/show_bug.cgi?id=229895
    //
    // While the HTML spec updates `activeElement` before firing `blur` during a synchronous
    // keyboard Tab transition, synchronous inspection during `blur` fails across real-world patterns:
    //   1. Pointer clicks & WebKit heuristics: Clicking a button inside the floating panel triggers
    //      `anchor.blur` before the click event fires. On WebKit/Safari (#229895), clicking buttons does
    //      not focus them synchronously, temporarily leaving `activeElement` as body or transitional.
    //   2. Programmatic & framework focus: Components mounted inside the floating element often receive
    //      focus via microtasks (`nextTick()`) or click handlers, which run after the anchor's `blur`
    //      event has already completed.
    //   3. Shadow DOM encapsulation: Crossing Shadow DOM boundaries frequently retargets or nullifies
    //      `event.relatedTarget` per W3C UI Events specification.
    // Deferring evaluation by 0ms lets the current event loop task settle (clicks, programmatic focus calls,
    // and DOM updates), allowing `document.activeElement` to reflect the final target.
    blurTimeoutId = currentWindow.setTimeout(() => {
      if (!open.value) return;

      const currentDocument = ownerDocument.value;
      const activeEl = currentDocument?.activeElement ?? null;

      // Case 1: Window / OS-level blur (focus left the document, not the anchor).
      // When the user switches to another OS window/app (Alt+Tab), changes browser tabs, or clicks
      // the browser's address bar/DevTools, the browser dispatches `blur` on the active anchor with
      // `event.relatedTarget === null`. In this scenario, `document.activeElement` remains the anchor
      // because DOM focus never moved to an in-page element. We preserve open state so returning to the
      // window does not close the popover.
      if (!event.relatedTarget && activeEl === anchorEl.value) {
        return;
      }

      // Case 2: Focus transitioned into the floating tree or an explicitly ignored target.
      // If focus landed on an interactive element inside the floating node (`node.contains(activeEl)`)
      // or satisfies the consumer's `ignoreFocusOut(activeEl)` predicate (e.g. an external toolbar),
      // we keep the popover open.
      if (shouldIgnoreDismiss(activeEl instanceof Element ? activeEl : null)) {
        return;
      }

      // Case 3: Genuine outside focus.
      // Focus has moved to an unrelated focusable element elsewhere in the document. Dismiss the popover.
      open.value = false;
    }, BLUR_CHECK_DELAY);
  }

  // In addition to element-level blur, observe focus changes at the document level
  // to handle cases where focus moves between descendants and outside elements
  // without triggering another blur on the original anchor.
  useEventListener(
    () => (isEnabled.value ? ownerDocument.value : null),
    "focusin",
    (e: FocusEvent) => {
      if (!open.value) return;

      const target = e.target instanceof Element ? e.target : null;
      if (!target || shouldIgnoreDismiss(target)) return;

      open.value = false;
    },
    { capture: true },
  );

  useEventListener(() => (isEnabled.value ? anchorEl.value : null), "blur", onBlur);

  watch(isEnabled, (enabled) => {
    if (!enabled) {
      clearBlurTimeout();
    }
  });

  tryOnScopeDispose(clearBlurTimeout);
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useFocus`.
 */
export type UseFocusContext = FloatingNode;

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
