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

  it("handles string arrays and default roving strategy", () => {
    scope.run(() => {
      const items = ref(["Apple", "Banana", "Cherry"]);
      const nav = useListNavigation(items);

      expect(nav.activeIndex.value).toBe(-1);
      expect(nav.activeItem.value).toBeUndefined();

      // Next moves to first item (index 0)
      nav.next();
      expect(nav.activeIndex.value).toBe(0);
      expect(nav.activeItem.value).toBe("Apple");

      // Next moves to index 1
      nav.next();
      expect(nav.activeIndex.value).toBe(1);
      expect(nav.activeItem.value).toBe("Banana");

      // Prev moves back to index 0
      nav.prev();
      expect(nav.activeIndex.value).toBe(0);

      // Last moves to index 2
      nav.last();
      expect(nav.activeIndex.value).toBe(2);
      expect(nav.activeItem.value).toBe("Cherry");

      // First moves to index 0
      nav.first();
      expect(nav.activeIndex.value).toBe(0);
    });
  });

  describe("roving focus strategy", () => {
    it("focuses active item element on active change", async () => {
      await scope.run(async () => {
        const items = ref([
          { id: "opt-1", label: "One" },
          { id: "opt-2", label: "Two" },
          { id: "opt-3", label: "Three" },
        ]);

        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          strategy: "roving",
        });

        const itemEl0 = trackElement(document.createElement("li"));
        const itemEl1 = trackElement(document.createElement("li"));
        const itemEl2 = trackElement(document.createElement("li"));

        containerEl.appendChild(itemEl0);
        containerEl.appendChild(itemEl1);
        containerEl.appendChild(itemEl2);

        const focusSpy1 = vi.spyOn(itemEl1, "focus");

        nav.registerItemElement(itemEl0, 0);
        nav.registerItemElement(itemEl1, 1);
        nav.registerItemElement(itemEl2, 2);

        nav.setActiveIndex(1);
        await nextTick();

        expect(focusSpy1).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("active descendant strategy", () => {
    it("manages aria-activedescendant and calls scrollIntoView", async () => {
      await scope.run(async () => {
        const items = ref([
          { id: "city-cai", label: "Cairo" },
          { id: "city-ale", label: "Alexandria" },
        ]);

        const containerEl = trackElement(document.createElement("div"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          strategy: "activedescendant",
        });

        const itemEl0 = trackElement(document.createElement("li"));
        itemEl0.id = "city-cai";
        itemEl0.scrollIntoView = vi.fn();

        const itemEl1 = trackElement(document.createElement("li"));
        itemEl1.id = "city-ale";
        itemEl1.scrollIntoView = vi.fn();

        containerEl.appendChild(itemEl0);
        containerEl.appendChild(itemEl1);

        nav.registerItemElement(itemEl0, 0);
        nav.registerItemElement(itemEl1, 1);

        await nextTick();

        expect(containerEl.getAttribute("tabindex")).toBe("0");
        expect(containerEl.getAttribute("aria-orientation")).toBe("vertical");
        expect(containerEl.hasAttribute("aria-activedescendant")).toBe(false);

        nav.setActiveIndex(1);
        await nextTick();

        expect(containerEl.getAttribute("aria-activedescendant")).toBe("city-ale");
        expect(itemEl1.scrollIntoView).toHaveBeenCalledWith({
          block: "nearest",
          inline: "nearest",
        });
      });
    });
  });

  describe("keyboard navigation", () => {
    it("navigates with ArrowDown and ArrowUp in vertical orientation", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          orientation: "vertical",
        });

        // ArrowDown -> index 0
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        expect(nav.activeIndex.value).toBe(0);

        // ArrowDown -> index 1
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        expect(nav.activeIndex.value).toBe(1);

        // ArrowUp -> index 0
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("navigates with ArrowRight and ArrowLeft in horizontal orientation", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          orientation: "horizontal",
        });

        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(nav.activeIndex.value).toBe(0);

        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(nav.activeIndex.value).toBe(1);

        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("inverts horizontal arrow navigation in RTL", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          orientation: "horizontal",
          rtl: true,
        });

        // In RTL, ArrowLeft moves forward ("next")
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(nav.activeIndex.value).toBe(0);

        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
        expect(nav.activeIndex.value).toBe(1);

        // In RTL, ArrowRight moves backward ("previous")
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
        expect(nav.activeIndex.value).toBe(0);
      });
    });

    it("respects boundary and loop options", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
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

    it("skips disabled items during navigation", () => {
      scope.run(() => {
        const items = ref([
          { id: "1", label: "A" },
          { id: "2", label: "B", disabled: true },
          { id: "3", label: "C" },
        ]);

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
        const items = ref([
          { id: "1", label: "A", disabled: true },
          { id: "2", label: "B" },
          { id: "3", label: "C" },
          { id: "4", label: "D", disabled: true },
        ]);

        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, { containerEl });

        // Home jumps to first enabled item (index 1)
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
        expect(nav.activeIndex.value).toBe(1);

        // End jumps to last enabled item (index 2)
        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
        expect(nav.activeIndex.value).toBe(2);
      });
    });
  });

  describe("selection and event delegation", () => {
    it("triggers onSelect on Enter and Space key", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const onSelect = vi.fn();
        const nav = useListNavigation(items, { containerEl, onSelect });

        nav.setActiveIndex(1);

        const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
        containerEl.dispatchEvent(enterEvent);
        expect(onSelect).toHaveBeenCalledWith("B", 1, enterEvent);

        const spaceEvent = new KeyboardEvent("keydown", { key: " " });
        containerEl.dispatchEvent(spaceEvent);
        expect(onSelect).toHaveBeenCalledWith("B", 1, spaceEvent);
      });
    });

    it("delegates click events from list item elements", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        const li2 = trackElement(document.createElement("li"));
        containerEl.appendChild(li0);
        containerEl.appendChild(li1);
        containerEl.appendChild(li2);
        document.body.appendChild(containerEl);

        const onSelect = vi.fn();
        const nav = useListNavigation(items, { containerEl, onSelect });

        li2.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(nav.activeIndex.value).toBe(2);
        expect(onSelect).toHaveBeenCalledWith("C", 2, expect.any(MouseEvent));
      });
    });

    it("does not trigger onSelect when clicking a disabled item", () => {
      scope.run(() => {
        const items = ref([{ id: "1", label: "A", disabled: true }]);
        const containerEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        containerEl.appendChild(li0);
        document.body.appendChild(containerEl);

        const onSelect = vi.fn();
        const nav = useListNavigation(items, { containerEl, onSelect });

        li0.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(nav.activeIndex.value).toBe(-1);
        expect(onSelect).not.toHaveBeenCalled();
      });
    });

    it("supports selectOnFocus mode", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const onSelect = vi.fn();
        const nav = useListNavigation(items, {
          containerEl,
          selectOnFocus: true,
          onSelect,
        });

        const keyEvent = new KeyboardEvent("keydown", { key: "ArrowDown" });
        containerEl.dispatchEvent(keyEvent);

        expect(nav.activeIndex.value).toBe(0);
        expect(onSelect).toHaveBeenCalledWith("A", 0, expect.any(Event));
      });
    });
  });

  describe("pointer move / hover delegation", () => {
    it("updates activeIndex on pointer move delegation when focusOnHover is true", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        containerEl.appendChild(li0);
        containerEl.appendChild(li1);
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          focusOnHover: true,
        });

        li1.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
        expect(nav.activeIndex.value).toBe(1);
      });
    });

    it("does not update activeIndex on pointer move delegation when focusOnHover is false", () => {
      scope.run(() => {
        const items = ref(["A", "B", "C"]);
        const containerEl = trackElement(document.createElement("ul"));
        const li0 = trackElement(document.createElement("li"));
        const li1 = trackElement(document.createElement("li"));
        containerEl.appendChild(li0);
        containerEl.appendChild(li1);
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, {
          containerEl,
          focusOnHover: false,
        });

        li1.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
        expect(nav.activeIndex.value).toBe(-1);
      });
    });
  });

  describe("typeahead integration", () => {
    it("matches item labels via typeahead keystrokes", () => {
      scope.run(() => {
        const items = ref(["Apple", "Banana", "Cherry"]);
        const containerEl = trackElement(document.createElement("ul"));
        document.body.appendChild(containerEl);

        const nav = useListNavigation(items, { containerEl });

        containerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
        expect(nav.activeIndex.value).toBe(2); // Cherry
      });
    });
  });

  describe("dynamic updates and lifecycle", () => {
    it("adjusts activeIndex when items list shrinks", async () => {
      await scope.run(async () => {
        const items = ref(["A", "B", "C", "D"]);
        const nav = useListNavigation(items);

        nav.setActiveIndex(3);
        expect(nav.activeIndex.value).toBe(3);

        items.value = ["A", "B"];
        await nextTick();

        expect(nav.activeIndex.value).toBe(1);
      });
    });

    it("supports custom item accessors and hybrid resolution", () => {
      scope.run(() => {
        interface CustomItem {
          code: string;
          name: string;
          isUnavailable?: boolean;
        }

        const items = ref<CustomItem[]>([
          { code: "US", name: "United States" },
          { code: "CA", name: "Canada", isUnavailable: true },
          { code: "MX", name: "Mexico" },
        ]);

        const nav = useListNavigation(items, {
          getItemId: (item) => `country-${item.code}`,
          getItemLabel: (item) => item.name,
          isItemDisabled: (item) => Boolean(item.isUnavailable),
        });

        nav.first();
        expect(nav.activeIndex.value).toBe(0);

        nav.next(); // skips CA (index 1) -> moves to MX (index 2)
        expect(nav.activeIndex.value).toBe(2);
      });
    });
  });
});
