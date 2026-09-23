import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { type FloatingNode, type UseFocusOptions, useFloatingNode, useFocus } from "@/composables";
import { matchesFocusVisible } from "@/shared/platform";
import { getTestEl } from "@/test-utils";

vi.mock("@/shared/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/platform")>();
  return {
    ...actual,
    matchesFocusVisible: vi.fn(actual.matchesFocusVisible),
  };
});

interface FixtureConfig {
  anchorKind?: "button" | "anchor-subtree";
  withOutside?: boolean;
  withIgnored?: boolean;
  defaultOpen?: boolean;
}

function createTestComponent(
  options: UseFocusOptions = {},
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const openRef = ref(config.defaultOpen ?? initialOpen);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useFocus(node, options);

    const anchorKind = config.anchorKind ?? "button";

    return () =>
      h("div", { class: "test-wrapper" }, [
        anchorKind === "anchor-subtree"
          ? h(
              "div",
              {
                ref: "anchor",
                "data-testid": "anchor",
                tabindex: 0,
                "aria-expanded": String(openRef.value),
              },
              ["Anchor", h("input", { "data-testid": "anchor-child", type: "text" })],
            )
          : h(
              "button",
              {
                ref: "anchor",
                "data-testid": "anchor",
                type: "button",
                "aria-expanded": String(openRef.value),
              },
              "Anchor",
            ),
        openRef.value
          ? h(
              "div",
              { ref: "floating", "data-testid": "floating", tabindex: -1 },
              "Floating content",
            )
          : null,
        ...(config.withOutside
          ? [h("button", { "data-testid": "outside", type: "button" }, "Outside")]
          : []),
        ...(config.withIgnored
          ? [h("button", { "data-testid": "ignored", type: "button" }, "Ignored")]
          : []),
      ]);
  });

  return {
    Component,
    getNode: () => node,
    openRef,
  };
}

function createTreeComponent(target: "parent" | "child") {
  const parentOpen = ref(true);
  const childOpen = ref(true);

  const Component = defineComponent(() => {
    const parentAnchorEl = useTemplateRef<HTMLElement>("parent-anchor");
    const parentFloatingEl = useTemplateRef<HTMLElement>("parent-floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const parentNode = useFloatingNode({
      anchorEl: parentAnchorEl,
      floatingEl: parentFloatingEl,
      open: parentOpen,
    });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });
    useFocus(target === "parent" ? parentNode : childNode, { requireFocusVisible: false });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "parent-anchor",
            "data-testid": "parent-anchor",
            "aria-expanded": String(parentOpen.value),
          },
          "Parent",
        ),
        parentOpen.value
          ? h(
              "div",
              { ref: "parent-floating", "data-testid": "parent-floating", tabindex: -1 },
              "Parent floating",
            )
          : null,
        h(
          "button",
          {
            ref: "child-anchor",
            "data-testid": "child-anchor",
            "aria-expanded": String(childOpen.value),
          },
          "Child",
        ),
        childOpen.value
          ? h(
              "div",
              { ref: "child-floating", "data-testid": "child-floating", tabindex: -1 },
              "Child floating",
            )
          : null,
        h("button", { "data-testid": "outside", type: "button" }, "Outside"),
      ]);
  });

  return { Component, parentOpen, childOpen };
}

async function flushFocus() {
  await nextTick();
  vi.runAllTimers();
  await nextTick();
}

