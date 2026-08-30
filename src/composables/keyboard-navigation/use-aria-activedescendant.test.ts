import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import {
  type UseAriaActivedescendantOptions,
  type UseAriaActivedescendantReturn,
  useAriaActivedescendant,
} from "./use-aria-activedescendant";

interface FixtureConfig {
  itemCount?: number;
  disabledIndices?: number[];
  ariaDisabledIndices?: number[];
  dir?: string;
  noListbox?: boolean;
  noElementsList?: boolean;
  isButtonTarget?: boolean;
  itemKeys?: Array<string | number>;
  withInteractiveChild?: boolean;
}

const createTestComponent = (
  options: Partial<UseAriaActivedescendantOptions> = {},
  config: FixtureConfig = {},
) => {
  let composableReturn!: UseAriaActivedescendantReturn;
  const countRef = ref(config.itemCount ?? 5);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const listboxEl = useTemplateRef<HTMLElement>("listbox");
    const elementsList = ref<(HTMLElement | null)[]>([]);

    composableReturn = useAriaActivedescendant({
      anchorEl,
      listboxEl: config.noListbox ? undefined : listboxEl,
      elementsList: config.noElementsList ? undefined : elementsList,
      ...options,
    });

    const register = (el: Element | null, idx: number) => {
      elementsList.value[idx] = el as HTMLElement;
    };

    const disabledSet = new Set(config.disabledIndices ?? []);
    const ariaDisabledSet = new Set(config.ariaDisabledIndices ?? []);

    return () =>
      h("div", { class: "test-wrapper", dir: config.dir }, [
        config.isButtonTarget
          ? h("button", {
              ref: "anchor",
              "aria-label": "anchor-button",
              ...composableReturn.getAnchorProps(),
            })
          : h("input", {
              ref: "anchor",
              "aria-label": "anchor",
              ...composableReturn.getAnchorProps(),
            }),
        h(
          "ul",
          {
            ref: "listbox",
            role: "listbox",
            style: "max-height: 100px; max-width: 100px; overflow: auto;",
            ...composableReturn.getListboxProps(),
          },
          Array.from({ length: countRef.value }).map((_, idx) => {
            const key = config.itemKeys?.[idx];
            const itemProps =
              key !== undefined
                ? composableReturn.getItemProps({ index: idx, key })
                : composableReturn.getOptionProps(idx);

            return h(
              "li",
              {
                role: "option",
                ref: (el) => register(el as Element, idx),
                ...itemProps,
                disabled: disabledSet.has(idx) ? true : undefined,
                ...(ariaDisabledSet.has(idx) ? { "aria-disabled": "true" } : {}),
                style: "height: 50px; width: 50px; min-width: 50px;", // To ensure scrolling works
              },
              config.withInteractiveChild
                ? [
                    h("span", "option " + (idx + 1)),
                    h("button", { class: "nested-btn", type: "button" }, "Action"),
                  ]
                : "option " + (idx + 1),
            );
          }),
        ),
      ]);
  });

  return { Component, getReturn: () => composableReturn, countRef };
};

