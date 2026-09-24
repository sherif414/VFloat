import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import {
  defineComponent,
  h,
  type MaybeRefOrGetter,
  nextTick,
  ref,
  type Ref,
  useTemplateRef,
} from "vue";
import { useFloatingNode } from "@/composables/floating-node";
import { getTestEl } from "@/test-utils";
import { type UseOutsideClickOptions, useOutsideClick } from "./use-outside-click";

const OUTSIDE_STYLE = {
  position: "fixed",
  bottom: "0",
  width: "100px",
  height: "100px",
  zIndex: "1",
} as const;

interface FixtureConfig {
  defaultOpen?: boolean;
  stopOutsideClickPropagation?: boolean;
}

function createTestComponent(options: UseOutsideClickOptions = {}, config: FixtureConfig = {}) {
  const openRef = ref(config.defaultOpen ?? true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    const node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useOutsideClick(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "anchor",
            type: "button",
            "data-testid": "anchor",
            "aria-expanded": String(openRef.value),
          },
          "Trigger",
        ),
        openRef.value
          ? h("div", { ref: "floating", "data-testid": "floating" }, [
              "Floating",
              h(
                "button",
                {
                  type: "button",
                  "data-testid": "remove-inside",
                  onClick: (event: MouseEvent) =>
                    (event.currentTarget as HTMLButtonElement).remove(),
                },
                "Remove me",
              ),
              h(
                "button",
                {
                  type: "button",
                  draggable: true,
                  "data-testid": "drag-handle",
                },
                "Drag",
              ),
              h("iframe", { "data-testid": "inside-iframe", title: "Inside frame" }),
            ])
          : null,
        h(
          "div",
          {
            "data-testid": "outside",
            style: { ...OUTSIDE_STYLE, left: "0" },
            draggable: true,
            onClick: config.stopOutsideClickPropagation
              ? (event: MouseEvent) => event.stopPropagation()
              : undefined,
          },
          "Outside",
        ),
        h(
          "div",
          {
            id: "outside-click-ignore-target",
            "data-testid": "ignored",
            style: { ...OUTSIDE_STYLE, left: "120px" },
          },
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
        h("iframe", { "data-testid": "outside-iframe", title: "Outside frame" }),
      ]);
  });

  return { Component };
}

function createTreeComponent(target: "parent" | "child") {
  const parentOpen = ref(true);
  const childOpen = ref(true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const parentNode = useFloatingNode({
      anchorEl,
      floatingEl,
      open: parentOpen,
    });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });

    useOutsideClick(target === "parent" ? parentNode : childNode, { event: "click" });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "anchor",
            type: "button",
            "data-testid": "anchor",
            "aria-expanded": String(parentOpen.value),
          },
          "Trigger",
        ),
        parentOpen.value
          ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating")
          : null,
        h(
          "button",
          {
            ref: "child-anchor",
            type: "button",
            "data-testid": "child-anchor",
            "aria-expanded": String(childOpen.value),
          },
          "Child Trigger",
        ),
        childOpen.value
          ? h(
              "div",
              {
                ref: "child-floating",
                "data-testid": "child-floating",
                style: { width: "100px", height: "100px" },
              },
              "Child Floating",
            )
          : null,
      ]);
  });

  return { Component };
}

async function renderOutsideClick(
  options: UseOutsideClickOptions = {},
  config: FixtureConfig = {},
) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    outsideEl: page.getByTestId("outside"),
    ignoredEl: page.getByTestId("ignored"),
    scrollableEl: page.getByTestId("outside-scrollable"),
    removeInsideEl: page.getByTestId("remove-inside"),
    dragHandleEl: page.getByTestId("drag-handle"),
    outsideIframeEl: page.getByTestId("outside-iframe"),
    insideIframeEl: page.getByTestId("inside-iframe"),
  };
}

async function renderTreeOutsideClick(target: "parent" | "child") {
  const fixture = createTreeComponent(target);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    childAnchorEl: page.getByTestId("child-anchor"),
    childFloatingEl: page.getByTestId("child-floating"),
  };
}

