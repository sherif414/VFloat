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

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(openRef.value).toBe(false);
    });

    it("closes on outside pointerdown", async () => {
      const { outsideEl, openRef } = await renderDismiss();

      await userEvent.click(outsideEl);
      await nextTick();

      expect(openRef.value).toBe(false);
    });

    it("does not close when pressing inside the floating element", async () => {
      const { floatingEl, openRef } = await renderDismiss();

      await userEvent.click(floatingEl);
      await nextTick();

      expect(openRef.value).toBe(true);
    });
  });

  describe("shared gate", () => {
    it("disables both channels when enabled is false", async () => {
      const { outsideEl, openRef } = await renderDismiss({ enabled: false });

      await userEvent.keyboard("{Escape}");
      await userEvent.click(outsideEl);
      await nextTick();

      expect(openRef.value).toBe(true);
    });

    it("follows a reactive enabled toggle for both channels", async () => {
      const enabledRef = ref(false);
      const { outsideEl, openRef } = await renderDismiss({ enabled: enabledRef });

      await userEvent.keyboard("{Escape}");
      await userEvent.click(outsideEl);
      await nextTick();
      expect(openRef.value).toBe(true);

      enabledRef.value = true;
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(openRef.value).toBe(false);
    });
  });

  describe("per-channel toggles", () => {
    it("keeps outside dismissal when Escape is disabled", async () => {
      const { outsideEl, openRef } = await renderDismiss({ escapeKey: false });

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(openRef.value).toBe(true);

      await userEvent.click(outsideEl);
      await nextTick();
      expect(openRef.value).toBe(false);
    });

    it("keeps Escape dismissal when outside press is disabled", async () => {
      const { outsideEl, openRef } = await renderDismiss({ outsidePress: false });

      await userEvent.click(outsideEl);
      await nextTick();
      expect(openRef.value).toBe(true);

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(openRef.value).toBe(false);
    });
  });

  describe("per-channel options", () => {
    it("calls a custom onEscape handler instead of closing", async () => {
      const onEscape = vi.fn();
      const { openRef } = await renderDismiss({ escapeKey: { onEscape } });

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(openRef.value).toBe(true);
    });

    it("respects the outsidePress event option", async () => {
      const { outsideEl, openRef } = await renderDismiss({
        outsidePress: { event: "click" },
      });

      // Pointerdown alone must not dismiss when event is configured as "click"
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

      await userEvent.keyboard("{Escape}");
      await nextTick();

      // One Escape press closes only the deepest open node, leaving the parent open.
      expect(fixture.childOpen.value).toBe(false);
      expect(fixture.parentOpen.value).toBe(true);
    });
  });

  describe("real user scenarios", () => {
    it("dismisses independent stacked overlays in LIFO order on Escape", async () => {
      const modalOpen = ref(true);
      const selectOpen = ref(true);

      const StackedComponent = defineComponent(() => {
        const modalAnchorEl = useTemplateRef<HTMLElement>("modal-anchor");
        const modalFloatingEl = useTemplateRef<HTMLElement>("modal-floating");
        const selectAnchorEl = useTemplateRef<HTMLElement>("select-anchor");
        const selectFloatingEl = useTemplateRef<HTMLElement>("select-floating");

        const modalNode = useFloatingNode({
          anchorEl: modalAnchorEl,
          floatingEl: modalFloatingEl,
          open: modalOpen,
        });
        useDismiss(modalNode);

        // Independent secondary overlay (e.g. Select dropdown opened inside modal)
        const selectNode = useFloatingNode({
          anchorEl: selectAnchorEl,
          floatingEl: selectFloatingEl,
          open: selectOpen,
        });
        useDismiss(selectNode);

        return () =>
          h("div", { class: "stacked-wrapper" }, [
            h("div", { ref: "modal-floating", "data-testid": "modal-overlay" }, [
              h("p", "Modal Dialog"),
              h("button", { ref: "select-anchor", "data-testid": "select-trigger" }, "Open Select"),
              h("div", { ref: "select-floating", "data-testid": "select-popover" }, [
                h("button", { "data-testid": "select-option" }, "Theme Option"),
              ]),
            ]),
            h("div", { "data-testid": "outside" }, "Page Backdrop"),
          ]);
      });

      await render(StackedComponent);
      await nextTick();

      const selectOption = getTestEl("select-option");
      await userEvent.click(selectOption);
      await nextTick();

      // 1st Escape: Closes the topmost overlay (Select dropdown), modal stays open
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(selectOpen.value).toBe(false);
      expect(modalOpen.value).toBe(true);

      // 2nd Escape: Closes the modal
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(modalOpen.value).toBe(false);
    });

    it("unwinds 3-level cascading menu step-by-step on Escape and closes all on outside click", async () => {
      const level1Open = ref(true);
      const level2Open = ref(true);
      const level3Open = ref(true);

      const CascadingMenu = defineComponent(() => {
        const a1 = useTemplateRef<HTMLElement>("a1");
        const f1 = useTemplateRef<HTMLElement>("f1");
        const a2 = useTemplateRef<HTMLElement>("a2");
        const f2 = useTemplateRef<HTMLElement>("f2");
        const a3 = useTemplateRef<HTMLElement>("a3");
        const f3 = useTemplateRef<HTMLElement>("f3");

        const node1 = useFloatingNode({ anchorEl: a1, floatingEl: f1, open: level1Open });
        const node2 = useFloatingNode({
          anchorEl: a2,
          floatingEl: f2,
          open: level2Open,
          parent: node1,
        });
        const node3 = useFloatingNode({
          anchorEl: a3,
          floatingEl: f3,
          open: level3Open,
          parent: node2,
        });

        useDismiss(node1);
        useDismiss(node2);
        useDismiss(node3);

        return () =>
          h("div", [
            h("button", { ref: "a1", "data-testid": "m1-trigger" }, "File"),
            h("div", { ref: "f1", "data-testid": "m1-flyout" }, [
              h("button", { ref: "a2", "data-testid": "m2-trigger" }, "Export"),
              h("div", { ref: "f2", "data-testid": "m2-flyout" }, [
                h("button", { ref: "a3", "data-testid": "m3-trigger" }, "PDF"),
                h("div", { ref: "f3", "data-testid": "m3-flyout" }, [
                  h("button", { "data-testid": "leaf-button" }, "Export as PDF/A"),
                ]),
              ]),
            ]),
            h("div", { "data-testid": "page-outside" }, "Page Canvas"),
          ]);
      });

      await render(CascadingMenu);
      await nextTick();

      const leafBtn = getTestEl("leaf-button");
      await userEvent.click(leafBtn);
      await nextTick();

      // 1st Escape: Closes leaf flyout (Level 3)
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(level3Open.value).toBe(false);
      expect(level2Open.value).toBe(true);
      expect(level1Open.value).toBe(true);

      // 2nd Escape: Closes submenu (Level 2)
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(level2Open.value).toBe(false);
      expect(level1Open.value).toBe(true);

      // Re-open level 2 and level 3 to test outside click
      level2Open.value = true;
      level3Open.value = true;
      await nextTick();

      // Outside click closes the entire hierarchy
      const outsideEl = getTestEl("page-outside");
      await userEvent.click(outsideEl);
      await nextTick();

      expect(level1Open.value).toBe(false);
      expect(level2Open.value).toBe(false);
      expect(level3Open.value).toBe(false);
    });

    it("ignores drag gesture originating inside floating element but closes on genuine outside click", async () => {
      const openRef = ref(true);

      const DragComponent = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const floatingEl = useTemplateRef<HTMLElement>("floating");

        const node = useFloatingNode({ anchorEl, floatingEl, open: openRef });
        useDismiss(node, { outsidePress: { event: "click", ignoreDrag: true } });

        return () =>
          h("div", [
            h("div", { ref: "floating", "data-testid": "floating-panel" }, "Copyable Code Snippet"),
            h("div", { "data-testid": "outside-drop" }, "Outside Zone"),
          ]);
      });

      await render(DragComponent);
      await nextTick();

      const floatingEl = getTestEl("floating-panel");
      const outsideEl = getTestEl("outside-drop");

      // Simulate user selecting text: mousedown inside floating panel, mouseup outside
      floatingEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      outsideEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();

      // Drag originating inside must not dismiss the floating panel
      expect(openRef.value).toBe(true);

      // A genuine outside click (mousedown + mouseup outside) dismisses the panel
      await userEvent.click(outsideEl);
      await nextTick();

      expect(openRef.value).toBe(false);
    });

    it("prevents Escape dismissal during IME candidate composition and dismisses once composed", async () => {
      const openRef = ref(true);

      const InputComponent = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLElement>("anchor");
        const floatingEl = useTemplateRef<HTMLElement>("floating");

        const node = useFloatingNode({ anchorEl, floatingEl, open: openRef });
        useDismiss(node);

        return () =>
          h("div", [
            h("div", { ref: "floating", "data-testid": "search-popover" }, [
              h("input", { "data-testid": "search-input", placeholder: "Search..." }),
            ]),
          ]);
      });

      await render(InputComponent);
      await nextTick();

      const inputEl = getTestEl("search-input");
      await userEvent.click(inputEl);

      // User starts IME composition (e.g. typing Japanese/Chinese candidates)
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // User presses Escape to close the IME candidate window
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Overlay must NOT close while composition is active
      expect(openRef.value).toBe(true);

      // User commits candidate and ends composition
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // User presses Escape to close the popover
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(openRef.value).toBe(false);
    });
  });
});