async function renderFocus(
  options: UseFocusOptions = {},
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const fixture = createTestComponent(options, initialOpen, config);
  await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    rawAnchorEl: getTestEl("anchor"),
    rawFloatingEl: config.defaultOpen || initialOpen ? getTestEl("floating") : null,
    childInputEl: config.anchorKind === "anchor-subtree" ? page.getByTestId("anchor-child") : null,
    rawChildInputEl: config.anchorKind === "anchor-subtree" ? getTestEl("anchor-child") : null,
    outsideEl: config.withOutside || config.withIgnored ? page.getByTestId("outside") : null,
    rawOutsideEl: config.withOutside || config.withIgnored ? getTestEl("outside") : null,
    ignoredEl: config.withIgnored ? page.getByTestId("ignored") : null,
    rawIgnoredEl: config.withIgnored ? getTestEl("ignored") : null,
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

async function renderTreeFocus(target: "parent" | "child") {
  const fixture = createTreeComponent(target);
  await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    parentAnchorEl: page.getByTestId("parent-anchor"),
    parentFloatingEl: page.getByTestId("parent-floating"),
    childAnchorEl: page.getByTestId("child-anchor"),
    childFloatingEl: page.getByTestId("child-floating"),
    outsideEl: page.getByTestId("outside"),
    rawParentFloatingEl: getTestEl("parent-floating"),
    rawChildFloatingEl: getTestEl("child-floating"),
    rawOutsideEl: getTestEl("outside"),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

describe("Feature: useFocus", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(matchesFocusVisible).mockReset();
    vi.useRealTimers();
  });

  describe("Scenario: Opening floating element on anchor focus", () => {
    it("Given requireFocusVisible is false, When anchor receives focus, Then opens floating element and marks anchor as expanded", async () => {
      // Given
      const { anchorEl, floatingEl, rawAnchorEl } = await renderFocus({
        requireFocusVisible: false,
      });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      rawAnchorEl.focus();
      await flushFocus();

      // Then
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given requireFocusVisible is true, When focus occurs, Then only opens when element matches focus-visible", async () => {
      // Given: Initially focus-visible returns false
      vi.mocked(matchesFocusVisible).mockReturnValue(false);
      const { anchorEl, floatingEl, rawAnchorEl } = await renderFocus({
        requireFocusVisible: true,
      });

      // When anchor focused without focus-visible
      rawAnchorEl.focus();
      await flushFocus();

      // Then: Remains closed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When focus-visible returns true
      vi.mocked(matchesFocusVisible).mockReturnValue(true);
      rawAnchorEl.blur();
      await flushFocus();
      rawAnchorEl.focus();
      await flushFocus();

      // Then: Opens and sets aria-expanded
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given window blurs while closed anchor retains focus, When window refocuses, Then blocks ghost reopening", async () => {
      // Given: Anchor opened then manually closed
      const { anchorEl, floatingEl, rawAnchorEl, node } = await renderFocus({
        requireFocusVisible: false,
      });
      rawAnchorEl.focus();
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      node.open.value = false;
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Window blurs while anchor is still focused
      window.dispatchEvent(new Event("blur"));

      // Blur and refocus anchor while window was blurred
      rawAnchorEl.blur();
      rawAnchorEl.focus();
      await flushFocus();

      // Then: Ghost reopen is blocked
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Window receives focus back
      window.dispatchEvent(new Event("focus"));

      rawAnchorEl.blur();
      rawAnchorEl.focus();
      await flushFocus();

      // Then: Normal focus opens the floating element again
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Closing floating element on blur and focus-out", () => {
    it("Given an open floating element, When focus leaves both anchor and floating element, Then closes floating element", async () => {
      // Given: Opened via anchor focus
      const { anchorEl, floatingEl, rawAnchorEl, rawOutsideEl } = await renderFocus(
        { requireFocusVisible: false },
        false,
        { withOutside: true },
      );
      rawAnchorEl.focus();
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves outside
      rawOutsideEl!.focus();
      await flushFocus();

      // Then: Floating element closes and anchor is collapsed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open floating element, When focus moves into the floating element, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, rawAnchorEl } = await renderFocus({
        requireFocusVisible: false,
      });
      rawAnchorEl.focus();
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves into floating element
      const rawFloatingEl = getTestEl("floating");
      rawFloatingEl.focus();
      await flushFocus();

      // Then: Floating element remains open
      await expect.element(floatingEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an anchor subtree, When focus moves within child elements of the anchor, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, rawAnchorEl, rawChildInputEl } = await renderFocus(
        { requireFocusVisible: false },
        false,
        { anchorKind: "anchor-subtree" },
      );
      rawAnchorEl.focus();
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves to child input inside anchor
      rawChildInputEl!.focus();
      await flushFocus();

      // Then: Remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Custom ignoreFocusOut predicate filtering", () => {
    it("Given an ignoreFocusOut predicate, When focus moves to the ignored element, Then keeps floating element open", async () => {
      // Given
      let targetIgnoredEl: HTMLElement | null = null;
      const { anchorEl, floatingEl, rawAnchorEl, rawOutsideEl, rawIgnoredEl } = await renderFocus(
        {
          requireFocusVisible: false,
          ignoreFocusOut: (target) => target === targetIgnoredEl,
        },
        false,
        { withOutside: true, withIgnored: true },
      );
      targetIgnoredEl = rawIgnoredEl;

      rawAnchorEl.focus();
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves to the ignored element
      rawIgnoredEl!.focus();
      await flushFocus();

      // Then: Remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves to non-ignored outside element
      rawOutsideEl!.focus();
      await flushFocus();

      // Then: Closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Parent and child floating node focus coordination", () => {
    it("Given a parent floating element, When focus moves into a child floating element, Then keeps parent open", async () => {
      // Given
      const { parentAnchorEl, parentFloatingEl, rawChildFloatingEl, rawOutsideEl } =
        await renderTreeFocus("parent");
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(parentFloatingEl).toBeVisible();

      // When: Focus moves to child floating element
      rawChildFloatingEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      // Then: Parent stays open
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(parentFloatingEl).toBeVisible();

      // When: Focus moves completely outside
      rawOutsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      // Then: Parent closes
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(parentFloatingEl).not.toBeInTheDocument();
    });

    it("Given a child floating element, When focus moves into parent floating element, Then closes child while parent stays open", async () => {
      // Given
      const {
        parentAnchorEl,
        parentFloatingEl,
        childAnchorEl,
        childFloatingEl,
        rawParentFloatingEl,
      } = await renderTreeFocus("child");
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();

      // When: Focus moves to parent floating element
      rawParentFloatingEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      // Then: Parent stays open, child closes
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(parentFloatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Dynamic enablement via enabled option", () => {
    it("Given enabled is false, When anchor receives focus, Then preserves closed state", async () => {
      // Given
      const enabled = ref(false);
      const { anchorEl, floatingEl, rawAnchorEl } = await renderFocus({
        enabled,
        requireFocusVisible: false,
      });

      // When
      rawAnchorEl.focus();
      await flushFocus();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });
});
