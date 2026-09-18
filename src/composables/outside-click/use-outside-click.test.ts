import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, type Ref, useTemplateRef } from "vue";
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

function createFullTreeComponent(
  options: {
    parentBubbles?: boolean;
    childBubbles?: boolean;
    parentCapture?: boolean;
    childCapture?: boolean;
    parentEvent?: "click" | "pointerdown";
    childEvent?: "click" | "pointerdown";
    parentEnabled?: Ref<boolean>;
  } = {},
) {
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

    useOutsideClick(parentNode, {
      event: options.parentEvent ?? "click",
      bubbles: options.parentBubbles ?? true,
      capture: options.parentCapture ?? true,
      enabled: options.parentEnabled,
    });
    useOutsideClick(childNode, {
      event: options.childEvent ?? "click",
      bubbles: options.childBubbles ?? true,
      capture: options.childCapture ?? true,
    });

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
        h("div", { "data-testid": "outside", style: { ...OUTSIDE_STYLE, left: "0" } }, "Outside"),
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

async function renderFullTreeOutsideClick(
  options: {
    parentBubbles?: boolean;
    childBubbles?: boolean;
    parentCapture?: boolean;
    childCapture?: boolean;
    parentEvent?: "click" | "pointerdown";
    childEvent?: "click" | "pointerdown";
    parentEnabled?: Ref<boolean>;
  } = {},
) {
  const fixture = createFullTreeComponent(options);
  await render(fixture.Component);
  await nextTick();
  return {
    outsideEl: getTestEl("outside"),
    parentNode: fixture.getParent(),
    childNode: fixture.getChild(),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

function createTwoOverlaysComponent(
  options: { overlayACapture?: boolean; overlayBCapture?: boolean } = {},
) {
  const openA = ref(true);
  const openB = ref(true);
  let nodeA!: ReturnType<typeof useFloatingNode>;
  let nodeB!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorA = useTemplateRef<HTMLElement>("anchor-a");
    const floatingA = useTemplateRef<HTMLElement>("floating-a");
    const anchorB = useTemplateRef<HTMLElement>("anchor-b");
    const floatingB = useTemplateRef<HTMLElement>("floating-b");

    nodeA = useFloatingNode({ anchorEl: anchorA, floatingEl: floatingA, open: openA });
    nodeB = useFloatingNode({ anchorEl: anchorB, floatingEl: floatingB, open: openB });

    useOutsideClick(nodeA, { event: "click", capture: options.overlayACapture ?? true });
    useOutsideClick(nodeB, { event: "click", capture: options.overlayBCapture ?? false });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor-a", "data-testid": "anchor-a" }, "Trigger A"),
        h("div", { ref: "floating-a", "data-testid": "floating-a" }, "Floating A"),
        h("button", { ref: "anchor-b", "data-testid": "anchor-b" }, "Trigger B"),
        h("div", { ref: "floating-b", "data-testid": "floating-b" }, "Floating B"),
        h("div", { "data-testid": "outside", style: { ...OUTSIDE_STYLE, left: "0" } }, "Outside"),
      ]);
  });

  return { Component, openA, openB, getNodeA: () => nodeA, getNodeB: () => nodeB };
}

