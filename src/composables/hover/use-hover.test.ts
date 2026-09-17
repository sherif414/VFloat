import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, onMounted, ref, shallowRef, useTemplateRef } from "vue";
import type { FloatingNode } from "@/composables";
import { type UseHoverOptions, useFloatingNode, useHover } from "@/composables";
import { getTestEl, makePointerEvent, stubElementRect } from "@/test-utils";

interface FixtureConfig {
  withIgnored?: boolean;
}

function createTestComponent(options: UseHoverOptions = {}, config: FixtureConfig = {}) {
  const open = ref(false);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorTemplateEl = useTemplateRef<HTMLDivElement>("anchor");
    const floatingEl = useTemplateRef<HTMLDivElement>("floating");
    // Writable mirror of the template ref so tests can reassign the anchor
    // and verify listener reattachment. Synced on mount before any dispatch.
    const anchorRef = shallowRef<HTMLDivElement | null>(null);

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
        h("div", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("div", { "data-testid": "anchor-2" }, "Anchor 2"),
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
    const parentAnchorEl = useTemplateRef<HTMLDivElement>("parent-anchor");
    const parentFloatingEl = useTemplateRef<HTMLDivElement>("parent-floating");
    const childAnchorEl = useTemplateRef<HTMLDivElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLDivElement>("child-floating");

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
        h("div", { ref: "parent-anchor", "data-testid": "parent-anchor" }, "Parent anchor"),
        h("div", { ref: "parent-floating", "data-testid": "parent-floating" }, "Parent floating"),
        h("div", { ref: "child-anchor", "data-testid": "child-anchor" }, "Child anchor"),
        h("div", { ref: "child-floating", "data-testid": "child-floating" }, "Child floating"),
      ]);
  });

  return { Component, parentOpen, childOpen };
}

