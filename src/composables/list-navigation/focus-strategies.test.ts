import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createFocusStrategyController, getItemTabindex } from "./focus-strategies";

describe("focus-strategies", () => {
  it("resolves correct item tabindex for roving strategy", () => {
    expect(getItemTabindex(0, 0, "roving")).toBe(0);
    expect(getItemTabindex(1, 0, "roving")).toBe(-1);
    expect(getItemTabindex(2, 0, "roving")).toBe(-1);

    expect(getItemTabindex(0, 1, "roving")).toBe(-1);
    expect(getItemTabindex(1, 1, "roving")).toBe(0);
    expect(getItemTabindex(2, 1, "roving")).toBe(-1);

    // Initial state when no active index is set (-1)
    expect(getItemTabindex(0, -1, "roving")).toBe(0);
    expect(getItemTabindex(1, -1, "roving")).toBe(-1);
  });

  it("resolves correct item tabindex for activedescendant strategy", () => {
    expect(getItemTabindex(0, 0, "activedescendant")).toBe(-1);
    expect(getItemTabindex(1, 0, "activedescendant")).toBe(-1);
    expect(getItemTabindex(0, -1, "activedescendant")).toBe(-1);
  });

  it("calls .focus() on item element for roving strategy", () => {
    const containerEl = ref<HTMLElement | null>(document.createElement("div"));
    const controller = createFocusStrategyController(() => containerEl.value);

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
    const controller = createFocusStrategyController(() => containerEl.value);

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
    const controller = createFocusStrategyController(() => containerEl.value);

    controller.syncFocus(-1, "activedescendant");
    expect(container.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("resolves item element via hybrid lookup (registerMap -> itemEls -> querySelectorAll)", () => {
    const container = document.createElement("ul");
    const li0 = document.createElement("li");
    const li1 = document.createElement("li");
    container.appendChild(li0);
    container.appendChild(li1);

    const itemEls = ref<HTMLElement[]>([li0, li1]);
    const controller = createFocusStrategyController(() => container, {
      getItemEls: () => itemEls.value,
    });

    // Resolves from itemEls
    expect(controller.getItemElement(1)).toBe(li1);

    // Overridden by explicit registerItemElement
    const customLi = document.createElement("li");
    controller.registerItemElement(customLi, 1);
    expect(controller.getItemElement(1)).toBe(customLi);

    // Fallback to querySelectorAll when itemEls is empty
    itemEls.value = [];
    controller.registerItemElement(null, 1);
    expect(controller.getItemElement(0)).toBe(li0);
    expect(controller.getItemElement(1)).toBe(li1);
  });

  it("finds item index via findItemIndex for nested target clicks", () => {
    const container = document.createElement("ul");
    const li0 = document.createElement("li");
    const spanInsideLi0 = document.createElement("span");
    li0.appendChild(spanInsideLi0);

    const li1 = document.createElement("li");
    container.appendChild(li0);
    container.appendChild(li1);

    const controller = createFocusStrategyController(() => container);

    expect(controller.findItemIndex(spanInsideLi0)).toBe(0);
    expect(controller.findItemIndex(li1)).toBe(1);
    expect(controller.findItemIndex(document.createElement("div"))).toBeNull();
  });
});
