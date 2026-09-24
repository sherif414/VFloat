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
 * Supports scrollbar filtering, drag suppression, iframe blur dismissal,
 * and configurable event triggers using per-instance document listeners.
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

  // --- Drag Gesture Guard ------------------------------------------------------

  const { event = "pointerdown", ignoreDrag = true } = options;
  let dragStartTarget: Node | null = null;
  let dragEndTarget: Node | null = null;
  let dragResetTimeoutId: number | undefined;

  function clearDragState(): void {
    if (dragResetTimeoutId !== undefined) {
      ownerWindow.value?.clearTimeout(dragResetTimeoutId);
      dragResetTimeoutId = undefined;
    }
    dragStartTarget = null;
    dragEndTarget = null;
  }

  function isDragGesture(): boolean {
    if (event !== "click" || !ignoreDrag) {
      return false;
    }

    // Fast path: When mousedown and mouseup hit the exact same node (the vast
    // majority of stationary clicks), it is structurally impossible for one endpoint
    // to be inside and the other outside. Reference equality lets us skip DOM traversal entirely.
    if (dragStartTarget === dragEndTarget) {
      clearDragState();
      return false;
    }

    // By the time isDragGesture() runs in handleClick, node.contains(clickTarget)
    // has already evaluated to false (the click's common ancestor is outside).
    // Therefore, drag suppression applies if and only if either endpoint started
    // or ended inside the floating node boundary.
    const startedInside = dragStartTarget !== null && node.contains(dragStartTarget);
    const endedInside = dragEndTarget !== null && node.contains(dragEndTarget);

    clearDragState();
    return startedInside || endedInside;
  }

  function handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = getEventTarget(e);
    if (!isNode(target)) return;
    clearDragState();
    dragStartTarget = target;
  }

  function handleMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = getEventTarget(e);
    if (!isNode(target)) return;
    dragEndTarget = target;
    if (dragResetTimeoutId !== undefined) {
      ownerWindow.value?.clearTimeout(dragResetTimeoutId);
    }
    // - If the browser emits a trailing 'click', handleClick consumes these targets synchronously.
    // - If the browser drops the 'click' (e.g. text selection or native drag-and-drop),
    //   this timer clears the Node references to prevent memory leaks and stale state.
    dragResetTimeoutId = ownerWindow.value?.setTimeout(() => {
      dragResetTimeoutId = undefined;
      dragStartTarget = null;
      dragEndTarget = null;
    }, 0);
  }

  const dragTarget = () =>
    enabled.value && node.open.value && event === "click" && ignoreDrag
      ? ownerDocument.value
      : null;

  useEventListener(dragTarget, "mousedown", handleMouseDown, true);
  useEventListener(dragTarget, "mouseup", handleMouseUp, true);

  tryOnScopeDispose(clearDragState);

  // --- Pointer Outside Dismissal -----------------------------------------------

  const { capture = true, ignoreScrollbar = true, shouldIgnore, onOutsideClick } = options;

  function handleClick(e: MouseEvent): void {
    if (!enabled.value || !node.open.value || e.button !== 0) return;

    const target = getEventTarget(e);
    if (!target || !isNode(target) || !target.isConnected) return;

    if (ignoreScrollbar) {
      const scrollbarTarget = resolveScrollbarTarget(target);
      if (scrollbarTarget && isClickOnScrollbar(e, scrollbarTarget)) {
        return;
      }
    }

    if (node.contains(target)) {
      clearDragState();
      return;
    }

    if (isDragGesture()) {
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

  useEventListener(
    () => (enabled.value && node.open.value ? ownerDocument.value : null),
    event,
    handleClick,
    capture,
  );

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
  event: MouseEvent,
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
   * Which document event triggers dismissal.
   * Static configuration determined by the component's UX pattern.
   * @default "pointerdown"
   */
  event?: "pointerdown" | "mousedown" | "click";
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
   * For `event: "click"`, whether to ignore mouseup outside when the drag
   * started inside the floating surface.
   * @default true
   */
  ignoreDrag?: boolean;
  /**
   * Custom predicate to ignore specific outside interactions.
   * Evaluated after the composite node family check.
   */
  shouldIgnore?: OutsideClickPredicate;
  /**
   * Custom callback invoked when an outside interaction occurs.
   * When provided, replaces default `node.open.value = false`.
   */
  onOutsideClick?: (event: MouseEvent, info: OutsideClickInfo) => void;
}