async function renderHover(options: UseHoverOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  const view = await render(fixture.Component);
  const anchorEl = getTestEl("anchor", view.container);
  const floatingEl = getTestEl("floating", view.container);
  stubElementRect(anchorEl, {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    right: 100,
    bottom: 100,
  });
  stubElementRect(floatingEl, {
    x: 0,
    y: 110,
    width: 50,
    height: 50,
    top: 110,
    left: 0,
    right: 50,
    bottom: 160,
  });
  vi.useFakeTimers();
  await nextTick();
  await nextTick();
  return {
    anchorEl,
    floatingEl,
    anchor2El: getTestEl("anchor-2", view.container),
    ignoredEl: config.withIgnored ? getTestEl("ignored", view.container) : null,
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
  const view = await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    parentAnchorEl: getTestEl("parent-anchor", view.container),
    parentFloatingEl: getTestEl("parent-floating", view.container),
    childAnchorEl: getTestEl("child-anchor", view.container),
    childFloatingEl: getTestEl("child-floating", view.container),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

describe("useHover", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("core functionality", () => {
    it("opens when pointer enters reference element", async () => {
      const ctx = await renderHover();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.node.open.value).toBe(true);
    });

    it("closes when pointer leaves reference element", async () => {
      const ctx = await renderHover();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      expect(ctx.node.open.value).toBe(false);
    });

    it("does not close immediately if pointer moves from reference to floating element", async () => {
      const ctx = await renderHover({ delay: 10 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();

      expect(ctx.node.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();

      expect(ctx.node.open.value).toBe(false);
    });

    it("attaches/reattaches listeners when element refs change", async () => {
      const ctx = await renderHover();
      const oldRef = ctx.anchorEl;

      ctx.node.refs.anchorEl.value = null;
      await nextTick();

      oldRef.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.node.refs.anchorEl.value = ctx.anchor2El;
      await nextTick();

      ctx.anchor2El.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);
    });

    it("disables functionality when enabled becomes false", async () => {
      const enabled = ref(true);
      const ctx = await renderHover({ enabled });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      enabled.value = false;
      await nextTick();

      ctx.node.open.value = false;
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("delay configuration", () => {
    it("respects delay.open (object notation)", async () => {
      const ctx = await renderHover({ delay: { open: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.node.open.value).toBe(false);
      vi.advanceTimersByTime(99);
      expect(ctx.node.open.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.node.open.value).toBe(true);
    });

    it("respects delay.close (object notation)", async () => {
      const ctx = await renderHover({ delay: { close: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      vi.advanceTimersByTime(99);
      expect(ctx.node.open.value).toBe(true);
      vi.advanceTimersByTime(1);
      expect(ctx.node.open.value).toBe(false);
    });

    it("respects delay (number notation) for both open and close", async () => {
      const ctx = await renderHover({ delay: 150 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.node.open.value).toBe(false);
      vi.advanceTimersByTime(150);
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      expect(ctx.node.open.value).toBe(true);
      vi.advanceTimersByTime(150);
      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("ignorePointerLeave predicate", () => {
    it("keeps the parent open when the pointer leaves into an ignored element", async () => {
      let ignoredEl: HTMLElement | null = null;
      const ctx = await renderHover(
        {
          ignorePointerLeave: (target) => target === ignoredEl,
        },
        { withIgnored: true },
      );
      ignoredEl = ctx.ignoredEl;

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();

      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: ignoredEl,
          clientX: 15,
          clientY: 15,
        }),
      );
      await nextTick();

      expect(ctx.node.open.value).toBe(true);
    });
  });

  describe("parent-linked nodes", () => {
    it("keeps a parent open when the pointer leaves into a child floating element", async () => {
      const ctx = await renderTreeHover("parent", false, true);

      ctx.parentAnchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.parentOpen.value).toBe(true);

      ctx.parentAnchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: ctx.childFloatingEl,
        }),
      );
      await nextTick();

      expect(ctx.parentOpen.value).toBe(true);
    });

    it("closes a child when the pointer leaves into the parent floating element", async () => {
      const ctx = await renderTreeHover("child", true, false);

      ctx.childAnchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.childOpen.value).toBe(true);

      ctx.childAnchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: ctx.parentFloatingEl,
        }),
      );
      await nextTick();

      expect(ctx.childOpen.value).toBe(false);
    });
  });

  describe("rest period (restMs)", () => {
    it("waits for restMs before opening if pointer rests", async () => {
      const ctx = await renderHover({ restMs: 50 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      vi.advanceTimersByTime(49);
      expect(ctx.node.open.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.node.open.value).toBe(true);
    });

    it("resets rest timer if pointer moves significantly before restMs expires", async () => {
      const ctx = await renderHover({ restMs: 50 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      vi.advanceTimersByTime(25);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointermove", { clientX: 30, clientY: 10 }));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      vi.advanceTimersByTime(30);
      expect(ctx.node.open.value).toBe(false);

      vi.advanceTimersByTime(20);
      expect(ctx.node.open.value).toBe(true);
    });

    it("cancels rest period timer if pointer leaves before restMs expires", async () => {
      const ctx = await renderHover({ restMs: 50 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();

      vi.advanceTimersByTime(30);
      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      vi.advanceTimersByTime(100);
      expect(ctx.node.open.value).toBe(false);
    });

    it("forces floating element open after fallback delay (1000ms) even if pointer moves continuously", async () => {
      const ctx = await renderHover({ restMs: 100 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 0, clientY: 0 }));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      for (let time = 50; time <= 950; time += 50) {
        vi.advanceTimersByTime(50);
        ctx.anchorEl.dispatchEvent(makePointerEvent("pointermove", { clientX: time, clientY: 0 }));
        await nextTick();
        expect(ctx.node.open.value).toBe(false);
      }

      vi.advanceTimersByTime(50);
      await nextTick();
      expect(ctx.node.open.value).toBe(true);
    });

    it("respects fallback delay when delay.open is specified alongside restMs", async () => {
      const ctx = await renderHover({
        delay: { open: 1200 },
        restMs: 50,
      });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 0, clientY: 0 }));
      await nextTick();

      for (let time = 30; time <= 1170; time += 30) {
        vi.advanceTimersByTime(30);
        ctx.anchorEl.dispatchEvent(makePointerEvent("pointermove", { clientX: time, clientY: 0 }));
        await nextTick();
        expect(ctx.node.open.value).toBe(false);
      }

      vi.advanceTimersByTime(30);
      await nextTick();
      expect(ctx.node.open.value).toBe(true);
    });

    it("opens after restMs when pointer rests even if delay.open is specified", async () => {
      const ctx = await renderHover({
        delay: { open: 200 },
        restMs: 50,
      });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();

      vi.advanceTimersByTime(49);
      expect(ctx.node.open.value).toBe(false);

      vi.advanceTimersByTime(1);
      expect(ctx.node.open.value).toBe(true);
    });
  });

  describe("mouse-only mode (mouseOnly)", () => {
    it("ignores non-mouse pointer types when mouseOnly is true", async () => {
      const ctx = await renderHover({ mouseOnly: true });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "touch" }));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "pen" }));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "mouse" }));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          pointerType: "touch",
          relatedTarget: document.body,
        }),
      );
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          pointerType: "mouse",
          relatedTarget: document.body,
        }),
      );
      await nextTick();
      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("edge case handling", () => {
    it("cancels pending open delay if pointer leaves reference", async () => {
      const ctx = await renderHover({ delay: { open: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(50);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      vi.runAllTimers();

      expect(ctx.node.open.value).toBe(false);
    });

    it("cancels pending close delay if pointer re-enters reference", async () => {
      const ctx = await renderHover({ delay: { close: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      vi.advanceTimersByTime(50);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(100);

      expect(ctx.node.open.value).toBe(true);
    });

    it("closes (respecting delay) if pointer leaves floating element", async () => {
      const ctx = await renderHover({ delay: { close: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(150);
      expect(ctx.node.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      vi.advanceTimersByTime(99);
      expect(ctx.node.open.value).toBe(true);
      vi.advanceTimersByTime(1);
      expect(ctx.node.open.value).toBe(false);
    });

    it("reacts to external state changes", async () => {
      const ctx = await renderHover();

      ctx.node.open.value = true;
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.node.open.value = false;
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      expect(ctx.node.open.value).toBe(false);
    });

    it("does not re-open when dismissed externally while cursor remains on anchor until re-entry", async () => {
      const ctx = await renderHover({ delay: { open: 50 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(50);
      expect(ctx.node.open.value).toBe(true);

      // External dismissal (e.g., Escape pressed or outside click) while pointer stays inside anchor
      ctx.node.open.value = false;
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      // Moving or waiting inside the anchor does not re-open
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointermove", { clientX: 20, clientY: 20 }));
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      // Leaving and re-entering restores hover opening
      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(50);
      expect(ctx.node.open.value).toBe(true);
    });

    it("cancels pending close delay when returning to anchor while open without scheduling open delay", async () => {
      const ctx = await renderHover({ delay: { open: 200, close: 100 } });

      // Open initial tooltip
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(200);
      expect(ctx.node.open.value).toBe(true);

      // Move into floating element
      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      // Leave floating element towards anchor (starts 100ms close delay)
      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.anchorEl }),
      );
      await nextTick();
      vi.advanceTimersByTime(40); // 40ms into 100ms close delay

      // Re-enter anchor element: close delay cancelled, surface stays open
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      // Even after 100ms total, it stays open (close timer was cancelled)
      vi.advanceTimersByTime(100);
      expect(ctx.node.open.value).toBe(true);
    });

    it("handles pointercancel on anchor and floating element similarly to pointerleave", async () => {
      const ctx = await renderHover();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      // System interrupts with pointercancel on anchor
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointercancel"));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      // Re-enter and move to floating element
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      // Pointercancel on floating element
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointercancel"));
      await nextTick();
      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("safePolygon behavior", () => {
    it("keeps open when leaving reference towards floating with safePolygon enabled", async () => {
      const ctx = await renderHover({ safePolygon: true });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      const leaveEvt = makePointerEvent("pointerleave", {
        clientX: 25,
        clientY: 100,
        relatedTarget: document.body,
      });
      ctx.anchorEl.dispatchEvent(leaveEvt);

      vi.advanceTimersByTime(0);
      await nextTick();

      expect(ctx.node.open.value).toBe(true);

      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 25, clientY: 105 }));
      vi.advanceTimersByTime(20);
      expect(ctx.node.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 25, clientY: 110 }));
      expect(ctx.node.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: document.body,
          clientX: 25,
          clientY: 110,
        }),
      );

      vi.advanceTimersByTime(0);
      await nextTick();

      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 500, clientY: 500 }));

      vi.runAllTimers();
      await nextTick();

      expect(ctx.node.open.value).toBe(false);
    });

    it("does not initiate safe polygon if reference is left before opening", async () => {
      const onPolygonChange = vi.fn();
      const ctx = await renderHover({
        delay: { open: 100 },
        safePolygon: { onPolygonChange },
      });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(30);
      expect(ctx.node.open.value).toBe(false);

      // On initial pointerenter, clearPolygon resets polygon to []
      expect(onPolygonChange).toHaveBeenCalledTimes(1);
      expect(onPolygonChange).toHaveBeenLastCalledWith([]);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.advanceTimersByTime(10);
      await nextTick();

      // Safe polygon is never initiated because tooltip was never opened
      expect(onPolygonChange).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(100);
      expect(ctx.node.open.value).toBe(false);
    });

    it("registers pointermove listener synchronously with passive: true upon pointerleave", async () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const ctx = await renderHover({ safePolygon: true });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          clientX: 25,
          clientY: 100,
          relatedTarget: document.body,
        }),
      );

      // Synchronously attached without timer ticks
      expect(addEventListenerSpy).toHaveBeenCalledWith("pointermove", expect.any(Function), {
        passive: true,
      });

      addEventListenerSpy.mockRestore();
    });

    it("cleans up blockPointerEvents overlay when clearPolygon is called on re-entry", async () => {
      const ctx = await renderHover({
        safePolygon: { blockPointerEvents: true },
      });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          clientX: 25,
          clientY: 100,
          relatedTarget: document.body,
        }),
      );

      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).not.toBeNull();

      // Re-enter anchor
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).toBeNull();
    });

    it("does not initiate safe polygon when pointer leaves floating element", async () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const ctx = await renderHover({ safePolygon: true });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: document.body,
          clientX: 25,
          clientY: 100,
        }),
      );
      await nextTick();

      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 25, clientY: 110 }));
      await nextTick();

      addEventListenerSpy.mockClear();

      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: document.body,
          clientX: 25,
          clientY: 110,
        }),
      );
      await nextTick();

      // Should not register a document-level pointermove listener for safePolygon
      expect(addEventListenerSpy).not.toHaveBeenCalledWith("pointermove", expect.any(Function), {
        passive: true,
      });
      // Closes according to normal delay rules (immediate when delay is 0)
      expect(ctx.node.open.value).toBe(false);

      addEventListenerSpy.mockRestore();
    });
  });

  describe("lifecycle & cleanup", () => {
    it("removes event listeners on unmount", async () => {
      const ctx = await renderHover();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      await ctx.view.unmount();
      await nextTick();

      ctx.node.open.value = false;

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.node.open.value = true;
      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(true);
    });

    it("cancels scheduled open when anchor element is removed from DOM during open delay", async () => {
      const ctx = await renderHover({ delay: { open: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.advanceTimersByTime(50);
      expect(ctx.node.open.value).toBe(false);

      // Unmount anchor element before delay expires
      ctx.anchorEl.remove();
      await nextTick();

      vi.advanceTimersByTime(60);
      await nextTick();

      expect(ctx.node.open.value).toBe(false);
    });
  });
});
