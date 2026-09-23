import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { useFloatingNode } from "@/composables/floating-node";
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
  node?: FloatingNode;
}

const createTestComponent = (
  options: Partial<UseAriaActivedescendantOptions> = {},
  config: FixtureConfig = {},
) => {
  let composableReturn!: UseAriaActivedescendantReturn;
  let testNode!: FloatingNode;
  const countRef = ref(config.itemCount ?? 5);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const listboxEl = useTemplateRef<HTMLElement>("listbox");
    const elementsList = ref<(HTMLElement | null)[]>([]);

    const floatingNode =
      config.node ??
      useFloatingNode({
        anchorEl,
        floatingEl: listboxEl,
        open: ref(true),
      });
    testNode = floatingNode;

    composableReturn = useAriaActivedescendant(floatingNode, {
      containerEl: config.noListbox ? undefined : listboxEl,
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
            })
          : h("input", {
              ref: "anchor",
              "aria-label": "anchor",
            }),
        h(
          "ul",
          {
            ref: "listbox",
            role: "listbox",
            style: "max-height: 100px; max-width: 100px; overflow: auto;",
          },
          Array.from({ length: countRef.value }).map((_, idx) => {
            const key = config.itemKeys?.[idx];
            const id = composableReturn.getItemId(idx, key);
            const isActive = composableReturn.activeIndex.value === idx;

            return h(
              "li",
              {
                id,
                role: "option",
                ref: (el) => register(el as Element, idx),
                "data-active": isActive ? "" : undefined,
                "data-index": idx,
                ...(key !== undefined ? { "data-key": key } : {}),
                disabled: disabledSet.has(idx) ? true : undefined,
                ...(ariaDisabledSet.has(idx) || disabledSet.has(idx)
                  ? { "aria-disabled": "true" }
                  : {}),
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

  return { Component, getReturn: () => composableReturn, countRef, getNode: () => testNode };
};

describe("Feature: useAriaActivedescendant", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: ID generation and resolution", () => {
    it("Given default options, When generating item IDs, Then deterministic IDs with default prefix are returned", async () => {
      const { Component, getReturn } = createTestComponent();
      await render(Component);
      const id = getReturn().getItemId(0);
      expect(id).toMatch(/^vfloat-.*-opt-0$/);
    });

    it("Given a custom idPrefix, When generating item IDs, Then IDs prepend the custom prefix", async () => {
      const { Component, getReturn } = createTestComponent({ idPrefix: "custom-id" });
      await render(Component);
      const id = getReturn().getItemId(1);
      expect(id).toBe("custom-id-opt-1");
    });

    it("Given a custom getItemId callback, When resolving an ID, Then the custom callback result is used", async () => {
      const { Component, getReturn } = createTestComponent({
        getItemId: (idx) => `item-${idx}`,
      });
      await render(Component);
      const id = getReturn().getItemId(2);
      expect(id).toBe("item-2");
    });

    it("Given a getItemKey callback, When resolving an ID, Then stable key-based IDs are generated", async () => {
      const { Component, getReturn } = createTestComponent({
        getItemKey: (idx) => `key-${idx * 10}`,
        idPrefix: "test",
      });
      await render(Component);
      const id = getReturn().getItemId(2);
      expect(id).toBe("test-opt-key-20");
    });

    it("Given a key parameter passed to getItemId, When resolving an ID, Then the key is incorporated into the ID", async () => {
      const { Component, getReturn } = createTestComponent({ idPrefix: "test" });
      await render(Component);
      const id = getReturn().getItemId(3, "alpha");
      expect(id).toBe("test-opt-alpha");
    });
  });

  describe("Scenario: aria-activedescendant attribute management and mounted DOM validation", () => {
    it("Given an active and mounted item, When rendered, Then aria-activedescendant is set on anchor", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect
        .element(anchor)
        .toHaveAttribute("aria-activedescendant", expect.stringMatching(/.*-opt-0/));
    });

    it("Given an active item, When active state is cleared, Then aria-activedescendant is removed from anchor", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).toHaveAttribute("aria-activedescendant");
      getReturn().clearActive();
      await nextTick();
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("Given enabled transitions to false, When observed, Then aria-activedescendant is removed from anchor", async () => {
      const enabled = ref(true);
      const { Component } = createTestComponent({ defaultIndex: 0, enabled });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).toHaveAttribute("aria-activedescendant");
      enabled.value = false;
      await nextTick();
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("Given active item transitions, When updating, Then aria-activedescendant updates directly without attribute churn", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      const mutations: Array<string | null> = [];

      const observer = new MutationObserver((records) => {
        for (const _r of records) {
          mutations.push(anchor.element().getAttribute("aria-activedescendant"));
        }
      });
      observer.observe(anchor.element(), {
        attributes: true,
        attributeFilter: ["aria-activedescendant"],
      });

      // Transition from item 0 to item 1
      getReturn().focusIndex(1);
      await nextTick();

      observer.disconnect();

      // Must be a single direct attribute transition, never removing the attribute in an intermediate state
      expect(mutations.length).toBe(1);
      expect(mutations[0]).toBe(getReturn().getItemId(1));
    });

    it("Given an active item is not mounted in the DOM, When inspected, Then no dangling ID is emitted on anchor", async () => {
      // In virtual lists where items are not in the DOM, activeId should be undefined
      const virtualizer = { scrollToIndex: vi.fn(), count: 100 };
      const { Component } = createTestComponent({ defaultIndex: 50, virtualizer } as any, {
        noElementsList: true,
      });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      // Item 50 is not in the DOM, so aria-activedescendant must NOT be set
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("Given an unrendered virtual item becomes mounted, When rendered, Then aria-activedescendant is committed to anchor", async () => {
      const isRendered = ref(false);
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLInputElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");
        const virtualizer = { scrollToIndex: vi.fn(), count: 100 };

        const node = useFloatingNode({
          anchorEl,
          floatingEl: listboxEl,
          open: ref(true),
        });

        const { getItemId } = useAriaActivedescendant(node, {
          defaultIndex: 50,
          virtualizer,
          idPrefix: "virt",
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor" }),
            h(
              "ul",
              { ref: "listbox", role: "listbox" },
              isRendered.value ? [h("li", { id: getItemId(50), role: "option" }, "Item 50")] : [],
            ),
          ]);
      });

      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");

      // Virtualizer renders item 50 into the DOM
      isRendered.value = true;
      await nextTick();

      await expect.element(anchor).toHaveAttribute("aria-activedescendant", "virt-opt-50");
    });

    it("Given an invalid ID with whitespace, When validated, Then the invalid ID is rejected and not emitted", async () => {
      const { Component } = createTestComponent({
        defaultIndex: 0,
        getItemId: () => "invalid id with spaces",
      });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });

    it("Given elements inside Shadow DOM, When item becomes active, Then aria-activedescendant resolves within shadow root", async () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });

      const input = document.createElement("input");
      input.setAttribute("aria-label", "shadow-anchor");
      const listbox = document.createElement("ul");
      listbox.setAttribute("role", "listbox");
      const opt = document.createElement("li");
      opt.id = "shadow-opt-0";
      opt.setAttribute("role", "option");
      listbox.appendChild(opt);
      shadow.appendChild(input);
      shadow.appendChild(listbox);

      // Verify that document.getElementById cannot reach inside shadow root
      expect(document.getElementById("shadow-opt-0")).toBeNull();
      expect(shadow.getElementById("shadow-opt-0")).toBe(opt);

      const targetEl = ref(input);
      const containerEl = ref(listbox);

      const node = useFloatingNode({
        anchorEl: targetEl,
        floatingEl: containerEl,
        open: ref(true),
      });

      const { activeId } = useAriaActivedescendant(node, {
        itemCount: 1,
        defaultIndex: 0,
        idPrefix: "shadow",
        getItemId: () => "shadow-opt-0",
      });

      await nextTick();
      expect(activeId.value).toBe("shadow-opt-0");

      host.remove();
    });
  });

  describe("Scenario: data-active state and consumer selection separation", () => {
    it("Given an active item, When rendered, Then data-active attribute is set on the active option", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1 });
      await render(Component);
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("Given active item changes, When observed, Then data-active is removed from previous option and set on new option", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 1 });
      await render(Component);
      const option2 = page.getByRole("option", { name: "option 2" });
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option2).toHaveAttribute("data-active", "");
      getReturn().setActiveIndex(2);
      await nextTick();
      await expect.element(option2).not.toHaveAttribute("data-active");
      await expect.element(option3).toHaveAttribute("data-active", "");
    });

    it("Given active descendants, When rendered, Then aria-selected is not forced on options", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const option1 = page.getByRole("option", { name: "option 1" });
      const option2 = page.getByRole("option", { name: "option 2" });
      // aria-selected should not be forced by the focus primitive
      await expect.element(option1).not.toHaveAttribute("aria-selected");
      await expect.element(option2).not.toHaveAttribute("aria-selected");
    });

    it("Given disabled options, When rendered, Then aria-disabled is set to true", async () => {
      const { Component } = createTestComponent({}, { disabledIndices: [1] });
      await render(Component);
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("aria-disabled", "true");
    });

    it("Given enabled options, When rendered, Then aria-disabled attribute is absent", async () => {
      const { Component } = createTestComponent();
      await render(Component);
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).not.toHaveAttribute("aria-disabled");
    });
  });

  describe("Scenario: Keyboard navigation with vertical orientation", () => {
    it("Given vertical orientation, When ArrowDown is pressed, Then active index moves to the next item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("Given vertical orientation, When ArrowUp is pressed, Then active index moves to the previous item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 2 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowUp}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("Given non-editable target, When Home is pressed, Then active index moves to the first item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 3 }, { isButtonTarget: true });
      await render(Component);
      const anchor = page.getByRole("button", { name: "anchor-button" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Home}");
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("Given non-editable target, When End is pressed, Then active index moves to the last item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 }, { isButtonTarget: true });
      await render(Component);
      const anchor = page.getByRole("button", { name: "anchor-button" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{End}");
      const option5 = page.getByRole("option", { name: "option 5" });
      await expect.element(option5).toHaveAttribute("data-active", "");
    });

    it("Given vertical orientation, When ArrowLeft or ArrowRight is pressed, Then active index remains unchanged", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowRight}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("Given navigation keys with modifier flags, When pressed, Then the events are ignored", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      anchor
        .element()
        .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true }));
      await nextTick();
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("Given active IME composition, When navigation or Enter keys occur, Then events are ignored without selection", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: 0, onSelect: onSelectMock });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });

      // Arrow down during composition
      anchor
        .element()
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", isComposing: true, bubbles: true }),
        );
      await nextTick();
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");

      // Enter during IME composition (confirming ideograph) must not select or trigger onSelect
      anchor
        .element()
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }),
        );
      await nextTick();
      expect(onSelectMock).not.toHaveBeenCalled();

      // Legacy IME keyCode 229 must also be ignored
      anchor.element().dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 229,
          bubbles: true,
        } as KeyboardEventInit),
      );
      await nextTick();
      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it("Given navigation keys, When processed, Then default browser scrolling is prevented", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
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

    it("Given unhandled keys like Tab or Escape, When dispatched, Then default prevention does not occur", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
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

  describe("Scenario: Keyboard navigation with horizontal orientation", () => {
    it("Given horizontal orientation, When ArrowRight is pressed, Then active index moves to the next item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0, orientation: "horizontal" });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowRight}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("Given horizontal orientation, When ArrowLeft is pressed, Then active index moves to the previous item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1, orientation: "horizontal" });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowLeft}");
      const option1 = page.getByRole("option", { name: "option 1" });
      await expect.element(option1).toHaveAttribute("data-active", "");
    });

    it("Given horizontal orientation, When ArrowDown or ArrowUp is pressed, Then active index remains unchanged", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1, orientation: "horizontal" });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      const option2 = page.getByRole("option", { name: "option 2" });
      await expect.element(option2).toHaveAttribute("data-active", "");
      await userEvent.keyboard("{ArrowUp}");
      await expect.element(option2).toHaveAttribute("data-active", "");
    });
  });

  describe("Scenario: Keyboard navigation with bidirectional orientation", () => {
    it("Given bidirectional orientation, When all four arrow keys are pressed, Then active index moves in corresponding directions", async () => {
      const { Component } = createTestComponent({ defaultIndex: 1, orientation: "both" });
      await render(Component);
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

  describe("Scenario: Keyboard navigation in right-to-left layout", () => {
    it("Given horizontal RTL mode, When ArrowLeft and ArrowRight are pressed, Then navigation directions are inverted", async () => {
      const { Component } = createTestComponent({
        defaultIndex: 1,
        orientation: "horizontal",
        rtl: true,
      });
      await render(Component);
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

    it("Given container with dir='rtl', When ArrowLeft is pressed, Then RTL is automatically detected and advances to next item", async () => {
      const { Component } = createTestComponent(
        { defaultIndex: 1, orientation: "horizontal" },
        { dir: "rtl" },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{ArrowLeft}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Scenario: Boundary behavior when loop is disabled", () => {
    it("Given loop is disabled, When pressing ArrowDown at the end of collection, Then active index stays on last item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 4, loop: false });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 5" }))
        .toHaveAttribute("data-active", "");
    });

    it("Given loop is disabled, When pressing ArrowUp at the start of collection, Then active index stays on first item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0, loop: false });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowUp}");
      await expect
        .element(page.getByRole("option", { name: "option 1" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Scenario: Boundary behavior when loop is enabled", () => {
    it("Given loop is enabled, When pressing ArrowDown at the end of collection, Then active index wraps to the first item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 4, loop: true });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 1" }))
        .toHaveAttribute("data-active", "");
    });

    it("Given loop is enabled, When pressing ArrowUp at the start of collection, Then active index wraps to the last item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0, loop: true });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowUp}");
      await expect
        .element(page.getByRole("option", { name: "option 5" }))
        .toHaveAttribute("data-active", "");
    });
  });

  describe("Scenario: Disabled item filtering and focus handling", () => {
    it("Given disabled items in collection, When navigating via keyboard, Then disabled items are skipped", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 }, { disabledIndices: [1] });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });

    it("Given aria-disabled items in collection, When navigating via keyboard, Then aria-disabled items are skipped", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 }, { ariaDisabledIndices: [1] });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });

    it("Given an isItemDisabled predicate, When navigating, Then matching items are skipped", async () => {
      const { Component } = createTestComponent({
        defaultIndex: 0,
        isItemDisabled: (idx) => idx === 1,
      });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 3" }))
        .toHaveAttribute("data-active", "");
    });

    it("Given focusDisabledElements is enabled, When navigating, Then disabled items receive focus", async () => {
      const { Component } = createTestComponent(
        { defaultIndex: 0, focusDisabledElements: true },
        { disabledIndices: [1] },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("option", { name: "option 2" }))
        .toHaveAttribute("data-active", "");
    });

    it("Given focusDisabledElements is enabled, When Enter is pressed on disabled item, Then selection is blocked", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        {
          defaultIndex: 1,
          focusDisabledElements: true,
          onSelect: onSelectMock,
        },
        { disabledIndices: [1] },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Selection coordination and editable input preservation", () => {
    it("Given an active item, When Enter is pressed, Then onSelect callback is invoked with active index and event", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: 2, onSelect: onSelectMock });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).toHaveBeenCalledWith(2, expect.any(Event));
    });

    it("Given no active item, When Enter is pressed, Then onSelect is not called and key passes through", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: -1, onSelect: onSelectMock });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{Enter}");
      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it("Given an editable text input anchor, When typing Space, Then space character is inserted without triggering selection", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: 1, onSelect: onSelectMock });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("hello world ");
      await expect.element(anchor).toHaveValue("hello world ");
      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it("Given a non-editable button target, When Space is pressed, Then onSelect callback is invoked", async () => {
      const onSelectMock = vi.fn();
      const { Component } = createTestComponent(
        { defaultIndex: 1, onSelect: onSelectMock },
        { isButtonTarget: true },
      );
      await render(Component);
      const anchor = page.getByRole("button", { name: "anchor-button" });
      await userEvent.click(anchor);
      await userEvent.keyboard(" ");
      expect(onSelectMock).toHaveBeenCalledWith(1, expect.any(Event));
    });

    it("Given an editable input, When Home or End is pressed, Then native text caret movement is preserved without changing active item", async () => {
      const { Component } = createTestComponent({ defaultIndex: 2 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("abc");
      await userEvent.keyboard("{Home}");
      // Active index should not change to 0
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveAttribute("data-active", "");
    });
  });

  describe("Scenario: Pointer hover navigation and virtual hover", () => {
    it("Given focusOnHover is enabled, When pointermove occurs over an option, Then that option becomes active", async () => {
      const { Component } = createTestComponent({ focusOnHover: true });
      await render(Component);
      await nextTick();
      const option3 = page.getByRole("option", { name: "option 3" });
      option3
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
      await nextTick();
      await expect.element(option3).toHaveAttribute("data-active", "");
    });

    it("Given focusOnHover is disabled, When pointermove occurs over an option, Then active index does not change", async () => {
      const { Component } = createTestComponent({ focusOnHover: false });
      await render(Component);
      const option3 = page.getByRole("option", { name: "option 3" });
      option3
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
      await nextTick();
      await expect.element(option3).not.toHaveAttribute("data-active");
    });

    it("Given virtualized list without elementsList, When hovering an item with data-index, Then that item is activated", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLInputElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");

        const node = useFloatingNode({
          anchorEl,
          floatingEl: listboxEl,
          open: ref(true),
        });

        const { getItemId, activeIndex } = useAriaActivedescendant(node, {
          itemCount: 10,
          focusOnHover: true,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor" }),
            h(
              "ul",
              { ref: "listbox", role: "listbox" },
              Array.from({ length: 5 }).map((_, idx) =>
                h(
                  "li",
                  {
                    id: getItemId(idx),
                    role: "option",
                    "data-index": idx,
                    "data-active": activeIndex.value === idx ? "" : undefined,
                  },
                  `virtual ${idx}`,
                ),
              ),
            ),
          ]);
      });

      await render(Component);
      await nextTick();
      const option2 = page.getByRole("option", { name: "virtual 2" });
      option2
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
      await nextTick();
      await expect.element(option2).toHaveAttribute("data-active", "");
    });

    it("Given pointer hovering over option, When synthetic pointermove fires with identical coordinates during scroll, Then active index is not hijacked", async () => {
      const { Component, getReturn } = createTestComponent({ focusOnHover: true });
      await render(Component);
      await nextTick();

      const option1 = page.getByRole("option", { name: "option 1" });

      // Move pointer over option 1
      option1
        .element()
        .dispatchEvent(
          new PointerEvent("pointermove", { bubbles: true, clientX: 50, clientY: 50 }),
        );
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(0);

      // Keyboard navigation advances activeIndex to option 2 (item 1)
      getReturn().focusIndex("next");
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(1);

      // Synthetic pointermove fires due to scroll with identical screen coordinates
      option1
        .element()
        .dispatchEvent(
          new PointerEvent("pointermove", { bubbles: true, clientX: 50, clientY: 50 }),
        );
      await nextTick();

      // Active index must NOT be hijacked back to 0
      expect(getReturn().activeIndex.value).toBe(1);

      // Physical pointer movement with new coordinates does update activeIndex
      option1
        .element()
        .dispatchEvent(
          new PointerEvent("pointermove", { bubbles: true, clientX: 50, clientY: 52 }),
        );
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(0);
    });
  });

  describe("Scenario: Pointer focus protection and interactive descendants", () => {
    it("Given pointerdown on an option, When dispatched, Then default is prevented to keep focus on anchor", async () => {
      const { Component } = createTestComponent();
      await render(Component);
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

    it("Given pointerdown on an interactive child within an option, When clicked, Then default is not prevented", async () => {
      const { Component } = createTestComponent({}, { withInteractiveChild: true });
      await render(Component);
      // Non-exact match: with an interactive child the option's accessible
      // name is "option 1 Action", and Vitest 5 matches locator text exactly
      // by default.
      const btn = (
        page.getByRole("option", { name: "option 1", exact: false }).element() as HTMLElement
      ).querySelector(".nested-btn") as HTMLElement;

      let prevented = false;
      btn.addEventListener("pointerdown", (e) => {
        if (e.defaultPrevented) prevented = true;
      });
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      expect(prevented).toBe(false);
    });

    it("Given preventPointerDown is false, When pointerdown occurs on option, Then default is not prevented", async () => {
      const { Component } = createTestComponent({ preventPointerDown: false });
      await render(Component);
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

    it("Given pointerdown on non-option container surfaces, When clicked, Then default is not prevented", async () => {
      const { Component } = createTestComponent();
      await render(Component);
      const listbox = page.getByRole("listbox");
      let prevented = false;
      listbox.element().addEventListener("pointerdown", (e) => {
        if (e.defaultPrevented) prevented = true;
      });
      listbox
        .element()
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      expect(prevented).toBe(false);
    });
  });

  describe("Scenario: Controlled vs uncontrolled active state synchronization", () => {
    it("Given an external activeIndex ref, When ref updates externally, Then active option and scroll reveal synchronize", async () => {
      const activeIndex = ref(0);
      const { Component } = createTestComponent({ activeIndex }, { itemCount: 10 });
      await render(Component);
      const listbox = page.getByRole("listbox").element() as HTMLElement;
      expect(listbox.scrollTop).toBe(0);

      activeIndex.value = 9;
      await nextTick();

      const option10 = page.getByRole("option", { name: "option 10" });
      await expect.element(option10).toHaveAttribute("data-active", "");
      expect(listbox.scrollTop).toBeGreaterThan(0);
    });

    it("Given an onActiveIndexChange callback, When navigation changes active index, Then callback is invoked with new index", async () => {
      const onChangeMock = vi.fn();
      const { Component } = createTestComponent({
        defaultIndex: 0,
        onActiveIndexChange: onChangeMock,
      });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      expect(onChangeMock).toHaveBeenCalledWith(1);
    });
  });

  describe("Scenario: Programmatic navigation controls", () => {
    it("Given programmatic controls, When setActiveIndex is called, Then target item becomes active", async () => {
      const { Component, getReturn } = createTestComponent();
      await render(Component);
      getReturn().setActiveIndex(2);
      await nextTick();
      const option3 = page.getByRole("option", { name: "option 3" });
      await expect.element(option3).toHaveAttribute("data-active", "");
    });

    it("Given an active item, When clearActive is called, Then active index resets to -1 and attribute is removed", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 2 });
      await render(Component);
      getReturn().clearActive();
      await nextTick();
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });
  });

  describe("Scenario: Target focus-entry synchronization", () => {
    it("Given an active index, When focus enters anchor target, Then active item is revealed and scrolled into view", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 }, { itemCount: 10 });
      await render(Component);
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

  describe("Scenario: Bounded scrolling across dimensions", () => {
    it("Given horizontal list orientation, When navigating horizontally, Then container scrollLeft adjusts to reveal items", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const containerEl = useTemplateRef<HTMLElement>("container");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const node = useFloatingNode({
          anchorEl,
          floatingEl: containerEl,
          open: ref(true),
        });

        const { getItemId } = useAriaActivedescendant(node, {
          elementsList,
          orientation: "horizontal",
          defaultIndex: 0,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor" }),
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
                    id: getItemId(idx),
                    ref: (el) => (elementsList.value[idx] = el as HTMLElement),
                    style: "min-width: 60px; height: 30px;",
                  },
                  `Item ${idx}`,
                ),
              ),
            ),
          ]);
      });

      await render(Component);
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

  describe("Scenario: Virtualizer integration and stable item keys", () => {
    it("Given a virtualizer integration, When active index changes, Then virtualizer scrollToIndex is called", async () => {
      const virtualizer = { scrollToIndex: vi.fn(), count: 100 };
      const activeIndex = ref(0);
      const { Component } = createTestComponent({ virtualizer, activeIndex } as any, {
        noElementsList: true,
      });
      await render(Component);

      activeIndex.value = 42;
      await nextTick();
      expect(virtualizer.scrollToIndex).toHaveBeenCalledWith(42, { align: "auto" });
    });

    it("Given getItemId with key, When called, Then stable key-based ID is generated", async () => {
      const { Component, getReturn } = createTestComponent({ idPrefix: "virt" });
      await render(Component);
      const id = getReturn().getItemId(5, "unique-row-5");
      expect(id).toBe("virt-opt-unique-row-5");
    });
  });

  describe("Scenario: DOM focus retention invariant", () => {
    it("Given keyboard navigation, When navigating across items, Then DOM focus never leaves the anchor", async () => {
      const { Component } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await expect.element(anchor).toHaveFocus();
    });

    it("Given programmatic navigation, When updating active index, Then DOM focus never leaves the anchor", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);
      getReturn().setActiveIndex(3);
      await nextTick();
      await expect.element(anchor).toHaveFocus();
    });
  });

  describe("Scenario: Composable API surface and return properties", () => {
    it("Given composable initialization, When inspected, Then public API methods and reactive state refs are exposed", async () => {
      const { Component, getReturn } = createTestComponent();
      await render(Component);
      const ret = getReturn();
      expect(ret.activeIndex).toBeDefined();
      expect(ret.activeId).toBeDefined();
      expect(ret.focusIndex).toBeDefined();
      expect(ret.setActiveIndex).toBeDefined();
      expect(ret.clearActive).toBeDefined();
      expect(ret.scrollToActive).toBeDefined();
      expect(ret.getItemId).toBeDefined();
    });
  });

  describe("Scenario: Reactive bounds auto-correction on collection updates", () => {
    it("Given collection becomes empty, When observed, Then activeIndex resets to -1 and activeId is cleared", async () => {
      const { Component, countRef, getReturn } = createTestComponent(
        { defaultIndex: 2 },
        { itemCount: 5 },
      );
      await render(Component);
      expect(getReturn().activeIndex.value).toBe(2);

      countRef.value = 0;
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(-1);
      expect(getReturn().activeId.value).toBeUndefined();
    });

    it("Given collection is filtered to fewer items, When activeIndex exceeds new bounds, Then activeIndex resets to -1", async () => {
      const { Component, countRef, getReturn } = createTestComponent(
        { defaultIndex: 4 },
        { itemCount: 5 },
      );
      await render(Component);
      expect(getReturn().activeIndex.value).toBe(4);

      // Filtering reduces items from 5 to 3 (valid indices: 0..2)
      countRef.value = 3;
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(-1);
    });

    it("Given collection is filtered, When activeIndex remains within new bounds, Then activeIndex is preserved", async () => {
      const { Component, countRef, getReturn } = createTestComponent(
        { defaultIndex: 1 },
        { itemCount: 5 },
      );
      await render(Component);
      expect(getReturn().activeIndex.value).toBe(1);

      countRef.value = 3;
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(1);
    });
  });

  describe("Scenario: PageUp and PageDown keyboard navigation", () => {
    it("Given PageDown key press, When default pageSize is used, Then active index advances by 10 items", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 }, { itemCount: 25 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{PageDown}");
      expect(getReturn().activeIndex.value).toBe(10);
    });

    it("Given PageUp key press, When default pageSize is used, Then active index moves back by 10 items", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 15 }, { itemCount: 25 });
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{PageUp}");
      expect(getReturn().activeIndex.value).toBe(5);
    });

    it("Given a custom pageSize option, When PageDown and PageUp are pressed, Then active index steps by custom size", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 1, pageSize: 3 },
        { itemCount: 10 },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{PageDown}");
      expect(getReturn().activeIndex.value).toBe(4);

      await userEvent.keyboard("{PageUp}");
      expect(getReturn().activeIndex.value).toBe(1);
    });

    it("Given jump past boundaries with loop disabled, When paging, Then active index clamps to collection edges", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 2, pageSize: 5 },
        { itemCount: 5 },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{PageDown}");
      expect(getReturn().activeIndex.value).toBe(4);

      await userEvent.keyboard("{PageUp}");
      expect(getReturn().activeIndex.value).toBe(0);
    });

    it("Given disabled items in page range, When paging, Then disabled items are skipped during page leap", async () => {
      // Items 0..5, disabled: 3. defaultIndex: 1, pageSize: 2 -> step 1 lands on 2, step 2 would land on 3 (disabled) -> lands on 4
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 1, pageSize: 2 },
        { itemCount: 6, disabledIndices: [3] },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await userEvent.click(anchor);

      await userEvent.keyboard("{PageDown}");
      expect(getReturn().activeIndex.value).toBe(4);
    });

    it("Given programmatic focusIndex, When page-down and page-up actions are passed, Then active index updates by page size", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 2, pageSize: 4 },
        { itemCount: 15 },
      );
      await render(Component);

      getReturn().focusIndex("page-down");
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(6);

      getReturn().focusIndex("page-up");
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);
    });

    it("Given PageUp and PageDown with modifier keys, When pressed, Then page navigation is ignored", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 2, pageSize: 5 },
        { itemCount: 15 },
      );
      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });

      anchor
        .element()
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "PageDown", ctrlKey: true, bubbles: true }),
        );
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);

      anchor
        .element()
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "PageUp", altKey: true, bubbles: true }),
        );
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);

      // Shift + PageDown and Shift + PageUp preserve native text selection in editable fields
      const shiftPageDown = new KeyboardEvent("keydown", {
        key: "PageDown",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      anchor.element().dispatchEvent(shiftPageDown);
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);
      expect(shiftPageDown.defaultPrevented).toBe(false);

      const shiftPageUp = new KeyboardEvent("keydown", {
        key: "PageUp",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      anchor.element().dispatchEvent(shiftPageUp);
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);
      expect(shiftPageUp.defaultPrevented).toBe(false);
    });
  });

  describe("Scenario: Virtualizer isIndexRendered coordination", () => {
    it("Given isIndexRendered returns false, When evaluated, Then DOM query is skipped and activeId remains undefined", async () => {
      const isIndexRendered = vi.fn().mockReturnValue(false);
      const virtualizer = { scrollToIndex: vi.fn(), count: 50, isIndexRendered };
      const { Component, getReturn } = createTestComponent(
        {
          defaultIndex: 25,
          virtualizer,
        } as any,
        { noElementsList: true },
      );

      await render(Component);
      expect(isIndexRendered).toHaveBeenCalledWith(25);
      expect(getReturn().activeId.value).toBeUndefined();
    });

    it("Given isIndexRendered transitions to true upon mounting, When re-evaluated, Then activeId is committed to anchor", async () => {
      let rendered = false;
      const isIndexRendered = vi.fn(() => rendered);
      const virtualizer = { scrollToIndex: vi.fn(), count: 50, isIndexRendered };

      const isMounted = ref(false);
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLInputElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");

        const node = useFloatingNode({
          anchorEl,
          floatingEl: listboxEl,
          open: ref(true),
        });

        const { getItemId } = useAriaActivedescendant(node, {
          defaultIndex: 10,
          virtualizer,
          idPrefix: "virt",
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "aria-label": "anchor" }),
            h(
              "ul",
              { ref: "listbox", role: "listbox" },
              isMounted.value ? [h("li", { id: getItemId(10), role: "option" }, "Item 10")] : [],
            ),
          ]);
      });

      await render(Component);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");

      rendered = true;
      isMounted.value = true;
      await nextTick();

      await expect.element(anchor).toHaveAttribute("aria-activedescendant", "virt-opt-10");
    });
  });

  describe("Scenario: ScrollIntoView option and manual scrollToActive invocation", () => {
    it("Given scrollIntoView is false, When active index changes, Then container scrollTop remains unchanged", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 0, scrollIntoView: false },
        { itemCount: 10 },
      );
      await render(Component);
      const listbox = page.getByRole("listbox").element() as HTMLElement;
      expect(listbox.scrollTop).toBe(0);

      getReturn().setActiveIndex(9);
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(9);
      expect(listbox.scrollTop).toBe(0);
    });

    it("Given scrollIntoView is false, When scrollToActive is imperatively called, Then active item is scrolled into view", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 0, scrollIntoView: false },
        { itemCount: 10 },
      );
      await render(Component);
      const listbox = page.getByRole("listbox").element() as HTMLElement;

      getReturn().setActiveIndex(9);
      await nextTick();
      expect(listbox.scrollTop).toBe(0);

      getReturn().scrollToActive();
      await nextTick();
      expect(listbox.scrollTop).toBeGreaterThan(0);
    });

    it("Given navigation with preventScroll, When subsequent navigation occurs without preventScroll, Then scroll suppression does not leak", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: 0 }, { itemCount: 10 });
      await render(Component);
      const listbox = page.getByRole("listbox").element() as HTMLElement;

      // Calling focusIndex on current item with preventScroll must not leak suppression
      getReturn().focusIndex(0, { preventScroll: true });
      await nextTick();

      // Subsequent navigation to item 9 without preventScroll MUST scroll into view
      getReturn().focusIndex(9);
      await nextTick();
      expect(listbox.scrollTop).toBeGreaterThan(0);
    });
  });

  describe("Scenario: Focusout handling and resetOnBlur synchronization", () => {
    it("Given resetOnBlur is true, When focus leaves target to an outside element, Then activeIndex resets to defaultIndex", async () => {
      const { Component, getReturn } = createTestComponent({ defaultIndex: -1, resetOnBlur: true });
      await render(Component);

      getReturn().setActiveIndex(2);
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);

      const anchor = page.getByRole("textbox", { name: "anchor" });
      const outsideEl = document.createElement("button");
      document.body.appendChild(outsideEl);

      anchor
        .element()
        .dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideEl }));
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(-1);
      outsideEl.remove();
    });

    it("Given resetOnBlur is false, When focus leaves target to an outside element, Then activeIndex is preserved", async () => {
      const { Component, getReturn } = createTestComponent({
        defaultIndex: -1,
        resetOnBlur: false,
      });
      await render(Component);

      getReturn().setActiveIndex(2);
      await nextTick();
      expect(getReturn().activeIndex.value).toBe(2);

      const anchor = page.getByRole("textbox", { name: "anchor" });
      const outsideEl = document.createElement("button");
      document.body.appendChild(outsideEl);

      anchor
        .element()
        .dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideEl }));
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(2);
      outsideEl.remove();
    });

    it("Given resetOnBlur is true, When focus moves from target into interactive listbox child, Then activeIndex is not reset", async () => {
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: -1, resetOnBlur: true },
        { withInteractiveChild: true },
      );
      await render(Component);

      getReturn().setActiveIndex(1);
      await nextTick();

      const anchor = page.getByRole("textbox", { name: "anchor" });
      const listbox = page.getByRole("listbox").element() as HTMLElement;
      const nestedBtn = listbox.querySelector(".nested-btn") as HTMLElement;

      anchor
        .element()
        .dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: nestedBtn }));
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(1);
    });
  });

  describe("Scenario: Pointerleave handling and clearOnPointerLeave synchronization", () => {
    it("Given clearOnPointerLeave is true, When pointer leaves listbox container, Then activeIndex clears to -1", async () => {
      const { Component, getReturn } = createTestComponent({
        focusOnHover: true,
        clearOnPointerLeave: true,
        defaultIndex: 2,
      });
      await render(Component);
      await nextTick();

      const listbox = page.getByRole("listbox");
      listbox.element().dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(-1);
    });

    it("Given clearOnPointerLeave is false, When pointer leaves listbox container, Then activeIndex is preserved", async () => {
      const { Component, getReturn } = createTestComponent({
        focusOnHover: true,
        clearOnPointerLeave: false,
        defaultIndex: 2,
      });
      await render(Component);
      await nextTick();

      const listbox = page.getByRole("listbox");
      listbox.element().dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(2);
    });
  });

  describe("Scenario: Pointer hover scroll stability without jumps", () => {
    it("Given focusOnHover is enabled, When hovering across items, Then active item updates without causing container scroll jumps", async () => {
      const { Component, getReturn } = createTestComponent(
        { focusOnHover: true },
        { itemCount: 10 },
      );
      await render(Component);
      await nextTick();

      const listbox = page.getByRole("listbox").element() as HTMLElement;
      listbox.scrollTop = 0;

      const option3 = page.getByRole("option", { name: "option 3" });
      option3
        .element()
        .dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 5, clientY: 5 }));
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(2);
      expect(listbox.scrollTop).toBe(0);
    });
  });

  describe("Scenario: Oversized element bounded scroll alignment", () => {
    it("Given an element taller than scroll container, When activated, Then top of element is aligned with top of container", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const node = useFloatingNode({
          anchorEl,
          floatingEl: listboxEl,
          open: ref(true),
        });

        const { getItemId } = useAriaActivedescendant(node, {
          elementsList,
          defaultIndex: 0,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor" }),
            h(
              "ul",
              { ref: "listbox", role: "listbox", style: "max-height: 100px; overflow: auto;" },
              [
                h(
                  "li",
                  {
                    id: getItemId(0),
                    ref: (el) => (elementsList.value[0] = el as HTMLElement),
                    style: "height: 50px;",
                  },
                  "Item 0",
                ),
                h(
                  "li",
                  {
                    id: getItemId(1),
                    ref: (el) => (elementsList.value[1] = el as HTMLElement),
                    style: "height: 200px;", // Taller than 100px container
                  },
                  "Oversized Item 1",
                ),
              ],
            ),
          ]);
      });

      await render(Component);
      await nextTick();

      const listbox = page.getByRole("listbox").element() as HTMLElement;
      expect(listbox.scrollTop).toBe(0);

      const anchor = page.getByRole("textbox");
      await userEvent.click(anchor);
      await userEvent.keyboard("{ArrowDown}");

      // When activating the 200px item, it should scroll to align top of item (top = 50px)
      await nextTick();
      expect(listbox.scrollTop).toBe(50);
    });
  });

  describe("Scenario: Offset-based geometry fast-path optimization", () => {
    it("Given a positioned container, When scrolling active item, Then offset fast-path is used without calling getBoundingClientRect", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const node = useFloatingNode({
          anchorEl,
          floatingEl: listboxEl,
          open: ref(true),
        });

        const { getItemId } = useAriaActivedescendant(node, {
          elementsList,
          scrollIntoView: true,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor" }),
            h(
              "ul",
              {
                ref: "listbox",
                role: "listbox",
                style: "position: relative; height: 100px; overflow-y: auto;",
              },
              Array.from({ length: 5 }).map((_, idx) =>
                h(
                  "li",
                  {
                    id: getItemId(idx),
                    ref: (el) => (elementsList.value[idx] = el as HTMLElement),
                    style: "height: 50px;",
                  },
                  `Item ${idx}`,
                ),
              ),
            ),
          ]);
      });

      await render(Component);
      await nextTick();

      const listbox = page.getByRole("listbox").element() as HTMLElement;
      const options = listbox.querySelectorAll("li");
      const targetItem = options[3] as HTMLElement;

      // Verify prerequisite: targetItem.offsetParent === listbox
      expect(targetItem.offsetParent).toBe(listbox);

      const targetRectSpy = vi.spyOn(targetItem, "getBoundingClientRect");
      const containerRectSpy = vi.spyOn(listbox, "getBoundingClientRect");

      const anchor = page.getByRole("textbox");
      await userEvent.click(anchor);

      // Navigate down to item 3 (offset: 150px; container height: 100px)
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await nextTick();

      // Should have scrolled to reveal item 3: scrollTop = (3 + 1) * 50 - 100 = 100
      expect(listbox.scrollTop).toBe(100);

      // Fast-path: getBoundingClientRect must NOT have been called on target or container
      expect(targetRectSpy).not.toHaveBeenCalled();
      expect(containerRectSpy).not.toHaveBeenCalled();

      targetRectSpy.mockRestore();
      containerRectSpy.mockRestore();
    });

    it("Given an unpositioned container, When scrolling active item, Then getBoundingClientRect fallback path is used", async () => {
      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const listboxEl = useTemplateRef<HTMLElement>("listbox");
        const elementsList = ref<(HTMLElement | null)[]>([]);

        const node = useFloatingNode({
          anchorEl,
          floatingEl: listboxEl,
          open: ref(true),
        });

        const { getItemId } = useAriaActivedescendant(node, {
          elementsList,
          scrollIntoView: true,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor" }),
            h(
              "ul",
              {
                ref: "listbox",
                role: "listbox",
                // Unpositioned container (position: static default)
                style: "height: 100px; overflow-y: auto;",
              },
              Array.from({ length: 5 }).map((_, idx) =>
                h(
                  "li",
                  {
                    id: getItemId(idx),
                    ref: (el) => (elementsList.value[idx] = el as HTMLElement),
                    style: "height: 50px;",
                  },
                  `Item ${idx}`,
                ),
              ),
            ),
          ]);
      });

      await render(Component);
      await nextTick();

      const listbox = page.getByRole("listbox").element() as HTMLElement;
      const options = listbox.querySelectorAll("li");
      const targetItem = options[3] as HTMLElement;

      // Because listbox is position: static, offsetParent is body (not listbox)
      expect(targetItem.offsetParent).not.toBe(listbox);

      const targetRectSpy = vi.spyOn(targetItem, "getBoundingClientRect");

      const anchor = page.getByRole("textbox");
      await userEvent.click(anchor);

      // Navigate down to item 3
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await nextTick();

      // Fallback path: getBoundingClientRect was called
      expect(targetRectSpy).toHaveBeenCalled();

      targetRectSpy.mockRestore();
    });
  });

  describe("Scenario: Floating node open state coordination", () => {
    it("Given floating node open state becomes false, When closed, Then activeIndex resets to -1 and aria attribute is removed", async () => {
      const open = ref(true);
      const anchorEl = ref<HTMLElement | null>(null);
      const floatingEl = ref<HTMLElement | null>(null);

      const node = useFloatingNode({
        anchorEl,
        floatingEl,
        open,
      });

      const { Component, getReturn } = createTestComponent({ defaultIndex: 2 }, { node });
      await render(Component);

      expect(getReturn().activeIndex.value).toBe(2);

      open.value = false;
      await nextTick();

      expect(getReturn().activeIndex.value).toBe(-1);
      const anchor = page.getByRole("textbox", { name: "anchor" });
      await expect.element(anchor).not.toHaveAttribute("aria-activedescendant");
    });
  });

  describe("Scenario: IME composition input safety", () => {
    it("Given active IME composition session, When navigation or Enter keys occur, Then keystrokes are ignored until composition ends", async () => {
      const onSelect = vi.fn();
      const { Component, getReturn } = createTestComponent(
        { defaultIndex: 1, onSelect },
        { itemCount: 5 },
      );
      await render(Component);

      const anchor = page.getByRole("textbox", { name: "anchor" }).element() as HTMLElement;

      // Start IME composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // Enter during composition should not fire onSelect
      anchor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(onSelect).not.toHaveBeenCalled();

      // ArrowDown during composition should not navigate
      anchor.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(getReturn().activeIndex.value).toBe(1);

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // Enter after compositionend should select
      anchor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect(onSelect).toHaveBeenCalledWith(1, expect.any(KeyboardEvent));
    });

    it("Given keydown event with isComposing true, When dispatched, Then item selection is prevented", async () => {
      const onSelect = vi.fn();
      const { Component } = createTestComponent({ defaultIndex: 0, onSelect }, { itemCount: 5 });
      await render(Component);

      const anchor = page.getByRole("textbox", { name: "anchor" }).element() as HTMLElement;

      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      Object.defineProperty(event, "isComposing", { value: true });

      anchor.dispatchEvent(event);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
