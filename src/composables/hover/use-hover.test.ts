import type { Strategy } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
} from "vue";
import type { FloatingNode } from "@/composables";
import { type UseHoverOptions, useFloatingNode, useFloatingTree, useHover } from "@/composables";
import { getTestEl, makePointerEvent, stubElementRect } from "@/test-utils";

interface FixtureConfig {
  withIgnored?: boolean;
}

function createTestComponent(options: UseHoverOptions = {}, config: FixtureConfig = {}) {
  const open = ref(false);
  const setOpen = vi.fn((val: boolean) => {
    open.value = val;
  });
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorTemplateEl = useTemplateRef<HTMLDivElement>("anchor");
    const floatingEl = useTemplateRef<HTMLDivElement>("floating");
    // Writable mirror of the template ref so tests can reassign the anchor
    // and verify listener reattachment. Synced on mount before any dispatch.
    const anchorRef = shallowRef<HTMLDivElement | null>(null);

    node = {
      refs: {
        anchorEl: anchorRef,
        floatingEl,
        arrowEl: ref(null),
      },
      open,
      setOpen,
      position: {
        placement: ref("bottom"),
        strategy: ref("absolute" as Strategy),
        middlewareData: ref({}),
        x: ref(0),
        y: ref(0),
        isPositioned: ref(true),
        update: vi.fn(),
        styles: computed(() => ({
          position: "absolute",
          top: "0px",
          left: "0px",
        })),
      },
    } as unknown as FloatingNode;

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

  return { Component, getNode: () => node, open, setOpen };
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

    const tree = useFloatingTree();
    const parentNode = useFloatingNode({
      anchorEl: parentAnchorEl,
      floatingEl: parentFloatingEl,
      open: parentOpen,
    });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
    });
    tree.addNode(parentNode);
    tree.addNode(childNode, parentNode.id);

    useHover(target === "parent" ? parentNode : childNode, { tree });

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
    setOpen: fixture.setOpen,
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
      expect(ctx.setOpen).toHaveBeenCalledWith(true, "hover", expect.any(Event));
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
      expect(ctx.setOpen).toHaveBeenCalledWith(false, "hover", expect.any(Event));
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

      ctx.node.setOpen(false);
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

    it("ignores restMs if delay.open is greater than 0", async () => {
      const ctx = await renderHover({
        delay: { open: 100 },
        restMs: 50,
      });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      vi.advanceTimersByTime(1);
      expect(ctx.node.open.value).toBe(false);

      vi.advanceTimersByTime(99);
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

      ctx.node.setOpen(true);
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      ctx.node.setOpen(false);
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
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
  });

  describe("lifecycle & cleanup", () => {
    it("removes event listeners on unmount", async () => {
      const ctx = await renderHover();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.node.open.value).toBe(true);

      await ctx.view.unmount();
      await nextTick();

      ctx.node.setOpen(false);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.node.open.value).toBe(false);

      ctx.node.setOpen(true);
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
      expect(ctx.setOpen).not.toHaveBeenCalledWith(true, "hover", expect.anything());
    });
  });
});
