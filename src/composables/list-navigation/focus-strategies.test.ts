import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  createFocusStrategyController,
  getItemTabindex,
  isDirectChildOfContainer,
} from "./focus-strategies";

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

  it("isolates nested submenus from parent menu query and event delegation", () => {
    // Structure:
    // <div role="menu" id="parent-menu">
    //   <div role="menuitem" id="p1">Parent 1</div>
    //   <div role="menuitem" id="p2">
    //     Parent 2
    //     <div role="menu" id="sub-menu">
    //       <div role="menuitem" id="s1">Sub 1</div>
    //       <div role="menuitem" id="s2">Sub 2</div>
    //     </div>
    //   </div>
    //   <div role="menuitem" id="p3">Parent 3</div>
    // </div>

    const parentMenu = document.createElement("div");
    parentMenu.setAttribute("role", "menu");

    const p1 = document.createElement("div");
    p1.setAttribute("role", "menuitem");
    p1.id = "p1";

    const p2 = document.createElement("div");
    p2.setAttribute("role", "menuitem");
    p2.id = "p2";

    const subMenu = document.createElement("div");
    subMenu.setAttribute("role", "menu");
    subMenu.id = "sub-menu";

    const s1 = document.createElement("div");
    s1.setAttribute("role", "menuitem");
    s1.id = "s1";

    const s2 = document.createElement("div");
    s2.setAttribute("role", "menuitem");
    s2.id = "s2";

    subMenu.appendChild(s1);
    subMenu.appendChild(s2);
    p2.appendChild(subMenu);

    const p3 = document.createElement("div");
    p3.setAttribute("role", "menuitem");
    p3.id = "p3";

    parentMenu.appendChild(p1);
    parentMenu.appendChild(p2);
    parentMenu.appendChild(p3);

    expect(isDirectChildOfContainer(p1, parentMenu)).toBe(true);
    expect(isDirectChildOfContainer(p2, parentMenu)).toBe(true);
    expect(isDirectChildOfContainer(p3, parentMenu)).toBe(true);
    expect(isDirectChildOfContainer(s1, parentMenu)).toBe(false);
    expect(isDirectChildOfContainer(s1, subMenu)).toBe(true);

    const parentController = createFocusStrategyController(() => parentMenu);
    const subController = createFocusStrategyController(() => subMenu);

    // Parent menu should only see p1, p2, p3
    expect(parentController.getItemElement(0)).toBe(p1);
    expect(parentController.getItemElement(1)).toBe(p2);
    expect(parentController.getItemElement(2)).toBe(p3);
    expect(parentController.getItemElement(3)).toBeNull();

    // Submenu should only see s1, s2
    expect(subController.getItemElement(0)).toBe(s1);
    expect(subController.getItemElement(1)).toBe(s2);
    expect(subController.getItemElement(2)).toBeNull();

    // Event targeting: click on s1 should match index 0 in subController, but return null in parentController
    expect(subController.findItemIndex(s1)).toBe(0);
    expect(parentController.findItemIndex(s1)).toBeNull();

    // Click on p3 should match index 2 in parentController
    expect(parentController.findItemIndex(p3)).toBe(2);
  });
});
