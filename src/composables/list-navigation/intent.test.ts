import { describe, expect, it } from "vite-plus/test";
import { resolveKeyboardIntent } from "./intent";

describe("resolveKeyboardIntent", () => {
  const createEvent = (key: string, modifiers: Record<string, boolean> = {}) => {
    return new KeyboardEvent("keydown", { key, ...modifiers });
  };

  it("ignores modifier keys", () => {
    expect(resolveKeyboardIntent(createEvent("ArrowDown", { ctrlKey: true }))).toBeNull();
    expect(resolveKeyboardIntent(createEvent("ArrowDown", { metaKey: true }))).toBeNull();
    expect(resolveKeyboardIntent(createEvent("ArrowDown", { altKey: true }))).toBeNull();
    // Shift is allowed (e.g. Shift+Tab, though Tab returns "close" here regardless)
    expect(resolveKeyboardIntent(createEvent("ArrowDown", { shiftKey: true }))).toBe("next");
  });

  it("resolves universal keys", () => {
    expect(resolveKeyboardIntent(createEvent("Home"))).toBe("first");
    expect(resolveKeyboardIntent(createEvent("End"))).toBe("last");
    expect(resolveKeyboardIntent(createEvent("Tab"))).toBe("close");
    expect(resolveKeyboardIntent(createEvent("Enter"))).toBe("activate");
    expect(resolveKeyboardIntent(createEvent(" "))).toBe("activate");
  });

  describe("vertical orientation", () => {
    const opts = { orientation: "vertical" as const };

    it("resolves main axis (LTR)", () => {
      expect(resolveKeyboardIntent(createEvent("ArrowDown"), opts)).toBe("next");
      expect(resolveKeyboardIntent(createEvent("ArrowUp"), opts)).toBe("previous");
    });

    it("resolves cross axis (LTR)", () => {
      expect(resolveKeyboardIntent(createEvent("ArrowRight"), opts)).toBe("enter");
      expect(resolveKeyboardIntent(createEvent("ArrowLeft"), opts)).toBe("exit");
    });

    it("resolves cross axis (RTL)", () => {
      const rtlOpts = { ...opts, rtl: true };
      expect(resolveKeyboardIntent(createEvent("ArrowRight"), rtlOpts)).toBe("exit");
      expect(resolveKeyboardIntent(createEvent("ArrowLeft"), rtlOpts)).toBe("enter");
    });
  });

  describe("horizontal orientation", () => {
    const opts = { orientation: "horizontal" as const };

    it("resolves main axis (LTR)", () => {
      expect(resolveKeyboardIntent(createEvent("ArrowRight"), opts)).toBe("next");
      expect(resolveKeyboardIntent(createEvent("ArrowLeft"), opts)).toBe("previous");
    });

    it("resolves main axis (RTL)", () => {
      const rtlOpts = { ...opts, rtl: true };
      expect(resolveKeyboardIntent(createEvent("ArrowRight"), rtlOpts)).toBe("previous");
      expect(resolveKeyboardIntent(createEvent("ArrowLeft"), rtlOpts)).toBe("next");
    });

    it("resolves ArrowDown as enter", () => {
      expect(resolveKeyboardIntent(createEvent("ArrowDown"), opts)).toBe("enter");
    });
  });
});
