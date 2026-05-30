import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue";
import { type FloatingContext } from "@/composables/floating-context";
import {
  isButtonTarget,
  isClickOnScrollbar,
  isEventTargetWithin,
  isHTMLElement,
  isMouseLikePointerType,
  isSpaceIgnored,
} from "@/shared/dom";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";
import type { OpenChangeReason } from "@/types";

type PointerType = "mouse" | "touch" | "pen";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the anchor element
 * and optionally when clicking outside both the anchor and floating elements.
 *
 * This composable provides unified event handlers for both inside click interactions
 * (to open/toggle floating elements) and outside click interactions (to close them).
 *
 * @param context - The floating context with open state and change handler.
 * @param options - Configuration options for click behavior.
 *
 * @example Basic usage with outside click enabled
 * ```ts
 * const context = useFloatingContext(...)
 * useClick(context, {
 *   toggle: true,
 *   closeOnOutsideClick: true,
 *   outsideClickEvent: 'pointerdown'
 * })
 * ```
 *
 * @example Custom outside click handler
 * ```ts
 * useClick(context, {
 *   closeOnOutsideClick: true,
 *   onOutsideClick: (event) => {
 *     if (confirm("Close dialog?")) {
 *       context.state.setOpen(false)
 *     }
 *   },
 * })
 * ```
 */
