import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import {
  defineComponent,
  h,
  type MaybeRefOrGetter,
  nextTick,
  ref,
  type Ref,
  useTemplateRef,
} from "vue";
import { type FloatingNode, useFloatingNode } from "@/composables/floating-node";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";
import { type UseOutsideClickOptions, useOutsideClick } from "./use-outside-click";

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
    parentLeafFirst?: MaybeRefOrGetter<boolean>;
    childLeafFirst?: MaybeRefOrGetter<boolean>;
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
      leafFirst: options.parentLeafFirst ?? false,
      capture: options.parentCapture ?? true,
      enabled: options.parentEnabled,
    });
    useOutsideClick(childNode, {
      event: options.childEvent ?? "click",
      leafFirst: options.childLeafFirst ?? false,
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
    parentLeafFirst?: MaybeRefOrGetter<boolean>;
    childLeafFirst?: MaybeRefOrGetter<boolean>;
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
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    childAnchorEl: getTestEl("child-anchor"),
    childFloatingEl: getTestEl("child-floating"),
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

describe("Feature: useOutsideClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Basic outside dismissal and target filtering", () => {
    it("Given an open floating element, When an outside element is clicked, Then closes the floating element", async () => {
      // Given
      const { outsideEl, node } = await renderOutsideClick({ event: "click" });
      expect(node.open.value).toBe(true);

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given event option is 'pointerdown', When pointerdown occurs on an outside element, Then closes the floating element", async () => {
      // Given
      const { outsideEl, node } = await renderOutsideClick({ event: "pointerdown" });
      expect(node.open.value).toBe(true);

      // When
      outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given enabled is false, When an outside element is clicked, Then preserves open state", async () => {
      // Given
      const { outsideEl, node } = await renderOutsideClick({
        enabled: false,
        event: "click",
      });

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given an open floating element, When clicking the anchor or floating panel, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, node } = await renderOutsideClick({
        event: "click",
      });

      // When: Click anchor
      await userEvent.click(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);

      // When: Click floating panel
      await userEvent.click(floatingEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given a shouldIgnore predicate, When clicking an ignored element, Then ignores click and preserves open state", async () => {
      // Given
      const { outsideEl, ignoredEl, node } = await renderOutsideClick({
        event: "click",
        shouldIgnore: (_event, target) => target === ignoredEl,
      });

      // When: Click ignored element
      await userEvent.click(ignoredEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);

      // When: Click non-ignored outside element
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given a custom onOutsideClick callback, When an outside element is clicked, Then invokes the callback without auto-closing", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { outsideEl, node } = await renderOutsideClick({
        event: "click",
        onOutsideClick,
      });

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(onOutsideClick).toHaveBeenCalledTimes(1);
      expect(node.open.value).toBe(true);
    });

    it("Given a floating element that is already closed, When an outside element is clicked, Then ignores invocation", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { outsideEl, node } = await renderOutsideClick({
        event: "click",
        onOutsideClick,
      });

      node.open.value = false;
      await nextTick();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(onOutsideClick).not.toHaveBeenCalled();
    });

    it("Given secondary or auxiliary mouse buttons, When right or middle clicked outside, Then preserves open state", async () => {
      // Given
      const { outsideEl, node } = await renderOutsideClick({ event: "pointerdown" });

      // When: Right-click (button 2)
      outsideEl.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 2 }),
      );
      await nextTick();
      expect(node.open.value).toBe(true);

      // When: Middle-click (button 1)
      outsideEl.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 1 }),
      );
      await nextTick();
      expect(node.open.value).toBe(true);

      // When: Primary click (button 0)
      outsideEl.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 }),
      );
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given enabled is a reactive ref, When enabled toggles from false to true, Then synchronizes outside click behavior", async () => {
      // Given
      const enabled = ref(false);
      const { outsideEl, node } = await renderOutsideClick({
        enabled,
        event: "click",
      });

      // When clicked while disabled
      await userEvent.click(outsideEl);
      await nextTick();
      expect(node.open.value).toBe(true);

      // When enabled becomes true
      enabled.value = true;
      await nextTick();

      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });
  });

  describe("Scenario: Drag gesture handling and boundary tracking", () => {
    it("Given ignoreDrag is true, When mousedown fires inside floating element and click fires outside, Then preserves open state", async () => {
      // Given
      const { floatingEl, outsideEl, node } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // When: Mouse down inside followed by click outside without intermediate mouseup
      floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
      outsideEl.dispatchEvent(makeMouseEvent("click"));
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given ignoreDrag is true, When drag starts inside floating element and releases outside, Then preserves open state", async () => {
      // Given
      const { floatingEl, outsideEl, node } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // When: Mouse down inside, mouse up outside, followed by click outside
      floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
      outsideEl.dispatchEvent(makeMouseEvent("mouseup"));
      outsideEl.dispatchEvent(makeMouseEvent("click"));
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given ignoreDrag is true, When drag starts outside and releases inside floating element, Then preserves open state", async () => {
      // Given
      const { floatingEl, outsideEl, node } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // When: Mouse down outside, mouse up inside, followed by click outside
      outsideEl.dispatchEvent(makeMouseEvent("mousedown"));
      floatingEl.dispatchEvent(makeMouseEvent("mouseup"));
      outsideEl.dispatchEvent(makeMouseEvent("click"));
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given ignoreDrag is true, When mouseup occurs and reset timer completes, Then allows subsequent outside click to dismiss", async () => {
      // Given
      vi.useFakeTimers();
      const { floatingEl, outsideEl, node } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // Start drag inside and release mouseup
      floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
      floatingEl.dispatchEvent(makeMouseEvent("mouseup"));

      // Advance past reset timeout
      vi.advanceTimersByTime(10);

      // When: Subsequent outside click
      outsideEl.dispatchEvent(makeMouseEvent("click"));
      await nextTick();

      // Then: Closes normally
      expect(node.open.value).toBe(false);
    });

    it("Given a new mousedown inside occurs before reset timer fires, When second gesture clicks outside, Then keeps drag protection active", async () => {
      // Given
      vi.useFakeTimers();
      const { floatingEl, outsideEl, node } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // Gesture 1: mousedown inside, mouseup outside -> schedules drag reset
      floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
      outsideEl.dispatchEvent(makeMouseEvent("mouseup"));

      // Gesture 2: immediate new mousedown inside BEFORE timer 1 executes
      floatingEl.dispatchEvent(makeMouseEvent("mousedown"));

      // Advance timer past first reset delay
      vi.advanceTimersByTime(10);

      // When: Gesture 2 click lands outside
      outsideEl.dispatchEvent(makeMouseEvent("click"));
      await nextTick();

      // Then: Still protected by active second drag gesture
      expect(node.open.value).toBe(true);
    });
  });

  describe("Scenario: Scrollbar hit-testing and edge avoidance", () => {
    it("Given ignoreScrollbar is true, When clicking element scrollbar gutter, Then preserves open state", async () => {
      // Given
      const { node } = await renderOutsideClick({ ignoreScrollbar: true });
      const scrollableEl = getTestEl("outside-scrollable");
      const rect = scrollableEl.getBoundingClientRect();
      Object.defineProperty(scrollableEl, "clientWidth", { value: 85, configurable: true });

      // When: Click on scrollbar gutter
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

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given ignoreScrollbar is false, When clicking element scrollbar gutter, Then closes the floating element", async () => {
      // Given
      const { node } = await renderOutsideClick({ ignoreScrollbar: false });
      const scrollableEl = getTestEl("outside-scrollable");
      const rect = scrollableEl.getBoundingClientRect();
      Object.defineProperty(scrollableEl, "clientWidth", { value: 85, configurable: true });

      // When
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

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given ignoreScrollbar is true, When clicking viewport scrollbar, Then preserves open state", async () => {
      // Given
      const { node } = await renderOutsideClick({ ignoreScrollbar: true });
      const origInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 985,
        configurable: true,
      });

      try {
        // When
        document.documentElement.dispatchEvent(
          new MouseEvent("pointerdown", {
            clientX: 990,
            clientY: 100,
            bubbles: true,
          }),
        );
        await nextTick();

        // Then
        expect(node.open.value).toBe(true);
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
      }
    });

    it("Given ignoreScrollbar is false, When clicking viewport scrollbar, Then closes the floating element", async () => {
      // Given
      const { node } = await renderOutsideClick({ ignoreScrollbar: false });
      const origInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 985,
        configurable: true,
      });

      try {
        // When
        document.documentElement.dispatchEvent(
          new MouseEvent("pointerdown", {
            clientX: 990,
            clientY: 100,
            bubbles: true,
          }),
        );
        await nextTick();

        // Then
        expect(node.open.value).toBe(false);
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
      }
    });

    it("Given RTL direction with ignoreScrollbar true, When clicking left scrollbar edge, Then detects scrollbar correctly", async () => {
      // Given
      const { node } = await renderOutsideClick({ ignoreScrollbar: true });
      const scrollableEl = getTestEl("outside-scrollable");
      scrollableEl.style.direction = "rtl";
      const rect = scrollableEl.getBoundingClientRect();
      Object.defineProperty(scrollableEl, "clientWidth", { value: 85, configurable: true });

      // When: Click left edge (scrollbar gutter in RTL)
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

      // When: Click right content area in RTL
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

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given an element with thick borders, When clicking on border, Then distinguishes borders from scrollbars and closes", async () => {
      // Given
      const { node } = await renderOutsideClick({ ignoreScrollbar: true });
      const outsideEl = getTestEl("outside");
      outsideEl.style.border = "15px solid black";
      const rect = outsideEl.getBoundingClientRect();
      Object.defineProperty(outsideEl, "offsetWidth", { value: 100, configurable: true });
      Object.defineProperty(outsideEl, "clientWidth", { value: 70, configurable: true });

      // When: Click on right border area
      outsideEl.dispatchEvent(
        new MouseEvent("pointerdown", {
          clientX: rect.left + 80,
          clientY: rect.top + 20,
          bubbles: true,
          button: 0,
        }),
      );
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });
  });

  describe("Scenario: Event phases, propagation, and capture options", () => {
    it("Given capture is true, When an outside element calls stopPropagation in bubble phase, Then still intercepts and closes", async () => {
      // Given
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

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given capture is false, When an outside element calls stopPropagation in bubble phase, Then respects stopPropagation and stays open", async () => {
      // Given
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

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given capture changes mid-open, When outside is clicked, Then maintains initial capture phase binding", async () => {
      // Given
      const options: UseOutsideClickOptions = { event: "click", capture: true };
      const { outsideEl, node } = await renderOutsideClick(options);

      options.capture = false;
      await nextTick();

      outsideEl.addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
        },
        { once: true },
      );

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });

    it("Given independent overlays with mixed capture phases, When clicking outside, Then dismisses both without cross-phase lockout", async () => {
      // Given
      const { outsideEl, openA, openB } = await renderTwoOverlaysOutsideClick({
        overlayACapture: true,
        overlayBCapture: false,
      });

      expect(openA.value).toBe(true);
      expect(openB.value).toBe(true);

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Both overlays close across phases
      expect(openA.value).toBe(false);
      expect(openB.value).toBe(false);
    });
  });

  describe("Scenario: DOM hierarchy, unmounted elements, and iframe focus", () => {
    it("Given an element inside floating unmounts upon click, When clicked, Then preserves open state", async () => {
      // Given
      const { floatingEl, node } = await renderOutsideClick({
        event: "click",
      });

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove Me";
      floatingEl.appendChild(removeBtn);

      removeBtn.addEventListener("click", () => {
        removeBtn.remove();
      });

      // When
      removeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given focus moves to an outside iframe, When window blurs, Then closes floating element", async () => {
      // Given
      vi.useFakeTimers();
      const { node } = await renderOutsideClick();

      const outsideIframe = document.createElement("iframe");
      document.body.appendChild(outsideIframe);

      Object.defineProperty(document, "activeElement", {
        value: outsideIframe,
        configurable: true,
      });

      // When: Window blurs to iframe
      window.dispatchEvent(new FocusEvent("blur"));
      vi.advanceTimersByTime(10);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
      outsideIframe.remove();
    });

    it("Given focus moves to an inner iframe inside floating panel, When window blurs, Then preserves open state", async () => {
      // Given
      vi.useFakeTimers();
      const { floatingEl, node } = await renderOutsideClick();

      const innerIframe = document.createElement("iframe");
      floatingEl.appendChild(innerIframe);

      Object.defineProperty(document, "activeElement", {
        value: innerIframe,
        configurable: true,
      });

      // When: Window blurs to inner iframe
      window.dispatchEvent(new FocusEvent("blur"));
      vi.advanceTimersByTime(10);
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
      innerIframe.remove();
    });
  });

  describe("Scenario: Tree hierarchies, parent-child coordination, and leaf-first unwinding", () => {
    it("Given a parent and child floating tree, When clicking inside child floating element, Then keeps parent open", async () => {
      // Given
      const { childFloatingEl, parentOpen } = await renderTreeOutsideClick("parent");

      // When
      await userEvent.click(childFloatingEl);
      await nextTick();

      // Then
      expect(parentOpen.value).toBe(true);
    });

    it("Given a parent and child floating tree, When clicking inside parent floating blank area, Then closes child while parent stays open", async () => {
      // Given
      const { floatingEl, parentOpen, childOpen } = await renderTreeOutsideClick("child");

      // When
      await userEvent.click(floatingEl);
      await nextTick();

      // Then
      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(false);
    });

    it("Given leafFirst is true, When clicking outside, Then unwinds the tree leaf-first across repeated clicks", async () => {
      // Given
      const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst: true,
        childLeafFirst: true,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // When: 1st outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Child closes, parent remains open
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(true);

      // When: 2nd outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Parent closes
      expect(parentOpen.value).toBe(false);
    });

    it("Given leafFirst is a reactive ref, When updated dynamically, Then switches to leaf-first unwinding order", async () => {
      // Given
      const parentLeafFirst = ref(false);
      const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst,
        childLeafFirst: true,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // When: Update leafFirst dynamically
      parentLeafFirst.value = true;
      await nextTick();

      // 1st outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Only child closes
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(true);

      // 2nd outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Parent closes
      expect(parentOpen.value).toBe(false);
    });

    it("Given leafFirst is false, When clicking outside, Then closes all hierarchy levels simultaneously", async () => {
      // Given
      const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst: false,
        childLeafFirst: false,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(false);
    });

    it("Given mixed capture settings across tree levels with leafFirst true, When clicking outside, Then coordinates leaf-first unwinding cleanly", async () => {
      // Given: Parent on bubble phase (capture: false), Child on capture phase (capture: true)
      const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst: true,
        childLeafFirst: true,
        parentCapture: false,
        childCapture: true,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // When: 1st outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Child closes first
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(true);

      // When: 2nd outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Parent closes
      expect(parentOpen.value).toBe(false);
    });

    it("Given an ancestor node re-registers dynamically while child is open, When clicking outside, Then maintains leaf-first tree order", async () => {
      // Given
      const parentEnabled = ref(true);
      const { outsideEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst: true,
        childLeafFirst: true,
        parentEnabled,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // Temporarily disable and re-enable parent to trigger unregister + re-register
      parentEnabled.value = false;
      await nextTick();
      parentEnabled.value = true;
      await nextTick();

      // When: 1st outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Child closes first
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(true);

      // When: 2nd outside click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Parent closes
      expect(parentOpen.value).toBe(false);
    });

    it("Given clicking on ancestor anchor when leafFirst is true, When clicked, Then dismisses descendant branch immediately", async () => {
      // Given
      const { anchorEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst: true,
        childLeafFirst: true,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // When: Clicking parent anchor is outside child
      await userEvent.click(anchorEl);
      await nextTick();

      // Then
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(true);
    });

    it("Given clicking inside ancestor floating panel when leafFirst is true, When clicked, Then dismisses descendant branch immediately", async () => {
      // Given
      const { floatingEl, parentOpen, childOpen } = await renderFullTreeOutsideClick({
        parentLeafFirst: true,
        childLeafFirst: true,
      });

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(true);

      // When: Clicking parent floating panel is outside child
      await userEvent.click(floatingEl);
      await nextTick();

      // Then
      expect(childOpen.value).toBe(false);
      expect(parentOpen.value).toBe(true);
    });
  });
});
