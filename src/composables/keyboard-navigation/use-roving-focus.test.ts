import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, ref, useTemplateRef } from "vue";
import {
  findNextNavigableIndex,
  isElementDisabled,
  resolveCollectionSize,
  resolveInitialNavigableIndex,
  resolveNavigableIndexByIntent,
  type UseRovingFocusOptions,
  type UseRovingFocusReturn,
  useRovingFocus,
} from "./use-roving-focus";

describe("useRovingFocus", () => {
  interface FixtureConfig {
    itemCount?: number;
    disabledIndices?: number[];
    ariaDisabledIndices?: number[];
    dir?: string;
    tabindex?: number | ((idx: number) => number | undefined);
    unmanaged?: boolean;
  }

  const createTestComponent = (
    options: Partial<UseRovingFocusOptions> = {},
    config: FixtureConfig = {},
  ) => {
    let rovingReturn!: UseRovingFocusReturn;

    const Component = defineComponent(() => {
      const containerEl = useTemplateRef<HTMLDivElement>("container");
      const elements = ref<(HTMLElement | null)[]>([]);

      rovingReturn = useRovingFocus({
        containerEl,
        elements,
        ...options,
      });

      const register = (el: Element | null, idx: number) => {
        elements.value[idx] = el as HTMLElement;
      };

      const count = config.itemCount ?? 5;
      const disabledSet = new Set(config.disabledIndices ?? []);
      const ariaDisabledSet = new Set(config.ariaDisabledIndices ?? []);

      const resolveItemTabindex = (idx: number) => {
        if (config.unmanaged) return undefined;
        if (typeof config.tabindex === "function") return config.tabindex(idx);
        if (config.tabindex !== undefined) return config.tabindex;
        if (options.autoTabindex === false) return undefined;
        return rovingReturn.activeIndex.value === idx ? 0 : -1;
      };

      return () =>
        h("div", { class: "test-wrapper" }, [
          h("button", { id: "before-btn" }, "Before Widget"),
          h(
            "div",
            {
              ref: "container",
              dir: config.dir,
            },
            Array.from({ length: count }).map((_, idx) =>
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => register(el as Element, idx),
                  tabindex: resolveItemTabindex(idx),
                  disabled: disabledSet.has(idx) ? true : undefined,
                  "aria-disabled": ariaDisabledSet.has(idx) ? "true" : undefined,
                },
                "option " + (idx + 1),
              ),
            ),
          ),
          h("button", { id: "after-btn" }, "After Widget"),
        ]);
    });

    return { Component, getRoving: () => rovingReturn };
  };

  describe("sequential tab order & focus entry (WCAG single tab stop)", () => {
    it("enters the composite widget on the first enabled item when tabbing in", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      // Tab moves focus into the widget on the default active item
      await userEvent.tab();
      await expect.element(option1).toHaveFocus();
    });

    it("enters on defaultActiveIndex when tabbing into the widget", async () => {
      const { Component } = createTestComponent({ defaultActiveIndex: 2 });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("skips disabled item and tabs into the first enabled item", async () => {
      const { Component } = createTestComponent(
        { defaultActiveIndex: 0 },
        { disabledIndices: [0] },
      );
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option2).toHaveFocus();
    });

    it("acts as a single tab stop and preserves focus position when tabbing out and back in", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      // 1. Enter widget and navigate to option 3 with arrow keys
      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option3).toHaveFocus();

      // 2. Tab exits widget entirely into the next page element (single tab stop)
      await userEvent.tab();
      await expect.element(afterBtn).toHaveFocus();

      // 3. Shift+Tab returns to the widget and restores focus on the last active item (option 3)
      await userEvent.tab({ shift: true });
      await expect.element(option3).toHaveFocus();
    });
  });

  describe("vertical keyboard navigation", () => {
    it("navigates to next/previous item on ArrowDown/ArrowUp", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option2).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option3).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option2).toHaveFocus();
    });

    it("jumps to first item on Home and last item on End", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{End}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{Home}");
      await expect.element(option1).toHaveFocus();
    });

    it("stops at boundaries when loop is false", async () => {
      const { Component } = createTestComponent({ loop: false });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{End}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option5).toHaveFocus();
    });

    it("wraps around boundaries when loop is true", async () => {
      const { Component } = createTestComponent({ loop: true });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).toHaveFocus();
    });

    it("skips disabled and aria-disabled items during navigation", async () => {
      const { Component } = createTestComponent(
        {},
        { disabledIndices: [1], ariaDisabledIndices: [2] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option1).toHaveFocus();
    });

    it("respects custom isElementDisabled predicate", async () => {
      const { Component } = createTestComponent({
        isElementDisabled: (_, idx) => idx === 1,
      });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option3).toHaveFocus();
    });
  });

  describe("horizontal & RTL navigation", () => {
    it("navigates on ArrowRight and ArrowLeft in horizontal orientation", async () => {
      const { Component } = createTestComponent({ orientation: "horizontal" });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowRight}");
      await expect.element(option2).toHaveFocus();

      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option1).toHaveFocus();
    });

    it("inverts horizontal arrow directions in RTL mode", async () => {
      const { Component } = createTestComponent({ orientation: "horizontal" }, { dir: "rtl" });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      // In RTL, ArrowLeft moves forward (next) and ArrowRight moves backward (prev)
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option2).toHaveFocus();

      await userEvent.keyboard("{ArrowRight}");
      await expect.element(option1).toHaveFocus();
    });
  });

  describe("both orientation (radio group pattern)", () => {
    it("navigates with all four arrow keys when orientation is both", async () => {
      const { Component } = createTestComponent({ orientation: "both" });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);

      // ArrowDown -> next
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option2).toHaveFocus();

      // ArrowRight -> next
      await userEvent.keyboard("{ArrowRight}");
      await expect.element(option3).toHaveFocus();

      // ArrowUp -> previous
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option2).toHaveFocus();

      // ArrowLeft -> previous
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option1).toHaveFocus();
    });

    it("respects RTL inversion for horizontal keys in both orientation", async () => {
      const { Component } = createTestComponent({ orientation: "both" }, { dir: "rtl" });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);

      // In RTL with orientation "both", ArrowLeft moves forward (next)
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option2).toHaveFocus();

      // ArrowRight moves backward (prev)
      await userEvent.keyboard("{ArrowRight}");
      await expect.element(option1).toHaveFocus();
    });
  });

  describe("onSelect callback", () => {
    it("fires onSelect when Enter or Space is pressed on active item", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ onSelect: onSelectMock });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));

      await userEvent.keyboard("{Space}");
      expect(onSelectMock).toHaveBeenCalledTimes(2);
      expect(onSelectMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
    });
  });

  describe("controlled activeIndex state & onActiveIndexChange", () => {
    it("fires onActiveIndexChange in uncontrolled mode when navigation occurs", async () => {
      const onActiveIndexChangeMock = vi.fn();
      const { Component } = createTestComponent({
        onActiveIndexChange: onActiveIndexChangeMock,
      });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(onActiveIndexChangeMock).toHaveBeenCalledWith(1);

      await userEvent.keyboard("{ArrowDown}");
      expect(onActiveIndexChangeMock).toHaveBeenCalledWith(2);
    });

    it("moves focus to the target item when activeIndex ref changes externally", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex: controlledIndex });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      controlledIndex.value = 2;
      await expect.element(option3).toHaveFocus();
    });

    it("fires onActiveIndexChange and updates controlled state when handled by consumer", async () => {
      const controlledIndex = ref(0);
      const onActiveIndexChangeMock = vi.fn((nextIdx: number) => {
        controlledIndex.value = nextIdx;
      });
      const { Component } = createTestComponent({
        activeIndex: controlledIndex,
        onActiveIndexChange: onActiveIndexChangeMock,
      });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(onActiveIndexChangeMock).toHaveBeenCalledWith(1);
      expect(controlledIndex.value).toBe(1);
      await expect.element(option2).toHaveFocus();
    });

    it("reverts external activeIndex change if the target index is disabled", async () => {
      const controlledIndex = ref(0);
      const onActiveIndexChangeMock = vi.fn((nextIdx: number) => {
        controlledIndex.value = nextIdx;
      });
      const { Component } = createTestComponent(
        {
          activeIndex: controlledIndex,
          onActiveIndexChange: onActiveIndexChangeMock,
        },
        { disabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      controlledIndex.value = 1;
      // Should revert back to 0 via onActiveIndexChange
      expect(controlledIndex.value).toBe(0);
      await expect.element(option1).toHaveFocus();
    });
  });

  describe("focusOnHover option", () => {
    it("moves focus to hovered item when focusOnHover is true", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.hover(option3);
      await expect.element(option3).toHaveFocus();
    });

    it("does not move focus on hover when focusOnHover is false by default", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await userEvent.hover(option3);

      await expect.element(option1).toHaveFocus();
      await expect.element(option3).not.toHaveFocus();
    });

    it("skips disabled items when hovered", async () => {
      const { Component } = createTestComponent({ focusOnHover: true }, { disabledIndices: [1] });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await userEvent.hover(option2);

      await expect.element(option1).toHaveFocus();
    });

    it("ignores touch pointer events", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);

      option3.element().dispatchEvent(
        new PointerEvent("pointermove", {
          pointerType: "touch",
          bubbles: true,
        }),
      );

      await expect.element(option1).toHaveFocus();
    });
  });

  describe("programmatic navigation methods", () => {
    it("supports next, prev, first, last, and setActiveIndex methods", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);

      getRoving().next();
      await expect.element(option2).toHaveFocus();

      getRoving().last();
      await expect.element(option5).toHaveFocus();

      getRoving().prev();
      await expect.element(option4).toHaveFocus();

      getRoving().first();
      await expect.element(option1).toHaveFocus();

      getRoving().setActiveIndex(2);
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveFocus();
    });
  });

  describe("disabled state & modifier key ignoring", () => {
    it("does not navigate when enabled is false", async () => {
      const { Component } = createTestComponent({ enabled: false });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).toHaveFocus();
    });

    it("ignores key combinations with ctrl, alt, or meta keys", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
      await expect.element(option1).toHaveFocus();
    });

    it("handles all options disabled safely", async () => {
      const { Component } = createTestComponent({}, { itemCount: 3, disabledIndices: [0, 1, 2] });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).not.toHaveFocus();
    });
  });

  describe("dynamic item updates", () => {
    it("supports dynamically appending new items to the list and navigating to them", async () => {
      const count = ref(3);

      const DynamicComponent = defineComponent(() => {
        const containerEl = useTemplateRef<HTMLDivElement>("container");
        const elements = ref<(HTMLElement | null)[]>([]);

        useRovingFocus({ containerEl, elements });

        const register = (el: Element | null, idx: number) => {
          elements.value[idx] = el as HTMLElement;
        };

        return () =>
          h(
            "div",
            { ref: "container" },
            Array.from({ length: count.value }).map((_, idx) =>
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => register(el as Element, idx),
                },
                "option " + (idx + 1),
              ),
            ),
          );
      });

      render(DynamicComponent);
      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      count.value++;
      const option4 = page.getByRole("option", { name: "option 4" });
      await expect.element(option4).toBeInTheDocument();

      await userEvent.keyboard("{End}");
      await expect.element(option4).toHaveFocus();
    });
  });

  describe("autoTabindex option & unmanaged tabindex", () => {
    it("automatically manages roving tabindex when autoTabindex is true (default)", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      expect((option1.element() as HTMLElement).tabIndex).toBe(0);
      expect((option2.element() as HTMLElement).tabIndex).toBe(-1);

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");

      await expect.element(option2).toHaveFocus();
      expect((option1.element() as HTMLElement).tabIndex).toBe(-1);
      expect((option2.element() as HTMLElement).tabIndex).toBe(0);
    });

    it("does not mutate element tabIndex when autoTabindex is false", async () => {
      const { Component, getRoving } = createTestComponent(
        { autoTabindex: false },
        { tabindex: -1 },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      // In unmanaged mode with static tabindex="-1", elements retain tabindex="-1"
      expect((option1.element() as HTMLElement).tabIndex).toBe(-1);
      expect((option2.element() as HTMLElement).tabIndex).toBe(-1);

      // Navigating moves focus without mutating el.tabIndex
      getRoving().next();
      await expect.element(option2).toHaveFocus();
      expect((option1.element() as HTMLElement).tabIndex).toBe(-1);
      expect((option2.element() as HTMLElement).tabIndex).toBe(-1);
    });
  });

  describe("virtual list support", () => {
    it("tracks virtualElement on navigation in virtual mode", async () => {
      const virtualElement = ref<HTMLElement | null>(null);

      const { Component } = createTestComponent({
        virtual: true,
        virtualElement,
        elementCount: 100,
      });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(virtualElement.value).not.toBeNull();
    });
  });

  describe("allowDisabledFocus option (WAI-ARIA APG discoverability)", () => {
    it("enters on defaultActiveIndex even if disabled when allowDisabledFocus is true", async () => {
      const { Component } = createTestComponent(
        { defaultActiveIndex: 0, allowDisabledFocus: true },
        { ariaDisabledIndices: [0] },
      );
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option1).toHaveFocus();
    });

    it("navigates through disabled and aria-disabled items when allowDisabledFocus is true", async () => {
      const { Component } = createTestComponent(
        { allowDisabledFocus: true },
        { ariaDisabledIndices: [1, 2] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      // Moves to aria-disabled item 2
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option2).toHaveFocus();

      // Moves to aria-disabled item 3
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option3).toHaveFocus();

      // Moves to enabled item 4
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();

      // Moves back up to aria-disabled item 3
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option3).toHaveFocus();
    });

    it("does not trigger onSelect when Enter or Space is pressed on a focused disabled item", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        { allowDisabledFocus: true, onSelect: onSelectMock },
        { ariaDisabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option2).toHaveFocus();

      // Enter on disabled item must not invoke onSelect
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).not.toHaveBeenCalled();

      // Space on disabled item must not invoke onSelect
      await userEvent.keyboard("{Space}");
      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it("triggers onSelect on enabled items when allowDisabledFocus is true", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        { allowDisabledFocus: true, onSelect: onSelectMock },
        { ariaDisabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
    });

    it("focuses disabled items on hover when focusOnHover and allowDisabledFocus are both true", async () => {
      const { Component } = createTestComponent(
        { focusOnHover: true, allowDisabledFocus: true },
        { ariaDisabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.hover(option2);
      await expect.element(option2).toHaveFocus();
    });

    it("supports programmatic navigation to disabled items when allowDisabledFocus is true", async () => {
      const { Component, getRoving } = createTestComponent(
        { allowDisabledFocus: true },
        { ariaDisabledIndices: [1, 4] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);

      getRoving().next();
      await expect.element(option2).toHaveFocus();

      getRoving().last();
      await expect.element(option5).toHaveFocus();

      getRoving().setActiveIndex(1);
      await expect.element(option2).toHaveFocus();
    });

    it("allows external activeIndex updates to target disabled items when allowDisabledFocus is true", async () => {
      const controlledIndex = ref(0);
      const onActiveIndexChangeMock = vi.fn((nextIdx: number) => {
        controlledIndex.value = nextIdx;
      });
      const { Component } = createTestComponent(
        {
          activeIndex: controlledIndex,
          onActiveIndexChange: onActiveIndexChangeMock,
          allowDisabledFocus: true,
        },
        { ariaDisabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option1);

      controlledIndex.value = 1;
      expect(controlledIndex.value).toBe(1);
      await expect.element(option2).toHaveFocus();
    });

    it("reactively auto-corrects activeIndex away from a disabled item when allowDisabledFocus changes to false", async () => {
      const allowDisabledFocusRef = ref(true);
      const { Component, getRoving } = createTestComponent(
        { allowDisabledFocus: allowDisabledFocusRef },
        { ariaDisabledIndices: [0] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option2);
      await expect.element(option2).toHaveFocus();

      getRoving().setActiveIndex(0);
      await expect.element(option1).toHaveFocus();

      allowDisabledFocusRef.value = false;
      await expect.element(option2).toHaveFocus();
    });
  });

  describe("pure idempotent helper functions", () => {
    describe("resolveCollectionSize", () => {
      it("returns list length for non-virtual lists", () => {
        expect(resolveCollectionSize(5)).toBe(5);
        expect(resolveCollectionSize(0)).toBe(0);
        expect(resolveCollectionSize(10, 50, false)).toBe(10);
      });

      it("returns explicit elementCount when virtual is true", () => {
        expect(resolveCollectionSize(5, 100, true)).toBe(100);
        expect(resolveCollectionSize(0, 0, true)).toBe(0);
        expect(resolveCollectionSize(5, null, true)).toBe(5);
      });
    });

    describe("isElementDisabled", () => {
      it("prioritizes customPredicate when supplied", () => {
        const customPredicate = (_el: HTMLElement | null, idx: number) => idx === 2;
        expect(isElementDisabled(null, 2, false, customPredicate)).toBe(true);
        expect(isElementDisabled(null, 1, false, customPredicate)).toBe(true);
      });

      it("identifies disabled and aria-disabled DOM attributes", () => {
        const btn = document.createElement("button");
        expect(isElementDisabled(btn, 0)).toBe(false);

        btn.setAttribute("disabled", "");
        expect(isElementDisabled(btn, 0)).toBe(true);

        const div = document.createElement("div");
        div.setAttribute("aria-disabled", "true");
        expect(isElementDisabled(div, 0)).toBe(true);
      });

      it("handles null elements in virtual and non-virtual modes", () => {
        expect(isElementDisabled(null, 0, false)).toBe(true);
        expect(isElementDisabled(null, 0, true)).toBe(false);
      });
    });

    describe("findNextNavigableIndex", () => {
      it("finds next enabled index forward without loop", () => {
        const isDisabled = (idx: number) => idx === 1;
        expect(findNextNavigableIndex(0, 1, 4, isDisabled, false)).toBe(2);
        expect(findNextNavigableIndex(2, 1, 4, isDisabled, false)).toBe(3);
        expect(findNextNavigableIndex(3, 1, 4, isDisabled, false)).toBe(null);
      });

      it("wraps around when loop is true", () => {
        const isDisabled = (idx: number) => idx === 0;
        expect(findNextNavigableIndex(3, 1, 4, isDisabled, true)).toBe(1);
        expect(findNextNavigableIndex(1, -1, 4, isDisabled, true)).toBe(3);
      });

      it("returns next item including disabled when allowDisabledFocus is true", () => {
        const isDisabled = (idx: number) => idx === 1;
        expect(findNextNavigableIndex(0, 1, 4, isDisabled, false, true)).toBe(1);
        expect(findNextNavigableIndex(1, 1, 4, isDisabled, false, true)).toBe(2);
      });

      it("wraps around to disabled items when loop is true and allowDisabledFocus is true", () => {
        const isDisabled = (idx: number) => idx === 0;
        expect(findNextNavigableIndex(3, 1, 4, isDisabled, true, true)).toBe(0);
        expect(findNextNavigableIndex(0, -1, 4, isDisabled, true, true)).toBe(3);
      });

      it("returns null when all items are disabled or totalSize is 0", () => {
        expect(findNextNavigableIndex(0, 1, 0, () => false, true)).toBe(null);
        expect(findNextNavigableIndex(0, 1, 3, () => true, true)).toBe(null);
      });
    });

    describe("resolveNavigableIndexByIntent", () => {
      const isDisabled = (idx: number) => idx === 1;

      it("resolves next/previous/first/last intents", () => {
        expect(resolveNavigableIndexByIntent("first", null, 4, isDisabled, false)).toBe(0);
        expect(resolveNavigableIndexByIntent("last", null, 4, isDisabled, false)).toBe(3);
        expect(resolveNavigableIndexByIntent("next", 0, 4, isDisabled, false)).toBe(2);
        expect(resolveNavigableIndexByIntent("previous", 2, 4, isDisabled, false)).toBe(0);
      });

      it("resolves next/previous/first/last onto disabled items when allowDisabledFocus is true", () => {
        expect(resolveNavigableIndexByIntent("first", null, 4, isDisabled, false, true)).toBe(0);
        expect(resolveNavigableIndexByIntent("next", 0, 4, isDisabled, false, true)).toBe(1);
        expect(resolveNavigableIndexByIntent("previous", 2, 4, isDisabled, false, true)).toBe(1);
        expect(resolveNavigableIndexByIntent("last", null, 4, isDisabled, false, true)).toBe(3);
      });

      it("returns null for unsupported navigation intents", () => {
        expect(resolveNavigableIndexByIntent("select", 0, 4, isDisabled, false)).toBe(null);
      });
    });

    describe("resolveInitialNavigableIndex", () => {
      it("returns defaultIndex if valid and enabled", () => {
        expect(resolveInitialNavigableIndex(2, 5, () => false)).toBe(2);
      });

      it("falls back to the first enabled index if default is disabled or out of bounds", () => {
        const isDisabled = (idx: number) => idx === 0 || idx === 1;
        expect(resolveInitialNavigableIndex(0, 5, isDisabled)).toBe(2);
        expect(resolveInitialNavigableIndex(10, 5, isDisabled)).toBe(2);
      });

      it("returns defaultIndex even if disabled when allowDisabledFocus is true", () => {
        const isDisabled = (idx: number) => idx === 0;
        expect(resolveInitialNavigableIndex(0, 5, isDisabled, true)).toBe(0);
      });
    });
  });
});