export function useClick(context: UseClickContext, options: UseClickOptions = {}): void {
  const { open, setOpen } = context.state;
  const refs = context.refs;
  const {
    enabled: enabledOption = true,
    event: eventOption = "click",
    toggle: toggleOption = true,
    ignoreMouse: ignoreMouseOption = false,
    ignoreKeyboard: ignoreKeyboardOption = false,
    ignoreTouch: ignoreTouchOption = false,
    closeOnOutsideClick: closeOnOutsideClickOption = false,
    outsideClickEvent: outsideClickEventOption = "pointerdown",
    outsideCapture: outsideCaptureOption = true,
    onOutsideClick: onOutsideClickOption,
    ignoreOutsideClick: ignoreOutsideClickOption,
    ignoreScrollbar: ignoreScrollbarOption = true,
    ignoreDrag: ignoreDragOption = true,
  } = options;

  //=====================================================================================
  // Interaction State
  //=====================================================================================
  // Kept as plain locals (not refs/reactive) because they only coordinate
  // intra-event ordering and short-lived suppression windows.
  const interactionState = {
    pointerType: undefined as PointerType | undefined,
    didKeyDown: false,
    dragStartedInside: false,
    interactionInProgress: false,
  };

  // Timeout used to clear `dragStartedInside` after a `mouseup`.
  // Stored so we can cancel/avoid late updates on unmount/anchor change.
  let dragResetTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const isEnabled = computed(() => toValue(enabledOption));
  const isOutsideClickEnabled = computed(() => toValue(closeOnOutsideClickOption));

  const anchorEl = computed(() => {
    const el = refs.anchorEl.value;
    if (el instanceof HTMLElement) return el;
    return null;
  });

  const floatingEl = computed(() => refs.floatingEl.value);

  //=====================================================================================
  // Event Handlers (Anchor & Outside)
  //=====================================================================================

  function clearDragResetTimeout() {
    if (dragResetTimeoutId == null) return;
    clearTimeout(dragResetTimeoutId);
    dragResetTimeoutId = undefined;
  }

  function onOpenChange(reason: OpenChangeReason, event: Event) {
    interactionState.interactionInProgress = true;
    try {
      if (open.value) {
        // When `toggle` is enabled, anchor clicks toggle open/closed.
        if (toValue(toggleOption)) {
          setOpen(false, reason, event);
        }
      } else {
        setOpen(true, reason, event);
      }
    } finally {
      // Reset after a micro-task so the same native event can finish bubbling
      // before the document-level outside listener potentially closes the element.
      queueMicrotask(() => {
        interactionState.interactionInProgress = false;
      });
    }
  }

  function clearInteractionState() {
    interactionState.pointerType = undefined;
    interactionState.didKeyDown = false;
    interactionState.dragStartedInside = false;
    clearDragResetTimeout();
  }

  function onPointerDown(e: PointerEvent) {
    interactionState.pointerType = e.pointerType as PointerType;
  }

  function isSyntheticKeyboardClick(e: MouseEvent): boolean {
    // When keyboard interactions are disabled, browsers may still dispatch a
    // click after Enter/Space activation on some elements.
    return toValue(ignoreKeyboardOption) && e.detail === 0;
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    if (toValue(eventOption) === "click") return;
    if (isIgnoredPointerType(interactionState.pointerType)) return;

    onOpenChange("anchor-click", e);
  }

  function onClick(e: MouseEvent): void {
    if (isSyntheticKeyboardClick(e)) {
      clearInteractionState();
      return;
    }

    if (toValue(eventOption) === "mousedown" && interactionState.pointerType) {
      // If pointerdown exists, reset it and skip click, as mousedown handled it.
      clearInteractionState();
      return;
    }

    if (isIgnoredPointerType(interactionState.pointerType)) {
      clearInteractionState();
      return;
    }

    onOpenChange("anchor-click", e);
    clearInteractionState();
  }

  function onKeyDown(e: KeyboardEvent) {
    interactionState.pointerType = undefined;

    if (e.defaultPrevented || toValue(ignoreKeyboardOption) || isButtonTarget(e)) {
      return;
    }

    const el = anchorEl.value;
    if (!el) return;

    if (e.key === " " && !isSpaceIgnored(el)) {
      // Prevent scrolling
      e.preventDefault();
      interactionState.didKeyDown = true;
    }

    if (e.key === "Enter") {
      onOpenChange("keyboard-activate", e);
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const el = anchorEl.value;
    if (!el) return;

    if (
      e.defaultPrevented ||
      toValue(ignoreKeyboardOption) ||
      isButtonTarget(e) ||
      isSpaceIgnored(el)
    ) {
      return;
    }

    if (e.key === " " && interactionState.didKeyDown) {
      interactionState.didKeyDown = false;
      onOpenChange("keyboard-activate", e);
    }
  }

  function onOutsideClick(event: MouseEvent) {
    if (!isEnabled.value || !isOutsideClickEnabled.value || !open.value) {
      return;
    }

    // Suppress outside-close for click sequences caused by a drag that started
    // inside the floating content.
    if (isDragSuppressed()) return;

    // Don't process outside clicks during ongoing interactions
    if (interactionState.interactionInProgress) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) return;

    // Clicked on a scrollbar
    if (
      toValue(ignoreScrollbarOption) &&
      isHTMLElement(target) &&
      floatingEl.value &&
      isClickOnScrollbar(event, target)
    ) {
      return;
    }

    if (ignoreOutsideClickOption && ignoreOutsideClickOption(target)) {
      return;
    }

    if (
      isEventTargetWithin(event, anchorEl.value) ||
      isEventTargetWithin(event, floatingEl.value)
    ) {
      return;
    }

    if (onOutsideClickOption) {
      onOutsideClickOption(event);
    } else {
      setOpen(false, "outside-pointer", event);
    }
  }

  function isDragSuppressed(): boolean {
    if (toValue(outsideClickEventOption) !== "click") return false;
    if (!toValue(ignoreDragOption)) return false;
    if (!interactionState.dragStartedInside) return false;

    interactionState.dragStartedInside = false;
    return true;
  }

  function onFloatingMouseDown() {
    interactionState.dragStartedInside = true;
  }

  function onFloatingMouseUp() {
    // Reset drag state after a brief delay to allow click events to process
    clearDragResetTimeout();
    dragResetTimeoutId = setTimeout(() => {
      interactionState.dragStartedInside = false;
    }, 0);
  }

  function isIgnoredPointerType(type: PointerType | undefined): boolean {
    if (isMouseLikePointerType(type, true) && toValue(ignoreMouseOption)) {
      return true;
    }
    if (type === "touch" && toValue(ignoreTouchOption)) {
      return true;
    }
    return false;
  }

  // Ensure the drag suppression timer can't update state after unmount.
  tryOnScopeDispose(() => {
    clearDragResetTimeout();
  });

  //=====================================================================================
  // Wiring: attach handlers to the current anchor element
  //=====================================================================================

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!isEnabled.value || !el) return;

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);

    onWatcherCleanup(() => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      clearInteractionState();
    });
  });

  //=====================================================================================
  // Wiring: document outside-click listener + drag suppression on floating
  //=====================================================================================

  useEventListener(
    () => (isEnabled.value && isOutsideClickEnabled.value ? document : null),
    outsideClickEventOption,
    onOutsideClick,
    { capture: toValue(outsideCaptureOption) },
  );

  useEventListener(
    () =>
      isEnabled.value && isOutsideClickEnabled.value && toValue(ignoreDragOption)
        ? floatingEl.value
        : null,
    "mousedown",
    onFloatingMouseDown,
    { capture: true },
  );

  useEventListener(
    () =>
      isEnabled.value && isOutsideClickEnabled.value && toValue(ignoreDragOption)
        ? floatingEl.value
        : null,
    "mouseup",
    onFloatingMouseUp,
    { capture: true },
  );
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useClick`.
 */
export interface UseClickContext {
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
 * Options for configuring the useClick behavior.
 */
export interface UseClickOptions {
  /**
   * Whether the composable is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * The type of event to use to determine a "click" with mouse input.
   * This option does not effect keyboard interactions.
   * @default 'click'
   */
  event?: MaybeRefOrGetter<"click" | "mousedown">;

  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore the logic for mouse input.
   * @default false
   */
  ignoreMouse?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore keyboard handlers (Enter and Space key functionality).
   * @default false
   */
  ignoreKeyboard?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore touch events.
   * @default false
   */
  ignoreTouch?: MaybeRefOrGetter<boolean>;

  // --- Outside Click Options ---

  /**
   * Whether to close the floating element when clicking outside.
   * @default false
   */
  closeOnOutsideClick?: MaybeRefOrGetter<boolean>;

  /**
   * The event to use for outside click detection.
   * @default 'pointerdown'
   */
  outsideClickEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;

  /**
   * Whether to use capture phase for document outside click listener.
   * @default true
   */
  outsideCapture?: MaybeRefOrGetter<boolean>;

  /**
   * Custom function to handle outside clicks.
   * If provided, this function will be called instead of the default behavior.
   * @param event - The mouse event that triggered the outside click
   */
  onOutsideClick?: (event: MouseEvent) => void;

  /**
   * Predicate to determine if an outside click should be ignored.
   * @param target - The event target
   * @returns true if the click should be ignored
   */
  ignoreOutsideClick?: (target: EventTarget | null) => boolean;

  /**
   * Whether to ignore clicks on scrollbars (prevent them from closing the floating element).
   * @default true
   */
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore outside clicks that are part of a drag sequence
   * (where the drag started inside the floating element and ended outside).
   * @default true
   */
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}
