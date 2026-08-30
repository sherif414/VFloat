import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  ActiveDescendantNavigationStrategy,
  createNavigationController,
  createNavigationStrategy,
  RovingFocusNavigationStrategy,
} from "./navigation-strategies";

describe("navigation-strategies", () => {
  describe("RovingFocusNavigationStrategy", () => {
    it("creates roving strategy instance with createNavigationStrategy", () => {
      const strategy = createNavigationStrategy("roving");
      expect(strategy).toBeInstanceOf(RovingFocusNavigationStrategy);
      expect(strategy.name).toBe("roving");
    });

    it("resolves correct item tabindex for roving strategy", () => {
      const strategy = new RovingFocusNavigationStrategy();
      expect(strategy.getItemTabindex(0, 0)).toBe(0);
      expect(strategy.getItemTabindex(1, 0)).toBe(-1);
      expect(strategy.getItemTabindex(2, 0)).toBe(-1);

      expect(strategy.getItemTabindex(0, 1)).toBe(-1);
      expect(strategy.getItemTabindex(1, 1)).toBe(0);
      expect(strategy.getItemTabindex(2, 1)).toBe(-1);

      // Initial state when no active index is set (-1)
      expect(strategy.getItemTabindex(0, -1)).toBe(0);
      expect(strategy.getItemTabindex(1, -1)).toBe(-1);
    });

    it("calls .focus() on item element for roving strategy", () => {
      const strategy = new RovingFocusNavigationStrategy();
      const itemEl = document.createElement("button");
      const focusSpy = vi.spyOn(itemEl, "focus");

      strategy.syncFocus({
        index: 1,
        itemEl,
        targetEl: null,
      });

      expect(focusSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("ActiveDescendantNavigationStrategy", () => {
    it("creates active descendant strategy instance with createNavigationStrategy", () => {
      const strategy = createNavigationStrategy("activedescendant");
      expect(strategy).toBeInstanceOf(ActiveDescendantNavigationStrategy);
      expect(strategy.name).toBe("activedescendant");
    });

    it("resolves -1 tabindex for activedescendant strategy", () => {
      const strategy = new ActiveDescendantNavigationStrategy();
      expect(strategy.getItemTabindex(0, 0)).toBe(-1);
      expect(strategy.getItemTabindex(1, 0)).toBe(-1);
      expect(strategy.getItemTabindex(0, -1)).toBe(-1);
    });

    it("sets aria-activedescendant and calls scrollIntoView for activedescendant strategy", () => {
      const strategy = new ActiveDescendantNavigationStrategy();
      const targetEl = document.createElement("input");
      const itemEl = document.createElement("div");
      itemEl.id = "opt-1";
      itemEl.scrollIntoView = vi.fn();

      strategy.syncFocus({
        index: 1,
        itemEl,
        targetEl,
        activeId: "opt-1",
      });

      expect(targetEl.getAttribute("aria-activedescendant")).toBe("opt-1");
      expect(itemEl.scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
    });

    it("removes aria-activedescendant when active index is -1 in activedescendant strategy", () => {
      const strategy = new ActiveDescendantNavigationStrategy();
      const targetEl = document.createElement("input");
      targetEl.setAttribute("aria-activedescendant", "opt-1");

      strategy.syncFocus({
        index: -1,
        itemEl: null,
        targetEl,
      });

      expect(targetEl.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("initializes target element tabindex and aria-orientation onTargetUpdate", () => {
      const strategy = new ActiveDescendantNavigationStrategy();
      const targetDiv = document.createElement("div");

      strategy.onTargetUpdate(targetDiv, "vertical");
      expect(targetDiv.getAttribute("tabindex")).toBe("0");
      expect(targetDiv.getAttribute("aria-orientation")).toBe("vertical");

      const targetInput = document.createElement("input");
      strategy.onTargetUpdate(targetInput, "horizontal");
      // Does not overwrite tabindex on input
      expect(targetInput.hasAttribute("tabindex")).toBe(false);
      expect(targetInput.getAttribute("aria-orientation")).toBe("horizontal");
    });
  });

  describe("createNavigationController", () => {
    it("resolves item element via items array", () => {
      const targetEl = document.createElement("ul");
      const li0 = document.createElement("li");
      const li1 = document.createElement("li");
      targetEl.appendChild(li0);
      targetEl.appendChild(li1);

      const items = ref<HTMLElement[]>([li0, li1]);
      const controller = createNavigationController(
        () => targetEl,
        () => items.value,
      );

      expect(controller.getItemElement(0)).toBe(li0);
      expect(controller.getItemElement(1)).toBe(li1);
      expect(controller.getItemElement(2)).toBeNull();
    });

    it("finds item index via findItemIndex for nested target clicks", () => {
      const targetEl = document.createElement("ul");
      const li0 = document.createElement("li");
      const spanInsideLi0 = document.createElement("span");
      li0.appendChild(spanInsideLi0);

      const li1 = document.createElement("li");
      targetEl.appendChild(li0);
      targetEl.appendChild(li1);

      const controller = createNavigationController(
        () => targetEl,
        () => [li0, li1],
      );

      expect(controller.findItemIndex(spanInsideLi0)).toBe(0);
      expect(controller.findItemIndex(li1)).toBe(1);
      expect(controller.findItemIndex(document.createElement("div"))).toBeNull();
    });

    it("supports virtual lists with arbitrary slice indices via sparse array", () => {
      const targetEl = document.createElement("div");
      const items: (HTMLElement | null)[] = [];

      // Simulate virtual list rendering slice from index 500 to 502
      const el500 = document.createElement("div");
      const el501 = document.createElement("div");
      const el502 = document.createElement("div");

      items[500] = el500;
      items[501] = el501;
      items[502] = el502;

      const controller = createNavigationController(
        () => targetEl,
        () => items,
      );

      expect(controller.getItemElement(500)).toBe(el500);
      expect(controller.getItemElement(501)).toBe(el501);
      expect(controller.getItemElement(499)).toBeNull();

      // Click delegation on virtual item 501
      const childSpan = document.createElement("span");
      el501.appendChild(childSpan);
      expect(controller.findItemIndex(childSpan)).toBe(501);

      // Unmount item 500 as it scrolls out of view
      items[500] = null;
      expect(controller.getItemElement(500)).toBeNull();
    });
  });
});
