import { useClick } from "../click/use-click";
import { useFloatingContext } from "../floating-context";
import { usePosition } from "../position";
import {
  createFocusDriver,
  createNavigableCollection,
  createNavigationTraverser,
  findFirstNavigableIndex,
  findLastNavigableIndex,
  findNextNavigableIndex,
  type UseRovingFocusOptions,
  type UseRovingFocusReturn,
  useRovingFocus,
} from "./use-roving-focus";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, ref, useTemplateRef } from "vue";

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
      const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
      const floatingEl = useTemplateRef<HTMLDivElement>("floating");

      const context = useFloatingContext({ anchorEl, floatingEl });
      const itemsList = ref<(HTMLElement | null)[]>([]);
      const { styles } = usePosition(context);
      useClick(context);

      rovingReturn = useRovingFocus(context, {
        itemsList,
        ...options,
      });

      const register = (el: Element | null, index: number) => {
        itemsList.value[index] = el as HTMLElement;
      };

      const count = config.itemCount ?? 5;
      const disabledSet = new Set(config.disabledIndices ?? []);
      const ariaDisabledSet = new Set(config.ariaDisabledIndices ?? []);

      return () => [
        h("button", { ref: "anchor" }, "anchor"),
        context.state.open.value &&
          h(
            "div",
            {
              ref: "floating",
              style: styles.value,
              dir: config.dir,
            },
            Array.from({ length: count }).map((_, idx) =>
              h(
                "div",
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
      ];
    });

    return { Component, getRoving: () => rovingReturn };
  };

  describe("initial focus & lifecycle", () => {
    it("navigates to first item on open by default", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveFocus();
    });

    it("does not focus automatically when autoFocus is false", async () => {
      const { Component } = createTestComponent({ autoFocus: false });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).not.toHaveFocus();
    });

    it("focuses initialIndex on open when provided", async () => {
      const { Component } = createTestComponent({ initialIndex: 2 });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveFocus();
    });

    it("skips disabled item when focusing initial on open", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [0] });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveFocus();
    });

    it("resets activeIndex when floating closes", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveFocus();
      expect(getRoving().activeIndex.value).toBe(0);

      await userEvent.click(anchor);
      expect(getRoving().activeIndex.value).toBeNull();
    });
  });

  describe("vertical keyboard navigation", () => {
    it("navigates to prev/next item on arrow down/up", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(page.getByRole("option", { name: "option 2" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(page.getByRole("option", { name: "option 3" })).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(page.getByRole("option", { name: "option 2" })).toHaveFocus();
    });

    it("jumps to first item on Home and last item on End", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{End}");
      await expect.element(page.getByRole("option", { name: "option 5" })).toHaveFocus();

      await userEvent.keyboard("{Home}");
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();
    });

    it("stops at boundaries when loop is false", async () => {
      const { Component } = createTestComponent({ loop: false });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{End}");
      await expect.element(page.getByRole("option", { name: "option 5" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(page.getByRole("option", { name: "option 5" })).toHaveFocus();
    });

    it("wraps around boundaries when loop is true", async () => {
      const { Component } = createTestComponent({ loop: true });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(page.getByRole("option", { name: "option 5" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();
    });

    it("skips disabled and aria-disabled items during navigation", async () => {
      const { Component } = createTestComponent(
        {},
        { disabledIndices: [1], ariaDisabledIndices: [2] },
      );
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(page.getByRole("option", { name: "option 4" })).toHaveFocus();

      await userEvent.keyboard("{ArrowUp}");
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();
    });

    it("respects custom isItemDisabled predicate", async () => {
      const { Component } = createTestComponent({
        isItemDisabled: (_, index) => index === 1,
      });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(page.getByRole("option", { name: "option 3" })).toHaveFocus();
    });
  });

  describe("horizontal & RTL navigation", () => {
    it("navigates on ArrowRight and ArrowLeft in horizontal orientation", async () => {
      const { Component } = createTestComponent({ orientation: "horizontal" });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      await userEvent.keyboard("{ArrowRight}");
      await expect.element(page.getByRole("option", { name: "option 2" })).toHaveFocus();

      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();
    });

    it("inverts horizontal arrow directions in RTL mode", async () => {
      const { Component } = createTestComponent({ orientation: "horizontal" }, { dir: "rtl" });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      // In RTL, ArrowLeft moves forward (next) and ArrowRight moves backward (prev)
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(page.getByRole("option", { name: "option 2" })).toHaveFocus();

      await userEvent.keyboard("{ArrowRight}");
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();
    });
  });

  describe("roving tabindex synchronization", () => {
    it("maintains tabindex 0 on active item and -1 on inactive siblings", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });

      await expect.element(option1).toHaveAttribute("tabindex", "0");
      await expect.element(option2).toHaveAttribute("tabindex", "-1");
      await expect.element(option3).toHaveAttribute("tabindex", "-1");

      await userEvent.keyboard("{ArrowDown}");

      await expect.element(option1).toHaveAttribute("tabindex", "-1");
      await expect.element(option2).toHaveAttribute("tabindex", "0");
      await expect.element(option3).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("virtual lists & programmatic navigation", () => {
    it("tracks virtualItemRef and notifies onNavigate callback", async () => {
      const onNavigateMock = vi.fn();
      const virtualItemRef = ref<HTMLElement | null>(null);

      const { Component } = createTestComponent({
        virtual: true,
        virtualItemRef,
        onNavigate: onNavigateMock,
      });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      expect(onNavigateMock).toHaveBeenCalledWith(0);
      expect(virtualItemRef.value).not.toBeNull();

      await userEvent.keyboard("{ArrowDown}");
      expect(onNavigateMock).toHaveBeenCalledWith(1);
    });

    it("supports programmatic navigation methods", async () => {
      const { Component, getRoving } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      getRoving().next();
      await expect.element(page.getByRole("option", { name: "option 2" })).toHaveFocus();

      getRoving().last();
      await expect.element(page.getByRole("option", { name: "option 5" })).toHaveFocus();

      getRoving().prev();
      await expect.element(page.getByRole("option", { name: "option 4" })).toHaveFocus();

      getRoving().first();
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();
    });
  });

  describe("disabled state & event ignoring", () => {
    it("does not navigate when enabled is false", async () => {
      const { Component } = createTestComponent({ enabled: false });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).not.toHaveFocus();
    });

    it("handles all options disabled without throwing or stealing focus", async () => {
      const { Component } = createTestComponent({}, { itemCount: 3, disabledIndices: [0, 1, 2] });
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).not.toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      await expect.element(option1).not.toHaveFocus();
    });

    it("ignores key combinations with ctrl, alt, or meta keys", async () => {
      const { Component } = createTestComponent();
      render(Component);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
      await expect.element(option1).toHaveFocus();

      await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
      await expect.element(option1).toHaveFocus();
    });
  });

  describe("dynamic updates & scrolling", () => {
    it("supports dynamically appending new items to the list", async () => {
      const count = ref(3);

      const DynamicComponent = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
        const floatingEl = useTemplateRef<HTMLDivElement>("floating");
        const context = useFloatingContext({ anchorEl, floatingEl });
        const itemsList = ref<(HTMLElement | null)[]>([]);
        const { styles } = usePosition(context);
        useClick(context);

        useRovingFocus(context, { itemsList });

        const register = (el: Element | null, index: number) => {
          itemsList.value[index] = el as HTMLElement;
        };

        return () => [
          h("button", { ref: "anchor" }, "anchor"),
          context.state.open.value &&
            h(
              "div",
              { ref: "floating", style: styles.value },
              Array.from({ length: count.value }).map((_, idx) =>
                h(
                  "div",
                  {
                    role: "option",
                    ref: (el) => register(el as Element, idx),
                  },
                  "option " + (idx + 1),
                ),
              ),
            ),
        ];
      });

      render(DynamicComponent);
      const anchor = page.getByRole("button", { name: "anchor" });

      await userEvent.click(anchor);
      await expect.element(page.getByRole("option", { name: "option 1" })).toHaveFocus();

      count.value++;
      const option4 = page.getByRole("option", { name: "option 4" });
      await expect.element(option4).toBeInTheDocument();

      await userEvent.keyboard("{End}");
      await expect.element(option4).toHaveFocus();
    });
  });

  describe("pure traversal algorithms & drivers", () => {
    it("finds next enabled index correctly without loop", () => {
      const collection = {
        getCount: () => 4,
        getItem: () => null,
        isDisabled: (idx: number) => idx === 1,
      };

      expect(findNextNavigableIndex(0, 1, collection, false)).toBe(2);
      expect(findNextNavigableIndex(2, 1, collection, false)).toBe(3);
      expect(findNextNavigableIndex(3, 1, collection, false)).toBeNull();
    });

    it("wraps around when loop is true", () => {
      const collection = {
        getCount: () => 3,
        getItem: () => null,
        isDisabled: (idx: number) => idx === 0,
      };

      expect(findNextNavigableIndex(2, 1, collection, true)).toBe(1);
      expect(findNextNavigableIndex(1, -1, collection, true)).toBe(2);
    });

    it("finds first and last enabled index", () => {
      const collection = {
        getCount: () => 4,
        getItem: () => null,
        isDisabled: (idx: number) => idx === 0 || idx === 3,
      };

      expect(findFirstNavigableIndex(collection)).toBe(1);
      expect(findLastNavigableIndex(collection)).toBe(2);
    });

    it("creates navigable collection that inspects DOM attributes and handles virtual counts", () => {
      const el0 = document.createElement("div");
      const el1 = document.createElement("div");
      el1.setAttribute("aria-disabled", "true");

      const collection = createNavigableCollection({
        itemsList: [el0, el1],
      });

      expect(collection.getCount()).toBe(2);
      expect(collection.getItem(0)).toBe(el0);
      expect(collection.isDisabled(0)).toBe(false);
      expect(collection.isDisabled(1)).toBe(true);

      const virtualCollection = createNavigableCollection({
        itemsList: [],
        virtual: true,
        itemCount: 100,
      });
      expect(virtualCollection.getCount()).toBe(100);
      expect(virtualCollection.isDisabled(10)).toBe(false);
    });

    it("creates navigation traverser that resolves semantic intents", () => {
      const collection = {
        getCount: () => 3,
        getItem: () => null,
        isDisabled: (idx: number) => idx === 1,
      };

      const traverser = createNavigationTraverser(collection, { loop: true });

      expect(traverser.findNext(0)).toBe(2);
      expect(traverser.findPrev(2)).toBe(0);
      expect(traverser.findFirst()).toBe(0);
      expect(traverser.findLast()).toBe(2);
      expect(traverser.resolveIntent("next", 0)).toBe(2);
      expect(traverser.resolveIntent("first", 2)).toBe(0);
      expect(traverser.resolveIntent("select", 0)).toBeNull();
    });

    it("creates focus driver that synchronizes tabindex and applies focus", () => {
      const el0 = document.createElement("button");
      const el1 = document.createElement("button");
      document.body.appendChild(el0);
      document.body.appendChild(el1);
      const virtualRef = ref<HTMLElement | null>(null);

      const focusDriver = createFocusDriver({
        itemsList: [el0, el1],
        virtualItemRef: virtualRef,
      });

      focusDriver.sync(1, el1);

      expect(el0.tabIndex).toBe(-1);
      expect(el1.tabIndex).toBe(0);
      expect(virtualRef.value).toBe(el1);
      expect(document.activeElement).toBe(el1);

      el0.remove();
      el1.remove();
    });
  });
});
