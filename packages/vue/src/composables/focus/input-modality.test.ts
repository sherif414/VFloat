import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { isUsingKeyboard } from "./input-modality";

describe("Feature: Input modality tracking", () => {
  afterEach(async () => {
    // Reset to pointer modality after test
    await userEvent.click(document.body);
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Alternating pointer and keyboard interactions", () => {
    it("Given initial pointer modality, When keyboard keydown occurs, Then modality switches to keyboard and reverts on pointerdown", async () => {
      // Start with click to ensure clean baseline
      await userEvent.click(document.body);
      expect(isUsingKeyboard.value).toBe(false);

      // Trigger keydown
      await userEvent.keyboard("{Tab}");
      expect(isUsingKeyboard.value).toBe(true);

      // Trigger pointerdown
      await userEvent.click(document.body);
      expect(isUsingKeyboard.value).toBe(false);
    });

    it("Given sequential inputs of the same type, When dispatched, Then modality state remains idempotent", async () => {
      await userEvent.keyboard("{ArrowDown}");
      expect(isUsingKeyboard.value).toBe(true);

      await userEvent.keyboard("{ArrowUp}");
      expect(isUsingKeyboard.value).toBe(true);

      await userEvent.click(document.body);
      expect(isUsingKeyboard.value).toBe(false);

      await userEvent.click(document.body);
      expect(isUsingKeyboard.value).toBe(false);
    });
  });
});
