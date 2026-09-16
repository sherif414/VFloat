import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
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
}

function renderAnchor(kind: AnchorKind): VNode {
  switch (kind) {
    case "role-button":
      return h(
        "div",
        { ref: "anchor", "data-testid": "anchor", tabindex: 0, role: "button" },
        "Custom Button",
      );
    case "link":
      return h("a", { ref: "anchor", "data-testid": "anchor", href: "#" }, "Link");
    case "bare-link":
      return h("a", { ref: "anchor", "data-testid": "anchor", tabindex: 0 }, "Link without href");
    case "text-input":
      return h("input", { ref: "anchor", "data-testid": "anchor", type: "text" });
    case "button-input":
      return h("input", {
        ref: "anchor",
        "data-testid": "anchor",
        type: "button",
        value: "Click me",
      });
    case "plain-div":
      return h("div", { ref: "anchor", "data-testid": "anchor" }, "Trigger");
    case "button":
    default:
      return h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger");
  }
}

function createTestComponent(options: UseClickOptions = {}, config: FixtureConfig = {}) {
  const openRef = ref(false);
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
        renderAnchor(config.anchorKind ?? "button"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
      ]);
  });

  return { Component, getNode: () => node, openRef };
}

async function renderClick(options: UseClickOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

describe("useClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("click behavior", () => {
    it("toggles open state on click", async () => {
      const { anchorEl, node } = await renderClick({ toggle: true });
      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(false);
    });

    it("opens but does not toggle when toggle is false", async () => {
      const { anchorEl, node } = await renderClick({ toggle: false });
      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);
    });
  });

  describe("pointer behavior", () => {
    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      const { anchorEl, node } = await renderClick({ ignoreMouse: true });
      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);

      expect(node.open.value).toBe(false);
    });

    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      const { anchorEl, node } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      expect(node.open.value).toBe(false);

      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      expect(node.open.value).toBe(true);

      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();
      expect(node.open.value).toBe(false);
    });

    it("tracks pointerType on pointerdown when handling mousedown event", async () => {
      const { anchorEl, node } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      expect(node.open.value).toBe(false);

      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0 }));
      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      expect(node.open.value).toBe(true);
    });

    it("handles unknown pointer device with empty string pointerType ('') when event is mousedown", async () => {
      const { anchorEl, node } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      expect(node.open.value).toBe(false);

      // Browser cannot determine device type so pointerType is ""
      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();
      expect(node.open.value).toBe(true);

      // Subsequent click event from the gesture must be skipped rather than double-toggling closed
      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();
      expect(node.open.value).toBe(true);
    });

    it("does not mistake unknown pointer ('') with detail === 0 for keyboard activation when ignoreKeyboard is true", async () => {
      const { anchorEl, node } = await renderClick({ ignoreKeyboard: true });
      expect(node.open.value).toBe(false);

      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 0 }));
      await nextTick();

      // Because pointerdown preceded the click, it is a pointer gesture, not keyboard
      expect(node.open.value).toBe(true);
    });

    it("allows unknown pointer device ('') when ignoreMouse is true", async () => {
      const { anchorEl, node } = await renderClick({ ignoreMouse: true });
      expect(node.open.value).toBe(false);

      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      expect(node.open.value).toBe(true);
    });

    it("opens on trailing click rather than mousedown for touch gestures when event is mousedown", async () => {
      const { anchorEl, node } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      expect(node.open.value).toBe(false);

      // Touch sequence: pointerdown -> mousedown (browser compat) -> click
      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "touch" }));
      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Should not open prematurely on touch mousedown
      expect(node.open.value).toBe(false);

      // Should open on subsequent click
      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();
      expect(node.open.value).toBe(true);
    });
  });

  describe("keyboard behavior", () => {
    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      const { anchorEl, node } = await renderClick({ ignoreKeyboard: true });

      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 0 }));
      await nextTick();

      expect(node.open.value).toBe(false);
    });

    it("toggles on Enter key press", async () => {
      const { anchorEl, node } = await renderClick();
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(true);

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(false);
    });

    it("toggles on Space key press", async () => {
      const { anchorEl, node } = await renderClick();
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard(" ");
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(node.open.value).toBe(false);
    });

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      const { anchorEl, node } = await renderClick(
        { ignoreKeyboard: true },
        { anchorKind: "plain-div" },
      );
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      await userEvent.keyboard(" ");

      expect(node.open.value).toBe(false);
    });

    it("does not trigger on Enter key press if ignoreKeyboard is true", async () => {
      const { anchorEl, node } = await renderClick({ ignoreKeyboard: true });
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      await userEvent.keyboard("{Enter}");

      expect(node.open.value).toBe(false);
    });
  });

  describe("enabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false);
      const { anchorEl, node } = await renderClick({ enabled });

      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);

      expect(node.open.value).toBe(false);

      enabled.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      expect(node.open.value).toBe(true);
    });

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true);
      const { anchorEl, node } = await renderClick({ enabled });

      await userEvent.click(anchorEl);
      expect(node.open.value).toBe(true);

      enabled.value = false;
      await nextTick();

      await userEvent.click(anchorEl);
      expect(node.open.value).toBe(true);
    });
  });

  describe("element types support", () => {
    it("handles div with role='button' on Enter and Space", async () => {
      const { anchorEl, node } = await renderClick({}, { anchorKind: "role-button" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(node.open.value).toBe(false);
    });

    it("handles <a href='...'> without double-triggering on Enter", async () => {
      const { anchorEl, node } = await renderClick({}, { anchorKind: "link" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(node.open.value).toBe(false);
    });

    it("handles <a> without href on Enter and Space", async () => {
      const { anchorEl, node } = await renderClick({}, { anchorKind: "bare-link" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(node.open.value).toBe(false);
    });

    it("does not toggle on Space or Enter when anchor is a typeable text input or textarea", async () => {
      const { anchorEl, node } = await renderClick({}, { anchorKind: "text-input" });

      anchorEl.focus();

      await userEvent.keyboard("hello world");
      expect(node.open.value).toBe(false);

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(false);
    });

    it("handles input[type='button'] on Space and Enter", async () => {
      const { anchorEl, node } = await renderClick({}, { anchorKind: "button-input" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(node.open.value).toBe(false);
    });

    it("attaches click handlers to a virtual element with a contextElement", async () => {
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
        });
        useClick(node);

        return () =>
          h("div", { class: "test-wrapper" }, [
            h("button", { ref: "context", "data-testid": "context-btn" }, "Context Target"),
            h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
          ]);
      });

      await render(Component);
      await nextTick();
      const btn = getTestEl("context-btn");

      expect(node.open.value).toBe(false);
      await userEvent.click(btn);
      await nextTick();
      expect(node.open.value).toBe(true);

      await userEvent.click(btn);
      await nextTick();
      expect(node.open.value).toBe(false);
    });
  });

  describe("stale interaction state cleanup", () => {
    it("clears pointerType on element pointercancel when touch interaction is cancelled", async () => {
      const { anchorEl, node } = await renderClick({ ignoreTouch: true });

      // Simulate a touch sequence on the anchor that gets cancelled (e.g. user starts dragging/scrolling away).
      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { pointerType: "touch" }));
      anchorEl.dispatchEvent(makePointerEvent("pointercancel", { pointerType: "touch" }));

      // A subsequent non-touch click should not be blocked by a stale "touch" pointerType.
      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      expect(node.open.value).toBe(true);
    });
  });

  describe("isButtonTarget and isLinkTarget with nested child elements", () => {
    it("recognizes native button targets and their nested children", () => {
      const button = document.createElement("button");
      const span = document.createElement("span");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const textNode = document.createTextNode("Click");

      svg.appendChild(path);
      span.appendChild(textNode);
      button.appendChild(span);
      button.appendChild(svg);

      // Direct button
      expect(isButtonTarget(button)).toBe(true);
      // Nested HTML child
      expect(isButtonTarget(span)).toBe(true);
      // Nested SVG child
      expect(isButtonTarget(svg)).toBe(true);
      // Deeply nested SVG child
      expect(isButtonTarget(path)).toBe(true);
      // Nested text node
      expect(isButtonTarget(textNode)).toBe(true);

      // Input buttons
      const buttonInput = document.createElement("input");
      buttonInput.type = "button";
      expect(isButtonTarget(buttonInput)).toBe(true);

      const submitInput = document.createElement("input");
      submitInput.type = "submit";
      expect(isButtonTarget(submitInput)).toBe(true);

      const resetInput = document.createElement("input");
      resetInput.type = "reset";
      expect(isButtonTarget(resetInput)).toBe(true);

      const imageInput = document.createElement("input");
      imageInput.type = "image";
      expect(isButtonTarget(imageInput)).toBe(true);

      // Summary and nested child
      const summary = document.createElement("summary");
      const summarySpan = document.createElement("span");
      summary.appendChild(summarySpan);
      expect(isButtonTarget(summary)).toBe(true);
      expect(isButtonTarget(summarySpan)).toBe(true);

      // Non-buttons
      const textInput = document.createElement("input");
      textInput.type = "text";
      expect(isButtonTarget(textInput)).toBe(false);

      const div = document.createElement("div");
      const divChild = document.createElement("span");
      div.appendChild(divChild);
      expect(isButtonTarget(div)).toBe(false);
      expect(isButtonTarget(divChild)).toBe(false);

      const roleButton = document.createElement("div");
      roleButton.setAttribute("role", "button");
      const roleButtonSpan = document.createElement("span");
      roleButton.appendChild(roleButtonSpan);
      expect(isButtonTarget(roleButton)).toBe(false);
      expect(isButtonTarget(roleButtonSpan)).toBe(false);

      const link = document.createElement("a");
      link.href = "#";
      const linkSpan = document.createElement("span");
      link.appendChild(linkSpan);
      expect(isButtonTarget(link)).toBe(false);
      expect(isButtonTarget(linkSpan)).toBe(false);

      // Non-elements
      expect(isButtonTarget(null)).toBe(false);
      expect(isButtonTarget(undefined as unknown as EventTarget)).toBe(false);
      expect(isButtonTarget(window)).toBe(false);
      expect(isButtonTarget(document)).toBe(false);
      expect(isButtonTarget(document.createTextNode("detached"))).toBe(false);
    });

    it("recognizes link targets with href and their nested children", () => {
      const link = document.createElement("a");
      link.href = "https://example.com";
      const span = document.createElement("span");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const textNode = document.createTextNode("Link text");

      svg.appendChild(path);
      span.appendChild(textNode);
      link.appendChild(span);
      link.appendChild(svg);

      // Direct link
      expect(isLinkTarget(link)).toBe(true);
      // Nested HTML child
      expect(isLinkTarget(span)).toBe(true);
      // Nested SVG child
      expect(isLinkTarget(svg)).toBe(true);
      // Deeply nested SVG child
      expect(isLinkTarget(path)).toBe(true);
      // Nested text node
      expect(isLinkTarget(textNode)).toBe(true);

      // Bare link without href
      const bareLink = document.createElement("a");
      const bareSpan = document.createElement("span");
      bareLink.appendChild(bareSpan);
      expect(isLinkTarget(bareLink)).toBe(false);
      expect(isLinkTarget(bareSpan)).toBe(false);

      // Non-links
      const button = document.createElement("button");
      const buttonSpan = document.createElement("span");
      button.appendChild(buttonSpan);
      expect(isLinkTarget(button)).toBe(false);
      expect(isLinkTarget(buttonSpan)).toBe(false);

      const div = document.createElement("div");
      expect(isLinkTarget(div)).toBe(false);

      // Non-elements
      expect(isLinkTarget(null)).toBe(false);
      expect(isLinkTarget(undefined as unknown as EventTarget)).toBe(false);
      expect(isLinkTarget(window)).toBe(false);
      expect(isLinkTarget(document)).toBe(false);
      expect(isLinkTarget(document.createTextNode("detached"))).toBe(false);
    });
  });
});
