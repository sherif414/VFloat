import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue";
import type { FloatingContext } from "@/composables/floating-context";
import { isButtonTarget, isMouseLikePointerType, isSpaceIgnored } from "@/shared/dom";
import type { OpenChangeReason } from "@/types";

type PointerType = "mouse" | "touch" | "pen";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the anchor element.
 *
 * This composable provides trigger handlers for opening/toggling floating elements.
 *
 * @param context - The floating context with open state and change handler.
 * @param options - Configuration options for click behavior.
 *
 * @example Basic usage
 * ```ts
 * const context = useFloatingContext(...)
 * useClick(context)
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
  } = options;

  //=====================================================================================
  // Interaction State
  //=====================================================================================
  // Kept as plain locals (not refs/reactive) because they only coordinate
  // intra-event ordering.
  const interactionState = {
    pointerType: undefined as PointerType | undefined,
    didKeyDown: false,
  };

  const isEnabled = computed(() => toValue(enabledOption));

  const anchorEl = computed(() => {
    const el = refs.anchorEl.value;
    if (el instanceof HTMLElement) return el;
    return null;
  });

  //=====================================================================================
  // Event Handlers
  //=====================================================================================

  function onOpenChange(reason: OpenChangeReason, event: Event) {
    if (open.value) {
      // When `toggle` is enabled, anchor clicks toggle open/closed.
      if (toValue(toggleOption)) {
        setOpen(false, reason, event);
      }
    } else {
      setOpen(true, reason, event);
    }
  }

  function clearInteractionState() {
    interactionState.pointerType = undefined;
    interactionState.didKeyDown = false;
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

  function isIgnoredPointerType(type: PointerType | undefined): boolean {
    if (isMouseLikePointerType(type, true) && toValue(ignoreMouseOption)) {
      return true;
    }
    if (type === "touch" && toValue(ignoreTouchOption)) {
      return true;
    }
    return false;
  }

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
   * This option does not affect keyboard interactions.
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
}
