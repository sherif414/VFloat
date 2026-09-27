import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { type FloatingNode, type UseFocusOptions, useFloatingNode, useFocus } from "@/composables";
import { isMac, isSafari, matchesFocusVisible } from "@/shared/platform";
import { getTestEl } from "@/test-utils";

vi.mock("@/shared/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/platform")>();
  return {
    ...actual,
    matchesFocusVisible: vi.fn(actual.matchesFocusVisible),
    isMac: vi.fn(actual.isMac),
    isSafari: vi.fn(actual.isSafari),
  };
});

interface FixtureConfig {
  anchorKind?: "button" | "anchor-subtree" | "text-input";
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
          : anchorKind === "text-input"
            ? h("input", {
                ref: "anchor",
                "data-testid": "anchor",
                type: "text",
                "aria-expanded": String(openRef.value),
              })
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
          ? h("div", { ref: "floating", "data-testid": "floating", tabindex: -1 }, [
              "Floating content",
              h("button", { "data-testid": "floating-btn", type: "button" }, "Inside Action"),
            ])
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
            type: "button",
            "aria-expanded": String(parentOpen.value),
          },
          "Parent",
        ),
        parentOpen.value
          ? h("div", { ref: "parent-floating", "data-testid": "parent-floating", tabindex: -1 }, [
              "Parent floating",
              h(
                "button",
                { "data-testid": "parent-floating-btn", type: "button" },
                "Parent Button",
              ),
            ])
          : null,
        h(
          "button",
          {
            ref: "child-anchor",
            "data-testid": "child-anchor",
            type: "button",
            "aria-expanded": String(childOpen.value),
          },
          "Child",
        ),
        childOpen.value
          ? h("div", { ref: "child-floating", "data-testid": "child-floating", tabindex: -1 }, [
              "Child floating",
              h("button", { "data-testid": "child-floating-btn", type: "button" }, "Child Button"),
            ])
          : null,
        h("button", { "data-testid": "outside", type: "button" }, "Outside"),
      ]);
  });

  return { Component, parentOpen, childOpen };
}

async function flushFocus() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}

