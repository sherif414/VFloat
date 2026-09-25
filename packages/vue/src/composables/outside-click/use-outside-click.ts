import { computed, type MaybeRefOrGetter, toValue, watchEffect } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { getEventTarget, isClickOnScrollbar, isHTMLElement, isNode } from "@/shared/dom";
import { getDocument, getWindow } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node when pointer input lands outside its floating family.
 *
 * Automatically balances desktop and mobile UX by handling mouse/pen input on
 * instant `pointerdown`, mobile touch input on scroll-safe `pointerup`/`pointercancel`,
 * and keyboard/accessibility activations on virtual `click`.
 *
 * @param node - The floating node with refs and open state.
 * @param options - Configuration options for outside-click dismissal.
 * @example
 * ```ts
 * useOutsideClick(node);
 * ```
 */
export function useOutsideClick(node: FloatingNode, options: UseOutsideClickOptions = {}): void {
  // --- Shared Options & Environment --------------------------------------------

  const enabled = computed(() => toValue(options.enabled) ?? true);
  const ownerDocument = computed(
    () =>
      node.refs.floatingEl.value?.ownerDocument ??
      (node.refs.anchorEl.value && "ownerDocument" in node.refs.anchorEl.value
        ? node.refs.anchorEl.value.ownerDocument
        : undefined) ??
      getDocument(),
  );
  const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow());

  // --- Pointer Outside Dismissal -----------------------------------------------

  const { capture = true, ignoreScrollbar = true, shouldIgnore, onOutsideClick } = options;

  function handleDismiss(e: MouseEvent | PointerEvent): void {
    if (!enabled.value || !node.open.value || e.button !== 0) return;

    const target = getEventTarget(e);
    if (!target || !isNode(target) || !target.isConnected) return;

    if (ignoreScrollbar && (e as PointerEvent).pointerType !== "touch") {
      const scrollbarTarget = resolveScrollbarTarget(target);
      if (scrollbarTarget && isClickOnScrollbar(e, scrollbarTarget)) {
        return;
      }
    }

    if (node.contains(target)) {
      return;
    }

    const info: OutsideClickInfo = { reason: "pointer", target };
    if (shouldIgnore?.(e, target, info)) {
      return;
    }

    if (onOutsideClick) {
      onOutsideClick(e, info);
    } else {
      node.open.value = false;
    }
  }

  // Track active touch pointer and whether the touch gesture initiated outside the floating tree.
  let touchPointerId: number | null = null;
  let isTouchDownOutside = false;

  function resetTouchState(): void {
    touchPointerId = null;
    isTouchDownOutside = false;
  }

  function handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;

    // On touchscreens, do not dismiss on pointerdown. When a user touches the screen
    // to begin a scroll gesture, dismissing immediately would close the overlay before
    // the browser determines whether the gesture was a tap or a scroll.
    // We record the pointer ID and whether the touch initiated outside, deferring
    // the dismissal check to pointerup / pointercancel.
    if (e.pointerType === "touch") {
      touchPointerId = e.pointerId;
      isTouchDownOutside = !node.contains(getEventTarget(e));
      return;
    }

    // Desktop mouse/pen inputs dismiss immediately at t=0 on pointerdown for snappy UX.
    handleDismiss(e);
  }

  function handlePointerUp(e: PointerEvent): void {
    // When a touch gesture finishes without scrolling, pointerup fires on the released target.
    // Unlike synthetic 'click' events (which iOS Safari / WebKit suppresses on non-interactive
    // elements like plain <div> containers, <body>, or blank background whitespace unless they have
    // cursor:pointer or inline onclick), standard W3C pointerup events are reliably dispatched
    // across all DOM nodes on mobile WebKit and Blink.
    if (e.pointerType === "touch" && e.pointerId === touchPointerId) {
      const wasOutside = isTouchDownOutside;
      resetTouchState();

      if (wasOutside) {
        handleDismiss(e);
      }
    }
  }

  function handlePointerCancel(e: PointerEvent): void {
    // If the touch interaction is hijacked by the browser for native viewport scrolling,
    // panning, or zooming, the browser emits pointercancel and suppresses pointerup.
    // Resetting the touch state here ensures the overlay remains open during scrolling.
    if (e.pointerType === "touch" && e.pointerId === touchPointerId) {
      resetTouchState();
    }
  }

  function handleClick(e: MouseEvent): void {
    if (e.button !== 0) return;

    // Desktop mouse/pen interactions are already handled on pointerdown, and touch taps
    // are handled on pointerup. Standard clicks with detail > 0 represent trailing physical
    // clicks whose interaction has already been processed (or text selection drag-out).
    //
    // Clicks with detail === 0 represent virtual activations from keyboard (Enter / Space)
    // or assistive technology (screen readers like VoiceOver or TalkBack), which must be handled.
    if (e.detail !== 0) return;

    handleDismiss(e);
  }

  watchEffect((onCleanup) => {
    if (!enabled.value || !node.open.value) return;

    const doc = ownerDocument.value;
    if (!doc) return;

    doc.addEventListener("pointerdown", handlePointerDown, capture);
    doc.addEventListener("pointerup", handlePointerUp, capture);
    doc.addEventListener("pointercancel", handlePointerCancel, capture);
    doc.addEventListener("click", handleClick, capture);

    onCleanup(() => {
      doc.removeEventListener("pointerdown", handlePointerDown, capture);
      doc.removeEventListener("pointerup", handlePointerUp, capture);
      doc.removeEventListener("pointercancel", handlePointerCancel, capture);
      doc.removeEventListener("click", handleClick, capture);
      resetTouchState();
    });
  });

  // --- Iframe Blur Dismissal ---------------------------------------------------

  let blurTimeoutId: number | undefined;

  function clearBlurTimeout(): void {
    if (blurTimeoutId !== undefined) {
      ownerWindow.value?.clearTimeout(blurTimeoutId);
      blurTimeoutId = undefined;
    }
  }

  function handleBlur(): void {
    clearBlurTimeout();
    blurTimeoutId = ownerWindow.value?.setTimeout(() => {
      blurTimeoutId = undefined;
      const doc = ownerDocument.value;
      const activeEl = doc?.activeElement;
      if (!doc || !isHTMLElement(activeEl) || activeEl.tagName !== "IFRAME") {
        return;
      }

      if (node.contains(activeEl)) return;

      const iframeWin = getWindow(activeEl) ?? doc.defaultView;
      const syntheticEvent = new (iframeWin?.MouseEvent ?? MouseEvent)("click", {
        bubbles: false,
        cancelable: true,
      });
      const info: OutsideClickInfo = { reason: "iframe-blur", target: activeEl };

      if (shouldIgnore?.(syntheticEvent, activeEl, info)) return;

      if (onOutsideClick) {
        onOutsideClick(syntheticEvent, info);
      } else {
        node.open.value = false;
      }
    }, 0);
  }

  useEventListener(
    () => (enabled.value && node.open.value ? ownerWindow.value : null),
    "blur",
    handleBlur,
  );

  tryOnScopeDispose(() => {
    clearBlurTimeout();
    resetTouchState();
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Resolves the measurable HTMLElement for scrollbar hit-testing.
 * When clicking the viewport scrollbar, event.target is the Document node,
 * so we resolve to document.documentElement (<html>).
 */
function resolveScrollbarTarget(target: EventTarget | null): HTMLElement | null {
  if (isHTMLElement(target)) {
    return target;
  }
  if (isNode(target) && target.nodeType === Node.DOCUMENT_NODE) {
    return (target as Document).documentElement;
  }
  return null;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/** Information passed to the outside-click callback and predicate. */
export interface OutsideClickInfo {
  /** The reason the interaction was triggered. */
  reason: "pointer" | "iframe-blur";
  /** The target that received the interaction, if available. */
  target: EventTarget | null;
}

/** Predicate used to decide whether an outside interaction should be skipped. */
export type OutsideClickPredicate = (
  event: MouseEvent | PointerEvent,
  target: EventTarget | null,
  info: OutsideClickInfo,
) => boolean;

/** Options for configuring outside-click dismissal. */
export interface UseOutsideClickOptions {
  /**
   * Whether outside-click detection is enabled.
   * Reactive: can be dynamically toggled (e.g., during form submission or modal states).
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * Which document event phase handles dismissal.
   * Static: read once during listener setup. Changing it mid-open takes
   * effect on close/re-open.
   * @default true
   */
  capture?: boolean;
  /**
   * Whether clicks on scrollbar gutters are ignored.
   * @default true
   */
  ignoreScrollbar?: boolean;
  /**
   * Custom predicate to ignore specific outside interactions.
   * Evaluated after the composite node family check.
   */
  shouldIgnore?: OutsideClickPredicate;
  /**
   * Custom callback invoked when an outside interaction occurs.
   * When provided, replaces default `node.open.value = false`.
   */
  onOutsideClick?: (event: MouseEvent | PointerEvent, info: OutsideClickInfo) => void;
}
