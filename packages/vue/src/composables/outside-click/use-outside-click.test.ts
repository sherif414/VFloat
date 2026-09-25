import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { useFloatingNode } from "@/composables/floating-node";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";
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
  removeInsideOnPointerdown?: boolean;
}

function dispatchTouch(
  target: EventTarget,
  type: "pointerdown" | "pointerup" | "pointercancel",
  opts: { pointerId?: number; clientX?: number; clientY?: number } = {},
): PointerEvent {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType: "touch",
    pointerId: opts.pointerId ?? 1,
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
  });
  target.dispatchEvent(event);
  return event;
}

async function renderOutsideClick(
  options: UseOutsideClickOptions = {},
  config: FixtureConfig = {},
) {
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
                  onClick: !config.removeInsideOnPointerdown
                    ? (event: MouseEvent) => (event.currentTarget as HTMLButtonElement).remove()
                    : undefined,
                  onPointerdown: config.removeInsideOnPointerdown
                    ? (event: PointerEvent) => (event.currentTarget as HTMLButtonElement).remove()
                    : undefined,
                },
                "Remove me",
              ),
              h(
                "button",
                {
                  type: "button",
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
            onPointerdown: config.stopOutsideClickPropagation
              ? (event: PointerEvent) => event.stopPropagation()
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
          [h("div", { style: { height: "300px", pointerEvents: "none" } }, "Scroll content")],
        ),
        h("iframe", { "data-testid": "outside-iframe", title: "Outside frame" }),
      ]);
  });

  await render(Component);
  await nextTick();
  return {
    anchorEl: page.getByRole("button", { name: "Trigger" }),
    floatingEl: page.getByTestId("floating"),
    outsideEl: page.getByTestId("outside"),
    ignoredEl: page.getByTestId("ignored"),
    scrollableEl: page.getByTestId("outside-scrollable"),
    removeInsideEl: page.getByRole("button", { name: "Remove me" }),
    dragHandleEl: page.getByRole("button", { name: "Drag" }),
    outsideIframeEl: page.getByTestId("outside-iframe"),
    insideIframeEl: page.getByTestId("inside-iframe"),
  };
}

async function renderFullTreeOutsideClick() {
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

    useOutsideClick(parentNode);
    useOutsideClick(childNode);

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

  await render(Component);
  await nextTick();
  return {
    anchorEl: page.getByRole("button", { name: "Trigger" }),
    floatingEl: page.getByTestId("floating"),
    childAnchorEl: page.getByRole("button", { name: "Child Trigger" }),
    childFloatingEl: page.getByTestId("child-floating"),
    outsideEl: page.getByTestId("outside"),
  };
}

async function renderTwoOverlaysOutsideClick(
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

    useOutsideClick(nodeA, { capture: options.overlayACapture ?? true });
    useOutsideClick(nodeB, { capture: options.overlayBCapture ?? false });

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

  await render(Component);
  await nextTick();
  return {
    outsideEl: page.getByTestId("outside"),
    anchorAEl: page.getByRole("button", { name: "Trigger A" }),
    floatingAEl: page.getByTestId("floating-a"),
    anchorBEl: page.getByRole("button", { name: "Trigger B" }),
    floatingBEl: page.getByTestId("floating-b"),
  };
}

const origDir = document.documentElement.dir;
const origInnerWidth = window.innerWidth;
const origGetBoundingClientRect = document.documentElement.getBoundingClientRect.bind(
  document.documentElement,
);

