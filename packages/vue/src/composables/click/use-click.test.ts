import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { computed, defineComponent, h, nextTick, ref, useTemplateRef, type VNode } from "vue";
import {
  type FloatingNode,
  type UseClickOptions,
  type VirtualElement,
  useClick,
  useFloatingNode,
} from "@/composables";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";
import { isButtonTarget, isLinkTarget } from "./use-click";

type AnchorKind =
  | "button"
  | "role-button"
  | "link"
  | "bare-link"
  | "text-input"
  | "button-input"
  | "plain-div";

interface FixtureConfig {
  anchorKind?: AnchorKind;
  defaultOpen?: boolean;
}

function renderAnchor(kind: AnchorKind, extraProps: Record<string, unknown> = {}): VNode {
  switch (kind) {
    case "role-button":
      return h(
        "div",
        { ref: "anchor", "data-testid": "anchor", tabindex: 0, role: "button", ...extraProps },
        "Custom Button",
      );
    case "link":
      return h("a", { ref: "anchor", "data-testid": "anchor", href: "#", ...extraProps }, "Link");
    case "bare-link":
      return h(
        "a",
        { ref: "anchor", "data-testid": "anchor", tabindex: 0, ...extraProps },
        "Link without href",
      );
    case "text-input":
      return h("input", { ref: "anchor", "data-testid": "anchor", type: "text", ...extraProps });
    case "button-input":
      return h("input", {
        ref: "anchor",
        "data-testid": "anchor",
        type: "button",
        value: "Click me",
        ...extraProps,
      });
    case "plain-div":
      return h("div", { ref: "anchor", "data-testid": "anchor", ...extraProps }, "Trigger");
    case "button":
    default:
      return h("button", { ref: "anchor", "data-testid": "anchor", ...extraProps }, "Trigger");
  }
}

function createTestComponent(options: UseClickOptions = {}, config: FixtureConfig = {}) {
  const openRef = ref(config.defaultOpen ?? false);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useClick(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        renderAnchor(config.anchorKind ?? "button", {
          "aria-expanded": String(openRef.value),
        }),
        openRef.value ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating") : null,
      ]);
  });

  return { Component, getNode: () => node, openRef };
}

