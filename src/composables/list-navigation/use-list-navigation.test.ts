import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useListNavigation } from "./use-list-navigation";

const trackedElements: HTMLElement[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }
  trackedElements.length = 0;
}

describe("useListNavigation", () => {
  let scope: ReturnType<typeof effectScope>;

  beforeEach(() => {
    scope = effectScope();
  });

  afterEach(() => {
    scope?.stop();
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("handles element array and default roving navigation controls", () => {
    scope.run(() => {
      const el0 = trackElement(document.createElement("li"));
      el0.textContent = "Apple";
      const el1 = trackElement(document.createElement("li"));
      el1.textContent = "Banana";
      const el2 = trackElement(document.createElement("li"));
      el2.textContent = "Cherry";

      const items = ref<HTMLElement[]>([el0, el1, el2]);
      const nav = useListNavigation(items);

      expect(nav.activeIndex.value).toBe(-1);
      expect(nav.activeEl.value).toBeNull();

      // Next moves to first item (index 0)
      nav.next();
      expect(nav.activeIndex.value).toBe(0);
      expect(nav.activeEl.value).toBe(el0);

      // Next moves to index 1
      nav.next();
      expect(nav.activeIndex.value).toBe(1);
      expect(nav.activeEl.value).toBe(el1);

      // Prev moves back to index 0
      nav.prev();
      expect(nav.activeIndex.value).toBe(0);
      expect(nav.activeEl.value).toBe(el0);

      // Last moves to index 2
      nav.last();
      expect(nav.activeIndex.value).toBe(2);
      expect(nav.activeEl.value).toBe(el2);

      // First moves to index 0
      nav.first();
      expect(nav.activeIndex.value).toBe(0);
      expect(nav.activeEl.value).toBe(el0);
    });
  });

  describe("roving focus strategy", () => {
    it("focuses active item element on active change", async () => {
      await scope.run(async () => {
        const targetEl = trackElement(document.createElement("ul"));
        document.body.appendChild(targetEl);

        const itemEl0 = trackElement(document.createElement("li"));
        const itemEl1 = trackElement(document.createElement("li"));
        const itemEl2 = trackElement(document.createElement("li"));

        targetEl.appendChild(itemEl0);
        targetEl.appendChild(itemEl1);
        targetEl.appendChild(itemEl2);

        const items = ref([itemEl0, itemEl1, itemEl2]);

        const nav = useListNavigation(items, {
          targetEl,
          strategy: "roving",
        });

        const focusSpy1 = vi.spyOn(itemEl1, "focus");

        nav.setActiveIndex(1);
        await nextTick();

        expect(focusSpy1).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("active descendant strategy", () => {
    it("manages aria-activedescendant and calls scrollIntoView", async () => {
      await scope.run(async () => {
        const targetEl = trackElement(document.createElement("div"));
        document.body.appendChild(targetEl);

        const itemEl0 = trackElement(document.createElement("li"));
        itemEl0.id = "city-cai";
        itemEl0.scrollIntoView = vi.fn();

        const itemEl1 = trackElement(document.createElement("li"));
        itemEl1.id = "city-ale";
        itemEl1.scrollIntoView = vi.fn();

        targetEl.appendChild(itemEl0);
        targetEl.appendChild(itemEl1);

        const items = ref([itemEl0, itemEl1]);

        const nav = useListNavigation(items, {
          targetEl,
          strategy: "activedescendant",
        });

        await nextTick();

        expect(targetEl.getAttribute("tabindex")).toBe("0");
        expect(targetEl.getAttribute("aria-orientation")).toBe("vertical");
        expect(targetEl.hasAttribute("aria-activedescendant")).toBe(false);

        nav.setActiveIndex(1);
        await nextTick();

        expect(targetEl.getAttribute("aria-activedescendant")).toBe("city-ale");
        expect(itemEl1.scrollIntoView).toHaveBeenCalledWith({
          block: "nearest",
          inline: "nearest",
        });
      });
    });
  });

  describe("item tabindex management", () => {
    it("applies roving tabindex to items and moves it with the active index", async () => {
      await scope.run(async () => {
        const itemEl0 = trackElement(document.createElement("li"));
        const itemEl1 = trackElement(document.createElement("li"));
        const itemEl2 = trackElement(document.createElement("li"));

        const nav = useListNavigation(ref([itemEl0, itemEl1, itemEl2]), {
          strategy: "roving",
        });

        await nextTick();

        // No active index yet: first item acts as the tab stop
        expect(itemEl0.getAttribute("tabindex")).toBe("0");
        expect(itemEl1.getAttribute("tabindex")).toBe("-1");
        expect(itemEl2.getAttribute("tabindex")).toBe("-1");

        nav.setActiveIndex(2);
        await nextTick();

        expect(itemEl0.getAttribute("tabindex")).toBe("-1");
        expect(itemEl1.getAttribute("tabindex")).toBe("-1");
        expect(itemEl2.getAttribute("tabindex")).toBe("0");
      });
    });

    it("keeps every item at tabindex=-1 for activedescendant strategy", async () => {
      await scope.run(async () => {
        const targetEl = trackElement(document.createElement("div"));
        const itemEl0 = trackElement(document.createElement("li"));
        const itemEl1 = trackElement(document.createElement("li"));

        useListNavigation(ref([itemEl0, itemEl1]), {
          targetEl,
          strategy: "activedescendant",
        });

        await nextTick();

        expect(itemEl0.getAttribute("tabindex")).toBe("-1");
        expect(itemEl1.getAttribute("tabindex")).toBe("-1");
        // Focus stays on the target, which receives the tab stop
        expect(targetEl.getAttribute("tabindex")).toBe("0");
      });
    });

    it("restores original item tabindex values on cleanup", async () => {
      const itemEl0 = trackElement(document.createElement("li"));
      const itemEl1 = trackElement(document.createElement("li"));
      itemEl1.tabIndex = 3;

      const localScope = effectScope();
      localScope.run(() => {
        useListNavigation(ref([itemEl0, itemEl1]));
      });

      await nextTick();
      expect(itemEl0.getAttribute("tabindex")).toBe("0");
      expect(itemEl1.getAttribute("tabindex")).toBe("-1");

      localScope.stop();

      // Attributes the composable introduced are removed; user-authored ones are reinstated
      expect(itemEl0.hasAttribute("tabindex")).toBe(false);
      expect(itemEl1.getAttribute("tabindex")).toBe("3");
    });

    it("leaves item tabindex untouched when disabled", async () => {
      await scope.run(async () => {
        const itemEl0 = trackElement(document.createElement("li"));
        const itemEl1 = trackElement(document.createElement("li"));

        useListNavigation(ref([itemEl0, itemEl1]), { enabled: false });

        await nextTick();

        expect(itemEl0.hasAttribute("tabindex")).toBe(false);
        expect(itemEl1.hasAttribute("tabindex")).toBe(false);
      });
    });

    it("rolls back managed tabindex when disabled and reapplies when re-enabled", async () => {
      await scope.run(async () => {
        const itemEl0 = trackElement(document.createElement("li"));
        const itemEl1 = trackElement(document.createElement("li"));
        const isEnabled = ref(true);

        useListNavigation(ref([itemEl0, itemEl1]), { enabled: isEnabled });

        await nextTick();
        expect(itemEl0.getAttribute("tabindex")).toBe("0");
        expect(itemEl1.getAttribute("tabindex")).toBe("-1");

        isEnabled.value = false;
        await nextTick();
        expect(itemEl0.hasAttribute("tabindex")).toBe(false);
        expect(itemEl1.hasAttribute("tabindex")).toBe(false);

        isEnabled.value = true;
        await nextTick();
        expect(itemEl0.getAttribute("tabindex")).toBe("0");
        expect(itemEl1.getAttribute("tabindex")).toBe("-1");
      });
    });

    it("skips sparse entries in virtualized item arrays", async () => {
      await scope.run(async () => {
        const itemEl500 = trackElement(document.createElement("div"));
        const itemEl501 = trackElement(document.createElement("div"));

        const items: (HTMLElement | null)[] = [];
        items[500] = itemEl500;
        items[501] = itemEl501;

        useListNavigation(ref(items));

        await nextTick();

        expect(itemEl500.getAttribute("tabindex")).toBe("-1");
        expect(itemEl501.getAttribute("tabindex")).toBe("-1");
      });
    });
  });

  describe("keyboard navigation", () => {
    it("navigates with ArrowDown and ArrowUp in vertical orientation", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2]);
        const nav = useListNavigation(items, {
          targetEl,
          orientation: "vertical",
        });

        // ArrowDown -> index 0
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        expect(nav.activeIndex.value).toBe(0);

        // ArrowDown -> index 1
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        expect(nav.activeIndex.value).toBe(1);

        // ArrowUp -> index 0
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("navigates with ArrowRight and ArrowLeft in horizontal orientation", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2]);
        const nav = useListNavigation(items, {
          targetEl,
          orientation: "horizontal",
        });

        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(nav.activeIndex.value).toBe(0);

        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(nav.activeIndex.value).toBe(1);

        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("inverts horizontal arrow navigation in RTL", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2]);
        const nav = useListNavigation(items, {
          targetEl,
          orientation: "horizontal",
          rtl: true,
        });

        // In RTL, ArrowLeft moves forward ("next")
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(nav.activeIndex.value).toBe(0);

        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(nav.activeIndex.value).toBe(1);

        // In RTL, ArrowRight moves backward ("previous")
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("respects boundary and loop options", () => {
      scope.run(() => {
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        const items = ref([li0, li1, li2]);

        const navNoLoop = useListNavigation(items, { loop: false });

        navNoLoop.setActiveIndex(2);
        navNoLoop.next();
        expect(navNoLoop.activeIndex.value).toBe(2); // no wrap

        navNoLoop.setActiveIndex(0);
        navNoLoop.prev();
        expect(navNoLoop.activeIndex.value).toBe(0); // no wrap

        const navLoop = useListNavigation(items, { loop: true });
        navLoop.setActiveIndex(2);
        navLoop.next();
        expect(navLoop.activeIndex.value).toBe(0); // wrapped to start

        navLoop.prev();
        expect(navLoop.activeIndex.value).toBe(2); // wrapped to end
      });
    });

    it("skips disabled items via DOM attributes (disabled or aria-disabled)", () => {
      scope.run(() => {
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        li1.setAttribute("aria-disabled", "true");
        const li2 = trackElement(document.createElement("li"));

        const items = ref([li0, li1, li2]);
        const nav = useListNavigation(items);

        nav.first();
        expect(nav.activeIndex.value).toBe(0);

        nav.next(); // Skips disabled item 1 -> index 2
        expect(nav.activeIndex.value).toBe(2);

        nav.prev(); // Skips disabled item 1 -> index 0
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("handles Home and End keys", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        li0.setAttribute("disabled", "");
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        const li3 = trackElement(document.createElement("li"));
        li3.setAttribute("aria-disabled", "true");

        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        targetEl.appendChild(li3);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2, li3]);
        const nav = useListNavigation(items, { targetEl });

        // Home jumps to first enabled item (index 1)
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
        expect(nav.activeIndex.value).toBe(1);

        // End jumps to last enabled item (index 2)
        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
        expect(nav.activeIndex.value).toBe(2);
      });
    });
  });

  describe("selection and event delegation", () => {
    it("triggers onSelect on Enter and Space key", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2]);
        const onSelect = vi.fn();
        const nav = useListNavigation(items, { targetEl, onSelect });

        nav.setActiveIndex(1);

        const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
        targetEl.dispatchEvent(enterEvent);
        expect(onSelect).toHaveBeenCalledWith(1, li1, enterEvent);

        const spaceEvent = new KeyboardEvent("keydown", { key: " " });
        targetEl.dispatchEvent(spaceEvent);
        expect(onSelect).toHaveBeenCalledWith(1, li1, spaceEvent);
      });
    });

    it("delegates click events from list item elements", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2]);
        const onSelect = vi.fn();
        const nav = useListNavigation(items, {
          targetEl,
          onSelect,
        });

        li2.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(nav.activeIndex.value).toBe(2);
        expect(onSelect).toHaveBeenCalledWith(2, li2, expect.any(MouseEvent));
      });
    });

    it("does not trigger onSelect when clicking a disabled item", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        li0.setAttribute("aria-disabled", "true");
        targetEl.appendChild(li0);
        document.body.appendChild(targetEl);

        const items = ref([li0]);
        const onSelect = vi.fn();
        const nav = useListNavigation(items, {
          targetEl,
          onSelect,
        });

        li0.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(nav.activeIndex.value).toBe(-1);
        expect(onSelect).not.toHaveBeenCalled();
      });
    });

    it("supports virtual list delegation and navigation via sparse array", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("div"));
        document.body.appendChild(targetEl);

        // Virtualizer renders slice [500, 501, 502]
        const v500 = trackElement(document.createElement("div"));
        const v501 = trackElement(document.createElement("div"));
        targetEl.appendChild(v500);
        targetEl.appendChild(v501);

        const items = ref<(HTMLElement | null)[]>([]);
        items.value[500] = v500;
        items.value[501] = v501;

        const onSelect = vi.fn();
        const nav = useListNavigation(items, { targetEl, onSelect });

        // Click on virtual item 501
        v501.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(nav.activeIndex.value).toBe(501);
        expect(onSelect).toHaveBeenCalledWith(501, v501, expect.any(MouseEvent));
      });
    });

    it("supports selectOnFocus mode", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1]);
        const onSelect = vi.fn();
        const nav = useListNavigation(items, {
          targetEl,
          selectOnFocus: true,
          onSelect,
        });

        const keyEvent = new KeyboardEvent("keydown", { key: "ArrowDown" });
        targetEl.dispatchEvent(keyEvent);

        expect(nav.activeIndex.value).toBe(0);
        expect(onSelect).toHaveBeenCalledWith(0, li0, expect.any(Event));
      });
    });
  });

  describe("pointer move / hover delegation", () => {
    it("updates activeIndex on pointer move delegation when focusOnHover is true", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1]);
        const nav = useListNavigation(items, {
          targetEl,
          focusOnHover: true,
        });

        li1.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
        expect(nav.activeIndex.value).toBe(1);
      });
    });

    it("does not update activeIndex on pointer move delegation when focusOnHover is false", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1]);
        const nav = useListNavigation(items, {
          targetEl,
          focusOnHover: false,
        });

        li1.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
        expect(nav.activeIndex.value).toBe(-1);
      });
    });
  });

  describe("typeahead integration", () => {
    it("matches item labels automatically from textContent and aria-label", () => {
      scope.run(() => {
        const targetEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        li0.textContent = "Apple";
        const li1 = trackElement(document.createElement("li"));
        li1.textContent = "Banana";
        const li2 = trackElement(document.createElement("li"));
        li2.setAttribute("aria-label", "Cherry");

        targetEl.appendChild(li0);
        targetEl.appendChild(li1);
        targetEl.appendChild(li2);
        document.body.appendChild(targetEl);

        const items = ref([li0, li1, li2]);
        const nav = useListNavigation(items, { targetEl });

        targetEl.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
        expect(nav.activeIndex.value).toBe(2); // Cherry
      });
    });
  });

  describe("dynamic updates and custom accessors", () => {
    it("adjusts activeIndex when items list shrinks", async () => {
      await scope.run(async () => {
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        const li3 = trackElement(document.createElement("li"));

        const items = ref([li0, li1, li2, li3]);
        const nav = useListNavigation(items);

        nav.setActiveIndex(3);
        expect(nav.activeIndex.value).toBe(3);

        items.value = [li0, li1];
        await nextTick();

        expect(nav.activeIndex.value).toBe(1);
      });
    });

    it("supports custom item accessors", () => {
      scope.run(() => {
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));

        const items = ref([li0, li1, li2]);
        const nav = useListNavigation(items, {
          getItemId: (_itemEl, index) => `country-id-${index}`,
          getItemLabel: (_itemEl, index) => ["United States", "Canada", "Mexico"][index],
          isItemDisabled: (_itemEl, index) => index === 1,
        });

        nav.first();
        expect(nav.activeIndex.value).toBe(0);

        nav.next(); // skips Canada (index 1) -> moves to Mexico (index 2)
        expect(nav.activeIndex.value).toBe(2);
      });
    });
  });
});