describe("Feature: useOutsideClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    document.documentElement.dir = origDir;
    Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
    delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
    document.documentElement.getBoundingClientRect = origGetBoundingClientRect;
  });

  describe("Scenario: Basic outside dismissal and target filtering", () => {
    it("Given an open floating element, When an outside element is clicked, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When
      await userEvent.click(outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open floating element, When touch pointerdown fires outside, Then preserves open state to allow scrolling", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: touch pointerdown fires outside (user touches screen to begin a scroll)
      const outsideDOM = getTestEl("outside");
      dispatchTouch(outsideDOM, "pointerdown");

      // Then: stays open so scrolling is not interrupted
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a touch gesture initiated outside, When pointerup fires without scrolling, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: touch tap completes with pointerup
      const outsideDOM = getTestEl("outside");
      dispatchTouch(outsideDOM, "pointerdown");
      dispatchTouch(outsideDOM, "pointerup");

      // Then: closes the floating element
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a touch gesture initiated outside, When pointercancel fires from scrolling, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: touch interaction is canceled by browser scrolling
      const outsideDOM = getTestEl("outside");
      dispatchTouch(outsideDOM, "pointerdown");
      dispatchTouch(outsideDOM, "pointercancel");

      // Then: stays open without interrupting scrolling
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given touch starts inside floating element and releases outside, When pointerup fires outside, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: touch starts inside floating surface and releases outside
      const floatingDOM = getTestEl("floating");
      const outsideDOM = getTestEl("outside");
      dispatchTouch(floatingDOM, "pointerdown");
      dispatchTouch(outsideDOM, "pointerup");

      // Then: overlay remains open because initial touch contact was inside
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a custom onOutsideClick callback, When touch tap completes with trailing click, Then invokes callback exactly once with interaction info", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl } = await renderOutsideClick({ onOutsideClick });

      // When: touch tap completes with pointerup followed by synthetic trailing click
      const outsideDOM = getTestEl("outside");
      dispatchTouch(outsideDOM, "pointerdown");
      dispatchTouch(outsideDOM, "pointerup");
      outsideDOM.dispatchEvent(makeMouseEvent("click", { detail: 1 }));

      // Then: callback is invoked exactly once for the tap gesture with pointer reason
      expect(onOutsideClick).toHaveBeenCalledTimes(1);
      expect(onOutsideClick).toHaveBeenCalledWith(
        expect.any(PointerEvent),
        expect.objectContaining({ reason: "pointer", target: outsideDOM }),
      );
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a virtual click from keyboard or assistive tech (detail 0), When click fires, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: keyboard activation or screen reader produces a click with detail 0
      const outsideDOM = getTestEl("outside");
      outsideDOM.dispatchEvent(makeMouseEvent("click", { detail: 0 }));

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given enabled is false, When an outside element is clicked, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        enabled: false,
      });

      // When
      await userEvent.click(outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element, When clicking the anchor element, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element, When clicking inside the floating panel, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();

      // When
      await userEvent.click(floatingEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a shouldIgnore predicate, When clicking an ignored element, Then passes interaction info and preserves open state", async () => {
      // Given
      const shouldIgnore = vi.fn(
        (_event, target) =>
          target !== null &&
          "id" in target &&
          (target as HTMLElement).id === "outside-click-ignore-target",
      );
      const { anchorEl, floatingEl, ignoredEl } = await renderOutsideClick({ shouldIgnore });
      const ignoredDOM = getTestEl("ignored");

      // When: Click ignored element
      await userEvent.click(ignoredEl);

      // Then
      expect(shouldIgnore).toHaveBeenCalledWith(
        expect.any(PointerEvent),
        ignoredDOM,
        expect.objectContaining({ reason: "pointer", target: ignoredDOM }),
      );
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a custom onOutsideClick callback, When an outside element is clicked, Then invokes the callback with interaction info without auto-closing", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        onOutsideClick,
      });
      const outsideDOM = getTestEl("outside");

      // When
      await userEvent.click(outsideEl);

      // Then
      expect(onOutsideClick).toHaveBeenCalledTimes(1);
      expect(onOutsideClick).toHaveBeenCalledWith(
        expect.any(PointerEvent),
        expect.objectContaining({ reason: "pointer", target: outsideDOM }),
      );
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a floating element that is already closed, When an outside element is clicked, Then ignores invocation", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(
        { onOutsideClick },
        { defaultOpen: false },
      );
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(outsideEl);

      // Then
      expect(onOutsideClick).not.toHaveBeenCalled();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given secondary mouse button (right-click), When right clicked outside, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick();

      // When: Right-click
      await userEvent.click(outsideEl, { button: "right" });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given auxiliary mouse button (middle-click), When middle clicked outside, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick();

      // When: Middle-click
      await userEvent.click(outsideEl, { button: "middle" });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given enabled is a reactive ref, When enabled toggles from false to true, Then synchronizes outside click behavior", async () => {
      // Given
      const enabled = ref(false);
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick({
        enabled,
      });

      // When clicked while disabled
      await userEvent.click(outsideEl);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When enabled becomes true
      enabled.value = true;
      await nextTick();

      await userEvent.click(outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Drag gesture handling and boundary tracking", () => {
    it("Given a drag starts inside and releases outside, When dragging finishes, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl, dragHandleEl, outsideEl } = await renderOutsideClick();

      // When: Drag starts inside and ends outside
      await userEvent.dragAndDrop(dragHandleEl, outsideEl);

      // Then: The overlay remains open because initial pointerdown was inside
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a drag started inside and completed outside, When an outside element is subsequently clicked, Then closes normally", async () => {
      // Given
      const { anchorEl, floatingEl, dragHandleEl, outsideEl } = await renderOutsideClick();

      // When: Drag starts inside and finishes outside
      await userEvent.dragAndDrop(dragHandleEl, outsideEl);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // And: A new outside click occurs
      await userEvent.click(outsideEl);

      // Then: Now it closes
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
      const origWidth = window.innerWidth;
      try {
        // Given
        Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
        Object.defineProperty(document.documentElement, "clientWidth", {
          value: 985,
          configurable: true,
        });
        const { anchorEl, floatingEl } = await renderOutsideClick({ ignoreScrollbar: true });

        // When: Dispatch pointerdown on Document (standard viewport scrollbar hit target)
        document.dispatchEvent(
          makePointerEvent("pointerdown", {
            clientX: 990,
            clientY: 100,
          }),
        );

        // Then
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
        await expect.element(floatingEl).toBeVisible();
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
      }
    });

    it("Given ignoreScrollbar is false, When clicking viewport scrollbar, Then closes the floating element", async () => {
      const origWidth = window.innerWidth;
      try {
        // Given
        Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
        Object.defineProperty(document.documentElement, "clientWidth", {
          value: 985,
          configurable: true,
        });
        const { anchorEl, floatingEl } = await renderOutsideClick({ ignoreScrollbar: false });

        // When: Dispatch pointerdown on Document
        document.dispatchEvent(
          makePointerEvent("pointerdown", {
            clientX: 990,
            clientY: 100,
          }),
        );

        // Then
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
        await expect.element(floatingEl).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
      }
    });

    it("Given RTL direction with ignoreScrollbar true, When clicking left scrollbar edge, Then preserves open state", async () => {
      const origDirVal = document.documentElement.dir;
      const origWidth = window.innerWidth;
      const origRectFn = document.documentElement.getBoundingClientRect.bind(
        document.documentElement,
      );

      try {
        // Given
        document.documentElement.dir = "rtl";
        Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
        Object.defineProperty(document.documentElement, "clientWidth", {
          value: 985,
          configurable: true,
        });
        document.documentElement.getBoundingClientRect = () =>
          ({ left: 15, top: 0, width: 985, height: 800, right: 1000, bottom: 800 }) as DOMRect;

        const { anchorEl, floatingEl } = await renderOutsideClick({ ignoreScrollbar: true });

        // When: Click inside the RTL scrollbar zone (x <= 15)
        document.dispatchEvent(
          makePointerEvent("pointerdown", {
            clientX: 10,
            clientY: 100,
          }),
        );

        // Then
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
        await expect.element(floatingEl).toBeVisible();
      } finally {
        document.documentElement.dir = origDirVal;
        Object.defineProperty(window, "innerWidth", { value: origWidth, configurable: true });
        delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth;
        document.documentElement.getBoundingClientRect = origRectFn;
      }
    });

    it("Given an element with thick borders, When clicking on border, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl, scrollableEl } = await renderOutsideClick({
        ignoreScrollbar: true,
      });
      const scrollableDOMEl = getTestEl("outside-scrollable");
      scrollableDOMEl.style.border = "0 solid black";
      scrollableDOMEl.style.borderLeftWidth = "10px";
      scrollableDOMEl.style.borderRightWidth = "10px";
      Object.defineProperty(scrollableDOMEl, "offsetWidth", { value: 100, configurable: true });
      Object.defineProperty(scrollableDOMEl, "clientWidth", { value: 80, configurable: true });
      Object.defineProperty(scrollableDOMEl, "offsetHeight", { value: 100, configurable: true });
      Object.defineProperty(scrollableDOMEl, "clientHeight", { value: 100, configurable: true });

      // When: Click on the border (x = 5, within the 10px left border)
      await userEvent.click(scrollableEl, { position: { x: 5, y: 20 } });

      // Then: Border clicks are not scrollbars and should dismiss
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Event phases, propagation, and capture options", () => {
    it("Given capture is true, When an outside element calls stopPropagation in bubble phase, Then still intercepts and closes", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(
        { capture: true },
        { stopOutsideClickPropagation: true },
      );

      // When
      await userEvent.click(outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given capture is false, When an outside element calls stopPropagation in bubble phase, Then respects stopPropagation and stays open", async () => {
      // Given
      const { anchorEl, floatingEl, outsideEl } = await renderOutsideClick(
        { capture: false },
        { stopOutsideClickPropagation: true },
      );

      // When
      await userEvent.click(outsideEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
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

      // When: Click outside in blank area
      await userEvent.click(outsideEl);

      // Then: Both overlays close cleanly regardless of phase differences
      await expect.element(anchorAEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingAEl).not.toBeInTheDocument();
      await expect.element(anchorBEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingBEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: DOM hierarchy, unmounted elements, and iframe focus", () => {
    it("Given an element inside floating unmounts during interaction, When clicked, Then preserves open state", async () => {
      // Given: Button inside floating that unmounts during pointerdown with bubble phase handling
      const { anchorEl, floatingEl, removeInsideEl } = await renderOutsideClick(
        { capture: false },
        { removeInsideOnPointerdown: true },
      );

      // When
      await userEvent.click(removeInsideEl);

      // Then: Disconnected target is guarded by !target.isConnected, keeping floating open
      await expect.element(removeInsideEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element, When window blur fires with focus on an outside iframe, Then closes the floating element", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl } = await renderOutsideClick({ onOutsideClick });
      const outsideIframeDOM = getTestEl("outside-iframe");

      // When: Focus moves to outside iframe and parent window blurs
      outsideIframeDOM.focus();
      window.dispatchEvent(new FocusEvent("blur"));

      // Then: Blur handler debounces and delivers iframe-blur outside click info
      await vi.waitFor(async () => {
        expect(onOutsideClick).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ reason: "iframe-blur", target: outsideIframeDOM }),
        );
      });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element without custom callback, When window blur fires with focus on an outside iframe, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderOutsideClick();
      const outsideIframeDOM = getTestEl("outside-iframe");

      // When: Focus moves to outside iframe and parent window blurs
      outsideIframeDOM.focus();
      window.dispatchEvent(new FocusEvent("blur"));

      // Then: Auto-closes the floating element
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open floating element, When window blur fires with focus on an iframe inside it, Then keeps the floating element open", async () => {
      // Given
      const onOutsideClick = vi.fn();
      const { anchorEl, floatingEl } = await renderOutsideClick({ onOutsideClick });
      const insideIframeDOM = getTestEl("inside-iframe");

      // When: Focus moves to inside iframe and parent window blurs
      insideIframeDOM.focus();
      window.dispatchEvent(new FocusEvent("blur"));
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Then: Inside iframe is within the floating tree, so it does not trigger outside dismissal
      expect(onOutsideClick).not.toHaveBeenCalled();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Tree hierarchies, parent-child coordination, and leaf-first unwinding", () => {
    it("Given a parent and child floating tree, When clicking inside child floating element, Then keeps parent open", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderFullTreeOutsideClick();

      // When
      await userEvent.click(childFloatingEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();
    });

    it("Given a parent and child floating tree, When clicking inside parent floating blank area, Then closes child while parent stays open", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderFullTreeOutsideClick();

      // When
      await userEvent.click(floatingEl);

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

      // Then: Both parent and child close simultaneously on outside click
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open parent and child floating tree, When ancestor anchor is clicked, Then closes child while keeping parent open", async () => {
      // Given
      const { anchorEl, floatingEl, childAnchorEl, childFloatingEl } =
        await renderFullTreeOutsideClick();

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(childFloatingEl).toBeVisible();

      // When: Clicking parent anchor is outside child but inside parent
      await userEvent.click(anchorEl);

      // Then: Child closes, parent stays open
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(childFloatingEl).not.toBeInTheDocument();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });
});
