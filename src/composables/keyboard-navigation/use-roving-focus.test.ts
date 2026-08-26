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
  }

  const createTestComponent = (
    options: Partial<UseRovingFocusOptions> = {},
    config: FixtureConfig = {},
  ) => {
    let rovingReturn!: UseRovingFocusReturn;

    const Component = defineComponent(() => {
      const containerEl = useTemplateRef<HTMLDivElement>("container");
      const itemsList = ref<(HTMLElement | null)[]>([]);

      rovingReturn = useRovingFocus({
        containerEl,
        itemsList,
        ...options,
      });

      const register = (el: Element | null, idx: number) => {
        itemsList.value[idx] = el as HTMLElement;
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

    it("respects custom isItemDisabled predicate", async () => {
      const { Component } = createTestComponent({
        isItemDisabled: (_, idx) => idx === 1,
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

  describe("focusItemOnHover option", () => {
    it("moves focus to hovered item when focusItemOnHover is true", async () => {
      const { Component } = createTestComponent({ focusItemOnHover: true });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.hover(option3);
      await expect.element(option3).toHaveFocus();
    });

    it("does not move focus on hover when focusItemOnHover is false by default", async () => {
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
      const { Component } = createTestComponent(
        { focusItemOnHover: true },
        { disabledIndices: [1] },
      );
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await userEvent.hover(option2);

      await expect.element(option1).toHaveFocus();
    });

    it("ignores touch pointer events", async () => {
      const { Component } = createTestComponent({ focusItemOnHover: true });
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
        const itemsList = ref<(HTMLElement | null)[]>([]);

        useRovingFocus({ containerEl, itemsList });

        const register = (el: Element | null, idx: number) => {
          itemsList.value[idx] = el as HTMLElement;
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

  describe("virtual list support", () => {
    it("tracks virtualItemRef on navigation in virtual mode", async () => {
      const virtualItemRef = ref<HTMLElement | null>(null);

      const { Component } = createTestComponent({
        virtual: true,
        virtualItemRef,
        itemCount: 100,
      });
      render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(virtualItemRef.value).not.toBeNull();
    });
  });
});
