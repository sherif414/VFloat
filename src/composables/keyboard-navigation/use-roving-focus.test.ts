import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, ref, useTemplateRef } from "vue";
import {
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
      const elementsList = ref<(HTMLElement | null)[]>([]);

      rovingReturn = useRovingFocus({
        containerEl,
        elementsList,
        ...options,
      });

      const register = (el: Element | null, idx: number) => {
        elementsList.value[idx] = el as HTMLElement;
      };

      const count = config.itemCount ?? 5;
      const disabledSet = new Set(config.disabledIndices ?? []);
      const ariaDisabledSet = new Set(config.ariaDisabledIndices ?? []);

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
                  tabindex: rovingReturn.getTabindex(idx),
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

    it("enters on initial activeIndex when tabbing into the widget", async () => {
      const { Component } = createTestComponent({ activeIndex: ref(2) });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("skips default item if disabled and tabs into the first enabled item", async () => {
      const { Component } = createTestComponent({ entryIndex: 0 }, { disabledIndices: [0, 1] });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      expect(
        (page.getByRole("option", { name: "option 1" }).element() as HTMLElement).tabIndex,
      ).toBe(-1);
      expect(option3.element().tabIndex).toBe(0);

      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("acts as a single tab stop and exits widget into the next page element on Tab", async () => {
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

      // 3. Shift+Tab returns to the widget and restores focus on the last focused item (option 3) per WAI-ARIA APG
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

  describe("controlled activeIndex state", () => {
    it("updates controlled activeIndex ref when navigation occurs", async () => {
      const controlledIndex = ref(0);
      // Wire onActiveIndexChange to close the controlled-state loop:
      // useControllableState writes through onChange, which must update the
      // external ref for the controlled pattern to reflect the new value.
      const { Component } = createTestComponent({
        activeIndex: controlledIndex,
        onActiveIndexChange: (idx) => {
          controlledIndex.value = idx;
        },
      });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(controlledIndex.value).toBe(1);
      await expect.element(option2).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      expect(controlledIndex.value).toBe(2);
    });

    it("reflects external activeIndex changes in tabindex without stealing DOM focus", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex: controlledIndex });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      // External ref change updates tabindex attributes but does NOT
      // steal DOM focus — prevents disorienting focus jumps per WCAG.
      controlledIndex.value = 2;
      await expect.element(option3).toHaveAttribute("tabindex", "0");
      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option1).toHaveFocus();
    });

    it("does not auto-revert controlled activeIndex but falls back tabindex when target is disabled", async () => {
      const controlledIndex = ref(0);
      const { Component, getRoving } = createTestComponent(
        { activeIndex: controlledIndex },
        { disabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      // Set controlled index to a disabled item — the ref is not auto-reverted
      // (prevents feedback loops), but getTabindex falls through to tabStopIndex.
      controlledIndex.value = 1;
      expect(controlledIndex.value).toBe(1);
      // tabStopIndex remains at 0 (last valid), so option1 gets tabindex=0
      expect(getRoving().getTabindex(0)).toBe(0);
      expect(getRoving().getTabindex(1)).toBe(-1);
    });

    it("invokes onActiveIndexChange callback when activeIndex updates", async () => {
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
    it("supports next, prev, first, last, and focusIndex methods", async () => {
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

      getRoving().focusIndex(2);
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveFocus();
    });

    it("sets activeIndex state without moving DOM focus when setActiveIndex is called", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      getRoving().setActiveIndex(2);
      expect(getRoving().activeIndex.value).toBe(2);
      expect(getRoving().getTabindex(2)).toBe(0);
      expect(getRoving().getTabindex(0)).toBe(-1);
      await expect.element(option1).toHaveFocus();
      await expect.element(option3).not.toHaveFocus();
    });

    it("continues from the last active item after activeIndex is cleared", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option3);
      getRoving().setActiveIndex(-1);
      getRoving().next();

      await expect.element(option4).toHaveFocus();
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
        const elementsList = ref<(HTMLElement | null)[]>([]);

        useRovingFocus({ containerEl, elementsList });

        const register = (el: Element | null, idx: number) => {
          elementsList.value[idx] = el as HTMLElement;
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

  describe("tabindex resolution", () => {
    it("sets tabindex=0 on the first item and tabindex=-1 on all others by default", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });

      expect(option1.element().tabIndex).toBe(0);
      expect(option2.element().tabIndex).toBe(-1);
      expect(option3.element().tabIndex).toBe(-1);
    });

    it("respects entryIndex when specified", async () => {
      const { Component } = createTestComponent({ entryIndex: 2 });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      expect(option1.element().tabIndex).toBe(-1);
      expect(option3.element().tabIndex).toBe(0);
    });

    it("skips hard-disabled items on mount and gives tabindex=0 to the first enabled item", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [0] });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option2).toHaveAttribute("tabindex", "0");
    });

    it("skips aria-disabled items on mount when allowDisabledFocus is false", async () => {
      const { Component } = createTestComponent(
        { focusDisabledElements: false },
        { ariaDisabledIndices: [0] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option2).toHaveAttribute("tabindex", "0");
    });

    it("designates a fallback tabindex=0 entry target when entryIndex is omitted", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      expect(getRoving().activeIndex.value).toBe(-1);
      expect(option1.element().tabIndex).toBe(0);
      expect(option2.element().tabIndex).toBe(-1);
    });

    it("moves tabindex=0 on keyboard navigation", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      expect(option1.element().tabIndex).toBe(0);

      await userEvent.keyboard("{ArrowDown}");

      await expect.element(option2).toHaveFocus();
      expect(option1.element().tabIndex).toBe(-1);
      expect(option2.element().tabIndex).toBe(0);
    });

    it("updates tabindex on mouse click selection", async () => {
      const { Component } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option4);

      expect(option1.element().tabIndex).toBe(-1);
      expect(option4.element().tabIndex).toBe(0);
    });

    it("skips disabled items during arrow navigation", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [1] });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");

      await expect.element(option3).toHaveFocus();
      expect(option1.element().tabIndex).toBe(-1);
      expect(option2.element().tabIndex).toBe(-1);
      expect(option3.element().tabIndex).toBe(0);
    });

    it("enters the widget at tabindex=0 and exits to next focusable element on Tab", async () => {
      const { Component } = createTestComponent({ entryIndex: 1 });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option2).toHaveFocus();

      await userEvent.tab();
      await expect.element(afterBtn).toHaveFocus();
    });

    it("enters back into the active item on Shift+Tab from outside", async () => {
      const { Component } = createTestComponent({ entryIndex: 2 });
      render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(afterBtn);
      await userEvent.tab({ shift: true });

      await expect.element(option3).toHaveFocus();
    });

    it("updates getTabindex return values when setActiveIndex is called programmatically", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const roving = getRoving();

      expect(roving.getTabindex(0)).toBe(0);
      expect(roving.getTabindex(1)).toBe(-1);

      roving.setActiveIndex(3);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option4).toHaveAttribute("tabindex", "0");
      expect(roving.getTabindex(3)).toBe(0);
    });
  });

  describe("allowDisabledFocus option (WAI-ARIA APG discoverability)", () => {
    it("enters on initial activeIndex even if disabled when allowDisabledFocus is true", async () => {
      const { Component } = createTestComponent(
        { activeIndex: ref(0), focusDisabledElements: true },
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
        { focusDisabledElements: true },
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
        { focusDisabledElements: true, onSelect: onSelectMock },
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
        { focusDisabledElements: true, onSelect: onSelectMock },
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
        { focusOnHover: true, focusDisabledElements: true },
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
        { focusDisabledElements: true },
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

      getRoving().focusIndex(1);
      await expect.element(option2).toHaveFocus();
    });

    it("reflects external activeIndex targeting a disabled item in tabindex when allowDisabledFocus is true", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent(
        {
          activeIndex: controlledIndex,
          focusDisabledElements: true,
        },
        { ariaDisabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option1);

      // External ref change — tabindex updates but DOM focus is not stolen
      controlledIndex.value = 1;
      expect(controlledIndex.value).toBe(1);
      await expect.element(option2).toHaveAttribute("tabindex", "0");
      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option1).toHaveFocus();
    });

    it("corrects tab stop resolution but not activeIndex when allowDisabledFocus changes to false", async () => {
      const allowDisabledFocusRef = ref(true);
      const { Component, getRoving } = createTestComponent(
        { focusDisabledElements: allowDisabledFocusRef },
        { ariaDisabledIndices: [0] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option2);
      await expect.element(option2).toHaveFocus();

      // Navigate to the disabled item (allowed because focusDisabledElements=true)
      getRoving().focusIndex(0);
      await expect.element(option1).toHaveFocus();

      // Flipping focusDisabledElements to false does NOT auto-move focus or
      // auto-correct activeIndex. getTabindex resolves to first navigable element = index 1.
      allowDisabledFocusRef.value = false;

      // activeIndex is still 0 (the disabled item), but getTabindex falls
      // through to first navigable = index 1.
      expect(getRoving().getTabindex(1)).toBe(0);
      expect(getRoving().getTabindex(0)).toBe(-1);
      // DOM focus remains where it was — no auto-correction
      await expect.element(option1).toHaveFocus();

      // Next keyboard action navigates correctly from the DOM focus position
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option2).toHaveFocus();
    });
  });

  describe("focus stealing prevention & mount isolation", () => {
    it("does not steal document focus on mount when element 0 is disabled", async () => {
      const { Component } = createTestComponent({ entryIndex: 0 }, { disabledIndices: [0] });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      // No element in the widget should have received focus on mount
      await expect.element(option1).not.toHaveFocus();
      await expect.element(option2).not.toHaveFocus();

      // But tabindex should be properly initialized for sequential tab entry
      expect((option1.element() as HTMLElement).tabIndex).toBe(-1);
      expect((option2.element() as HTMLElement).tabIndex).toBe(0);
    });

    it("does not steal focus when activeIndex changes externally while widget is unfocused", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex: controlledIndex });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      // Changing controlledIndex while beforeBtn is focused must not steal focus
      controlledIndex.value = 2;
      await expect.element(beforeBtn).toHaveFocus();
      await expect.element(option3).not.toHaveFocus();
      expect((option3.element() as HTMLElement).tabIndex).toBe(0);
      expect((option1.element() as HTMLElement).tabIndex).toBe(-1);
    });
  });

  describe("uncontrolled entryIndex & async element mounting", () => {
    it("starts at entryIndex in uncontrolled mode", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: 2 });
      render(Component);

      expect(getRoving().activeIndex.value).toBe(-1);
      expect(getRoving().getTabindex(2)).toBe(0);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("preserves entryIndex when elements populate asynchronously", async () => {
      const isLoaded = ref(false);

      const AsyncComponent = defineComponent(() => {
        const containerEl = useTemplateRef<HTMLDivElement>("container");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const roving = useRovingFocus({
          containerEl,
          elementsList,
          entryIndex: 2,
        });

        const register = (el: Element | null, idx: number) => {
          elementsList.value[idx] = el as HTMLElement;
        };

        return () =>
          h("div", [
            h("button", { id: "before-btn" }, "Before Widget"),
            h(
              "div",
              { ref: "container" },
              isLoaded.value
                ? Array.from({ length: 4 }).map((_, idx) =>
                    h(
                      "button",
                      {
                        role: "option",
                        ref: (el) => register(el as Element, idx),
                        tabindex: roving.getTabindex(idx),
                      },
                      "option " + (idx + 1),
                    ),
                  )
                : [],
            ),
          ]);
      });

      render(AsyncComponent);
      const beforeBtn = page.getByRole("button", { name: "Before Widget" });

      // Trigger async loading of elements
      isLoaded.value = true;

      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toBeInTheDocument();

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });
  });

  describe("unfocused (-1) initial state & sequential tab stop fallback", () => {
    it("initializes with activeIndex = -1 without highlighting an initial item", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      expect(getRoving().activeIndex.value).toBe(-1);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      // Fallback designates option 1 as tabindex="0"
      expect((option1.element() as HTMLElement).tabIndex).toBe(0);
      expect((option2.element() as HTMLElement).tabIndex).toBe(-1);
    });

    it("enters on fallback element when tabbing in with activeIndex = -1 and syncs activeIndex", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);
    });

    it("navigates to first item on next() from initial activeIndex = -1", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });

      // Programmatic next from -1 targets first enabled item
      getRoving().next();
      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);
    });

    it("navigates to last item on prev() from initial activeIndex = -1", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option5 = page.getByRole("option", { name: "option 5" });

      // Programmatic prev from -1 targets last enabled item
      getRoving().prev();
      await expect.element(option5).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(4);
    });
  });

  describe("focusin native focus synchronization", () => {
    it("synchronizes activeIndex when an item is clicked directly and navigates correctly thereafter", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      const option4 = page.getByRole("option", { name: "option 4" });

      // Directly click option 3
      await userEvent.click(option3);
      await expect.element(option3).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(2);

      // Press ArrowDown -> should move to option 4 (index 3), not jump to option 2
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(3);
    });
  });

  describe("focusOnHover scroll prevention", () => {
    it("focuses hovered item without calling scrollIntoView", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      const option3El = option3.element() as HTMLElement;
      const scrollSpy = vi.fn();
      option3El.scrollIntoView = scrollSpy;

      await userEvent.click(option1);
      await userEvent.hover(option3);

      await expect.element(option3).toHaveFocus();
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  describe("entryIndex reactive anchoring & APG priority resolution", () => {
    it("enters the composite widget on entryIndex when tabbing in", async () => {
      const selectedIndex = ref(2);
      const { Component } = createTestComponent({ entryIndex: selectedIndex });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("restores entry focus to entryIndex after a transient arrow preview is dismissed", async () => {
      const selectedIndex = ref(2);
      const { Component, getRoving } = createTestComponent({ entryIndex: selectedIndex });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      // 1. Tab into widget -> lands on option 3 (entryIndex: 2)
      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();

      // 2. Preview option 4 using ArrowDown without committing selection
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(3);

      // 3. User closes widget / dismisses -> activeIndex reset to -1
      getRoving().setActiveIndex(-1);
      await userEvent.click(afterBtn);
      await expect.element(afterBtn).toHaveFocus();

      // 4. Tab back into widget -> focus returns to committed entryIndex (option 3), not option 4
      await userEvent.tab({ shift: true });
      await expect.element(option3).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(2);
    });

    it("reflects dynamic entryIndex updates in tabindex without stealing DOM focus", async () => {
      const selectedIndex = ref(1);
      const { Component, getRoving } = createTestComponent({ entryIndex: selectedIndex });
      render(Component);

      const option4 = page.getByRole("option", { name: "option 4" });

      expect(getRoving().getTabindex(1)).toBe(0);
      expect(getRoving().getTabindex(0)).toBe(-1);
      expect(getRoving().getTabindex(3)).toBe(-1);

      // Focus outside the widget
      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      // External selection changes
      selectedIndex.value = 3;

      expect(getRoving().getTabindex(3)).toBe(0);
      expect(getRoving().getTabindex(1)).toBe(-1);
      // DOM focus is not hijacked
      await expect.element(beforeBtn).toHaveFocus();
      await expect.element(option4).not.toHaveFocus();
    });

    it("falls back to first enabled item when entryIndex is disabled", async () => {
      const selectedIndex = ref(1); // option 2 is disabled
      const { Component, getRoving } = createTestComponent(
        { entryIndex: selectedIndex },
        { disabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      expect(getRoving().getTabindex(0)).toBe(0);
      expect(getRoving().getTabindex(1)).toBe(-1);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option1).toHaveFocus();
      await expect.element(option2).not.toHaveFocus();
    });

    it("falls back to first enabled item when entryIndex is null or undefined", async () => {
      const selectedIndex = ref<number | null>(null);
      const { Component, getRoving } = createTestComponent({ entryIndex: selectedIndex });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      expect(getRoving().getTabindex(0)).toBe(0);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option1).toHaveFocus();
    });

    it("disables sequential tab-stop entry when entryIndex is explicitly -1", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: -1 });
      render(Component);

      expect(getRoving().getTabindex(0)).toBe(-1);
      expect(getRoving().getTabindex(1)).toBe(-1);
    });
  });

  describe("focusout boundary handling", () => {
    it("clears activeIndex to -1 when focus leaves the container", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);

      await userEvent.click(afterBtn);
      await expect.element(afterBtn).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(-1);
    });

    it("does not clear activeIndex when focus moves between items inside the container", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);

      await userEvent.click(option2);
      await expect.element(option2).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(1);
    });
  });

  describe("entryFocusMode (last-focused vs entry-index)", () => {
    it("restores focus to the last focused element on re-entry when entryFocusMode is last-focused (default)", async () => {
      const { Component } = createTestComponent({
        entryIndex: 1,
        entryFocusMode: "last-focused",
      });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      // 1. Initial tab entry lands on entryIndex (option 2)
      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option2).toHaveFocus();

      // 2. Navigate to option 4
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();

      // 3. Tab out to afterBtn
      await userEvent.tab();
      await expect.element(afterBtn).toHaveFocus();

      // 4. Shift+Tab back into the widget -> restores focus to option 4 (last focused element)
      await userEvent.tab({ shift: true });
      await expect.element(option4).toHaveFocus();
    });

    it("unconditionally resets focus to entryIndex on re-entry when entryFocusMode is entry-index", async () => {
      const { Component } = createTestComponent({
        entryIndex: 1,
        entryFocusMode: "entry-index",
      });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      // 1. Initial tab entry lands on entryIndex (option 2)
      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option2).toHaveFocus();

      // 2. Navigate to option 4
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();

      // 3. Tab out to afterBtn
      await userEvent.tab();
      await expect.element(afterBtn).toHaveFocus();

      // 4. Shift+Tab back into the widget -> resets to entryIndex (option 2)
      await userEvent.tab({ shift: true });
      await expect.element(option2).toHaveFocus();
    });

    it("syncs resting tab stop when entryIndex updates reactively while widget is unfocused", async () => {
      const entryIndexRef = ref(1);
      const { Component, getRoving } = createTestComponent({
        entryIndex: entryIndexRef,
        entryFocusMode: "last-focused",
      });
      render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      // 1. Enter and navigate to option 4
      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option2).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();

      // 2. Leave widget
      await userEvent.tab();
      await expect.element(afterBtn).toHaveFocus();

      // 3. External application changes entryIndex (e.g. selected tab updated externally to index 0)
      entryIndexRef.value = 0;
      expect(getRoving().getTabindex(0)).toBe(0);
      expect(getRoving().getTabindex(3)).toBe(-1);

      // 4. Re-entering widget lands on the newly updated entryIndex (option 1)
      await userEvent.tab({ shift: true });
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveFocus();
    });
  });
});
