import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue";

import type { FloatingNode } from "@/composables/floating-node";
import { useComposition } from "@/shared/composition-state";
import {
  isElement,
  isMouseLikePointerType,
  isNode,
  isShadowRoot,
  isTypeableElement as _isTypeableElement,
} from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";

type PointerType = "mouse" | "touch" | "pen" | (string & {});

const BUTTON_SELECTOR =
  'button, input[type="button"], input[type="submit"], input[type="reset"], input[type="image"], summary';

const LINK_SELECTOR = "a[href]";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Enables showing/hiding the floating element when clicking the anchor element.
 *
 * This composable provides trigger handlers for opening/toggling floating elements.
 *
 * @param node - The floating node with open state and refs.
 * @param options - Configuration options for click behavior.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useClick(node)
 * ```
 */
export function useClick(node: FloatingNode, options: UseClickOptions = {}): void {
  const { open, refs } = node;

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const isToggle = computed(() => toValue(options.toggle) ?? true);
  const ignoreKeyboard = computed(() => toValue(options.ignoreKeyboard) ?? false);
  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));

  function toggleOpen(): void {
    if (open.value) {
      if (isToggle.value) {
        open.value = false;
      }
    } else {
      open.value = true;
    }
  }

  // --- Pointer Click Activation ------------------------------------------------

  const eventName = computed(() => toValue(options.event) ?? "click");
  const ignoreMouse = computed(() => toValue(options.ignoreMouse) ?? false);
  const ignoreTouch = computed(() => toValue(options.ignoreTouch) ?? false);

  let pointerType: PointerType | undefined = undefined;
  let didHandleMouseDown = false;

  function clearPointerState(): void {
    pointerType = undefined;
    didHandleMouseDown = false;
  }

  function shouldIgnorePointerType(type: PointerType | undefined): boolean {
    if (ignoreMouse.value && isMouseLikePointerType(type, true)) {
      return true;
    }
    return type === "touch" && ignoreTouch.value;
  }

  function onPointerDown(e: PointerEvent): void {
    pointerType = e.pointerType as PointerType;
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (eventName.value !== "mousedown") return;
    if (pointerType === "touch") return;
    if (shouldIgnorePointerType(pointerType)) return;

    toggleOpen();
    didHandleMouseDown = true;
  }

  function onClick(e: MouseEvent): void {
    if (e.button !== 0) return;

    if (eventName.value === "mousedown" && didHandleMouseDown) {
      clearPointerState();
      return;
    }

    if (shouldIgnorePointerType(pointerType)) {
      clearPointerState();
      return;
    }

    // Synthetic click from keyboard activation (detail === 0 and no active pointer gesture)
    if (pointerType === undefined && e.detail === 0 && ignoreKeyboard.value) {
      clearPointerState();
      return;
    }

    toggleOpen();
    clearPointerState();
  }

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!isEnabled.value || !el) return;

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("click", onClick);

    // Clear stale interaction state if the pointer gesture is cancelled (e.g. touch drag/scroll).
    el.addEventListener("pointercancel", clearPointerState);

    onWatcherCleanup(() => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointercancel", clearPointerState);
      clearPointerState();
    });
  });

  // --- Keyboard Trigger Activation ---------------------------------------------

  const isImeComposing = useComposition();
  let didKeyDown = false;

  function clearKeyboardState(): void {
    didKeyDown = false;
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== " " && e.key !== "Enter") return;
    pointerType = undefined;
    if (e.repeat) return;
    if (isImeComposing(e)) return;
    const boundary = anchorEl.value;
    if (isButtonTarget(e.target, boundary) || isTypeableElement(e.target)) return;

    if (e.key === " ") {
      e.preventDefault();
      didKeyDown = true;
    } else {
      if (isLinkTarget(e.target, boundary)) return;
      toggleOpen();
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (e.key === " " && didKeyDown) {
      didKeyDown = false;
      if (isImeComposing(e)) return;
      toggleOpen();
    }
  }

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!isEnabled.value || ignoreKeyboard.value || !el) return;

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);

    onWatcherCleanup(() => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      clearKeyboardState();
    });
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function getClosestElement(target: EventTarget | null): Element | null {
  let current: Node | null = isNode(target) ? target : null;
  while (current) {
    if (isElement(current)) return current;
    current = isShadowRoot(current) ? current.host : current.parentNode;
  }
  return null;
}

/**
 * Recognizes native button elements that natively dispatch synthetic click events on Space/Enter.
 */
function isButtonTarget(target: EventTarget | null, boundary?: Element | null): boolean {
  const element = getClosestElement(target);
  if (!element) return false;
  const button = element.closest?.(BUTTON_SELECTOR);
  if (!button) return false;
  return boundary ? boundary.contains(button) : true;
}

/**
 * Skips custom Space handling when the focused element already behaves like a text field.
 */
function isTypeableElement(target: EventTarget | null): boolean {
  const element = getClosestElement(target);
  return _isTypeableElement(element);
}

/**
 * Recognizes native link elements that natively dispatch synthetic click events on Enter.
 */
function isLinkTarget(target: EventTarget | null, boundary?: Element | null): boolean {
  const element = getClosestElement(target);
  if (!element) return false;
  const link = element.closest?.(LINK_SELECTOR);
  if (!link) return false;
  return boundary ? boundary.contains(link) : true;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useClick`.
 */
export type UseClickContext = FloatingNode;

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
   * The type of event to use to determine a "click" with pointer input.
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