function createFullTreeComponent(
  options: {
    parentCapture?: boolean;
    childCapture?: boolean;
    parentEvent?: "click" | "pointerdown";
    childEvent?: "click" | "pointerdown";
    parentEnabled?: Ref<boolean>;
  } = {},
) {
  const parentOpen = ref(true);
  const childOpen = ref(true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const parentNode = useFloatingNode({
      anchorEl,
      floatingEl,
      open: parentOpen,
    });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });

    useOutsideClick(parentNode, {
      event: options.parentEvent ?? "click",
      capture: options.parentCapture ?? true,
      enabled: options.parentEnabled,
    });
    useOutsideClick(childNode, {
      event: options.childEvent ?? "click",
      capture: options.childCapture ?? true,
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "anchor",
            type: "button",
            "data-testid": "anchor",
            "aria-expanded": String(parentOpen.value),
          },
          "Trigger",
        ),
        parentOpen.value
          ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating")
          : null,
        h(
          "button",
          {
            ref: "child-anchor",
            type: "button",
            "data-testid": "child-anchor",
            "aria-expanded": String(childOpen.value),
          },
          "Child Trigger",
        ),
        childOpen.value
          ? h(
              "div",
              {
                ref: "child-floating",
                "data-testid": "child-floating",
                style: { width: "100px", height: "100px" },
              },
              "Child Floating",
            )
          : null,
        h("div", { "data-testid": "outside", style: { ...OUTSIDE_STYLE, left: "0" } }, "Outside"),
      ]);
  });

  return { Component };
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
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    childAnchorEl: page.getByTestId("child-anchor"),
    childFloatingEl: page.getByTestId("child-floating"),
    outsideEl: page.getByTestId("outside"),
  };
}

function createTwoOverlaysComponent(
  options: { overlayACapture?: boolean; overlayBCapture?: boolean } = {},
) {
  const openA = ref(true);
  const openB = ref(true);

  const Component = defineComponent(() => {
    const anchorA = useTemplateRef<HTMLElement>("anchor-a");
    const floatingA = useTemplateRef<HTMLElement>("floating-a");
    const anchorB = useTemplateRef<HTMLElement>("anchor-b");
    const floatingB = useTemplateRef<HTMLElement>("floating-b");

    const nodeA = useFloatingNode({ anchorEl: anchorA, floatingEl: floatingA, open: openA });
    const nodeB = useFloatingNode({ anchorEl: anchorB, floatingEl: floatingB, open: openB });

    useOutsideClick(nodeA, { event: "click", capture: options.overlayACapture ?? true });
    useOutsideClick(nodeB, { event: "click", capture: options.overlayBCapture ?? false });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "anchor-a",
            type: "button",
            "data-testid": "anchor-a",
            "aria-expanded": String(openA.value),
          },
          "Trigger A",
        ),
        openA.value
          ? h("div", { ref: "floating-a", "data-testid": "floating-a" }, "Floating A")
          : null,
        h(
          "button",
          {
            ref: "anchor-b",
            type: "button",
            "data-testid": "anchor-b",
            "aria-expanded": String(openB.value),
          },
          "Trigger B",
        ),
        openB.value
          ? h("div", { ref: "floating-b", "data-testid": "floating-b" }, "Floating B")
          : null,
        h("div", { "data-testid": "outside", style: { ...OUTSIDE_STYLE, left: "0" } }, "Outside"),
      ]);
  });

  return { Component };
}

