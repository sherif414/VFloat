import { afterEach, describe, expect, it, vi } from "vitest";
import { isUsingKeyboard } from "./input-modality";

describe("input-modality", () => {
  afterEach(() => {
    // Reset to pointer modality after test
    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("switches to keyboard modality on window keydown and back on pointerdown", () => {
    // Start with pointerdown to ensure clean baseline
    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(isUsingKeyboard.value).toBe(false);

    // Trigger keydown
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(isUsingKeyboard.value).toBe(true);

    // Trigger pointerdown
    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(isUsingKeyboard.value).toBe(false);
  });

  it("handles repeated alternating input events correctly", () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(isUsingKeyboard.value).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(isUsingKeyboard.value).toBe(true);

    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(isUsingKeyboard.value).toBe(false);

    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(isUsingKeyboard.value).toBe(false);
  });
});
