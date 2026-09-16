import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watchPostEffect } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import {
  isElement,
  isHTMLElement,
  isMouseLikePointerType,
  isNode,
  isTypeableElement as _isTypeableElement,
} from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";

type PointerType = "mouse" | "touch" | "pen" | (string & {});

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

  // --- Modality & Open State Tracking -----------------------------------------

  let pointerType: PointerType | undefined = undefined;
  let didKeyDown: boolean = false;

  const ignoreKeyboard = computed(() => toValue(options.ignoreKeyboard ?? false));
  const isEnabled = computed(() => toValue(options.enabled ?? true));
  const anchorEl = computed(() => getAnchorElement(refs.anchorEl.value));

  function toggleOpen() {
    const toggle = toValue(options.toggle ?? true);

    if (open.value) {
      if (toggle) {
        open.value = false;
      }
    } else {
      open.value = true;
    }
  }

  function clearInteractionState() {
    pointerType = undefined;
    didKeyDown = false;
  }

  // --- Pointers ---------------------------------------------------------------

  function onPointerDown(e: PointerEvent) {
    pointerType = e.pointerType as PointerType;
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    if (toValue(options.event ?? "click") !== "mousedown") return;
    if (shouldIgnorePointerType(pointerType)) return;

    toggleOpen();
  }

  function onClick(e: MouseEvent): void {
    // When event is mousedown, skip trailing click if a pointer gesture initiated it.
    // Explicitly check !== undefined so unknown device pointerType ("") is not treated as falsy/keyboard.
    if (toValue(options.event ?? "click") === "mousedown" && pointerType !== undefined) {
      clearInteractionState();
      return;
    }

    if (shouldIgnorePointerType(pointerType)) {
      clearInteractionState();
      return;
    }

    // Synthetic click from keyboard activation (detail === 0 and no active pointer gesture)
    if (pointerType === undefined && e.detail === 0 && ignoreKeyboard.value) {
      clearInteractionState();
      return;
    }

    toggleOpen();
    clearInteractionState();
  }

  function shouldIgnorePointerType(type: PointerType | undefined): boolean {
    if (isMouseLikePointerType(type, true) && toValue(options.ignoreMouse ?? false)) {
      return true;
    }
    return type === "touch" && toValue(options.ignoreTouch ?? false);
  }

  // --- Keyboard ---------------------------------------------------------------

  function onKeyDown(e: KeyboardEvent) {
    pointerType = undefined;
    if (isButtonTarget(e.target) || isTypeableElement(e.target)) return;

    if (e.key === " ") {
      if (!isButtonTarget(e.target)) {
        e.preventDefault();
      }
      didKeyDown = true;
    }

    if (e.key === "Enter") {
      if (isLinkTarget(e.target)) return;
      toggleOpen();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === " " && didKeyDown) {
      didKeyDown = false;
      toggleOpen();
    }
  }

  // --- Trigger Event Registration ---------------------------------------------

  watchPostEffect(() => {
    const el = anchorEl.value;
    if (!isEnabled.value || !el) return;

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("click", onClick);

    // Clear stale interaction state if the pointer gesture is cancelled (e.g. touch drag/scroll)
    // or if the element/window loses focus before keyup (e.g. blur while holding Space).
    el.addEventListener("pointercancel", clearInteractionState);

    if (!ignoreKeyboard.value) {
      el.addEventListener("keydown", onKeyDown);
      el.addEventListener("keyup", onKeyUp);
    }

    onWatcherCleanup(() => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointercancel", clearInteractionState);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      clearInteractionState();
    });
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

const BUTTON_SELECTOR =
  'button, input[type="button"], input[type="submit"], input[type="reset"], input[type="image"], summary';

const LINK_SELECTOR = "a[href]";

function getClosestElement(target: EventTarget | null): Element | null {
  if (!target || typeof target !== "object") return null;
  if (isElement(target)) return target;
  if (isNode(target) && isElement(target.parentElement)) return target.parentElement;
  if ("closest" in target && typeof (target as Element).closest === "function") {
    return target as Element;
  }
  return null;
}

/**
 * Recognizes native button elements that natively dispatch synthetic click events on Space/Enter.
 */
export function isButtonTarget(target: EventTarget | null): boolean {
  const element = getClosestElement(target);
  if (!element) return false;
  return Boolean(element.closest?.(BUTTON_SELECTOR));
}

/**
 * Skips custom Space handling when the focused element already behaves like a text field.
 */
export function isTypeableElement(target: EventTarget | null): boolean {
  if (!isHTMLElement(target)) return false;
  return _isTypeableElement(target);
}

/**
 * Recognizes native link elements that natively dispatch synthetic click events on Enter.
 */
export function isLinkTarget(target: EventTarget | null): boolean {
  const element = getClosestElement(target);
  if (!element) return false;
  return Boolean(element.closest?.(LINK_SELECTOR));
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
