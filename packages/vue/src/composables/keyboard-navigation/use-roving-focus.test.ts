import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { type FloatingNode, useFloatingNode } from "../floating-node";
import {
  type UseRovingFocusOptions,
  type UseRovingFocusReturn,
  useRovingFocus,
} from "./use-roving-focus";

describe("Feature: useRovingFocus", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  interface FixtureConfig {
    itemCount?: number;
    disabledIndices?: number[];
    ariaDisabledIndices?: number[];
    dir?: string;
    tabindex?: number | ((idx: number) => number | undefined);
    unmanaged?: boolean;
    node?: FloatingNode;
  }

  const createTestComponent = (
    options: Partial<UseRovingFocusOptions> = {},
    config: FixtureConfig = {},
  ) => {
    let rovingReturn!: UseRovingFocusReturn;
    let testNode!: FloatingNode;

    const Component = defineComponent(() => {
      const containerEl = useTemplateRef<HTMLDivElement>("container");
      const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
      const elementsList = ref<(HTMLElement | null)[]>([]);

      const floatingNode =
        config.node ??
        useFloatingNode({
          anchorEl,
          floatingEl: containerEl,
          open: ref(true),
        });
      testNode = floatingNode;

      rovingReturn = useRovingFocus(floatingNode, {
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
          h("button", { id: "before-btn", ref: "anchor" }, "Before Widget"),
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

    return { Component, getRoving: () => rovingReturn, getContext: () => testNode };
  };

  describe("Scenario: Sequential tab order and focus entry as a single tab stop", () => {
    it("Given the initial composite widget, When tabbing in from a preceding page element, Then focus lands on the first enabled item", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      // Tab moves focus into the widget on the default active item
      await userEvent.tab();
      await expect.element(option1).toHaveFocus();
    });

    it("Given an explicit initial activeIndex, When tabbing into the widget, Then focus lands on that specified item", async () => {
      const { Component } = createTestComponent({ activeIndex: ref(2) });
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("Given default entry item is disabled, When tabbing into the widget, Then disabled item is skipped and focus lands on first enabled item", async () => {
      const { Component } = createTestComponent({ entryIndex: 0 }, { disabledIndices: [0, 1] });
      await render(Component);

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

    it("Given focus inside the widget, When Tab is pressed, Then focus exits the widget to the next page element as a single tab stop", async () => {
      const { Component } = createTestComponent();
      await render(Component);

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

  describe("Scenario: Vertical keyboard navigation", () => {
    it("Given vertical orientation, When ArrowDown or ArrowUp is pressed, Then focus navigates to the next or previous item", async () => {
      const { Component } = createTestComponent();
      await render(Component);

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

    it("Given vertical orientation, When Home or End is pressed, Then focus jumps directly to the first or last item", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{End}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{Home}");
      await expect.element(option1).toHaveFocus();
    });

    it("Given loop is disabled, When navigating past the start or end, Then focus stops at the boundary items", async () => {
      const { Component } = createTestComponent({ loop: false });
      await render(Component);

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

    it("Given loop is enabled, When navigating past the start or end, Then focus wraps around the boundary items", async () => {
      const { Component } = createTestComponent({ loop: true });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).toHaveFocus();
    });

    it("Given disabled or aria-disabled items in the list, When navigating with arrow keys, Then disabled items are skipped", async () => {
      const { Component } = createTestComponent(
        {},
        { disabledIndices: [1], ariaDisabledIndices: [2] },
      );
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option4).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option1).toHaveFocus();
    });

    it("Given pageSize is configured, When PageDown or PageUp is pressed, Then focus jumps by the page size", async () => {
      const { Component } = createTestComponent({ pageSize: 4 }, { itemCount: 15 });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option5 = page.getByRole("option", { name: "option 5" });
      const option9 = page.getByRole("option", { name: "option 9" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{PageDown}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{PageDown}");
      await expect.element(option9).toHaveFocus();

      await userEvent.keyboard("{PageUp}");
      await expect.element(option5).toHaveFocus();

      await userEvent.keyboard("{PageUp}");
      await expect.element(option1).toHaveFocus();

      // Stops at boundary when loop is false
      await userEvent.keyboard("{PageUp}");
      await expect.element(option1).toHaveFocus();
    });
  });

  describe("Scenario: Horizontal and right-to-left keyboard navigation", () => {
    it("Given horizontal orientation, When ArrowRight or ArrowLeft is pressed, Then focus navigates to the next or previous item", async () => {
      const { Component } = createTestComponent({ orientation: "horizontal" });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowRight}");
      await expect.element(option2).toHaveFocus();

      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option1).toHaveFocus();
    });

    it("Given horizontal orientation in RTL layout, When ArrowLeft or ArrowRight is pressed, Then arrow navigation directions are inverted", async () => {
      const { Component } = createTestComponent({ orientation: "horizontal" }, { dir: "rtl" });
      await render(Component);

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

  describe("Scenario: Bidirectional orientation navigation", () => {
    it("Given orientation is set to both, When any of the four arrow keys is pressed, Then focus moves in the matching direction", async () => {
      const { Component } = createTestComponent({ orientation: "both" });
      await render(Component);

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

    it("Given orientation is set to both in RTL layout, When horizontal arrow keys are pressed, Then RTL inversion applies to horizontal keys", async () => {
      const { Component } = createTestComponent({ orientation: "both" }, { dir: "rtl" });
      await render(Component);

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

  describe("Scenario: Item selection via onSelect callback", () => {
    it("Given an active focused item, When Enter or Space is pressed, Then onSelect callback is invoked with the active index and event", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ onSelect: onSelectMock });
      await render(Component);

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

  describe("Scenario: Nested menu navigation via onEnter and onExit callbacks", () => {
    it("Given vertical orientation, When ArrowRight is pressed on an active item, Then onEnter callback is invoked", async () => {
      const onEnterMock = vi.fn();
      const { Component } = createTestComponent({ onEnter: onEnterMock });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowRight}");
      expect(onEnterMock).toHaveBeenCalledTimes(1);
      expect(onEnterMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
    });

    it("Given vertical RTL orientation, When ArrowLeft is pressed on an active item, Then onEnter callback is invoked", async () => {
      const onEnterMock = vi.fn();
      const { Component } = createTestComponent(
        { onEnter: onEnterMock, rtl: true },
        { dir: "rtl" },
      );
      await render(Component);

      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option2);

      await userEvent.keyboard("{ArrowLeft}");
      expect(onEnterMock).toHaveBeenCalledTimes(1);
      expect(onEnterMock).toHaveBeenCalledWith(1, expect.any(KeyboardEvent));
    });

    it("Given horizontal orientation, When ArrowDown or ArrowUp is pressed on an active item, Then onEnter callback is invoked", async () => {
      const onEnterMock = vi.fn();
      const { Component } = createTestComponent({
        orientation: "horizontal",
        onEnter: onEnterMock,
      });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(onEnterMock).toHaveBeenCalledTimes(1);
      expect(onEnterMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));

      await userEvent.keyboard("{ArrowUp}");
      expect(onEnterMock).toHaveBeenCalledTimes(2);
      expect(onEnterMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
    });

    it("Given active item is disabled, When enter-intent arrow key is pressed, Then onEnter callback is not invoked", async () => {
      const onEnterMock = vi.fn();
      const { Component } = createTestComponent(
        { activeIndex: ref(0), focusDisabledElements: true, onEnter: onEnterMock },
        { ariaDisabledIndices: [0] },
      );
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{ArrowRight}");
      expect(onEnterMock).not.toHaveBeenCalled();
    });

    it("Given vertical orientation, When ArrowLeft is pressed on an active item, Then onExit callback is invoked", async () => {
      const onExitMock = vi.fn();
      const { Component } = createTestComponent({ onExit: onExitMock });
      await render(Component);

      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option2);

      await userEvent.keyboard("{ArrowLeft}");
      expect(onExitMock).toHaveBeenCalledTimes(1);
      expect(onExitMock).toHaveBeenCalledWith(1, expect.any(KeyboardEvent));
    });

    it("Given vertical RTL orientation, When ArrowRight is pressed on an active item, Then onExit callback is invoked", async () => {
      const onExitMock = vi.fn();
      const { Component } = createTestComponent({ onExit: onExitMock, rtl: true }, { dir: "rtl" });
      await render(Component);

      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option2);

      await userEvent.keyboard("{ArrowRight}");
      expect(onExitMock).toHaveBeenCalledTimes(1);
      expect(onExitMock).toHaveBeenCalledWith(1, expect.any(KeyboardEvent));
    });

    it("Given active item is disabled, When exit-intent arrow key is pressed, Then onExit callback is still invoked", async () => {
      const onExitMock = vi.fn();
      const { Component } = createTestComponent(
        { activeIndex: ref(0), focusDisabledElements: true, onExit: onExitMock },
        { ariaDisabledIndices: [0] },
      );
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{ArrowLeft}");
      expect(onExitMock).toHaveBeenCalledTimes(1);
      expect(onExitMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
    });

    it("Given an onEnter callback, When returning false, Then event default prevention is avoided", async () => {
      let preventDefaultSpy = vi.fn();
      const onEnterReturnFalse = vi.fn((_idx, e: KeyboardEvent) => {
        preventDefaultSpy = vi.spyOn(e, "preventDefault");
        return false;
      });

      const { Component } = createTestComponent({ onEnter: onEnterReturnFalse });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowRight}");
      expect(onEnterReturnFalse).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it("Given onEnter and onExit callbacks are omitted, When arrow keys occur, Then default prevention is not triggered", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      let prevented = false;
      const keydownListener = (e: KeyboardEvent) => {
        if (e.defaultPrevented) prevented = true;
      };
      window.addEventListener("keydown", keydownListener);

      await userEvent.keyboard("{ArrowRight}");
      expect(prevented).toBe(false);

      await userEvent.keyboard("{ArrowLeft}");
      expect(prevented).toBe(false);

      window.removeEventListener("keydown", keydownListener);
    });
  });

  describe("Scenario: Controlled activeIndex state synchronization", () => {
    it("Given a controlled activeIndex ref, When keyboard navigation occurs, Then the controlled ref is updated through change handler", async () => {
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
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(controlledIndex.value).toBe(1);
      await expect.element(option2).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      expect(controlledIndex.value).toBe(2);
    });

    it("Given a controlled activeIndex ref, When the ref is changed externally, Then tabindex updates without stealing DOM focus", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex: controlledIndex });
      await render(Component);

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

    it("Given a controlled activeIndex set to a disabled item, When evaluated, Then activeIndex is not auto-reverted and tabindex falls back", async () => {
      const controlledIndex = ref(0);
      const { Component, getRoving } = createTestComponent(
        { activeIndex: controlledIndex },
        { disabledIndices: [1] },
      );
      await render(Component);

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

    it("Given an onActiveIndexChange callback, When navigation occurs, Then the callback is invoked with the new active index", async () => {
      const onActiveIndexChangeMock = vi.fn();
      const { Component } = createTestComponent({
        onActiveIndexChange: onActiveIndexChangeMock,
      });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      expect(onActiveIndexChangeMock).toHaveBeenCalledWith(1);

      await userEvent.keyboard("{ArrowDown}");
      expect(onActiveIndexChangeMock).toHaveBeenCalledWith(2);
    });
  });

  describe("Scenario: Pointer hover focus orchestration", () => {
    it("Given focusOnHover is enabled, When hovering an item with a mouse pointer, Then focus moves to the hovered item", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.hover(option3);
      await expect.element(option3).toHaveFocus();
    });

    it("Given focusOnHover is disabled by default, When hovering an item, Then DOM focus remains on the previously focused item", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(option1);
      await userEvent.hover(option3);

      await expect.element(option1).toHaveFocus();
      await expect.element(option3).not.toHaveFocus();
    });

    it("Given focusOnHover is enabled, When hovering a disabled item, Then focus does not move to the disabled item", async () => {
      const { Component } = createTestComponent({ focusOnHover: true }, { disabledIndices: [1] });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await userEvent.hover(option2);

      await expect.element(option1).toHaveFocus();
    });

    it("Given focusOnHover is enabled, When pointermove originates from a touch device, Then the touch event is ignored", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      await render(Component);

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

  describe("Scenario: Programmatic navigation and focus methods", () => {
    it("Given programmatic navigation methods, When next, prev, first, last, or numeric index is invoked, Then focus moves accordingly", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);

      getRoving().focusIndex("next");
      await expect.element(option2).toHaveFocus();

      getRoving().focusIndex("last");
      await expect.element(option5).toHaveFocus();

      getRoving().focusIndex("prev");
      await expect.element(option4).toHaveFocus();

      getRoving().focusIndex("first");
      await expect.element(option1).toHaveFocus();

      getRoving().focusIndex(2);
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveFocus();
    });

    it("Given setActiveIndex is called programmatically, When invoked, Then activeIndex state updates without moving DOM focus", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

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

    it("Given activeIndex is cleared to -1, When focusIndex('next') is invoked, Then navigation resumes from the last active item", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option3);
      getRoving().setActiveIndex(-1);
      getRoving().focusIndex("next");

      await expect.element(option4).toHaveFocus();
    });

    it("Given a roving focus instance with active focus, When reset() is called, Then activeIndex and resting tabStopIndex return to entryIndex", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: 1 });
      await render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      await userEvent.click(option3);

      expect(getRoving().activeIndex.value).toBe(2);
      expect(getRoving().tabStopIndex.value).toBe(2);

      getRoving().reset();

      expect(getRoving().activeIndex.value).toBe(-1);
      // Resting tab stop returns to entryIndex (option 2 = index 1)
      expect(getRoving().tabStopIndex.value).toBe(1);
      expect(getRoving().getTabindex(1)).toBe(0);
      expect(getRoving().getTabindex(2)).toBe(-1);
    });

    it("Given reactive tabStopIndex, When navigation occurs, Then tabStopIndex reactively matches getTabindex resolution", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: 0 });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      expect(getRoving().tabStopIndex.value).toBe(0);

      await userEvent.click(option1);
      await userEvent.keyboard("{ArrowDown}");

      await expect.element(option2).toHaveFocus();
      expect(getRoving().tabStopIndex.value).toBe(1);
      expect(getRoving().getTabindex(1)).toBe(0);
      expect(getRoving().getTabindex(0)).toBe(-1);
    });

    it("Given focusIndex with page actions, When 'page-down' or 'page-up' is called, Then focus leaps by pageSize", async () => {
      const { Component, getRoving } = createTestComponent({ pageSize: 3 }, { itemCount: 10 });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option4 = page.getByRole("option", { name: "option 4" });
      const option7 = page.getByRole("option", { name: "option 7" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      getRoving().focusIndex("page-down");
      await expect.element(option4).toHaveFocus();

      getRoving().focusIndex("page-down");
      await expect.element(option7).toHaveFocus();

      getRoving().focusIndex("page-up");
      await expect.element(option4).toHaveFocus();
    });

    it("Given focusIndex with 'reset', When called, Then active focus is reset back to resting entryIndex", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: 1 });
      await render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      await userEvent.click(option3);
      expect(getRoving().activeIndex.value).toBe(2);

      getRoving().focusIndex("reset");
      expect(getRoving().activeIndex.value).toBe(-1);
      expect(getRoving().tabStopIndex.value).toBe(1);
    });

    it("Given undefined ref values for pageSize and orientation, When evaluated, Then sensible default values are used", async () => {
      const pageSizeRef = ref<number | undefined>(undefined);
      const orientationRef = ref<"vertical" | "horizontal" | undefined>(undefined);
      const { Component, getRoving } = createTestComponent(
        { pageSize: pageSizeRef as any, orientation: orientationRef as any },
        { itemCount: 25 },
      );
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option11 = page.getByRole("option", { name: "option 11" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      // Should default to 10 and vertical orientation
      await userEvent.keyboard("{PageDown}");
      await expect.element(option11).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(10);
    });
  });

  describe("Scenario: Disabled item handling and modifier key filtering", () => {
    it("Given enabled is set to false, When keyboard navigation keys are pressed, Then navigation is disabled", async () => {
      const { Component } = createTestComponent({ enabled: false });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).toHaveFocus();
    });

    it("Given modifier keys (Ctrl, Alt, Meta) are held, When arrow keys are pressed, Then the key combination is ignored", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
      await expect.element(option1).toHaveFocus();
    });

    it("Given all items in the list are disabled, When navigating, Then errors are avoided and no item receives focus", async () => {
      const { Component } = createTestComponent({}, { itemCount: 3, disabledIndices: [0, 1, 2] });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).not.toHaveFocus();
    });
  });

  describe("Scenario: Dynamic item list updates and bounds auto-correction", () => {
    it("Given an element list that grows dynamically, When new items are appended, Then keyboard navigation reaches the new items", async () => {
      const count = ref(3);

      const DynamicComponent = defineComponent(() => {
        const containerEl = useTemplateRef<HTMLDivElement>("container");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const anchorEl = ref<HTMLElement | null>(null);
        const node = useFloatingNode({
          anchorEl,
          floatingEl: containerEl,
          open: ref(true),
        });

        useRovingFocus(node, { elementsList });

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

      await render(DynamicComponent);
      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      count.value++;
      const option4 = page.getByRole("option", { name: "option 4" });
      await expect.element(option4).toBeInTheDocument();

      await userEvent.keyboard("{End}");
      await expect.element(option4).toHaveFocus();
    });
  });

  describe("Scenario: Tabindex management and roving tabindex resolution", () => {
    it("Given default roving focus configuration, When initialized, Then first item receives tabindex=0 and others receive -1", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });

      expect(option1.element().tabIndex).toBe(0);
      expect(option2.element().tabIndex).toBe(-1);
      expect(option3.element().tabIndex).toBe(-1);
    });

    it("Given a custom entryIndex, When initialized, Then the entryIndex item receives tabindex=0", async () => {
      const { Component } = createTestComponent({ entryIndex: 2 });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option3 = page.getByRole("option", { name: "option 3" });

      expect(option1.element().tabIndex).toBe(-1);
      expect(option3.element().tabIndex).toBe(0);
    });

    it("Given first item is disabled on mount, When initialized, Then first enabled item receives tabindex=0", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [0] });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option2).toHaveAttribute("tabindex", "0");
    });

    it("Given first item is aria-disabled and allowDisabledFocus is false, When mounted, Then first enabled item receives tabindex=0", async () => {
      const { Component } = createTestComponent(
        { focusDisabledElements: false },
        { ariaDisabledIndices: [0] },
      );
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option2).toHaveAttribute("tabindex", "0");
    });

    it("Given entryIndex is omitted, When initialized, Then a fallback tabindex=0 entry target is designated while activeIndex is -1", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      expect(getRoving().activeIndex.value).toBe(-1);
      expect(option1.element().tabIndex).toBe(0);
      expect(option2.element().tabIndex).toBe(-1);
    });

    it("Given keyboard navigation, When moving between items, Then tabindex=0 roves to the newly active item", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      expect(option1.element().tabIndex).toBe(0);

      await userEvent.keyboard("{ArrowDown}");

      await expect.element(option2).toHaveFocus();
      expect(option1.element().tabIndex).toBe(-1);
      expect(option2.element().tabIndex).toBe(0);
    });

    it("Given pointer click on an item, When clicked, Then tabindex=0 updates to the clicked item", async () => {
      const { Component } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option4 = page.getByRole("option", { name: "option 4" });

      await userEvent.click(option4);

      expect(option1.element().tabIndex).toBe(-1);
      expect(option4.element().tabIndex).toBe(0);
    });

    it("Given disabled items in the list, When navigating with arrow keys, Then tabindex skips disabled items", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [1] });
      await render(Component);

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

    it("Given entryIndex is configured, When tabbing in and out, Then Tab enters at tabindex=0 and exits to next focusable element", async () => {
      const { Component } = createTestComponent({ entryIndex: 1 });
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option2).toHaveFocus();

      await userEvent.tab();
      await expect.element(afterBtn).toHaveFocus();
    });

    it("Given focus is outside the widget, When Shift+Tab is pressed, Then focus enters the active item from behind", async () => {
      const { Component } = createTestComponent({ entryIndex: 2 });
      await render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(afterBtn);
      await userEvent.tab({ shift: true });

      await expect.element(option3).toHaveFocus();
    });

    it("Given setActiveIndex is called programmatically, When invoked, Then getTabindex return values update accordingly", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

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

  describe("Scenario: Disabled element focusability for ARIA discoverability", () => {
    it("Given focusDisabledElements is true, When tabbing into the widget, Then initial activeIndex receives focus even if disabled", async () => {
      const { Component } = createTestComponent(
        { activeIndex: ref(0), focusDisabledElements: true },
        { ariaDisabledIndices: [0] },
      );
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option1).toHaveFocus();
    });

    it("Given focusDisabledElements is true, When navigating with arrow keys, Then disabled and aria-disabled items receive focus", async () => {
      const { Component } = createTestComponent(
        { focusDisabledElements: true },
        { ariaDisabledIndices: [1, 2] },
      );
      await render(Component);

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

    it("Given focusDisabledElements is true, When Enter or Space is pressed on focused disabled item, Then onSelect is not triggered", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        { focusDisabledElements: true, onSelect: onSelectMock },
        { ariaDisabledIndices: [1] },
      );
      await render(Component);

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

    it("Given focusDisabledElements is true, When Enter or Space is pressed on focused enabled item, Then onSelect is triggered normally", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        { focusDisabledElements: true, onSelect: onSelectMock },
        { ariaDisabledIndices: [1] },
      );
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);

      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
    });

    it("Given focusOnHover and focusDisabledElements are both true, When hovering disabled items, Then disabled items receive focus", async () => {
      const { Component } = createTestComponent(
        { focusOnHover: true, focusDisabledElements: true },
        { ariaDisabledIndices: [1] },
      );
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();

      await userEvent.hover(option2);
      await expect.element(option2).toHaveFocus();
    });

    it("Given focusDisabledElements is true, When using programmatic focus methods, Then disabled items can be focused", async () => {
      const { Component, getRoving } = createTestComponent(
        { focusDisabledElements: true },
        { ariaDisabledIndices: [1, 4] },
      );
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option5 = page.getByRole("option", { name: "option 5" });

      await userEvent.click(option1);

      getRoving().focusIndex("next");
      await expect.element(option2).toHaveFocus();

      getRoving().focusIndex("last");
      await expect.element(option5).toHaveFocus();

      getRoving().focusIndex(1);
      await expect.element(option2).toHaveFocus();
    });

    it("Given focusDisabledElements is true, When external activeIndex targets a disabled item, Then tabindex=0 is applied to it", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent(
        {
          activeIndex: controlledIndex,
          focusDisabledElements: true,
        },
        { ariaDisabledIndices: [1] },
      );
      await render(Component);

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

    it("Given focusDisabledElements transitions from true to false, When observed, Then tab stop resolution corrects without jumping DOM focus", async () => {
      const allowDisabledFocusRef = ref(true);
      const { Component, getRoving } = createTestComponent(
        { focusDisabledElements: allowDisabledFocusRef },
        { ariaDisabledIndices: [0] },
      );
      await render(Component);

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

  describe("Scenario: Mount isolation and focus stealing prevention", () => {
    it("Given item 0 is disabled on mount, When widget mounts, Then document focus is not stolen while tabindex initializes correctly", async () => {
      const { Component } = createTestComponent({ entryIndex: 0 }, { disabledIndices: [0] });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      // No element in the widget should have received focus on mount
      await expect.element(option1).not.toHaveFocus();
      await expect.element(option2).not.toHaveFocus();

      // But tabindex should be properly initialized for sequential tab entry
      expect((option1.element() as HTMLElement).tabIndex).toBe(-1);
      expect((option2.element() as HTMLElement).tabIndex).toBe(0);
    });

    it("Given widget is currently unfocused, When activeIndex changes externally, Then focus is not stolen from the active page element", async () => {
      const controlledIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex: controlledIndex });
      await render(Component);

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

  describe("Scenario: Uncontrolled entryIndex and asynchronous element mounting", () => {
    it("Given uncontrolled mode with entryIndex, When initialized, Then activeIndex is -1 and entryIndex item has tabindex=0", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: 2 });
      await render(Component);

      expect(getRoving().activeIndex.value).toBe(-1);
      expect(getRoving().getTabindex(2)).toBe(0);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("Given elements populate asynchronously, When loaded, Then entryIndex is preserved and receives focus on tab in", async () => {
      const isLoaded = ref(false);

      const AsyncComponent = defineComponent(() => {
        const containerEl = useTemplateRef<HTMLDivElement>("container");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const anchorEl = ref<HTMLElement | null>(null);
        const node = useFloatingNode({
          anchorEl,
          floatingEl: containerEl,
          open: ref(true),
        });

        const roving = useRovingFocus(node, {
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

      await render(AsyncComponent);
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

  describe("Scenario: Unfocused initial state and sequential tab stop fallback", () => {
    it("Given initial uncontrolled configuration, When mounted, Then activeIndex is -1 without prematurely highlighting an item", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      expect(getRoving().activeIndex.value).toBe(-1);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      // Fallback designates option 1 as tabindex="0"
      expect((option1.element() as HTMLElement).tabIndex).toBe(0);
      expect((option2.element() as HTMLElement).tabIndex).toBe(-1);
    });

    it("Given initial activeIndex is -1, When tabbing in from outside, Then focus lands on fallback element and syncs activeIndex", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option1 = page.getByRole("option", { name: "option 1" });

      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);
    });

    it("Given initial activeIndex is -1, When focusIndex('next') is called, Then focus navigates to the first enabled item", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });

      // Programmatic next from -1 targets first enabled item
      getRoving().focusIndex("next");
      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);
    });

    it("Given initial activeIndex is -1, When focusIndex('prev') is called, Then focus navigates to the last enabled item", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option5 = page.getByRole("option", { name: "option 5" });

      // Programmatic prev from -1 targets last enabled item
      getRoving().focusIndex("prev");
      await expect.element(option5).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(4);
    });
  });

  describe("Scenario: Native focusin synchronization", () => {
    it("Given an item clicked directly in the DOM, When clicked, Then activeIndex synchronizes and subsequent arrow navigation is relative to it", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

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

  describe("Scenario: Pointer hover scroll stability", () => {
    it("Given focusOnHover is true, When hovering an item, Then focus moves to the item without calling scrollIntoView", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      await render(Component);

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

  describe("Scenario: Reactive entryIndex anchoring and APG priority resolution", () => {
    it("Given reactive entryIndex ref, When tabbing in, Then focus lands on the item corresponding to entryIndex", async () => {
      const selectedIndex = ref(2);
      const { Component } = createTestComponent({ entryIndex: selectedIndex });
      await render(Component);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await userEvent.click(beforeBtn);
      await expect.element(beforeBtn).toHaveFocus();

      await userEvent.tab();
      await expect.element(option3).toHaveFocus();
    });

    it("Given a transient arrow preview is dismissed, When tabbing back in, Then entry focus restores to entryIndex rather than previewed item", async () => {
      const selectedIndex = ref(2);
      const { Component, getRoving } = createTestComponent({ entryIndex: selectedIndex });
      await render(Component);

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

    it("Given dynamic entryIndex updates while widget is unfocused, When updated, Then resting tabindex reflects change without stealing focus", async () => {
      const selectedIndex = ref(1);
      const { Component, getRoving } = createTestComponent({ entryIndex: selectedIndex });
      await render(Component);

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

    it("Given entryIndex targets a disabled item, When tabbing in, Then focus falls back to the first enabled item", async () => {
      const selectedIndex = ref(1); // option 2 is disabled
      const { Component, getRoving } = createTestComponent(
        { entryIndex: selectedIndex },
        { disabledIndices: [1] },
      );
      await render(Component);

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

    it("Given entryIndex is null or undefined, When tabbing in, Then focus falls back to the first enabled item", async () => {
      const selectedIndex = ref<number | null>(null);
      const { Component, getRoving } = createTestComponent({ entryIndex: selectedIndex });
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      expect(getRoving().getTabindex(0)).toBe(0);

      const beforeBtn = page.getByRole("button", { name: "Before Widget" });
      await userEvent.click(beforeBtn);
      await userEvent.tab();

      await expect.element(option1).toHaveFocus();
    });

    it("Given entryIndex is explicitly -1, When evaluated, Then sequential tab-stop entry into the widget is disabled", async () => {
      const { Component, getRoving } = createTestComponent({ entryIndex: -1 });
      await render(Component);

      expect(getRoving().getTabindex(0)).toBe(-1);
      expect(getRoving().getTabindex(1)).toBe(-1);
    });
  });

  describe("Scenario: Focusout boundary handling and blur synchronization", () => {
    it("Given focus inside the widget, When focus leaves the container, Then activeIndex clears to -1", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(option1);
      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);

      await userEvent.click(afterBtn);
      await expect.element(afterBtn).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(-1);
    });

    it("Given focus moving between items within the container, When focus changes, Then activeIndex is not cleared to -1", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

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

  describe("Scenario: Entry focus mode resolution between last-focused and entry-index", () => {
    it("Given entryFocusMode is 'last-focused', When re-entering widget via Shift+Tab, Then focus returns to the last focused item", async () => {
      const { Component } = createTestComponent({
        entryIndex: 1,
        entryFocusMode: "last-focused",
      });
      await render(Component);

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

    it("Given entryFocusMode is 'entry-index', When re-entering widget via Shift+Tab, Then focus resets to entryIndex", async () => {
      const { Component } = createTestComponent({
        entryIndex: 1,
        entryFocusMode: "entry-index",
      });
      await render(Component);

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

    it("Given entryIndex updates reactively while widget is unfocused, When re-entering, Then resting tab stop syncs to updated entryIndex", async () => {
      const entryIndexRef = ref(1);
      const { Component, getRoving } = createTestComponent({
        entryIndex: entryIndexRef,
        entryFocusMode: "last-focused",
      });
      await render(Component);

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

  describe("Scenario: Focus synchronization fast-path optimizations", () => {
    it("Given focusin event targets already active element, When fired, Then fast-path executes without linear element scanning", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);
      await nextTick();

      const roving = getRoving();
      // Set active index to 2
      roving.focusIndex(2);
      await nextTick();

      const option3 = page.getByRole("option", { name: "option 3" }).element() as HTMLElement;
      await expect.element(page.getByRole("option", { name: "option 3" })).toHaveFocus();

      // Spy on option elements' contains method
      const option1 = page.getByRole("option", { name: "option 1" }).element() as HTMLElement;
      const option1ContainsSpy = vi.spyOn(option1, "contains");

      // Trigger focusin with target = option3 (already activeIndex 2)
      option3.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await nextTick();

      // option1 (index 0) should NOT have been scanned via contains()
      expect(option1ContainsSpy).not.toHaveBeenCalled();
      expect(roving.activeIndex.value).toBe(2);

      option1ContainsSpy.mockRestore();
    });

    it("Given focusin event targets a different element than activeIndex, When fired, Then linear scan fallback identifies correct index", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);
      await nextTick();

      const roving = getRoving();
      roving.focusIndex(0);
      await nextTick();
      expect(roving.activeIndex.value).toBe(0);

      const option3 = page.getByRole("option", { name: "option 3" }).element() as HTMLElement;
      // Focus target is option3 while activeIndex is 0
      option3.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await nextTick();

      // Should fall back to linear scan and find index 2
      expect(roving.activeIndex.value).toBe(2);
    });

    it("Given activeIndex cleared externally while DOM focus remains, When navigating, Then resolveFocusedIndex probes lastFocusedIndex first", async () => {
      const activeIndexRef = ref(-1);
      const { Component, getRoving } = createTestComponent({
        activeIndex: activeIndexRef,
        onActiveIndexChange: (idx) => {
          activeIndexRef.value = idx;
        },
      });
      await render(Component);
      await nextTick();

      const roving = getRoving();
      // Focus index 3
      roving.focusIndex(3);
      await nextTick();

      const option1 = page.getByRole("option", { name: "option 1" }).element() as HTMLElement;
      const option4 = page.getByRole("option", { name: "option 4" }).element() as HTMLElement;
      await expect.element(option4).toHaveFocus();

      // Simulate activeIndex cleared externally to -1 while DOM focus remains on option4
      activeIndexRef.value = -1;
      await nextTick();

      const option1ContainsSpy = vi.spyOn(option1, "contains");

      // Navigate down from option4 (should resume from index 3 via lastFocusedIndex fast-path -> index 4)
      option4.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      await nextTick();

      // option1 should NOT have been scanned
      expect(option1ContainsSpy).not.toHaveBeenCalled();
      expect(roving.activeIndex.value).toBe(4);

      option1ContainsSpy.mockRestore();
    });
  });

  describe("Scenario: FloatingNode integration and nested floating tree coordination", () => {
    it("Given a FloatingNode without explicit containerEl, When initialized, Then containerEl resolves from node.refs.floatingEl", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });

      await userEvent.click(option1);
      expect(getRoving().activeIndex.value).toBe(0);

      await userEvent.keyboard("{ArrowDown}");
      expect(getRoving().activeIndex.value).toBe(1);
      await expect.element(option2).toHaveFocus();
    });

    it("Given nested parent and child floating nodes, When focus enters teleported child element, Then parent activeIndex is preserved", async () => {
      let rootRoving!: UseRovingFocusReturn;

      const RootWithChild = defineComponent(() => {
        const rootContainerEl = useTemplateRef<HTMLDivElement>("rootContainer");
        const rootElementsList = ref<(HTMLElement | null)[]>([]);
        const childContainerEl = useTemplateRef<HTMLDivElement>("childContainer");
        const childElementsList = ref<(HTMLElement | null)[]>([]);

        const rootAnchorEl = ref<HTMLElement | null>(null);
        const rootNode = useFloatingNode({
          anchorEl: rootAnchorEl,
          floatingEl: rootContainerEl,
          open: ref(true),
        });

        rootRoving = useRovingFocus(rootNode, {
          elementsList: rootElementsList,
        });

        const childAnchorEl = ref<HTMLElement | null>(null);
        const childNode = useFloatingNode({
          anchorEl: childAnchorEl,
          floatingEl: childContainerEl,
          open: ref(true),
          parent: rootNode,
        });

        useRovingFocus(childNode, {
          elementsList: childElementsList,
        });

        return () =>
          h("div", [
            h("div", { ref: "rootContainer", id: "root-menu" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    rootElementsList.value[0] = el as HTMLElement;
                  },
                  tabindex: rootRoving.getTabindex(0),
                },
                "Root Option 1",
              ),
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    rootElementsList.value[1] = el as HTMLElement;
                  },
                  tabindex: rootRoving.getTabindex(1),
                },
                "Root Option 2 (Sub Trigger)",
              ),
            ]),
            // Teleported child menu rendering outside root container in DOM
            h("div", { ref: "childContainer", id: "child-submenu" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    childElementsList.value[0] = el as HTMLElement;
                  },
                },
                "Child Option 1",
              ),
            ]),
          ]);
      });

      await render(RootWithChild);

      const rootOption2 = page.getByRole("option", { name: "Root Option 2 (Sub Trigger)" });
      const childOption1 = page.getByRole("option", { name: "Child Option 1" });

      // Focus root option 2
      await userEvent.click(rootOption2);
      expect(rootRoving.activeIndex.value).toBe(1);

      // Now move focus to child option 1 (simulating entering teleported submenu)
      await userEvent.click(childOption1);
      await expect.element(childOption1).toHaveFocus();

      // Parent container received focusout, but target is within descendant child in FloatingTree:
      // Parent's activeIndex must NOT be wiped to -1!
      expect(rootRoving.activeIndex.value).toBe(1);
    });

    it("Given nested parent and child floating nodes, When pointer enters teleported child element, Then parent activeIndex is preserved on pointerleave", async () => {
      let rootRoving!: UseRovingFocusReturn;

      const RootWithChild = defineComponent(() => {
        const rootContainerEl = useTemplateRef<HTMLDivElement>("rootContainer");
        const rootElementsList = ref<(HTMLElement | null)[]>([]);
        const childContainerEl = useTemplateRef<HTMLDivElement>("childContainer");

        const rootAnchorEl = ref<HTMLElement | null>(null);
        const rootNode = useFloatingNode({
          anchorEl: rootAnchorEl,
          floatingEl: rootContainerEl,
          open: ref(true),
        });

        rootRoving = useRovingFocus(rootNode, {
          elementsList: rootElementsList,
        });

        const childAnchorEl = ref<HTMLElement | null>(null);
        useFloatingNode({
          anchorEl: childAnchorEl,
          floatingEl: childContainerEl,
          open: ref(true),
          parent: rootNode,
        });

        return () =>
          h("div", [
            h("div", { ref: "rootContainer", id: "root-menu" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    rootElementsList.value[0] = el as HTMLElement;
                  },
                  tabindex: rootRoving.getTabindex(0),
                },
                "Root Option 1",
              ),
            ]),
            h("div", { ref: "childContainer", id: "child-submenu" }, "Child menu"),
          ]);
      });

      await render(RootWithChild);

      const rootOption1 = page.getByRole("option", { name: "Root Option 1" });
      await userEvent.click(rootOption1);
      expect(rootRoving.activeIndex.value).toBe(0);

      const rootContainer = page.getByRole("option", { name: "Root Option 1" }).element()
        ?.parentElement as HTMLElement;
      const childContainer = document.getElementById("child-submenu") as HTMLElement;

      // Dispatch pointerleave from rootContainer with relatedTarget set to childContainer
      rootContainer.dispatchEvent(
        new PointerEvent("pointerleave", { bubbles: false, relatedTarget: childContainer }),
      );
      await nextTick();

      // Parent activeIndex should NOT be cleared to -1
      expect(rootRoving.activeIndex.value).toBe(0);
    });

    it("Given focus leaves the entire floating tree, When focusout fires, Then activeIndex clears to -1", async () => {
      const { Component, getRoving } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      const afterBtn = page.getByRole("button", { name: "After Widget" });

      await userEvent.click(option1);
      expect(getRoving().activeIndex.value).toBe(0);

      // Move focus outside widget to afterBtn
      await userEvent.click(afterBtn);
      await expect.element(afterBtn).toHaveFocus();

      expect(getRoving().activeIndex.value).toBe(-1);
    });

    it("Given open descendant submenus, When navigating between sibling items in parent menu, Then open descendant submenus automatically close", async () => {
      let childNode!: FloatingNode;
      let rootRoving!: UseRovingFocusReturn;

      const RootWithChild = defineComponent(() => {
        const rootContainerEl = useTemplateRef<HTMLDivElement>("rootContainer");
        const rootElementsList = ref<(HTMLElement | null)[]>([]);
        const childContainerEl = useTemplateRef<HTMLDivElement>("childContainer");

        const rootAnchorEl = ref<HTMLElement | null>(null);
        const rootNode = useFloatingNode({
          anchorEl: rootAnchorEl,
          floatingEl: rootContainerEl,
          open: ref(true),
        });

        rootRoving = useRovingFocus(rootNode, {
          elementsList: rootElementsList,
        });

        const childAnchorEl = ref<HTMLElement | null>(null);
        childNode = useFloatingNode({
          anchorEl: childAnchorEl,
          floatingEl: childContainerEl,
          open: ref(true),
          parent: rootNode,
        });

        return () =>
          h("div", [
            h("div", { ref: "rootContainer" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    rootElementsList.value[0] = el as HTMLElement;
                  },
                  tabindex: rootRoving.getTabindex(0),
                },
                "Parent Item 1 (Submenu open)",
              ),
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    rootElementsList.value[1] = el as HTMLElement;
                  },
                  tabindex: rootRoving.getTabindex(1),
                },
                "Parent Item 2",
              ),
            ]),
            h("div", { ref: "childContainer" }, "Child Submenu"),
          ]);
      });

      await render(RootWithChild);

      const item1 = page.getByRole("option", { name: "Parent Item 1 (Submenu open)" });
      const item2 = page.getByRole("option", { name: "Parent Item 2" });

      await userEvent.click(item1);
      expect(rootRoving.activeIndex.value).toBe(0);
      expect(childNode.open.value).toBe(true);

      // ArrowDown to sibling item 2
      await userEvent.keyboard("{ArrowDown}");
      expect(rootRoving.activeIndex.value).toBe(1);
      await expect.element(item2).toHaveFocus();

      // Child node should have been closed automatically
      expect(childNode.open.value).toBe(false);
    });

    it("Given focus in child submenu, When exit-intent arrow key is pressed, Then child submenu closes and focus returns to anchor trigger", async () => {
      let childNode!: FloatingNode;
      let childRoving!: UseRovingFocusReturn;

      const SubmenuFixture = defineComponent(() => {
        const rootFloatingEl = useTemplateRef<HTMLDivElement>("rootFloating");
        const subTriggerEl = useTemplateRef<HTMLButtonElement>("subTrigger");
        const childFloatingEl = useTemplateRef<HTMLDivElement>("childFloating");
        const childElementsList = ref<(HTMLElement | null)[]>([]);

        const rootAnchorEl = ref<HTMLElement | null>(null);
        const rootNode = useFloatingNode({
          anchorEl: rootAnchorEl,
          floatingEl: rootFloatingEl,
          open: ref(true),
        });

        childNode = useFloatingNode({
          anchorEl: subTriggerEl,
          floatingEl: childFloatingEl,
          open: ref(true),
          parent: rootNode,
        });

        childRoving = useRovingFocus(childNode, {
          elementsList: childElementsList,
        });

        return () =>
          h("div", [
            h("div", { ref: "rootFloating" }, [
              h("button", { ref: "subTrigger", id: "sub-trigger" }, "Open Submenu"),
            ]),
            h("div", { ref: "childFloating", id: "child-floating" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    childElementsList.value[0] = el as HTMLElement;
                  },
                  tabindex: childRoving.getTabindex(0),
                },
                "Sub Item 1",
              ),
            ]),
          ]);
      });

      await render(SubmenuFixture);

      const subTrigger = page.getByRole("button", { name: "Open Submenu" });
      const subItem1 = page.getByRole("option", { name: "Sub Item 1" });

      await userEvent.click(subItem1);
      await expect.element(subItem1).toHaveFocus();
      expect(childRoving.activeIndex.value).toBe(0);

      // Press ArrowLeft (exit intent in vertical LTR)
      await userEvent.keyboard("{ArrowLeft}");

      // Child node should close
      expect(childNode.open.value).toBe(false);

      // Focus should return to the anchor trigger
      await expect.element(subTrigger).toHaveFocus();
    });

    it("Given child submenu in RTL layout, When ArrowRight is pressed on sub item, Then child submenu closes and returns focus to anchor", async () => {
      let childNode!: FloatingNode;
      let childRoving!: UseRovingFocusReturn;

      const SubmenuFixtureRtl = defineComponent(() => {
        const rootFloatingEl = useTemplateRef<HTMLDivElement>("rootFloating");
        const subTriggerEl = useTemplateRef<HTMLButtonElement>("subTrigger");
        const childFloatingEl = useTemplateRef<HTMLDivElement>("childFloating");
        const childElementsList = ref<(HTMLElement | null)[]>([]);

        const rootAnchorEl = ref<HTMLElement | null>(null);
        const rootNode = useFloatingNode({
          anchorEl: rootAnchorEl,
          floatingEl: rootFloatingEl,
          open: ref(true),
        });

        childNode = useFloatingNode({
          anchorEl: subTriggerEl,
          floatingEl: childFloatingEl,
          open: ref(true),
          parent: rootNode,
        });

        childRoving = useRovingFocus(childNode, {
          elementsList: childElementsList,
          rtl: true,
        });

        return () =>
          h("div", [
            h("div", { ref: "rootFloating" }, [h("button", { ref: "subTrigger" }, "Open Submenu")]),
            h("div", { ref: "childFloating", dir: "rtl" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    childElementsList.value[0] = el as HTMLElement;
                  },
                  tabindex: childRoving.getTabindex(0),
                },
                "Sub Item 1",
              ),
            ]),
          ]);
      });

      await render(SubmenuFixtureRtl);

      const subTrigger = page.getByRole("button", { name: "Open Submenu" });
      const subItem1 = page.getByRole("option", { name: "Sub Item 1" });

      await userEvent.click(subItem1);
      await expect.element(subItem1).toHaveFocus();

      // Press ArrowRight (exit intent in RTL)
      await userEvent.keyboard("{ArrowRight}");

      expect(childNode.open.value).toBe(false);
      await expect.element(subTrigger).toHaveFocus();
    });

    it("Given a custom onExit callback on child node, When exit key is pressed, Then custom handler intercepts exit without default close", async () => {
      let childNode!: FloatingNode;
      const customOnExit = vi.fn();

      const SubmenuFixture = defineComponent(() => {
        const rootFloatingEl = useTemplateRef<HTMLDivElement>("rootFloating");
        const subTriggerEl = useTemplateRef<HTMLButtonElement>("subTrigger");
        const childFloatingEl = useTemplateRef<HTMLDivElement>("childFloating");
        const childElementsList = ref<(HTMLElement | null)[]>([]);

        const rootAnchorEl = ref<HTMLElement | null>(null);
        const rootNode = useFloatingNode({
          anchorEl: rootAnchorEl,
          floatingEl: rootFloatingEl,
          open: ref(true),
        });

        childNode = useFloatingNode({
          anchorEl: subTriggerEl,
          floatingEl: childFloatingEl,
          open: ref(true),
          parent: rootNode,
        });

        useRovingFocus(childNode, {
          elementsList: childElementsList,
          onExit: customOnExit,
        });

        return () =>
          h("div", [
            h("div", { ref: "rootFloating" }, [h("button", { ref: "subTrigger" }, "Open Submenu")]),
            h("div", { ref: "childFloating" }, [
              h(
                "button",
                {
                  role: "option",
                  ref: (el) => {
                    childElementsList.value[0] = el as HTMLElement;
                  },
                },
                "Sub Item 1",
              ),
            ]),
          ]);
      });

      await render(SubmenuFixture);

      const subItem1 = page.getByRole("option", { name: "Sub Item 1" });
      await userEvent.click(subItem1);

      await userEvent.keyboard("{ArrowLeft}");

      expect(customOnExit).toHaveBeenCalledTimes(1);
      expect(customOnExit).toHaveBeenCalledWith(0, expect.any(KeyboardEvent));
      // Child node should NOT be closed because custom handler intercepted it
      expect(childNode.open.value).toBe(true);
    });

    it("Given node.open transitions to false, When closed, Then roving focus resets and tabStopIndex restores to entryIndex", async () => {
      const { Component, getRoving, getContext } = createTestComponent();
      await render(Component);

      const option3 = page.getByRole("option", { name: "option 3" });
      await userEvent.click(option3);
      expect(getRoving().activeIndex.value).toBe(2);

      // Close the node
      getContext().open.value = false;
      await nextTick();

      expect(getRoving().activeIndex.value).toBe(-1);
      expect(getRoving().tabStopIndex.value).toBe(0); // restored to entryIndex
    });

    it("Given root floating node without onExit handler, When exit arrow key is pressed, Then root node does not close or exit", async () => {
      const { Component, getRoving, getContext } = createTestComponent();
      await render(Component);

      const option1 = page.getByRole("option", { name: "option 1" });
      await userEvent.click(option1);
      expect(getRoving().activeIndex.value).toBe(0);

      await userEvent.keyboard("{ArrowLeft}");
      // Context should remain open and activeIndex unchanged
      expect(getContext().open.value).toBe(true);
      expect(getRoving().activeIndex.value).toBe(0);
    });
  });
});
