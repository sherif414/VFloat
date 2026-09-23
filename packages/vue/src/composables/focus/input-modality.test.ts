import { afterEach, describe, expect, it, vi } from "vitest";
import { isUsingKeyboard } from "./input-modality";

describe("Feature: Input modality tracking", () => {
  afterEach(() => {
    // Reset to pointer modality after test
    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Alternating pointer and keyboard interactions", () => {
    it("Given initial pointer modality, When keyboard keydown occurs, Then modality switches to keyboard and reverts on pointerdown", () => {
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

    it("Given sequential inputs of the same type, When dispatched, Then modality state remains idempotent", () => {
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
});
