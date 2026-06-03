import { computed, type MaybeRefOrGetter, toValue } from "vue";
import {
  type FloatingContext,
  isFloatingContextTargetWithin,
} from "@/composables/floating-context";
import { isClickOnScrollbar, isHTMLElement } from "@/shared/dom";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating context when pointer input lands outside its floating family.
 *
 * @param context - The floating context with refs and open state.
 * @param options - Configuration options for outside-click dismissal.
 *
 * @example Basic usage
 * ```ts
 * const context = useFloatingContext(...)
 * useOutsideClick(context)
 * ```
 *
 * @example Ignore a related external element
 * ```ts
 * useOutsideClick(context, {
 *   ignoreClick: (_event, target) => {
 *     return target instanceof Node && !!toolbarEl.value?.contains(target)
 *   }
 * })
 * ```
 */
export function useOutsideClick(
  context: UseOutsideClickContext,
  options: UseOutsideClickOptions = {},
): void {
  const { open, setOpen } = context.state;
  const {
    enabled: enabledOption = true,
    event: eventOption = "pointerdown",
    capture: captureOption = true,
    ignoreClick: ignoreClickOption,
    onClick: onClickOption,
    ignoreScrollbar: ignoreScrollbarOption = true,
    ignoreDrag: ignoreDragOption = true,
  } = options;

  const isEnabled = computed(() => toValue(enabledOption));
  const floatingEl = computed(() => context.refs.floatingEl.value);

  let dragStartedInside = false;
  let dragResetTimeoutId: ReturnType<typeof setTimeout> | undefined;

  function clearDragResetTimeout() {
    if (dragResetTimeoutId == null) return;
    clearTimeout(dragResetTimeoutId);
    dragResetTimeoutId = undefined;
  }

  function onDocumentClick(event: MouseEvent) {
    if (!isEnabled.value || !open.value) {
      return;
    }

    if (isDragSuppressed()) return;

    const target = event.target as Node | null;
    if (!target) return;

    if (
      toValue(ignoreScrollbarOption) &&
      isHTMLElement(target) &&
      floatingEl.value &&
      isClickOnScrollbar(event, target)
    ) {
      return;
    }

    if (isFloatingContextTargetWithin(context, target)) {
      return;
    }

    if (ignoreClickOption?.(event, target)) {
      return;
    }

    if (onClickOption) {
      onClickOption(event);
      return;
    }

    setOpen(false, "outside-pointer", event);
  }

  function isDragSuppressed(): boolean {
    if (toValue(eventOption) !== "click") return false;
    if (!toValue(ignoreDragOption)) return false;
    if (!dragStartedInside) return false;

    dragStartedInside = false;
    return true;
  }

  function onFloatingMouseDown() {
    dragStartedInside = true;
  }

  function onFloatingMouseUp() {
    clearDragResetTimeout();
    dragResetTimeoutId = setTimeout(() => {
      dragStartedInside = false;
    }, 0);
  }

  tryOnScopeDispose(() => {
    clearDragResetTimeout();
  });

  useEventListener(() => (isEnabled.value ? document : null), eventOption, onDocumentClick, {
    capture: toValue(captureOption),
  });

  useEventListener(
    () => (isEnabled.value && toValue(ignoreDragOption) ? floatingEl.value : null),
    "mousedown",
    onFloatingMouseDown,
    { capture: true },
  );

  useEventListener(
    () => (isEnabled.value && toValue(ignoreDragOption) ? floatingEl.value : null),
    "mouseup",
    onFloatingMouseUp,
    { capture: true },
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useOutsideClick`.
 */
export interface UseOutsideClickContext {
  /**
   * The reactive refs exposed by the floating context.
   */
  refs: FloatingContext["refs"];
  /**
   * The reactive state and state mutators for the floating context.
   */
  state: FloatingContext["state"];
}

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
