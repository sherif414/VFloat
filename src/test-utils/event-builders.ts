/**
 * Shared synthetic event builders for render-based tests.
 *
 * These helpers dispatch real DOM events on rendered elements so timer
 * control (`vi.useFakeTimers()`) and coordinate mocking stay deterministic.
 * They create events only; element creation and mounting belong to the test
 * component rendered via `vitest-browser-vue`.
 */

interface KeyModifiers {
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  cancelable?: boolean;
}

/**
 * Dispatches a bubbling `keydown` event on a rendered target.
 *
 * @param target - Rendered element (or input) receiving the keystroke.
 * @param key - Key value (e.g. `"b"`, `" "`, `"ArrowDown"`).
 * @param options - Modifier flags forwarded to the KeyboardEvent.
 * @returns The dispatched event for `defaultPrevented` assertions.
 */
export function dispatchKey(
  target: EventTarget,
  key: string,
  options: KeyModifiers = {},
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: options.cancelable ?? true,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    altKey: options.altKey ?? false,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Creates a mouse-flavored pointer event for geometry and safe-polygon tests.
 */
export function makePointerEvent(
  type: string,
  opts: Partial<PointerEventInit & { relatedTarget?: EventTarget | null }> = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType: "mouse",
    ...opts,
  } as PointerEventInit);
}

/**
 * Creates a plain DOMRect stub for geometry tests without layout.
 */
export function makeDOMRect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    right: x + w,
    bottom: y + h,
    left: x,
    toJSON() {},
  } as DOMRect;
}