describe("useAriaActivedescendant", () => {
  describe("Suite 1: ID generation & resolution", () => {
    it("generates deterministic IDs using default prefix", async () => {
      const { Component, getReturn } = createTestComponent();
      render(Component);
      const props = getReturn().getOptionProps(0);
      expect(props.id).toMatch(/^vfloat-.*-opt-0$/);
    });

    it("uses custom idPrefix when provided", async () => {
      const { Component, getReturn } = createTestComponent({ idPrefix: "custom-id" });
      render(Component);
      const props = getReturn().getOptionProps(1);
      expect(props.id).toBe("custom-id-opt-1");
    });

    it("uses custom getItemId callback when provided", async () => {
      const { Component, getReturn } = createTestComponent({
        getItemId: (idx) => `item-${idx}`,
      });
      render(Component);
      const props = getReturn().getOptionProps(2);
      expect(props.id).toBe("item-2");
    });

    it("uses getItemKey callback to generate stable key-based IDs", async () => {
      const { Component, getReturn } = createTestComponent({
        getItemKey: (idx) => `key-${idx * 10}`,
        idPrefix: "test",
      });
      render(Component);
      const props = getReturn().getItemProps(2);
      expect(props.id).toBe("test-opt-key-20");
    });

    it("supports polymorphic item parameter in getItemProps", async () => {
      const { Component, getReturn } = createTestComponent({ idPrefix: "test" });
      render(Component);
      const props = getReturn().getItemProps({ index: 3, key: "alpha" });
      expect(props.id).toBe("test-opt-alpha");
      expect(props["data-key"]).toBe("alpha");
      expect(props["data-index"]).toBe(3);
    });
  });

  describe("Suite 2: aria-activedescendant attribute management & mounted DOM validation", () => {
    it("sets aria-activedescendant on anchor when item is active and mounted", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect
        .element(anchor)
        .toHaveAttribute("aria-activedescendant", expect.stringMatching(/.*-opt-0/));
    });

    it("removes aria-activedescendant when no item is active", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).toHaveAttribute("aria-activedescendant");
      getReturn().clearActive();
      await nextTick();
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("removes aria-activedescendant when disabled (enabled: false)", async () => {
      const enabled = ref(true);
      const { Component } = createTestComponent({ defaultIndex: 0, enabled });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).toHaveAttribute("aria-activedescendant");
      enabled.value = false;
      await nextTick();
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("does NOT emit dangling ID when active item is not mounted in the DOM", async () => {
      // In virtual lists where items are not in the DOM, activeId should be undefined
      const virtualizer = { scrollToIndex: vi.fn(), count: 100 };
      const { Component } = createTestComponent({ defaultIndex: 50, virtualizer } as any, {
        noElementsList: true,
      });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      // Item 50 is not in the DOM, so aria-activedescendant must NOT be set
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("commits aria-activedescendant once virtual item is rendered and mounted in the DOM", async () => {
      const isRendered = ref(false);
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLInputElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");
        const virtualizer = { scrollToIndex: vi.fn(), count: 100 };

        const { getAnchorProps, getOptionProps } = useAriaActivedescendant({
          anchorEl,
          listboxEl,
          defaultIndex: 50,
          virtualizer,
          idPrefix: "virt",
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor", ...getAnchorProps() }),
            h(
              "ul",
              { ref: "listbox", role: "listbox" },
              isRendered.value
                ? [h("li", { role: "option", ...getOptionProps(50) }, "Item 50")]
                : [],
            ),
          ]);
      });

      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");

      // Virtualizer renders item 50 into the DOM
      isRendered.value = true;
      await nextTick();

      await expect.element(anchor).toHaveAttribute("aria-activedescendant", "virt-opt-50");
    });

    it("rejects invalid/whitespace IDs and does not emit them", async () => {
      const { Component } = createTestComponent({
        defaultIndex: 0,
        getItemId: () => "invalid id with spaces",
      });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });
  });

  describe("Suite 3: data-active & selection separation", () => {
    it("sets data-active on the active option", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1 });
      render(Component);
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("removes data-active from previously active option (only one at a time)", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 1 });
      render(Component);
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option2).toHaveAttribute("data-active", "");
      getReturn().setActiveIndex(2);
      await nextTick();
      await expect.element(option2).not.toHaveAttribute("data-active");
      await expect.element(option3).toHaveAttribute("data-active", "");
    });

    it("does NOT hardcode aria-selected on options (selection is consumer-controlled)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      // aria-selected should not be forced by the focus primitive
      await expect.element(option1).not.toHaveAttribute("aria-selected");
      await expect.element(option2).not.toHaveAttribute("aria-selected");
    });

    it("sets aria-disabled='true' on disabled options", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [1] });
      render(Component);
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("aria-disabled", "true");
    });

    it("does not set aria-disabled on enabled options (attribute absent)", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).not.toHaveAttribute("aria-disabled");
    });
  });

  describe("Suite 4: keyboard navigation — vertical (default)", () => {
    it("navigates to next item on ArrowDown", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("navigates to previous item on ArrowUp", async () => {
      const { Component } = createTestComponent({ defaultIndex: 2 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowUp}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("navigates to first item on Home on non-editable targets", async () => {
      const { Component } = createTestComponent({ defaultIndex: 3 }, { isButtonTarget: true });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor-button" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Home}");
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("navigates to last item on End on non-editable targets", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 }, { isButtonTarget: true });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor-button" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{End}");
      const option5 = page.getByRole("option", { name: "option 5" });
      await expect.element(option5).toHaveAttribute("data-active", "");
    });

    it("does not navigate on ArrowLeft/ArrowRight in vertical mode", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowRight}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("ignores keys with modifier (Ctrl, Meta, Alt)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      anchor
        .element()
        .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true }));
      await nextTick();
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("ignores IME composition events", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      anchor
        .element()
        .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", isComposing: true }));
      await nextTick();
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("prevents default on navigation keys", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      let prevented = false;
      window.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "ArrowDown" && e.defaultPrevented) prevented = true;
        },
        { once: true },
      );
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      expect(prevented).toBe(true);
    });

    it("does not prevent default on unhandled keys (Tab, Escape pass through)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      let prevented = false;
      anchor.element().addEventListener("keydown", (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === "Escape" && keyEvent.defaultPrevented) prevented = true;
      });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Escape}");
      expect(prevented).toBe(false);
    });
  });

  describe("Suite 5: keyboard navigation — horizontal", () => {
    it("navigates to next item on ArrowRight", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0, orientation: "horizontal" });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowRight}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("navigates to previous item on ArrowLeft", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1, orientation: "horizontal" });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowLeft}");
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("does not navigate on ArrowDown/ArrowUp in horizontal mode", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1, orientation: "horizontal" });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option2).toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 6: keyboard navigation — both orientation", () => {
    it("navigates on all four arrow keys (Down/Right → next, Up/Left → previous)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1, orientation: "both" });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");

      await userEvent.keyboard("{ArrowRight}");
      await expect
        .element(page.getByRole("option", { name: "option 4" }))
        .toHaveAttribute("data-active", "");

      await userEvent.keyboard("{ArrowUp}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");

      await userEvent.keyboard("{ArrowLeft}");
      await expect
        .element(page.getByRole("option", { name: "option 2" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 7: keyboard navigation — RTL", () => {
    it("swaps ArrowLeft/ArrowRight in horizontal RTL mode", async () => {
      const { Component } = createTestComponent({
        defaultIndex: 1,
        orientation: "horizontal",
        rtl: true,
      });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{ArrowLeft}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");

      await userEvent.keyboard("{ArrowRight}");
      await expect
        .element(page.getByRole("option", { name: "option 2" }))
        .toHaveAttribute("data-active", "");
    });

    it("detects RTL from container dir attribute", async () => {
      const { Component } = createTestComponent(
        { defaultIndex: 1, orientation: "horizontal" },
        { dir: "rtl" },
      );
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{ArrowLeft}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 8: boundary behavior — no loop", () => {
    it("stays on last item when pressing ArrowDown at end (loop: false)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 4, loop: false });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 5" }))
        .toHaveAttribute("data-active", "");
    });

    it("stays on first item when pressing ArrowUp at start (loop: false)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0, loop: false });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowUp}");
      await expect
        .element(page.getByRole("option", { name: "option 1" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 9: boundary behavior — loop", () => {
    it("wraps to first item when pressing ArrowDown at end (loop: true)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 4, loop: true });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 1" }))
        .toHaveAttribute("data-active", "");
    });

    it("wraps to last item when pressing ArrowUp at start (loop: true)", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0, loop: true });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowUp}");
      await expect
        .element(page.getByRole("option", { name: "option 5" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 10: disabled item handling", () => {
    it("skips disabled items during keyboard navigation", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 }, { disabledIndices: [1] });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });

    it("skips aria-disabled items during keyboard navigation", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 }, { ariaDisabledIndices: [1] });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });

    it("skips items matching isItemDisabled predicate", async () => {
      const { Component } = createTestComponent({
        defaultIndex: 0,
        isItemDisabled: (idx) => idx === 1,
      });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });

    it("allows focusing disabled items when focusDisabledElements is true", async () => {
      const { Component } = createTestComponent(
        { defaultIndex: 0, focusDisabledElements: true },
        { disabledIndices: [1] },
      );
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 2" }))
        .toHaveAttribute("data-active", "");
    });

    it("blocks selection on disabled items even when focusDisabledElements is true", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        {
          defaultIndex: 1,
          focusDisabledElements: true,
          onSelect: onSelectMock,
        },
        { disabledIndices: [1] },
      );
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).not.toHaveBeenCalled();
    });
  });

  describe("Suite 11: selection & editable input preservation", () => {
    it("calls onSelect with correct index and event on Enter when an item is active", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: 2, onSelect: onSelectMock });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).toHaveBeenCalledWith(2, expect.any(Event));
    });

    it("does not call onSelect on Enter when no item is active (Enter passes through)", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: -1, onSelect: onSelectMock });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it("preserves Space character typing inside editable inputs (does not select)", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: 1, onSelect: onSelectMock });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("hello world ");
      await expect.element(anchor).toHaveValue("hello world ");
      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it("calls onSelect on Space on non-editable targets", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        { defaultIndex: 1, onSelect: onSelectMock },
        { isButtonTarget: true },
      );
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor-button" });
      await userEvent.click(anchor);
      await userEvent.keyboard(" ");
      expect(onSelectMock).toHaveBeenCalledWith(1, expect.any(Event));
    });

    it("preserves Home and End keys for native text caret movement in editable inputs", async () => {
      const { Component } = createTestComponent({ defaultIndex: 2 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("abc");
      await userEvent.keyboard("{Home}");
      // Active index should not change to 0
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 12: pointer hover navigation & virtual hover", () => {
    it("activates item on pointermove when focusOnHover is true", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      render(Component);
      await nextTick();
      const option3 = page.getByRole("option", { name: "option 3" });
      option3
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
      await nextTick();
      await expect.element(option3).toHaveAttribute("data-active", "");
    });

    it("does not activate on pointermove when focusOnHover is false", async () => {
      const { Component } = createTestComponent({ focusOnHover: false });
      render(Component);
      const option3 = page.getByRole("option", { name: "option 3" });
      option3
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
      await nextTick();
      await expect.element(option3).not.toHaveAttribute("data-active");
    });

    it("activates item on hover using data-index in virtualized lists without elementsList", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLInputElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");

        const { getAnchorProps, getOptionProps } = useAriaActivedescendant({
          anchorEl,
          listboxEl,
          itemCount: 10,
          focusOnHover: true,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor", ...getAnchorProps() }),
            h(
              "ul",
              { ref: "listbox", role: "listbox" },
              Array.from({ length: 5 }).map((_, idx) =>
                h("li", { role: "option", ...getOptionProps(idx) }, `virtual ${idx}`),
              ),
            ),
          ]);
      });

      render(Component);
      await nextTick();
      const option2 = page.getByRole("option", { name: "virtual 2" });
      option2
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
      await nextTick();
      await expect.element(option2).toHaveAttribute("data-active", "");
    });
  });

  describe("Suite 13: pointer focus protection & interactive descendants", () => {
    it("prevents pointerdown default on options to retain anchor focus", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const option1 = page.getByRole("option", { name: "option 1" });
      let prevented = false;
      option1.element().addEventListener("pointerdown", (e) => {
        if (e.defaultPrevented) prevented = true;
      });
      option1
        .element()
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      expect(prevented).toBe(true);
    });

    it("does NOT prevent default when clicking an interactive child inside an option", async () => {
      const { Component } = createTestComponent({}, { withInteractiveChild: true });
      render(Component);
      const btn = (
        page.getByRole("option", { name: "option 1" }).element() as HTMLElement
      ).querySelector(".nested-btn") as HTMLElement;

      let prevented = false;
      btn.addEventListener("pointerdown", (e) => {
        if (e.defaultPrevented) prevented = true;
      });
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      expect(prevented).toBe(false);
    });

    it("respects preventPointerDown: false option", async () => {
      const { Component } = createTestComponent({ preventPointerDown: false });
      render(Component);
      const option1 = page.getByRole("option", { name: "option 1" });
      let prevented = false;
      option1.element().addEventListener("pointerdown", (e) => {
        if (e.defaultPrevented) prevented = true;
      });
      option1
        .element()
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      expect(prevented).toBe(false);
    });
  });

  describe("Suite 14: controlled vs uncontrolled state & external sync", () => {
    it("syncs with external activeIndex ref and triggers scroll reveal", async () => {
      const activeIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex }, { itemCount: 10 });
      render(Component);
      const listbox = page.getByRole("listbox").element() as HTMLElement;
      expect(listbox.scrollTop).toBe(0);

      activeIndex.value = 9;
      await nextTick();

      const option10 = page.getByRole("option", { name: "option 10" });
      await expect.element(option10).toHaveAttribute("data-active", "");
      expect(listbox.scrollTop).toBeGreaterThan(0);
    });

    it("fires onActiveIndexChange on navigation", async () => {
      const onChangeMock = vi.fn();
      const { Component } = createTestComponent({
        defaultIndex: 0,
        onActiveIndexChange: onChangeMock,
      });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      expect(onChangeMock).toHaveBeenCalledWith(1);
    });
  });

  describe("Suite 15: programmatic navigation", () => {
    it("setActiveIndex programmatically sets active item", async () => {
      const { Component, getReturn } = createTestComponent();
      render(Component);
      getReturn().setActiveIndex(2);
      await nextTick();
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveAttribute("data-active", "");
    });

    it("clearActive resets to -1", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 2 });
      render(Component);
      getReturn().clearActive();
      await nextTick();
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });
  });

  describe("Suite 16: focus-entry synchronization", () => {
    it("reveals and syncs active item when target receives focus", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 }, { itemCount: 10 });
      render(Component);
      const listbox = page.getByRole("listbox").element() as HTMLElement;

      getReturn().setActiveIndex(9);
      await nextTick();
      expect(listbox.scrollTop).toBeGreaterThan(0);

      // Reset scroll manually
      listbox.scrollTop = 0;
      expect(listbox.scrollTop).toBe(0);

      // Focus enters target
      const anchor = page.getByRole("textbox", { name: "anchor" });
      anchor.element().dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await nextTick();

      expect(listbox.scrollTop).toBeGreaterThan(0);
    });
  });

  describe("Suite 17: bounded scrolling — vertical, horizontal, bidirectional", () => {
    it("adjusts horizontal container scrollLeft for horizontal lists", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const containerEl = useTemplateRef<HTMLElement>("container");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const { getAnchorProps, getOptionProps } = useAriaActivedescendant({
          anchorEl,
          containerEl,
          elementsList,
          orientation: "horizontal",
          defaultIndex: 0,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor", ...getAnchorProps() }),
            h(
              "div",
              {
                ref: "container",
                style: "display: flex; width: 100px; overflow: auto;",
              },
              Array.from({ length: 10 }).map((_, idx) =>
                h(
                  "div",
                  {
                    ref: (el) => (elementsList.value[idx] = el as HTMLElement),
                    ...getOptionProps(idx),
                    style: "min-width: 60px; height: 30px;",
                  },
                  `Item ${idx}`,
                ),
              ),
            ),
          ]);
      });

      render(Component);
      const container = (page.getByRole("textbox", { name: "anchor" }).element() as HTMLElement)
        .nextElementSibling as HTMLElement;
      expect(container.scrollLeft).toBe(0);

      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");

      await nextTick();
      expect(container.scrollLeft).toBeGreaterThan(0);
    });
  });

  describe("Suite 18: virtualizer integration & stable item keys", () => {
    it("calls virtualizer.scrollToIndex on navigation and external activeIndex change", async () => {
      const virtualizer = { scrollToIndex: vi.fn(), count: 100 };
      const activeIndex = ref(0);
      const { Component } = createTestComponent({ virtualizer, activeIndex } as any, {
        noElementsList: true,
      });
      render(Component);

      activeIndex.value = 42;
      await nextTick();
      expect(virtualizer.scrollToIndex).toHaveBeenCalledWith(42, { align: "auto" });
    });

    it("generates stable key-based ID from getVirtualItemProps", async () => {
      const { Component, getReturn } = createTestComponent({ idPrefix: "virt" });
      render(Component);
      const props = getReturn().getVirtualItemProps({ index: 5, key: "unique-row-5" });
      expect(props.id).toBe("virt-opt-unique-row-5");
      expect(props["data-key"]).toBe("unique-row-5");
    });
  });

  describe("Suite 19: DOM focus invariant", () => {
    it("DOM focus never leaves the anchor during keyboard navigation", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(anchor).toHaveFocus();
    });

    it("DOM focus never leaves the anchor during programmatic navigation", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 });
      render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      getReturn().setActiveIndex(3);
      await nextTick();
      await expect.element(anchor).toHaveFocus();
    });
  });

  describe("Suite 20: generic API surface & aliases", () => {
    it("provides getTargetProps and getContainerProps matching aliases", () => {
      const { Component, getReturn } = createTestComponent();
      render(Component);
      const ret = getReturn();
      expect(ret.getTargetProps).toBe(ret.getAnchorProps);
      expect(ret.getContainerProps).toBe(ret.getListboxProps);
      expect(ret.getItemProps).toBeDefined();
    });
  });
});
