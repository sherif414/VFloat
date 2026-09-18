import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { isClickOnScrollbar, isHTMLElement } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { getDocument, getWindow } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node when pointer input lands outside its floating family.
 *
 * @internal Consumed by `useDismiss`. Use `useDismiss(node, { outsidePress })` instead.
 *
 * @param node - The floating node with refs and open state.
 * @param options - Configuration options for outside-click dismissal.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useDismiss(node)
 * ```
 *
 * @example Ignore a related external element
 * ```ts
 * useDismiss(node, {
 *   outsidePress: {
 *     ignoreClick: (_event, target) => {
 *       return target instanceof Node && !!toolbarEl.value?.contains(target)
 *     },
 *   },
 * })
 * ```
 */
export function useOutsideClick(node: FloatingNode, options: UseOutsideClickOptions = {}): void {
  const { open } = node;

  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const floatingEl = computed(() => node.refs.floatingEl.value);
  const ownerDocument = computed(
    () =>
      floatingEl.value?.ownerDocument ??
      getAnchorElement(node.refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );
  const ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow());

  let dragStartedInside = false;
  let dragResetTimeoutId: ReturnType<typeof setTimeout> | number | undefined;

  function clearDragResetTimeout() {
    if (dragResetTimeoutId == null) return;
    ownerWindow.value?.clearTimeout(dragResetTimeoutId as number);
    dragResetTimeoutId = undefined;
  }

  function onDocumentClick(event: MouseEvent) {
    if (!isEnabled.value || !open.value) {
      return;
    }

    if (isDragSuppressed()) return;

    const target = event.target as Node | null;
    if (!target) return;

    // Ignore clicks on scrollbar gutters (e.g. of the document or an outside container).
    if (
      toValue(options.ignoreScrollbar ?? true) &&
      isHTMLElement(target) &&
      isClickOnScrollbar(event, target)
    ) {
      return;
    }

    if (node.contains(target)) {
      return;
    }

    if (options.ignoreClick?.(event, target)) {
      return;
    }

    if (options.onClick) {
      options.onClick(event);
      return;
    }

    open.value = false;
  }

  function isDragSuppressed(): boolean {
    if (toValue(options.event ?? "pointerdown") !== "click") return false;
    if (!toValue(options.ignoreDrag ?? true)) return false;
    if (!dragStartedInside) return false;

    dragStartedInside = false;
    return true;
  }

  function onFloatingMouseDown() {
    dragStartedInside = true;
  }

  function onFloatingMouseUp() {
    clearDragResetTimeout();
    dragResetTimeoutId = ownerWindow.value?.setTimeout(() => {
      dragStartedInside = false;
    }, 0);
  }

  tryOnScopeDispose(() => {
    clearDragResetTimeout();
  });

  useEventListener(
    () => (isEnabled.value ? ownerDocument.value : null),
    () => toValue(options.event ?? "pointerdown"),
    onDocumentClick,
    {
      capture: toValue(options.capture ?? true),
    },
  );

  useEventListener(
    () => (isEnabled.value && toValue(options.ignoreDrag ?? true) ? floatingEl.value : null),
    "mousedown",
    onFloatingMouseDown,
    { capture: true },
  );

  useEventListener(
    () => (isEnabled.value && toValue(options.ignoreDrag ?? true) ? floatingEl.value : null),
    "mouseup",
    onFloatingMouseUp,
    { capture: true },
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring outside-click dismissal.
 */
export interface UseOutsideClickOptions {
  /**
   * Whether the composable is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * The event to use for click detection.
   * @default 'pointerdown'
   */
  event?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;

  /**
   * Whether to use capture phase for the document listener.
   * @default true
   */
  capture?: MaybeRefOrGetter<boolean>;

  /**
   * Predicate used to ignore specific outside clicks.
   * @param event - The mouse event that triggered the outside click
   * @param target - The event target
   * @returns true if the click should be ignored
   */
  ignoreClick?: OutsideClickPredicate;

  /**
   * Custom function to handle outside clicks.
   * If provided, this function is called instead of the default close behavior.
   * @param event - The mouse event that triggered the outside click
   */
  onClick?: (event: MouseEvent) => void;

  /**
   * Whether to ignore clicks on scrollbars.
   * @default true
   */
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore outside clicks that are part of a drag sequence
   * where the drag started inside the floating element and ended outside.
   * @default true
   */
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}

/**
 * Predicate used by `ignoreClick` to decide whether an outside click should be skipped.
 */
export type OutsideClickPredicate = (event: MouseEvent, target: EventTarget | null) => boolean;
