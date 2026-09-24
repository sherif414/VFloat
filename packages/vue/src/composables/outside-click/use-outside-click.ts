import { computed, type MaybeRefOrGetter, toValue } from "vue";
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
 * instant `pointerdown`, mobile touch input on scroll-safe tap `click`, and
 * keyboard/accessibility activations on virtual `click`.
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

  function handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    // Ignore touch input on pointerdown so touching to scroll does not dismiss the overlay
    if (e.pointerType === "touch") return;

    handleDismiss(e);
  }

  function handleClick(e: MouseEvent): void {
    if (e.button !== 0) return;

    const isTouch = (e as PointerEvent).pointerType === "touch";
    const isVirtual = e.detail === 0;

    // Desktop mouse/pen interactions are already handled on pointerdown.
    // Clicks with detail > 0 and mouse/pen pointerType represent either:
    // 1. Trailing clicks whose pointerdown already closed the overlay
    // 2. Trailing clicks from text selection drag-out (which must be ignored!)
    if (!isTouch && !isVirtual) return;

    handleDismiss(e);
  }

  const listenerTarget = () => (enabled.value && node.open.value ? ownerDocument.value : null);

  useEventListener(listenerTarget, "pointerdown", handlePointerDown, capture);
  useEventListener(listenerTarget, "click", handleClick, capture);

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

  tryOnScopeDispose(clearBlurTimeout);
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