async function renderClick(options: UseClickOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

describe("Feature: useClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Toggle activation on anchor click", () => {
    it("Given a closed floating element with toggle enabled, When the anchor is clicked, Then opens and marks anchor as expanded", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element with toggle enabled, When the anchor is clicked again, Then closes and marks anchor as collapsed", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: true }, { defaultOpen: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given toggle is disabled, When the anchor is clicked repeatedly, Then opens on first click and remains open", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: false });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When clicked again
      await userEvent.click(anchorEl);

      // Then remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When clicked a third time
      await userEvent.click(anchorEl);

      // Then still remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Pointer event handling and modality filtering", () => {
    it("Given ignoreMouse is true, When anchor is clicked via mouse pointer, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreMouse: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given event option is 'mousedown', When mousedown is dispatched on anchor, Then toggles open state immediately", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When mousedown fires again
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given event option is 'mousedown', When pointerdown occurs before mousedown, Then tracks pointerType and opens", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0 }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given unknown pointer device with empty pointerType, When event is 'mousedown', Then opens and avoids double-toggle on subsequent click", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Browser cannot determine device type so pointerType is ""
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then: Opens on mousedown
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Subsequent click event from same gesture fires
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Remains open rather than double-toggling closed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given unknown pointer device with detail 0, When ignoreKeyboard is true, Then treats gesture as pointer and opens", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreKeyboard: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: pointerdown preceded the click, so it is a pointer gesture, not keyboard
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 0 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given unknown pointer device with empty pointerType, When ignoreMouse is true, Then allows the unknown device and opens", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreMouse: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a touch gesture when event is 'mousedown', When pointerdown and mousedown fire, Then defers opening until the trailing click", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Touch sequence begins (pointerdown -> mousedown)
      rawAnchorEl.dispatchEvent(
        makePointerEvent("pointerdown", { button: 0, pointerType: "touch" }),
      );
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then: Does not open prematurely on touch mousedown
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Subsequent trailing click arrives
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Opens on trailing click
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Keyboard activation on Enter and Space keys", () => {
    it("Given ignoreKeyboard is true, When synthetic keyboard click with detail 0 is dispatched, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreKeyboard: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 0 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a focused anchor, When Enter key is pressed, Then toggles the floating element open and closed", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick();
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When pressed again
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a focused anchor, When Space key is pressed, Then toggles the floating element open and closed", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick();
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.keyboard(" ");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When pressed again
      await userEvent.keyboard(" ");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given ignoreKeyboard is true, When Space key is pressed on a non-button trigger, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick(
        { ignoreKeyboard: true },
        { anchorKind: "plain-div" },
      );
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When
      await userEvent.keyboard(" ");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given ignoreKeyboard is true, When Enter key is pressed on anchor, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreKeyboard: true });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Dynamic enablement via enabled option", () => {
    it("Given enabled is initially false, When anchor is clicked, Then ignores click until enabled becomes true", async () => {
      // Given
      const enabled = ref(false);
      const { anchorEl, floatingEl } = await renderClick({ enabled });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When clicked while disabled
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When dynamically enabled
      enabled.value = true;
      await nextTick();
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an active open element, When enabled changes to false, Then ignores subsequent clicks and preserves open state", async () => {
      // Given
      const enabled = ref(true);
      const { anchorEl, floatingEl } = await renderClick({ enabled });

      // When opened
      await userEvent.click(anchorEl);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When dynamically disabled
      enabled.value = false;
      await nextTick();
      await userEvent.click(anchorEl);

      // Then: Preserves open state because click was ignored
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Anchor element types and virtual triggers", () => {
    it("Given a div with role='button', When Enter and Space keys are pressed, Then toggles open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "role-button" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an anchor element with href, When Enter key is pressed, Then opens without double-triggering", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "link" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an anchor element without href, When Enter and Space keys are pressed, Then toggles open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "bare-link" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a typeable text input anchor, When typing characters or pressing Enter, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "text-input" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When typing text
      await userEvent.keyboard("hello world");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When pressing Enter in input
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an input element with type='button', When Enter and Space keys are pressed, Then toggles open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "button-input" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a virtual element with a contextElement, When context element is clicked, Then toggles open state", async () => {
      // Given
      const openRef = ref(false);
      let node!: FloatingNode;
      const Component = defineComponent(() => {
        const floatingEl = useTemplateRef<HTMLElement>("floating");
        const contextEl = useTemplateRef<HTMLElement>("context");
        const virtualAnchor = computed<VirtualElement | null>(() => {
          if (!contextEl.value) return null;
          return {
            getBoundingClientRect: () => contextEl.value!.getBoundingClientRect(),
            contextElement: contextEl.value,
          };
        });

        node = useFloatingNode({
          anchorEl: virtualAnchor,
          floatingEl,
          open: openRef,
        });
        useClick(node);

        return () =>
          h("div", { class: "test-wrapper" }, [
            h(
              "button",
              {
                ref: "context",
                "data-testid": "context-btn",
                "aria-expanded": String(openRef.value),
              },
              "Context Target",
            ),
            openRef.value
              ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating")
              : null,
          ]);
      });

      await render(Component);
      await nextTick();
      const contextBtnEl = page.getByTestId("context-btn");
      const floatingEl = page.getByTestId("floating");

      await expect.element(contextBtnEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(contextBtnEl);

      // Then
      await expect.element(contextBtnEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When clicked again
      await userEvent.click(contextBtnEl);

      // Then
      await expect.element(contextBtnEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Stale interaction state cleanup", () => {
    it("Given an in-progress touch gesture that is cancelled, When pointercancel fires, Then allows subsequent non-touch clicks", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreTouch: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Simulate a touch sequence that gets cancelled (e.g. user starts dragging/scrolling away)
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { pointerType: "touch" }));
      rawAnchorEl.dispatchEvent(makePointerEvent("pointercancel", { pointerType: "touch" }));

      // When: Subsequent non-touch click arrives
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Click is not blocked by stale touch state
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Target identification helpers (isButtonTarget, isLinkTarget)", () => {
    it("Given button elements and nested descendants, When evaluated by isButtonTarget, Then identifies them as button targets", () => {
      // Given
      const buttonEl = document.createElement("button");
      const spanEl = document.createElement("span");
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const textNode = document.createTextNode("Click");

      svgEl.appendChild(pathEl);
      spanEl.appendChild(textNode);
      buttonEl.appendChild(spanEl);
      buttonEl.appendChild(svgEl);

      // Then: Direct button and nested elements
      expect(isButtonTarget(buttonEl)).toBe(true);
      expect(isButtonTarget(spanEl)).toBe(true);
      expect(isButtonTarget(svgEl)).toBe(true);
      expect(isButtonTarget(pathEl)).toBe(true);
      expect(isButtonTarget(textNode)).toBe(true);

      // Given: Input button variations
      const buttonInputEl = document.createElement("input");
      buttonInputEl.type = "button";
      expect(isButtonTarget(buttonInputEl)).toBe(true);

      const submitInputEl = document.createElement("input");
      submitInputEl.type = "submit";
      expect(isButtonTarget(submitInputEl)).toBe(true);

      const resetInputEl = document.createElement("input");
      resetInputEl.type = "reset";
      expect(isButtonTarget(resetInputEl)).toBe(true);

      const imageInputEl = document.createElement("input");
      imageInputEl.type = "image";
      expect(isButtonTarget(imageInputEl)).toBe(true);

      // Given: Summary element
      const summaryEl = document.createElement("summary");
      const summarySpanEl = document.createElement("span");
      summaryEl.appendChild(summarySpanEl);
      expect(isButtonTarget(summaryEl)).toBe(true);
      expect(isButtonTarget(summarySpanEl)).toBe(true);

      // Given: Non-button elements
      const textInputEl = document.createElement("input");
      textInputEl.type = "text";
      expect(isButtonTarget(textInputEl)).toBe(false);

      const divEl = document.createElement("div");
      const divChildEl = document.createElement("span");
      divEl.appendChild(divChildEl);
      expect(isButtonTarget(divEl)).toBe(false);
      expect(isButtonTarget(divChildEl)).toBe(false);

      const roleButtonEl = document.createElement("div");
      roleButtonEl.setAttribute("role", "button");
      const roleButtonSpanEl = document.createElement("span");
      roleButtonEl.appendChild(roleButtonSpanEl);
      expect(isButtonTarget(roleButtonEl)).toBe(false);
      expect(isButtonTarget(roleButtonSpanEl)).toBe(false);

      const linkEl = document.createElement("a");
      linkEl.href = "#";
      const linkSpanEl = document.createElement("span");
      linkEl.appendChild(linkSpanEl);
      expect(isButtonTarget(linkEl)).toBe(false);
      expect(isButtonTarget(linkSpanEl)).toBe(false);

      // Non-elements
      expect(isButtonTarget(null)).toBe(false);
      expect(isButtonTarget(undefined as unknown as EventTarget)).toBe(false);
      expect(isButtonTarget(window)).toBe(false);
      expect(isButtonTarget(document)).toBe(false);
      expect(isButtonTarget(document.createTextNode("detached"))).toBe(false);
    });

    it("Given link elements with href and nested descendants, When evaluated by isLinkTarget, Then identifies them as link targets", () => {
      // Given
      const linkEl = document.createElement("a");
      linkEl.href = "https://example.com";
      const spanEl = document.createElement("span");
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const textNode = document.createTextNode("Link text");

      svgEl.appendChild(pathEl);
      spanEl.appendChild(textNode);
      linkEl.appendChild(spanEl);
      linkEl.appendChild(svgEl);

      // Then: Direct link and nested elements
      expect(isLinkTarget(linkEl)).toBe(true);
      expect(isLinkTarget(spanEl)).toBe(true);
      expect(isLinkTarget(svgEl)).toBe(true);
      expect(isLinkTarget(pathEl)).toBe(true);
      expect(isLinkTarget(textNode)).toBe(true);

      // Given: Bare link without href
      const bareLinkEl = document.createElement("a");
      const bareSpanEl = document.createElement("span");
      bareLinkEl.appendChild(bareSpanEl);
      expect(isLinkTarget(bareLinkEl)).toBe(false);
      expect(isLinkTarget(bareSpanEl)).toBe(false);

      // Given: Non-links
      const buttonEl = document.createElement("button");
      const buttonSpanEl = document.createElement("span");
      buttonEl.appendChild(buttonSpanEl);
      expect(isLinkTarget(buttonEl)).toBe(false);
      expect(isLinkTarget(buttonSpanEl)).toBe(false);

      const divEl = document.createElement("div");
      expect(isLinkTarget(divEl)).toBe(false);

      // Non-elements
      expect(isLinkTarget(null)).toBe(false);
      expect(isLinkTarget(undefined as unknown as EventTarget)).toBe(false);
      expect(isLinkTarget(window)).toBe(false);
      expect(isLinkTarget(document)).toBe(false);
      expect(isLinkTarget(document.createTextNode("detached"))).toBe(false);
    });
  });

  describe("Scenario: IME composition safety", () => {
    it("Given an active IME composition session on a non-button trigger, When Enter or Space is pressed, Then ignores activation until composition ends", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "plain-div" });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Start IME
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // Enter during IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // Space during IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: End IME
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // Enter after IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();

      // Then: Opens normally
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a keydown event with isComposing true directly, When Enter is pressed, Then ignores activation", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "plain-div" });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      Object.defineProperty(event, "isComposing", { value: true });
      rawAnchorEl.dispatchEvent(event);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });
});