async function renderFocus(
  options: UseFocusOptions = {},
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const fixture = createTestComponent(options, initialOpen, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    floatingBtnEl: page.getByTestId("floating-btn"),
    childInputEl: config.anchorKind === "anchor-subtree" ? page.getByTestId("anchor-child") : null,
    outsideEl: config.withOutside || config.withIgnored ? page.getByTestId("outside") : null,
    ignoredEl: config.withIgnored ? page.getByTestId("ignored") : null,
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

async function renderTreeFocus(target: "parent" | "child") {
  const fixture = createTreeComponent(target);
  await render(fixture.Component);
  await nextTick();
  return {
    parentAnchorEl: page.getByTestId("parent-anchor"),
    parentFloatingEl: page.getByTestId("parent-floating"),
    parentFloatingBtnEl: page.getByTestId("parent-floating-btn"),
    childAnchorEl: page.getByTestId("child-anchor"),
    childFloatingEl: page.getByTestId("child-floating"),
    childFloatingBtnEl: page.getByTestId("child-floating-btn"),
    outsideEl: page.getByTestId("outside"),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

describe("Feature: useFocus", () => {
  afterEach(async () => {
    // Reset modality to pointer
    await userEvent.click(document.body);
    vi.clearAllMocks();
    vi.mocked(matchesFocusVisible).mockReset();
    vi.mocked(isMac).mockReset();
    vi.mocked(isSafari).mockReset();
    vi.useRealTimers();
  });

  describe("Scenario: Opening floating element on anchor focus", () => {
    it("Given requireFocusVisible is false, When anchor receives focus, Then opens floating element and marks anchor as expanded", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderFocus({
        requireFocusVisible: false,
      });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(anchorEl);
      await flushFocus();

      // Then
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given requireFocusVisible is true, When focus occurs, Then only opens when element matches focus-visible", async () => {
      // Given: Initially focus-visible returns false
      vi.mocked(matchesFocusVisible).mockReturnValue(false);
      const { anchorEl, floatingEl, outsideEl } = await renderFocus(
        { requireFocusVisible: true },
        false,
        { withOutside: true },
      );

      // When anchor focused without focus-visible
      await userEvent.click(anchorEl);
      await flushFocus();

      // Then: Remains closed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When focus-visible returns true
      vi.mocked(matchesFocusVisible).mockReturnValue(true);
      await userEvent.click(outsideEl!);
      await flushFocus();
      await userEvent.click(anchorEl);
      await flushFocus();

      // Then: Opens and sets aria-expanded
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given window blurs while closed anchor retains focus, When window refocuses, Then blocks ghost reopening", async () => {
      // Given: Anchor opened then manually closed while retaining focus
      const { anchorEl, floatingEl, outsideEl, node } = await renderFocus(
        { requireFocusVisible: false },
        false,
        { withOutside: true },
      );
      await userEvent.click(anchorEl);
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      node.open.value = false;
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Window blurs while anchor is still focused (OS window switch simulation)
      window.dispatchEvent(new Event("blur"));

      // Browser refocuses window and re-dispatches focus event to activeElement
      getTestEl("anchor").dispatchEvent(new FocusEvent("focus"));
      await flushFocus();

      // Then: Ghost reopen is blocked
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Window receives focus back and user naturally focuses anchor again
      window.dispatchEvent(new Event("focus"));
      await userEvent.click(outsideEl!);
      await flushFocus();
      await userEvent.click(anchorEl);
      await flushFocus();

      // Then: Normal focus opens the floating element again
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Safari on macOS focus-visible bypass (WebKit #233465)", () => {
    it("Given Safari on macOS with null relatedTarget, When anchor is a non-typeable button without keyboard modality, Then preserves closed state", async () => {
      // Given
      vi.mocked(isMac).mockReturnValue(true);
      vi.mocked(isSafari).mockReturnValue(true);
      const { anchorEl, floatingEl } = await renderFocus({
        requireFocusVisible: true,
      });

      // When: Button receives focus without keyboard modality and relatedTarget is null
      getTestEl("anchor").dispatchEvent(new FocusEvent("focus", { relatedTarget: null }));
      await flushFocus();

      // Then: Preserves closed state
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given Safari on macOS with null relatedTarget, When anchor is a text input, Then opens floating element", async () => {
      // Given
      vi.mocked(isMac).mockReturnValue(true);
      vi.mocked(isSafari).mockReturnValue(true);
      const { anchorEl, floatingEl } = await renderFocus({ requireFocusVisible: true }, false, {
        anchorKind: "text-input",
      });

      // When: Text input receives focus with null relatedTarget
      getTestEl("anchor").dispatchEvent(new FocusEvent("focus", { relatedTarget: null }));
      await flushFocus();

      // Then: Opens floating element per W3C :focus-visible spec
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given Safari on macOS with null relatedTarget, When user is using keyboard modality, Then opens floating element", async () => {
      // Given
      vi.mocked(isMac).mockReturnValue(true);
      vi.mocked(isSafari).mockReturnValue(true);
      const { anchorEl, floatingEl } = await renderFocus({
        requireFocusVisible: true,
      });

      // User presses Tab to switch modality to keyboard
      await userEvent.keyboard("{Tab}");

      // When: Focus enters document from outside with null relatedTarget
      getTestEl("anchor").dispatchEvent(new FocusEvent("focus", { relatedTarget: null }));
      await flushFocus();

      // Then: Opens floating element
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Closing floating element on blur and focus-out", () => {
    it("Given an open floating element, When focus leaves both anchor and floating element, Then closes floating element", async () => {
      // Given: Opened via anchor focus
      const { anchorEl, floatingEl, outsideEl } = await renderFocus(
        { requireFocusVisible: false },
        false,
        { withOutside: true },
      );
      await userEvent.click(anchorEl);
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves outside
      await userEvent.click(outsideEl!);
      await flushFocus();

      // Then: Floating element closes and anchor is collapsed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open floating element, When focus moves into the floating element, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, floatingBtnEl } = await renderFocus({
        requireFocusVisible: false,
      });
      await userEvent.click(anchorEl);
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves into floating element
      await userEvent.click(floatingBtnEl);
      await flushFocus();

      // Then: Floating element remains open
      await expect.element(floatingBtnEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an anchor subtree, When focus moves within child elements of the anchor, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, childInputEl } = await renderFocus(
        { requireFocusVisible: false },
        false,
        { anchorKind: "anchor-subtree" },
      );
      await userEvent.tab();
      await flushFocus();
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves to child input inside anchor
      await userEvent.click(childInputEl!);
      await flushFocus();

      // Then: Remains open
      await expect.element(childInputEl!).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element and focused anchor, When OS-level window blur occurs where anchor remains activeElement, Then preserves open state", async () => {
      // Given: Opened via anchor focus
      const { anchorEl, floatingEl } = await renderFocus({
        requireFocusVisible: false,
      });
      await userEvent.click(anchorEl);
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Window/OS blur occurs (relatedTarget is null, activeElement is still anchor)
      getTestEl("anchor").dispatchEvent(new FocusEvent("blur", { relatedTarget: null }));
      await flushFocus();

      // Then: Preserves open state
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Custom ignoreFocusOut predicate filtering", () => {
    it("Given an ignoreFocusOut predicate, When focus moves to the ignored element, Then keeps floating element open", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl, ignoredEl } = await renderFocus(
        {
          requireFocusVisible: false,
          ignoreFocusOut: (target) => target === getTestEl("ignored"),
        },
        false,
        { withOutside: true, withIgnored: true },
      );

      await userEvent.click(anchorEl);
      await flushFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves to the ignored element
      await userEvent.click(ignoredEl!);
      await flushFocus();

      // Then: Remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Focus moves to non-ignored outside element
      await userEvent.click(outsideEl!);
      await flushFocus();

      // Then: Closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Parent and child floating node focus coordination", () => {
    it("Given a parent floating element, When focus moves into a child floating element, Then keeps parent open", async () => {
      // Given
      const { parentAnchorEl, parentFloatingEl, childFloatingBtnEl, outsideEl } =
        await renderTreeFocus("parent");
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(parentFloatingEl).toBeVisible();

      // When: Focus moves to child floating element
      await userEvent.click(childFloatingBtnEl);
      await flushFocus();

      // Then: Parent stays open
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(parentFloatingEl).toBeVisible();

      // When: Focus moves completely outside
      await userEvent.click(outsideEl);
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
        parentFloatingBtnEl,
        childAnchorEl,
        childFloatingEl,
      } = await renderTreeFocus("child");
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();

      // When: Focus moves to parent floating element
      await userEvent.click(parentFloatingBtnEl);
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
      const { anchorEl, floatingEl } = await renderFocus({
        enabled,
        requireFocusVisible: false,
      });

      // When
      await userEvent.click(anchorEl);
      await flushFocus();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });
});
