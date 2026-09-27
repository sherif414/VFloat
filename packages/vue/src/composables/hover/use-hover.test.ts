import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { type Locator, page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, onMounted, ref, shallowRef, useTemplateRef } from "vue";
import type { FloatingNode, UseHoverOptions } from "@/composables";
import { useFloatingNode, useHover } from "@/composables";
import { makePointerEvent, stubElementRect } from "@/test-utils";

interface FixtureConfig {
  withIgnored?: boolean;
}

function dispatchPointer(
  target: Locator | Element,
  type: string,
  opts: Parameters<typeof makePointerEvent>[1] = {},
): void {
  const el =
    "element" in target && typeof target.element === "function"
      ? (target.element() as Element)
      : (target as Element);
  el.dispatchEvent(makePointerEvent(type, opts));
}

function createTestComponent(options: UseHoverOptions = {}, config: FixtureConfig = {}) {
  const open = ref(false);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorTemplateEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    // Writable mirror of the template ref so tests can reassign the anchor
    // and verify listener reattachment. Synced on mount before any dispatch.
    const anchorRef = shallowRef<HTMLElement | null>(null);

    node = useFloatingNode({
      anchorEl: anchorRef,
      floatingEl,
      open,
    });

    useHover(node, options);

    onMounted(() => {
      anchorRef.value = anchorTemplateEl.value;
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "anchor",
            "data-testid": "anchor",
            type: "button",
            "aria-expanded": String(open.value),
          },
          "Anchor",
        ),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("button", { "data-testid": "anchor-2", type: "button" }, "Anchor 2"),
        ...(config.withIgnored ? [h("div", { "data-testid": "ignored" }, "Ignored")] : []),
      ]);
  });

  return {
    Component,
    getNode: () => node,
    open,
  };
}

function createTreeComponent(
  target: "parent" | "child",
  parentInitial: boolean,
  childInitial: boolean,
) {
  const parentOpen = ref(parentInitial);
  const childOpen = ref(childInitial);

  const Component = defineComponent(() => {
    const parentAnchorEl = useTemplateRef<HTMLElement>("parent-anchor");
    const parentFloatingEl = useTemplateRef<HTMLElement>("parent-floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const parentNode = useFloatingNode({
      anchorEl: parentAnchorEl,
      floatingEl: parentFloatingEl,
      open: parentOpen,
    });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });

    useHover(target === "parent" ? parentNode : childNode);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "parent-anchor",
            "data-testid": "parent-anchor",
            type: "button",
            "aria-expanded": String(parentOpen.value),
          },
          "Parent anchor",
        ),
        h("div", { ref: "parent-floating", "data-testid": "parent-floating" }, "Parent floating"),
        h(
          "button",
          {
            ref: "child-anchor",
            "data-testid": "child-anchor",
            type: "button",
            "aria-expanded": String(childOpen.value),
          },
          "Child anchor",
        ),
        h("div", { ref: "child-floating", "data-testid": "child-floating" }, "Child floating"),
      ]);
  });

  return { Component, parentOpen, childOpen };
}

async function renderHover(options: UseHoverOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  const view = await render(fixture.Component);
  const anchorEl = page.getByTestId("anchor");
  const floatingEl = page.getByTestId("floating");
  stubElementRect(anchorEl.element() as HTMLElement, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    right: 100,
    bottom: 100,
  });
  stubElementRect(floatingEl.element() as HTMLElement, {
    x: 0,
    y: 110,
    width: 50,
    height: 50,
    top: 110,
    left: 0,
    right: 50,
    bottom: 160,
  });
  await nextTick();
  return {
    anchorEl,
    floatingEl,
    anchor2El: page.getByTestId("anchor-2"),
    ignoredEl: config.withIgnored ? page.getByTestId("ignored") : null,
    view,
    node: fixture.getNode(),
    open: fixture.open,
  };
}