async function renderTwoOverlaysOutsideClick(
  options: { overlayACapture?: boolean; overlayBCapture?: boolean } = {},
) {
  const fixture = createTwoOverlaysComponent(options);
  await render(fixture.Component);
  await nextTick();
  return {
    outsideEl: page.getByTestId("outside"),
    anchorAEl: page.getByTestId("anchor-a"),
    floatingAEl: page.getByTestId("floating-a"),
    anchorBEl: page.getByTestId("anchor-b"),
    floatingBEl: page.getByTestId("floating-b"),
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
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({ event: "click" });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given event option is 'pointerdown', When pointerdown occurs on an outside element, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        event: "pointerdown",
      });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given enabled is false, When an outside element is clicked, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        enabled: false,
        event: "click",
      });

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element, When clicking the anchor or floating panel, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick({
        event: "click",
      });

      // When: Click anchor
      await userEvent.click(anchorEl);
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Click floating panel
      await userEvent.click(floatingEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a shouldIgnore predicate, When clicking an ignored element, Then ignores click and preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl, ignoredEl } = await renderOutsideClick({
        event: "click",
        shouldIgnore: (_event, target) =>
          target !== null && "id" in target && target.id === "outside-click-ignore-target",
      });

      // When: Click ignored element
      await userEvent.click(ignoredEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Click non-ignored outside element
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a custom onOutsideClick callback, When an outside element is clicked, Then invokes the callback without auto-closing", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        event: "click",
        onOutsideClick,
      });

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(onOutsideClick).toHaveBeenCalledTimes(1);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a floating element that is already closed, When an outside element is clicked, Then ignores invocation", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(
        { event: "click", onOutsideClick },
        { defaultOpen: false },
      );
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      expect(onOutsideClick).not.toHaveBeenCalled();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given secondary or auxiliary mouse buttons, When right or middle clicked outside, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        event: "pointerdown",
      });

      // When: Right-click
      await userEvent.click(outsideEl, { button: "right" });
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Middle-click
      await userEvent.click(outsideEl, { button: "middle" });
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Primary click
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given enabled is a reactive ref, When enabled toggles from false to true, Then synchronizes outside click behavior", async () => {
      // Given
      const enabled = ref(false);
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        enabled,
        event: "click",
      });

      // When clicked while disabled
      await userEvent.click(outsideEl);
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When enabled becomes true
      enabled.value = true;
      await nextTick();

      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Drag gesture handling and boundary tracking", () => {
    it("Given ignoreDrag is true, When a drag starts inside and releases outside, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, dragHandleEl, outsideEl } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // When
      await userEvent.dragAndDrop(dragHandleEl, outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given ignoreDrag is false, When a drag starts inside and releases outside, Then closes floating element", async () => {
      // Given
      const { anchorEl, floatingEl, dragHandleEl, outsideEl } = await renderOutsideClick({
        event: "click",
        ignoreDrag: false,
      });

      // When
      await userEvent.dragAndDrop(dragHandleEl, outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given ignoreDrag is true, When a drag starts outside and releases inside, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, dragHandleEl, outsideEl } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // When
      await userEvent.dragAndDrop(outsideEl, dragHandleEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given ignoreDrag is true, When a drag reset timer expires before the next click, Then closes normally", async () => {
      // Given
      vi.useFakeTimers();
      const { anchorEl, floatingEl, dragHandleEl, outsideEl } = await renderOutsideClick({
        event: "click",
        ignoreDrag: true,
      });

      // When: A drag completes and its reset timer expires
      await userEvent.dragAndDrop(dragHandleEl, outsideEl);
      await vi.advanceTimersByTimeAsync(10);

      // And: A new outside click occurs
      await userEvent.click(outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Scrollbar hit-testing and edge avoidance", () => {
    it("Given ignoreScrollbar is true, When clicking an element scrollbar gutter, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, scrollableEl } = await renderOutsideClick({
        ignoreScrollbar: true,
      });
      const scrollableDOMEl = getTestEl("outside-scrollable");
      Object.defineProperty(scrollableDOMEl, "clientWidth", { value: 85, configurable: true });

      // When
      await userEvent.click(scrollableEl, { position: { x: 90, y: 20 } });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given ignoreScrollbar is false, When clicking element scrollbar gutter, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl, scrollableEl } = await renderOutsideClick({
        ignoreScrollbar: false,
      });
      const scrollableDOMEl = getTestEl("outside-scrollable");
      Object.defineProperty(scrollableDOMEl, "clientWidth", { value: 85, configurable: true });

      // When
      await userEvent.click(scrollableEl, { position: { x: 90, y: 20 } });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given ignoreScrollbar is true, When clicking viewport scrollbar, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick({ ignoreScrollbar: true });
      const origInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 985,
        configurable: true,
      });

      try {
        // When
        await userEvent.click(document.documentElement, { position: { x: 990, y: 100 } });

        // Then
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
        await expect.element(floatingEl).toBeVisible();
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
      }
    });

    it("Given ignoreScrollbar is false, When clicking viewport scrollbar, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick({ ignoreScrollbar: false });
      const origInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 985,
        configurable: true,
      });

      try {
        // When
        await userEvent.click(document.documentElement, { position: { x: 990, y: 100 } });

        // Then
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
        await expect.element(floatingEl).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
      }
    });

    it("Given RTL direction with ignoreScrollbar true, When clicking left scrollbar edge, Then detects scrollbar correctly", async () => {
      // Given
      const { anchorEl, floatingEl, scrollableEl } = await renderOutsideClick({
        ignoreScrollbar: true,
      });
      const scrollableDOMEl = getTestEl("outside-scrollable");
      scrollableDOMEl.style.direction = "rtl";
      Object.defineProperty(scrollableDOMEl, "clientWidth", { value: 85, configurable: true });

      // When: Click the left scrollbar gutter in RTL
      await userEvent.click(scrollableEl, { position: { x: 5, y: 20 } });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Click right content area in RTL
      await userEvent.click(scrollableEl, { position: { x: 90, y: 20 } });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an element with thick borders, When clicking on border, Then distinguishes borders from scrollbars and closes", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        ignoreScrollbar: true,
      });
      const outsideDOMEl = getTestEl("outside");
      outsideDOMEl.style.border = "15px solid black";
      Object.defineProperty(outsideDOMEl, "offsetWidth", { value: 100, configurable: true });
      Object.defineProperty(outsideDOMEl, "clientWidth", { value: 70, configurable: true });

      // When: Click on right border area
      await userEvent.click(outsideEl, { position: { x: 80, y: 20 } });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Event phases, propagation, and capture options", () => {
    it("Given capture is true, When an outside element calls stopPropagation in bubble phase, Then still intercepts and closes", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(
        { event: "click", capture: true },
        { stopOutsideClickPropagation: true },
      );

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given capture is false, When an outside element calls stopPropagation in bubble phase, Then respects stopPropagation and stays open", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(
        { event: "click", capture: false },
        { stopOutsideClickPropagation: true },
      );

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given capture changes mid-open, When outside is clicked, Then maintains initial capture phase binding", async () => {
      // Given
      const options: UseOutsideClickOptions = { event: "click", capture: true };
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(options, {
        stopOutsideClickPropagation: true,
      });

      options.capture = false;
      await nextTick();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given independent overlays with mixed capture phases, When clicking outside, Then dismisses both without cross-phase lockout", async () => {
      // Given
      const { outsideEl, anchorAEl, floatingAEl, anchorBEl, floatingBEl } =
        await renderTwoOverlaysOutsideClick({
          overlayACapture: true,
          overlayBCapture: false,
        });

      await expect.element(anchorAEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingAEl).toBeVisible();
      await expect.element(anchorBEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingBEl).toBeVisible();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Both overlays close across phases
      await expect.element(anchorAEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingAEl).not.toBeInTheDocument();
      await expect.element(anchorBEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingBEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: DOM hierarchy, unmounted elements, and iframe focus", () => {
    it("Given an element inside floating unmounts upon click, When clicked, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, removeInsideEl } = await renderOutsideClick({ event: "click" });

      // When
      await userEvent.click(removeInsideEl);

      // Then
      await expect.element(removeInsideEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element, When focus moves to an outside iframe, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl, outsideIframeEl } = await renderOutsideClick();
      vi.useFakeTimers();

      // When
      await userEvent.click(outsideIframeEl);
      await vi.advanceTimersByTimeAsync(10);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open floating element, When focus moves to an iframe inside it, Then keeps the floating element open", async () => {
      // Given
      const { anchorEl, floatingEl, insideIframeEl } = await renderOutsideClick();
      vi.useFakeTimers();

      // When
      await userEvent.click(insideIframeEl);
      await vi.advanceTimersByTimeAsync(10);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Tree hierarchies, parent-child coordination, and leaf-first unwinding", () => {
    it("Given a parent and child floating tree, When clicking inside child floating element, Then keeps parent open", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderTreeOutsideClick("parent");

      // When
      await userEvent.click(childFloatingEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();
    });

    it("Given a parent and child floating tree, When clicking inside parent floating blank area, Then closes child while parent stays open", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderTreeOutsideClick("child");

      // When
      await userEvent.click(floatingEl);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
    });

    it("Given a nested floating tree, When clicking outside, Then closes all hierarchy levels simultaneously", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl, outsideEl } =
        await renderFullTreeOutsideClick();

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();

      // When
      await userEvent.click(outsideEl);
      await nextTick();

      // Then: Both parent and child close simultaneously on outside click
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given clicking on ancestor anchor, When clicked, Then dismisses descendant branch immediately", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderFullTreeOutsideClick();

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();

      // When: Clicking parent anchor is outside child but inside parent
      await userEvent.click(anchorEl);
      await nextTick();

      // Then: Child closes, parent stays open
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given clicking inside ancestor floating panel, When clicked, Then dismisses descendant branch immediately", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderFullTreeOutsideClick();

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();

      // When: Clicking parent floating panel is outside child but inside parent
      await userEvent.click(floatingEl);
      await nextTick();

      // Then: Child closes, parent stays open
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });
});
