import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { type FloatingNode, useFloatingNode } from "@/composables/floating-node";
import { type UseOutsideClickOptions, useOutsideClick } from "./use-outside-click";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";

const OUTSIDE_STYLE = {
  position: "fixed",
  bottom: "0",
  width: "100px",
  height: "100px",
  zIndex: "1",
} as const;

function createTestComponent(options: UseOutsideClickOptions = {}) {
  const openRef = ref(true);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useOutsideClick(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("div", { "data-testid": "outside", style: { ...OUTSIDE_STYLE, left: "0" } }, "Outside"),
        h(
          "div",
          { "data-testid": "ignored", style: { ...OUTSIDE_STYLE, left: "120px" } },
          "Ignored",
        ),
        h(
          "div",
          {
            "data-testid": "outside-scrollable",
            style: { ...OUTSIDE_STYLE, left: "240px", overflowY: "scroll" },
          },
          [h("div", { style: { height: "300px" } }, "Scroll content")],
        ),
      ]);
  });

  return { Component, getNode: () => node, openRef };
}

function createTreeComponent(target: "parent" | "child") {
  const parentOpen = ref(true);
  const childOpen = ref(true);
  let parentNode!: ReturnType<typeof useFloatingNode>;
  let childNode!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    parentNode = useFloatingNode({
      anchorEl,
      floatingEl,
      open: parentOpen,
    });
    childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });

    useOutsideClick(target === "parent" ? parentNode : childNode, { event: "click" });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("button", { ref: "child-anchor", "data-testid": "child-anchor" }, "Child Trigger"),
        h(
          "div",
          {
            ref: "child-floating",
            "data-testid": "child-floating",
            style: { width: "100px", height: "100px" },
          },
          "Child Floating",
        ),
      ]);
  });

  return {
    Component,
    getParent: () => parentNode,
    getChild: () => childNode,
    parentOpen,
    childOpen,
  };
}

