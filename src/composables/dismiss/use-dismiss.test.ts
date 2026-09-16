import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { useDismiss, useFloatingNode, type UseDismissOptions } from "@/composables";
import { getTestEl, makePointerEvent } from "@/test-utils";

function createTestComponent(options: UseDismissOptions = {}) {
  const openRef = ref(true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    const node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useDismiss(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("div", { "data-testid": "outside" }, "Outside"),
      ]);
  });

  return { Component, openRef };
}

function createTreeComponent() {
  const parentOpen = ref(true);
  const childOpen = ref(true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const parentNode = useFloatingNode({ anchorEl, floatingEl, open: parentOpen });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });

    useDismiss(parentNode);
    useDismiss(childNode);

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
  await render(fixture.Component);
  await nextTick();
  return {
    floatingEl: getTestEl("floating"),
    outsideEl: getTestEl("outside"),
    openRef: fixture.openRef,
  };
}

describe("useDismiss", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("default channels", () => {
    it("closes on Escape", async () => {
      const { openRef } = await renderDismiss();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(openRef.value).toBe(false);
    });

    it("closes on outside pointerdown", async () => {
      const { outsideEl, openRef } = await renderDismiss();

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      expect(openRef.value).toBe(false);
    });

    it("does not close when pressing inside the floating element", async () => {
      const { floatingEl, openRef } = await renderDismiss();

      floatingEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      expect(openRef.value).toBe(true);
    });
  });

  describe("shared gate", () => {
    it("disables both channels when enabled is false", async () => {
      const { outsideEl, openRef } = await renderDismiss({ enabled: false });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      expect(openRef.value).toBe(true);
    });

    it("follows a reactive enabled toggle for both channels", async () => {
      const enabledRef = ref(false);
      const { outsideEl, openRef } = await renderDismiss({ enabled: enabledRef });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(openRef.value).toBe(true);

      enabledRef.value = true;
      await nextTick();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(openRef.value).toBe(false);
    });
  });

  describe("per-channel toggles", () => {
    it("keeps outside dismissal when Escape is disabled", async () => {
      const { outsideEl, openRef } = await renderDismiss({ escapeKey: false });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(openRef.value).toBe(true);

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(openRef.value).toBe(false);
    });

    it("keeps Escape dismissal when outside press is disabled", async () => {
      const { outsideEl, openRef } = await renderDismiss({ outsidePress: false });

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(openRef.value).toBe(true);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
      expect(openRef.value).toBe(false);
    });
  });

  describe("per-channel options", () => {
    it("calls a custom onEscape handler instead of closing", async () => {
      const onEscape = vi.fn();
      const { openRef } = await renderDismiss({ escapeKey: { onEscape } });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(openRef.value).toBe(true);
    });

    it("respects the outsidePress event option", async () => {
      const { outsideEl, openRef } = await renderDismiss({
        outsidePress: { event: "click" },
      });

      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();
      expect(openRef.value).toBe(true);

      await userEvent.click(outsideEl);
      await nextTick();
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
