import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  createFocusStrategyController,
  resolveContainerTabindex,
  resolveItemTabindex,
} from "./focus-strategies";

describe("focus-strategies", () => {
  it("resolves correct item tabindex for roving strategy", () => {
    expect(resolveItemTabindex(0, 0, "roving")).toBe(0);
    expect(resolveItemTabindex(1, 0, "roving")).toBe(-1);
    expect(resolveItemTabindex(2, 0, "roving")).toBe(-1);

    expect(resolveItemTabindex(0, 1, "roving")).toBe(-1);
    expect(resolveItemTabindex(1, 1, "roving")).toBe(0);
    expect(resolveItemTabindex(2, 1, "roving")).toBe(-1);

    // Initial state when no active index is set (-1)
    expect(resolveItemTabindex(0, -1, "roving")).toBe(0);
    expect(resolveItemTabindex(1, -1, "roving")).toBe(-1);
  });

  it("resolves correct item tabindex for activedescendant strategy", () => {
    expect(resolveItemTabindex(0, 0, "activedescendant")).toBe(-1);
    expect(resolveItemTabindex(1, 0, "activedescendant")).toBe(-1);
    expect(resolveItemTabindex(0, -1, "activedescendant")).toBe(-1);
  });

  it("resolves container tabindex", () => {
    expect(resolveContainerTabindex("roving")).toBe(-1);
    expect(resolveContainerTabindex("activedescendant")).toBe(0);
  });

  it("calls .focus() on item element for roving strategy", () => {
    const containerEl = ref<HTMLElement | null>(document.createElement("div"));
    const controller = createFocusStrategyController(containerEl);

    const item0 = document.createElement("div");
    const item1 = document.createElement("div");
    const focusSpy = vi.spyOn(item1, "focus");

    controller.registerItemElement(item0, 0);
    controller.registerItemElement(item1, 1);

    controller.syncFocus(1, "roving");
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("sets aria-activedescendant and calls scrollIntoView for activedescendant strategy", () => {
    const container = document.createElement("input");
    const containerEl = ref<HTMLElement | null>(container);
    const controller = createFocusStrategyController(containerEl);

    const item1 = document.createElement("div");
    item1.id = "item-1";
    item1.scrollIntoView = vi.fn();

    controller.registerItemElement(item1, 1);

    controller.syncFocus(1, "activedescendant", "item-1");

    expect(container.getAttribute("aria-activedescendant")).toBe("item-1");
    expect(item1.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
    });
  });

  it("removes aria-activedescendant when active index is -1 in activedescendant strategy", () => {
    const container = document.createElement("input");
    container.setAttribute("aria-activedescendant", "item-1");
    const containerEl = ref<HTMLElement | null>(container);
    const controller = createFocusStrategyController(containerEl);

    controller.syncFocus(-1, "activedescendant");
    expect(container.hasAttribute("aria-activedescendant")).toBe(false);
  });
});