async function renderOutsideClick(options: UseOutsideClickOptions = {}) {
  const fixture = createTestComponent(options);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    outsideEl: getTestEl("outside"),
    ignoredEl: getTestEl("ignored"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

async function renderTreeOutsideClick(target: "parent" | "child") {
  const fixture = createTreeComponent(target);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    childAnchorEl: getTestEl("child-anchor"),
    childFloatingEl: getTestEl("child-floating"),
    parentNode: fixture.getParent(),
    childNode: fixture.getChild(),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

describe("useOutsideClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("closes on outside click by default", async () => {
    const { outsideEl, node } = await renderOutsideClick({ event: "click" });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(node.open.value).toBe(false);
  });

  it("closes on outside pointerdown when configured", async () => {
    const { outsideEl, node } = await renderOutsideClick({ event: "pointerdown" });

    outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
    await nextTick();

    expect(node.open.value).toBe(false);
  });

  it("does not close when outside dismissal is disabled", async () => {
    const { outsideEl, node } = await renderOutsideClick({
      enabled: false,
      event: "click",
    });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("does not close when clicking the anchor or floating element", async () => {
    const { anchorEl, floatingEl, node } = await renderOutsideClick({
      event: "click",
    });

    await userEvent.click(anchorEl);
    await userEvent.click(floatingEl);
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("uses the ignoreClick predicate for per-target dismissal", async () => {
    const { outsideEl, ignoredEl, node } = await renderOutsideClick({
      event: "click",
      ignoreClick: (_event, target) => target === ignoredEl,
    });

    await userEvent.click(ignoredEl);
    await nextTick();
    expect(node.open.value).toBe(true);

    await userEvent.click(outsideEl);
    await nextTick();
    expect(node.open.value).toBe(false);
  });

  it("calls onClick instead of closing when a custom handler is provided", async () => {
    const onClick = vi.fn();
    const { outsideEl, node } = await renderOutsideClick({
      event: "click",
      onClick,
    });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(node.open.value).toBe(true);
  });

  it("ignores outside click after a drag that started inside the floating element", async () => {
    const { floatingEl, outsideEl, node } = await renderOutsideClick({
      event: "click",
      ignoreDrag: true,
    });

    floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
    outsideEl.dispatchEvent(makeMouseEvent("click"));
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("keeps a parent open when clicking inside a child floating element", async () => {
    const { childFloatingEl, parentOpen } = await renderTreeOutsideClick("parent");

    await userEvent.click(childFloatingEl);
    await nextTick();

    expect(parentOpen.value).toBe(true);
  });

  it("treats parent blank areas as outside for child nodes", async () => {
    const { floatingEl, parentOpen, childOpen } = await renderTreeOutsideClick("child");

    await userEvent.click(floatingEl);
    await nextTick();

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(false);
  });

  it("ignores outside press on scrollbars when ignoreScrollbar is true", async () => {
    const { node } = await renderOutsideClick({ ignoreScrollbar: true });
    const scrollableEl = getTestEl("outside-scrollable");
    const rect = scrollableEl.getBoundingClientRect();

    // Headless Chromium uses overlay scrollbars by default (clientWidth === offsetWidth).
    // Simulate classic 15px scrollbar gutter width.
    Object.defineProperty(scrollableEl, "clientWidth", { value: 85, configurable: true });

    // Click near the right edge where the vertical scrollbar gutter resides
    const scrollbarX = rect.left + 90;
    const scrollbarY = rect.top + 20;

    scrollableEl.dispatchEvent(
      new MouseEvent("pointerdown", {
        clientX: scrollbarX,
        clientY: scrollbarY,
        bubbles: true,
      }),
    );
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("closes on scrollbar click when ignoreScrollbar is false", async () => {
    const { node } = await renderOutsideClick({ ignoreScrollbar: false });
    const scrollableEl = getTestEl("outside-scrollable");
    const rect = scrollableEl.getBoundingClientRect();

    // Headless Chromium uses overlay scrollbars by default (clientWidth === offsetWidth).
    // Simulate classic 15px scrollbar gutter width.
    Object.defineProperty(scrollableEl, "clientWidth", { value: 85, configurable: true });

    const scrollbarX = rect.left + 90;
    const scrollbarY = rect.top + 20;

    scrollableEl.dispatchEvent(
      new MouseEvent("pointerdown", {
        clientX: scrollbarX,
        clientY: scrollbarY,
        bubbles: true,
      }),
    );
    await nextTick();

    expect(node.open.value).toBe(false);
  });

  it("reacts dynamically when enabled option changes", async () => {
    const enabled = ref(false);
    const { outsideEl, node } = await renderOutsideClick({
      enabled,
      event: "click",
    });

    await userEvent.click(outsideEl);
    await nextTick();
    expect(node.open.value).toBe(true);

    enabled.value = true;
    await nextTick();

    await userEvent.click(outsideEl);
    await nextTick();
    expect(node.open.value).toBe(false);
  });

  it("intercepts click even if stopPropagation is called in bubbling when capture is true", async () => {
    const { outsideEl, node } = await renderOutsideClick({
      event: "click",
      capture: true,
    });

    outsideEl.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      },
      { once: true },
    );

    await userEvent.click(outsideEl);
    await nextTick();

    expect(node.open.value).toBe(false);
  });

  it("allows bubbling stopPropagation to prevent dismissal when capture is false", async () => {
    const { outsideEl, node } = await renderOutsideClick({
      event: "click",
      capture: false,
    });

    outsideEl.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      },
      { once: true },
    );

    await userEvent.click(outsideEl);
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("does not trigger onClick when node is already closed", async () => {
    const onClick = vi.fn();
    const { outsideEl, node } = await renderOutsideClick({
      event: "click",
      onClick,
    });

    node.open.value = false;
    await nextTick();

    await userEvent.click(outsideEl);
    await nextTick();

    expect(onClick).not.toHaveBeenCalled();
  });

  it("resets drag sequence after mouseup timeout completes", async () => {
    vi.useFakeTimers();

    const { floatingEl, outsideEl, node } = await renderOutsideClick({
      event: "click",
      ignoreDrag: true,
    });

    // Start drag inside and release mouseup
    floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
    floatingEl.dispatchEvent(makeMouseEvent("mouseup"));

    // Advance past the 0ms timeout that resets dragStartedInside
    vi.advanceTimersByTime(10);

    // Subsequent outside click should close since drag was reset
    outsideEl.dispatchEvent(makeMouseEvent("click"));
    await nextTick();

    expect(node.open.value).toBe(false);
  });
});