async function renderTwoOverlaysOutsideClick(
  options: { overlayACapture?: boolean; overlayBCapture?: boolean } = {},
) {
  const fixture = createTwoOverlaysComponent(options);
  await render(fixture.Component);
  await nextTick();
  return {
    outsideEl: getTestEl("outside"),
    openA: fixture.openA,
    openB: fixture.openB,
    nodeA: fixture.getNodeA(),
    nodeB: fixture.getNodeB(),
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

  it("ignores clicks on the viewport scrollbar when ignoreScrollbar is true", async () => {
    const { node } = await renderOutsideClick({ ignoreScrollbar: true });

    const origInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, "clientWidth", {
      value: 985,
      configurable: true,
    });

    try {
      document.documentElement.dispatchEvent(
        new MouseEvent("pointerdown", {
          clientX: 990,
          clientY: 100,
          bubbles: true,
        }),
      );
      await nextTick();

      expect(node.open.value).toBe(true);
    } finally {
      Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
      delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
    }
  });

  it("dismisses on viewport scrollbar click when ignoreScrollbar is false", async () => {
    const { node } = await renderOutsideClick({ ignoreScrollbar: false });

    const origInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, "clientWidth", {
      value: 985,
      configurable: true,
    });

    try {
      document.documentElement.dispatchEvent(
        new MouseEvent("pointerdown", {
          clientX: 990,
          clientY: 100,
          bubbles: true,
        }),
      );
      await nextTick();

      expect(node.open.value).toBe(false);
    } finally {
      Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
      delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
    }
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

  it("ignores non-primary button presses (right click and middle click)", async () => {
    const { outsideEl, node } = await renderOutsideClick({ event: "pointerdown" });

    // Secondary / right-click (button: 2)
    outsideEl.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 2 }),
    );
    await nextTick();
    expect(node.open.value).toBe(true);

    // Auxiliary / middle-click (button: 1)
    outsideEl.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 1 }),
    );
    await nextTick();
    expect(node.open.value).toBe(true);

    // Primary click (button: 0)
    outsideEl.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }),
    );
    await nextTick();
    expect(node.open.value).toBe(false);
  });

  it("detects scrollbar clicks correctly in RTL layout", async () => {
    const { node } = await renderOutsideClick({ ignoreScrollbar: true });
    const scrollableEl = getTestEl("outside-scrollable");
    scrollableEl.style.direction = "rtl";
    const rect = scrollableEl.getBoundingClientRect();

    // 15px scrollbar gutter in a 100px element with clientWidth 85
    Object.defineProperty(scrollableEl, "clientWidth", { value: 85, configurable: true });

    // In RTL, the scrollbar is on the left edge (0 to 15px)
    const scrollbarX = rect.left + 5;
    const scrollbarY = rect.top + 20;

    scrollableEl.dispatchEvent(
      new MouseEvent("pointerdown", {
        clientX: scrollbarX,
        clientY: scrollbarY,
        bubbles: true,
        button: 0,
      }),
    );
    await nextTick();
    expect(node.open.value).toBe(true);

    // Click on the right content area in RTL (85px to 100px) should dismiss
    const contentX = rect.left + 90;
    scrollableEl.dispatchEvent(
      new MouseEvent("pointerdown", {
        clientX: contentX,
        clientY: scrollbarY,
        bubbles: true,
        button: 0,
      }),
    );
    await nextTick();
    expect(node.open.value).toBe(false);
  });

  it("does not mistake element borders for scrollbars", async () => {
    const { node } = await renderOutsideClick({ ignoreScrollbar: true });
    const outsideEl = getTestEl("outside");
    outsideEl.style.border = "15px solid black";
    const rect = outsideEl.getBoundingClientRect();

    // offsetWidth is 100, clientWidth is 70 (borderLeft 15 + borderRight 15)
    Object.defineProperty(outsideEl, "offsetWidth", { value: 100, configurable: true });
    Object.defineProperty(outsideEl, "clientWidth", { value: 70, configurable: true });

    // Click on the right border area
    outsideEl.dispatchEvent(
      new MouseEvent("pointerdown", {
        clientX: rect.left + 80,
        clientY: rect.top + 20,
        bubbles: true,
        button: 0,
      }),
    );
    await nextTick();

    // Should close because borders are not scrollbars
    expect(node.open.value).toBe(false);
  });

  it("ignores outside click when drag started inside floating element and released outside", async () => {
    const { floatingEl, outsideEl, node } = await renderOutsideClick({
      event: "click",
      ignoreDrag: true,
    });

    floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
    outsideEl.dispatchEvent(makeMouseEvent("mouseup"));
    outsideEl.dispatchEvent(makeMouseEvent("click"));
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("ignores outside click when drag started outside and released inside floating element", async () => {
    const { floatingEl, outsideEl, node } = await renderOutsideClick({
      event: "click",
      ignoreDrag: true,
    });

    outsideEl.dispatchEvent(makeMouseEvent("mousedown"));
    floatingEl.dispatchEvent(makeMouseEvent("mouseup"));
    outsideEl.dispatchEvent(makeMouseEvent("click"));
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("does not dismiss when an element inside floating unmounts on click", async () => {
    const { floatingEl, node } = await renderOutsideClick({
      event: "click",
    });

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove Me";
    floatingEl.appendChild(removeBtn);

    removeBtn.addEventListener("click", () => {
      removeBtn.remove();
    });

    removeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await nextTick();

    expect(node.open.value).toBe(true);
  });

  it("coordinates tree unwinding leaf-first when bubbles is false", async () => {
    const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
      parentBubbles: false,
      childBubbles: false,
    });

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(true);

    // Click 1 outside: only child should close
    await userEvent.click(outsideEl);
    await nextTick();

    expect(childOpen.value).toBe(false);
    expect(parentOpen.value).toBe(true);

    // Click 2 outside: parent now closes
    await userEvent.click(outsideEl);
    await nextTick();

    expect(parentOpen.value).toBe(false);
  });

  it("collapses all levels simultaneously on outside click when bubbles is true", async () => {
    const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
      parentBubbles: true,
      childBubbles: true,
    });

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(true);

    // Click 1 outside: both should close simultaneously
    await userEvent.click(outsideEl);
    await nextTick();

    expect(childOpen.value).toBe(false);
    expect(parentOpen.value).toBe(false);
  });

  it("dismisses floating element when focus moves to an outside iframe", async () => {
    vi.useFakeTimers();
    const { node } = await renderOutsideClick();

    const outsideIframe = document.createElement("iframe");
    document.body.appendChild(outsideIframe);

    // Simulate focus moving to the iframe
    Object.defineProperty(document, "activeElement", {
      value: outsideIframe,
      configurable: true,
    });
    window.dispatchEvent(new FocusEvent("blur"));

    vi.advanceTimersByTime(10);
    await nextTick();

    expect(node.open.value).toBe(false);
    outsideIframe.remove();
  });

  it("does not dismiss floating element when focus moves to an inner iframe", async () => {
    vi.useFakeTimers();
    const { floatingEl, node } = await renderOutsideClick();

    const innerIframe = document.createElement("iframe");
    floatingEl.appendChild(innerIframe);

    Object.defineProperty(document, "activeElement", {
      value: innerIframe,
      configurable: true,
    });
    window.dispatchEvent(new FocusEvent("blur"));

    vi.advanceTimersByTime(10);
    await nextTick();

    expect(node.open.value).toBe(true);
    innerIframe.remove();
  });

  it("coordinates tree unwinding leaf-first across mixed capture settings when bubbles is false", async () => {
    // Parent on bubble phase (capture: false), Child on capture phase (capture: true)
    const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
      parentBubbles: false,
      childBubbles: false,
      parentCapture: false,
      childCapture: true,
    });

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(true);

    // Click 1 outside: capture listener closes child; bubble listener skips parent via event-scoped snapshot
    await userEvent.click(outsideEl);
    await nextTick();

    expect(childOpen.value).toBe(false);
    expect(parentOpen.value).toBe(true);

    // Click 2 outside: parent now closes
    await userEvent.click(outsideEl);
    await nextTick();

    expect(parentOpen.value).toBe(false);
  });

  it("dismisses independent overlays with mixed capture phases without cross-phase lockout", async () => {
    const { outsideEl, openA, openB } = await renderTwoOverlaysOutsideClick({
      overlayACapture: true,
      overlayBCapture: false,
    });

    expect(openA.value).toBe(true);
    expect(openB.value).toBe(true);

    // Single click outside should dismiss both overlays across capture and bubble phases
    await userEvent.click(outsideEl);
    await nextTick();

    expect(openA.value).toBe(false);
    expect(openB.value).toBe(false);
  });

  it("maintains leaf-first tree order when an ancestor re-registers while children remain open", async () => {
    const parentEnabled = ref(true);
    const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
      parentBubbles: false,
      childBubbles: false,
      parentEnabled,
    });

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(true);

    // Temporarily disable and re-enable parent to trigger watcher unregister + re-register
    parentEnabled.value = false;
    await nextTick();
    parentEnabled.value = true;
    await nextTick();

    // Leaf-first depth sorting ensures child still unwinds first
    await userEvent.click(outsideEl);
    await nextTick();

    expect(childOpen.value).toBe(false);
    expect(parentOpen.value).toBe(true);

    // Second click dismisses parent
    await userEvent.click(outsideEl);
    await nextTick();

    expect(parentOpen.value).toBe(false);
  });

  it("cancels pending drag reset timer on new mousedown to prevent wiping active drag tracking", async () => {
    vi.useFakeTimers();

    const { floatingEl, outsideEl, node } = await renderOutsideClick({
      event: "click",
      ignoreDrag: true,
    });

    // Gesture 1: mousedown inside, mouseup outside -> schedules drag reset timeout
    floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
    outsideEl.dispatchEvent(makeMouseEvent("mouseup"));

    // Gesture 2: immediate new mousedown inside BEFORE timer 1 executes
    floatingEl.dispatchEvent(makeMouseEvent("mousedown"));

    // Advance timer past the reset delay of gesture 1
    vi.advanceTimersByTime(10);

    // Gesture 2 click lands outside; should NOT dismiss because drag started inside and wasn't wiped out
    outsideEl.dispatchEvent(makeMouseEvent("click"));
    await nextTick();

    expect(node.open.value).toBe(true);
  });
});
