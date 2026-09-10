import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef, type VNode } from "vue";
import {
  type UseClickContext,
  type UseClickOptions,
  useClick,
  useFloatingNode,
  useHover,
} from "@/composables";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";

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
  const setOpenMock: ReturnType<typeof vi.fn> = vi.fn((open: boolean) => {
    openRef.value = open;
  });
  let node!: UseClickContext;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = {
      refs: {
        anchorEl,
        floatingEl,
        arrowEl: ref<HTMLElement | null>(null),
      },
      open: openRef,
      setOpen: setOpenMock as () => void,
    };
    useClick(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        renderAnchor(config.anchorKind ?? "button"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
      ]);
  });

  return { Component, getNode: () => node, openRef, setOpenMock };
}

function createHoverClickComponent() {
  let floatingNode!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    floatingNode = useFloatingNode({ anchorEl, floatingEl });
    useHover(floatingNode);
    useClick(floatingNode, { stickIfOpen: true });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
      ]);
  });

  return { Component, getNode: () => floatingNode };
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
    setOpenMock: fixture.setOpenMock,
  };
}

async function renderHoverClick() {
  const fixture = createHoverClickComponent();
  await render(fixture.Component);
  await nextTick();
  return { anchorEl: getTestEl("anchor"), node: fixture.getNode() };
}

describe("useClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("click behavior", () => {
    it("toggles open state on click", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({ toggle: true });
      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(false);
    });

    it("opens but does not toggle when toggle is false", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({ toggle: false });
      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(node.open.value).toBe(true);
    });
  });

  describe("pointer behavior", () => {
    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({ ignoreMouse: true });
      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);
    });

    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      expect(node.open.value).toBe(false);

      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);
      setOpenMock.mockClear();

      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(false);
    });

    it("tracks pointerType on pointerdown when handling mousedown event", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      expect(node.open.value).toBe(false);

      anchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0 }));
      anchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);
    });
  });

  describe("keyboard behavior", () => {
    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({ ignoreKeyboard: true });

      anchorEl.dispatchEvent(makeMouseEvent("click", { detail: 0 }));
      await nextTick();

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);
    });

    it("toggles on Enter key press", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick();
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(false);
    });

    it("toggles on Space key press", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick();
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(false);
    });

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick(
        { ignoreKeyboard: true },
        { anchorKind: "plain-div" },
      );
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      await userEvent.keyboard(" ");

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);
    });

    it("does not trigger on Enter key press if ignoreKeyboard is true", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({ ignoreKeyboard: true });
      expect(node.open.value).toBe(false);

      anchorEl.focus();
      await userEvent.keyboard("{Enter}");

      expect(setOpenMock).not.toHaveBeenCalled();
    });
  });

  describe("enabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false);
      const { anchorEl, node, setOpenMock } = await renderClick({ enabled });

      expect(node.open.value).toBe(false);

      await userEvent.click(anchorEl);

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);

      enabled.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);
    });

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true);
      const { anchorEl, node, setOpenMock } = await renderClick({ enabled });

      await userEvent.click(anchorEl);
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(node.open.value).toBe(true);
      setOpenMock.mockClear();

      enabled.value = false;
      await nextTick();

      await userEvent.click(anchorEl);
      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(true);
    });
  });

  describe("stickIfOpen behavior", () => {
    it("closes open element on click by default when stickIfOpen is false", async () => {
      const { anchorEl, node, openRef, setOpenMock } = await renderClick({
        stickIfOpen: false,
        toggle: true,
      });
      openRef.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenCalledWith(false, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(false);
    });

    it("keeps open element open (pins it) on first click when stickIfOpen is true", async () => {
      const { anchorEl, node, openRef, setOpenMock } = await renderClick({
        stickIfOpen: true,
        toggle: true,
      });
      openRef.value = true;
      await nextTick();

      // First click: pins the already-open overlay without closing it
      await userEvent.click(anchorEl);
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);

      // Second click: toggles it closed
      await userEvent.click(anchorEl);
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(false);
    });

    it("keeps open element open across multiple clicks when stickIfOpen is true and toggle is false", async () => {
      const { anchorEl, node, openRef } = await renderClick({
        stickIfOpen: true,
        toggle: false,
      });
      openRef.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);
    });
  });

  describe("combined hover and click pinning integration", () => {
    it("pins hover overlay on click so pointer leave does not close it", async () => {
      const { anchorEl, node } = await renderHoverClick();
      expect(node.open.value).toBe(false);

      // 1. Pointer enters anchor -> opened via hover
      anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(node.open.value).toBe(true);
      expect(node.lastOpenReason?.value).toBe("hover");

      // 2. User clicks anchor -> pins open via stickIfOpen
      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);
      expect(node.lastOpenReason?.value).toBe("anchor-click");

      // 3. Pointer leaves anchor -> stays open because it is pinned
      anchorEl.dispatchEvent(makePointerEvent("pointerleave"));
      await nextTick();
      expect(node.open.value).toBe(true);

      // 4. Second click on anchor -> closes overlay
      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(false);
      expect(node.lastOpenReason?.value).toBeNull();
    });

    it("unpinned hover overlay closes normally on pointer leave without click", async () => {
      const { anchorEl, node } = await renderHoverClick();
      expect(node.open.value).toBe(false);

      // Pointer enters anchor -> opens via hover
      anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(node.open.value).toBe(true);
      expect(node.lastOpenReason?.value).toBe("hover");

      // Pointer leaves without clicking -> closes via hover
      anchorEl.dispatchEvent(makePointerEvent("pointerleave"));
      await nextTick();
      expect(node.open.value).toBe(false);
      expect(node.lastOpenReason?.value).toBeNull();
    });
  });

  describe("element types support", () => {
    it("handles div with role='button' on Enter and Space", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({}, { anchorKind: "role-button" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "keyboard-activate", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(
        2,
        false,
        "keyboard-activate",
        expect.any(Object),
      );
      expect(node.open.value).toBe(false);
    });

    it("handles <a href='...'> without double-triggering on Enter", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({}, { anchorKind: "link" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(
        2,
        false,
        "keyboard-activate",
        expect.any(Object),
      );
      expect(node.open.value).toBe(false);
    });

    it("handles <a> without href on Enter and Space", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({}, { anchorKind: "bare-link" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "keyboard-activate", expect.any(Object));
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(
        2,
        false,
        "keyboard-activate",
        expect.any(Object),
      );
      expect(node.open.value).toBe(false);
    });

    it("does not toggle on Space or Enter when anchor is a typeable text input or textarea", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({}, { anchorKind: "text-input" });

      anchorEl.focus();

      await userEvent.keyboard("hello world");
      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);
    });

    it("handles input[type='button'] on Space and Enter", async () => {
      const { anchorEl, node, setOpenMock } = await renderClick({}, { anchorKind: "button-input" });

      anchorEl.focus();

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(node.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(node.open.value).toBe(false);
    });
  });
});