async function renderTreeHover(
  target: "parent" | "child",
  parentInitial: boolean,
  childInitial: boolean,
) {
  const fixture = createTreeComponent(target, parentInitial, childInitial);
  await render(fixture.Component);
  await nextTick();
  return {
    parentAnchorEl: page.getByTestId("parent-anchor"),
    parentFloatingEl: page.getByTestId("parent-floating"),
    childAnchorEl: page.getByTestId("child-anchor"),
    childFloatingEl: page.getByTestId("child-floating"),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

describe("Feature: useHover", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Basic pointer enter and leave triggering", () => {
    it("Given a closed floating element, When pointer enters reference element, Then opens the floating element", async () => {
      // Given
      const { anchorEl } = await renderHover();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.hover(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given an open floating element, When pointer leaves reference element, Then closes the floating element", async () => {
      // Given
      const { anchorEl } = await renderHover();
      await userEvent.hover(anchorEl);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      await userEvent.unhover(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given an open floating element with delay, When pointer moves directly from reference to floating element, Then preserves open state", async () => {
      vi.useFakeTimers();
      // Given
      const { anchorEl, floatingEl, node } = await renderHover({ delay: 10 });
      dispatchPointer(anchorEl, "pointerenter");
      vi.runAllTimers();
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Pointer transitions into floating element
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: floatingEl.element() });
      dispatchPointer(floatingEl, "pointerenter");
      vi.runAllTimers();
      await nextTick();

      // Then: Remains open
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Pointer leaves floating element into document body
      dispatchPointer(floatingEl, "pointerleave", { relatedTarget: document.body });
      vi.runAllTimers();
      await nextTick();

      // Then: Closes
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given reference element ref changes dynamically, When pointer enters new reference element, Then opens floating element", async () => {
      // Given
      const { anchorEl, anchor2El, node } = await renderHover();
      const oldRefEl = anchorEl.element();

      node.refs.anchorEl.value = null;
      await nextTick();

      dispatchPointer(oldRefEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      node.refs.anchorEl.value = anchor2El.element();
      await nextTick();

      await userEvent.hover(anchor2El);
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given enabled changes to false, When pointer enters reference element, Then preserves closed state", async () => {
      // Given
      const enabled = ref(true);
      const { anchorEl, node } = await renderHover({ enabled });

      await userEvent.hover(anchorEl);
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Disabled dynamically
      enabled.value = false;
      await nextTick();

      node.open.value = false;
      await userEvent.hover(anchorEl);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Scenario: Open and close delay configuration", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("Given delay.open is specified, When pointer enters reference element, Then waits for open delay before opening", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ delay: { open: 100 } });

      // When
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      // Then: Remains closed before delay
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      vi.advanceTimersByTime(99);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // Then: Opens after delay
      vi.advanceTimersByTime(1);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given delay.close is specified, When pointer leaves reference element, Then waits for close delay before closing", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ delay: { close: 100 } });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();

      // Then: Remains open before close delay
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      vi.advanceTimersByTime(99);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // Then: Closes after close delay
      vi.advanceTimersByTime(1);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given a numeric delay is specified, When pointer enters and leaves, Then applies the delay to both open and close", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ delay: 150 });

      // When entering
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      vi.advanceTimersByTime(150);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When leaving
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      vi.advanceTimersByTime(150);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Scenario: Custom ignorePointerLeave predicate", () => {
    it("Given ignorePointerLeave predicate matches target, When pointer leaves into ignored element, Then preserves open state", async () => {
      // Given
      let targetIgnoredEl: HTMLElement | null = null;
      const { anchorEl, ignoredEl, node } = await renderHover(
        {
          ignorePointerLeave: (target) => target === targetIgnoredEl,
        },
        { withIgnored: true },
      );
      targetIgnoredEl = ignoredEl!.element() as HTMLElement;

      dispatchPointer(anchorEl, "pointerenter", { clientX: 10, clientY: 10 });
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      dispatchPointer(anchorEl, "pointerleave", {
        relatedTarget: targetIgnoredEl,
        clientX: 15,
        clientY: 15,
      });
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Scenario: Parent and child floating node hover coordination", () => {
    it("Given a parent floating element, When pointer leaves parent into a child floating element, Then keeps parent open", async () => {
      // Given
      const { parentAnchorEl, childFloatingEl, parentOpen } = await renderTreeHover(
        "parent",
        false,
        true,
      );

      dispatchPointer(parentAnchorEl, "pointerenter");
      await nextTick();
      expect(parentOpen.value).toBe(true);
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      dispatchPointer(parentAnchorEl, "pointerleave", {
        relatedTarget: childFloatingEl.element(),
      });
      await nextTick();

      // Then
      expect(parentOpen.value).toBe(true);
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given a child floating element, When pointer leaves child into parent floating element, Then closes child while parent stays open", async () => {
      // Given
      const { childAnchorEl, parentFloatingEl, childOpen } = await renderTreeHover(
        "child",
        true,
        false,
      );

      dispatchPointer(childAnchorEl, "pointerenter");
      await nextTick();
      expect(childOpen.value).toBe(true);
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      dispatchPointer(childAnchorEl, "pointerleave", {
        relatedTarget: parentFloatingEl.element(),
      });
      await nextTick();

      // Then
      expect(childOpen.value).toBe(false);
      await expect.element(childAnchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given parent node with an open child, When parent receives pointerleave, Then canClose prevents parent from closing", async () => {
      vi.useFakeTimers();
      // Given: parent is open and child is open
      const { parentAnchorEl, parentOpen } = await renderTreeHover("parent", true, true);

      // When: pointer leaves parent anchor into empty space
      dispatchPointer(parentAnchorEl, "pointerleave", {
        relatedTarget: document.body,
      });
      vi.runAllTimers();
      await nextTick();

      // Then: Parent stays open because child is open
      expect(parentOpen.value).toBe(true);
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given parent and child are both open with cursor outside both, When child closes, Then parent auto-reconciles and closes", async () => {
      vi.useFakeTimers();
      // Given: parent and child are open, cursor has left both elements
      const { parentAnchorEl, childOpen, parentOpen } = await renderTreeHover("parent", true, true);

      // Simulate cursor leaving parent anchor into empty space
      dispatchPointer(parentAnchorEl, "pointerleave", {
        relatedTarget: document.body,
      });
      await nextTick();
      // Parent stays open because child is still open
      expect(parentOpen.value).toBe(true);
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "true");

      // When: child submenu closes (e.g. via escape key or outside click)
      childOpen.value = false;
      vi.runAllTimers();
      await nextTick();

      // Then: hasOpenChild watcher fires reconcile → parent auto-closes
      expect(parentOpen.value).toBe(false);
      await expect.element(parentAnchorEl).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Scenario: Rest period requirements (restMs)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("Given restMs is specified, When pointer enters and rests, Then opens after restMs duration expires", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ restMs: 50 });

      // When
      dispatchPointer(anchorEl, "pointerenter", { clientX: 10, clientY: 10 });
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // Then
      vi.advanceTimersByTime(49);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      vi.advanceTimersByTime(1);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given restMs is specified, When pointer moves significantly before restMs expires, Then resets the rest timer", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ restMs: 50 });

      dispatchPointer(anchorEl, "pointerenter", { clientX: 10, clientY: 10 });
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      vi.advanceTimersByTime(25);

      // When: Significant pointer move
      dispatchPointer(anchorEl, "pointermove", { clientX: 30, clientY: 10 });
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // Then: Rest timer restarted
      vi.advanceTimersByTime(30);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      vi.advanceTimersByTime(20);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given restMs is specified, When pointer leaves reference before restMs expires, Then cancels pending rest timer", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ restMs: 50 });

      dispatchPointer(anchorEl, "pointerenter", { clientX: 10, clientY: 10 });
      await nextTick();

      vi.advanceTimersByTime(30);

      // When
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();

      // Then
      vi.advanceTimersByTime(100);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given restMs is specified, When pointer moves continuously for 1000ms, Then forces floating element open via fallback delay", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ restMs: 100 });

      dispatchPointer(anchorEl, "pointerenter", { clientX: 0, clientY: 0 });
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Pointer moves continuously without resting
      for (let time = 50; time <= 950; time += 50) {
        vi.advanceTimersByTime(50);
        dispatchPointer(anchorEl, "pointermove", { clientX: time, clientY: 0 });
        await nextTick();
        expect(node.open.value).toBe(false);
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      }

      // Then: Fallback threshold (1000ms) triggers opening
      vi.advanceTimersByTime(50);
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given delay.open is larger than fallback, When pointer moves continuously past delay.open, Then opens after custom fallback expires", async () => {
      // Given
      const { anchorEl, node } = await renderHover({
        delay: { open: 1200 },
        restMs: 50,
      });

      dispatchPointer(anchorEl, "pointerenter", { clientX: 0, clientY: 0 });
      await nextTick();

      // When
      for (let time = 30; time <= 1170; time += 30) {
        vi.advanceTimersByTime(30);
        dispatchPointer(anchorEl, "pointermove", { clientX: time, clientY: 0 });
        await nextTick();
        expect(node.open.value).toBe(false);
        await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      }

      // Then
      vi.advanceTimersByTime(30);
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given delay.open is specified alongside restMs, When pointer rests on reference, Then opens after restMs without waiting for full delay.open", async () => {
      // Given
      const { anchorEl, node } = await renderHover({
        delay: { open: 200 },
        restMs: 50,
      });

      // When
      dispatchPointer(anchorEl, "pointerenter", { clientX: 10, clientY: 10 });
      await nextTick();

      // Then
      vi.advanceTimersByTime(49);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      vi.advanceTimersByTime(1);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Scenario: Modality filtering with mouseOnly", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("Given mouseOnly is true, When non-mouse pointer interactions occur, Then ignores touch and pen pointers and only responds to mouse", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ mouseOnly: true });

      // When: Touch pointer
      dispatchPointer(anchorEl, "pointerenter", { pointerType: "touch" });
      vi.runAllTimers();
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Pen pointer
      dispatchPointer(anchorEl, "pointerenter", { pointerType: "pen" });
      vi.runAllTimers();
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Mouse pointer
      dispatchPointer(anchorEl, "pointerenter", { pointerType: "mouse" });
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Touch pointer leave
      dispatchPointer(anchorEl, "pointerleave", {
        pointerType: "touch",
        relatedTarget: document.body,
      });
      vi.runAllTimers();
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Mouse pointer leave
      dispatchPointer(anchorEl, "pointerleave", {
        pointerType: "mouse",
        relatedTarget: document.body,
      });
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Scenario: Interruptions, cancellations, and external dismissals", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("Given a pending open delay, When pointer leaves reference before delay expires, Then cancels pending opening", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ delay: { open: 100 } });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(50);

      // When
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();
      vi.runAllTimers();

      // Then
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given a pending close delay, When pointer re-enters reference before delay expires, Then cancels close delay and stays open", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ delay: { close: 100 } });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();
      vi.advanceTimersByTime(50);

      // When
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(100);

      // Then
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given pointer is inside floating element with close delay, When pointer leaves floating element, Then closes after close delay", async () => {
      // Given
      const { anchorEl, floatingEl, node } = await renderHover({ delay: { close: 100 } });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: floatingEl.element() });
      dispatchPointer(floatingEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(150);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      dispatchPointer(floatingEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();

      // Then
      vi.advanceTimersByTime(99);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      vi.advanceTimersByTime(1);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given an active floating element, When open state is toggled externally, Then synchronizes state accordingly", async () => {
      // Given
      const { anchorEl, node } = await renderHover();

      // When: Externally opened
      node.open.value = true;
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Externally closed
      node.open.value = false;
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given floating element is dismissed externally while cursor remains on anchor, When cursor moves within anchor, Then prevents re-opening until re-entry", async () => {
      // Given
      const { anchorEl, node } = await renderHover({ delay: { open: 50 } });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(50);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: External dismissal (e.g., Escape pressed or outside click) while pointer stays inside anchor
      node.open.value = false;
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // Moving or waiting inside the anchor does not re-open
      dispatchPointer(anchorEl, "pointermove", { clientX: 20, clientY: 20 });
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // Leaving and re-entering restores hover opening
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(50);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given pointer returns from floating element back to anchor while open, When entering anchor, Then cancels close delay without scheduling open delay", async () => {
      // Given
      const { anchorEl, floatingEl, node } = await renderHover({
        delay: { open: 200, close: 100 },
      });

      // Open initial tooltip
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(200);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // Move into floating element
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: floatingEl.element() });
      dispatchPointer(floatingEl, "pointerenter");
      await nextTick();

      // Leave floating element towards anchor (starts 100ms close delay)
      dispatchPointer(floatingEl, "pointerleave", { relatedTarget: anchorEl.element() });
      await nextTick();
      vi.advanceTimersByTime(40); // 40ms into 100ms close delay

      // When: Re-enter anchor element: close delay cancelled, surface stays open
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      // Then: Even after 100ms total, it stays open (close timer was cancelled)
      vi.advanceTimersByTime(100);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given pointercancel fires on anchor or floating element, When interrupted, Then closes the floating element", async () => {
      // Given
      const { anchorEl, floatingEl, node } = await renderHover();

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: System interrupts with pointercancel on anchor
      dispatchPointer(anchorEl, "pointercancel");
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // Re-enter and move to floating element
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: floatingEl.element() });
      dispatchPointer(floatingEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Pointercancel on floating element
      dispatchPointer(floatingEl, "pointercancel");
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Scenario: Safe polygon corridor traversal", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("Given safePolygon is enabled, When pointer leaves reference and moves through the safe corridor toward floating element, Then keeps floating element open", async () => {
      // Given
      const { anchorEl, floatingEl, node } = await renderHover({ safePolygon: true });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      // When: Pointer leaves anchor towards floating element
      dispatchPointer(anchorEl, "pointerleave", {
        clientX: 25,
        clientY: 100,
        relatedTarget: document.body,
      });

      vi.advanceTimersByTime(0);
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // Pointer moves along corridor
      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 25, clientY: 105 }));
      vi.advanceTimersByTime(20);
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // Enters floating element
      dispatchPointer(floatingEl, "pointerenter", { clientX: 25, clientY: 110 });
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Pointer leaves floating element into unrelated space
      dispatchPointer(floatingEl, "pointerleave", {
        relatedTarget: document.body,
        clientX: 25,
        clientY: 110,
      });

      vi.advanceTimersByTime(0);
      await nextTick();

      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 500, clientY: 500 }));
      vi.runAllTimers();
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given reference element is left before tooltip opens, When safe polygon is configured, Then does not initiate safe corridor", async () => {
      // Given
      const onPolygonChange = vi.fn();
      const { anchorEl, node } = await renderHover({
        delay: { open: 100 },
        safePolygon: { onPolygonChange },
      });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      vi.advanceTimersByTime(30);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // On initial pointerenter, clearPolygon resets polygon to []
      expect(onPolygonChange).toHaveBeenCalledTimes(1);
      expect(onPolygonChange).toHaveBeenLastCalledWith([]);

      // When: Pointer leaves before opening
      dispatchPointer(anchorEl, "pointerleave", { relatedTarget: document.body });
      vi.advanceTimersByTime(10);
      await nextTick();

      // Then: Safe polygon was never initiated
      expect(onPolygonChange).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(100);
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
    });

    it("Given safePolygon is enabled, When pointerleave occurs on reference, Then attaches passive pointermove listener synchronously", async () => {
      // Given
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const { anchorEl } = await renderHover({ safePolygon: true });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      // When
      dispatchPointer(anchorEl, "pointerleave", {
        clientX: 25,
        clientY: 100,
        relatedTarget: document.body,
      });

      // Then: Synchronously attached without timer ticks
      expect(addEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function), {
        passive: true,
      });

      addEventListenerSpy.mockRestore();
    });

    it("Given safePolygon is enabled, When pointer leaves reference through opposite side, Then does not start safe polygon and closes", async () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const { anchorEl, node } = await renderHover({
        safePolygon: { blockPointerEvents: true },
      });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Leave from the top (opposite side of bottom-positioned floating element)
      dispatchPointer(anchorEl, "pointerleave", {
        clientX: 25,
        clientY: -10,
        relatedTarget: document.body,
      });
      await nextTick();

      // Then: Did not attach pointermove listener or apply a shield
      expect(addEventListenerSpy).not.toHaveBeenCalledWith("pointermove", expect.any(Function), {
        passive: true,
      });
      expect(document.body.style.pointerEvents).toBe("");
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      addEventListenerSpy.mockRestore();
    });

    it("Given blockPointerEvents shield is active, When pointer re-enters anchor, Then releases the shield synchronously", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderHover({
        safePolygon: { blockPointerEvents: true },
      });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      dispatchPointer(anchorEl, "pointerleave", {
        clientX: 25,
        clientY: 100,
        relatedTarget: document.body,
      });

      expect(document.body.style.pointerEvents).toBe("none");
      expect(floatingEl.element().style.pointerEvents).toBe("auto");

      // When: Re-enter anchor
      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();

      // Then
      expect(document.body.style.pointerEvents).toBe("");
      expect(floatingEl.element().style.pointerEvents).toBe("");
    });

    it("Given pointer is inside floating element with safePolygon enabled, When pointer leaves floating element, Then does not initiate safe corridor and closes", async () => {
      // Given
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const { anchorEl, floatingEl, node } = await renderHover({ safePolygon: true });

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      dispatchPointer(anchorEl, "pointerleave", {
        relatedTarget: document.body,
        clientX: 25,
        clientY: 100,
      });
      await nextTick();

      dispatchPointer(floatingEl, "pointerenter", { clientX: 25, clientY: 110 });
      await nextTick();

      addEventListenerSpy.mockClear();

      // When: Leaving floating element
      dispatchPointer(floatingEl, "pointerleave", {
        relatedTarget: document.body,
        clientX: 25,
        clientY: 110,
      });
      await nextTick();

      // Then: Should not register a document-level pointermove listener for safePolygon
      expect(addEventListenerSpy).not.toHaveBeenCalledWith("pointermove", expect.any(Function), {
        passive: true,
      });
      // Closes according to normal delay rules (immediate when delay is 0)
      expect(node.open.value).toBe(false);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      addEventListenerSpy.mockRestore();
    });
  });

  describe("Scenario: Lifecycle, element detachment, and unmount cleanup", () => {
    it("Given a mounted component with active hover listeners, When component is unmounted, Then detaches all event listeners", async () => {
      // Given
      const { anchorEl, floatingEl, view, node } = await renderHover();
      const anchorRawEl = anchorEl.element();
      const floatingRawEl = floatingEl.element();

      dispatchPointer(anchorEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(true);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When: Component unmounts
      await view.unmount();
      await nextTick();

      node.open.value = false;

      dispatchPointer(anchorRawEl, "pointerenter");
      await nextTick();
      expect(node.open.value).toBe(false);

      node.open.value = true;
      dispatchPointer(floatingRawEl, "pointerleave", { relatedTarget: document.body });
      await nextTick();

      // Then
      expect(node.open.value).toBe(true);
    });

    it("Given an active open delay, When anchor element is removed from DOM before delay expires, Then cancels scheduled open", async () => {
      vi.useFakeTimers();
      // Given
      const { anchorEl, node } = await renderHover({ delay: { open: 100 } });

      dispatchPointer(anchorEl, "pointerenter");
      vi.advanceTimersByTime(50);
      expect(node.open.value).toBe(false);

      // When: Unmount anchor element before delay expires
      anchorEl.element().remove();
      await nextTick();

      vi.advanceTimersByTime(60);
      await nextTick();

      // Then
      expect(node.open.value).toBe(false);
    });
  });
});
