import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import {
  useDismiss,
  useFloatingNode,
  useFloatingTree,
  type UseDismissOptions,
} from "@/composables";
import { getTestEl, makePointerEvent } from "@/test-utils";

function createTestComponent(options: UseDismissOptions = {}) {
  const openRef = ref(true);
  const setOpenMock = vi.fn();

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    // Controlled open state: the mock observes every open change the node makes.
    const node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
      onOpenChange: (value, reason, event) => setOpenMock(value, reason, event),
    });
    useDismiss(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("div", { "data-testid": "outside" }, "Outside"),
      ]);
  });

  return { Component, openRef, setOpenMock };
}

function createTreeComponent() {
  const parentOpen = ref(true);
  const childOpen = ref(true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const tree = useFloatingTree();
    const parentNode = useFloatingNode({ anchorEl, floatingEl, open: parentOpen });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
    });
    tree.addNode(parentNode);
    tree.addNode(childNode, parentNode.id);

    useDismiss(parentNode, { tree });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("button", { ref: "child-anchor", "data-testid": "child-anchor" }, "Child Trigger"),
        h("div", { ref: "child-floating", "data-testid": "child-floating" }, "Child Floating"),
        h("div", { "data-testid": "outside" }, "Outside"),
      ]);
  });

  return { Component, parentOpen, childOpen };
}

async function renderDismiss(options: UseDismissOptions = {}) {
  const fixture = createTestComponent(options);
  const setOpenMock = fixture.setOpenMock;
  await render(fixture.Component);
  await nextTick();
  return {
    floatingEl: getTestEl("floating"),
    outsideEl: getTestEl("outside"),
    openRef: fixture.openRef,
    setOpenMock,
  };
}

describe("useDismiss", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("default channels", () => {
    it("closes on Escape with the escape-key reason", async () => {
      const { setOpenMock, openRef } = await renderDismiss();
      setOpenMock.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
      expect(openRef.value).toBe(false);
    });

    it("closes on outside pointerdown with the outside-pointer reason", async () => {
      const { outsideEl, setOpenMock, openRef } = await renderDismiss();
      setOpenMock.mockClear();

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledWith(false, "outside-pointer", expect.any(Event));
      expect(openRef.value).toBe(false);
    });

    it("does not close when pressing inside the floating element", async () => {
      const { floatingEl, setOpenMock, openRef } = await renderDismiss();
      setOpenMock.mockClear();

      floatingEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(openRef.value).toBe(true);
    });
  });

  describe("shared gate", () => {
    it("disables both channels when enabled is false", async () => {
      const { outsideEl, setOpenMock, openRef } = await renderDismiss({ enabled: false });
      setOpenMock.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(openRef.value).toBe(true);
    });

    it("follows a reactive enabled toggle for both channels", async () => {
      const enabledRef = ref(false);
      const { outsideEl, setOpenMock, openRef } = await renderDismiss({ enabled: enabledRef });
      setOpenMock.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(setOpenMock).not.toHaveBeenCalled();

      enabledRef.value = true;
      await nextTick();
      setOpenMock.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
      expect(openRef.value).toBe(false);
    });
  });

  describe("per-channel toggles", () => {
    it("keeps outside dismissal when Escape is disabled", async () => {
      const { outsideEl, setOpenMock, openRef } = await renderDismiss({ escapeKey: false });
      setOpenMock.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(setOpenMock).not.toHaveBeenCalled();

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledWith(false, "outside-pointer", expect.any(Event));
      expect(openRef.value).toBe(false);
    });

    it("keeps Escape dismissal when outside press is disabled", async () => {
      const { outsideEl, setOpenMock, openRef } = await renderDismiss({ outsidePress: false });
      setOpenMock.mockClear();

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(setOpenMock).not.toHaveBeenCalled();
      expect(openRef.value).toBe(true);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
    });
  });

  describe("per-channel options", () => {
    it("calls a custom onEscape handler instead of closing", async () => {
      const onEscape = vi.fn();
      const { setOpenMock, openRef } = await renderDismiss({ escapeKey: { onEscape } });
      setOpenMock.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(setOpenMock).not.toHaveBeenCalled();
      expect(openRef.value).toBe(true);
    });

    it("respects the outsidePress event option", async () => {
      const { outsideEl, setOpenMock, openRef } = await renderDismiss({
        outsidePress: { event: "click" },
      });
      setOpenMock.mockClear();

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(setOpenMock).not.toHaveBeenCalled();

      await userEvent.click(outsideEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledWith(false, "outside-pointer", expect.any(Event));
      expect(openRef.value).toBe(false);
    });
  });

  describe("shared tree", () => {
    it("treats descendant floating elements as inside for both channels", async () => {
      const fixture = createTreeComponent();
      await render(fixture.Component);
      await nextTick();

      const childFloatingEl = getTestEl("child-floating");
      await userEvent.click(childFloatingEl);
      await nextTick();

      expect(fixture.parentOpen.value).toBe(true);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      // One Escape press closes only the deepest open node, leaving the parent open.
      expect(fixture.childOpen.value).toBe(false);
      expect(fixture.parentOpen.value).toBe(true);
    });
  });
});
