import type { Strategy } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref } from "vue";
import type { FloatingContext } from "@/composables";
import { type UseHoverOptions, useFloatingContext, useHover } from "@/composables";

const trackedElements: HTMLElement[] = [];
const activeScopes: ReturnType<typeof effectScope>[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }
  trackedElements.length = 0;
}

function makePointerEvent(
  type: string,
  opts: Partial<PointerEventInit & { relatedTarget?: EventTarget | null }> = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType: "mouse",
    ...opts,
  } as PointerEventInit);
}

function makeDOMRect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    right: x + w,
    bottom: y + h,
    left: x,
    toJSON() {},
  } as DOMRect;
}

type HoverTestContext = {
  anchorEl: HTMLDivElement;
  floatingEl: HTMLDivElement;
  context: FloatingContext;
  scope: ReturnType<typeof effectScope>;
  setOpen: ReturnType<typeof vi.fn>;
};

async function createHoverContext(options: UseHoverOptions = {}): Promise<HoverTestContext> {
  const anchorEl = trackElement(document.createElement("div"));
  const floatingEl = trackElement(document.createElement("div"));

  anchorEl.getBoundingClientRect = () => makeDOMRect(0, 0, 100, 100);
  floatingEl.getBoundingClientRect = () => makeDOMRect(0, 110, 50, 50);

  document.body.appendChild(anchorEl);
  document.body.appendChild(floatingEl);

  const open = ref(false);
  const setOpen = vi.fn((val: boolean) => {
    open.value = val;
  });

  const context = {
    refs: {
      anchorEl: ref(anchorEl),
      floatingEl: ref(floatingEl),
      arrowEl: ref(null),
    },
    state: {
      open,
      setOpen,
    },
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
  } as unknown as FloatingContext;

  const scope = effectScope();
  activeScopes.push(scope);
  scope.run(() => {
    useHover(context, options);
  });

  await nextTick();
  await nextTick();

  return {
    anchorEl,
    floatingEl,
    context,
    scope,
    setOpen,
  };
}

describe("useHover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }
    activeScopes.length = 0;
    clearTrackedElements();
    await nextTick();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("core functionality", () => {
    it("opens when pointer enters reference element", async () => {
      const ctx = await createHoverContext();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.setOpen).toHaveBeenCalledWith(true, "hover", expect.any(Event));
    });

    it("closes when pointer leaves reference element", async () => {
      const ctx = await createHoverContext();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
      expect(ctx.setOpen).toHaveBeenCalledWith(false, "hover", expect.any(Event));
    });

    it("does not close immediately if pointer moves from reference to floating element", async () => {
      const ctx = await createHoverContext({ delay: 10 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
    });

    it("attaches/reattaches listeners when element refs change", async () => {
      const ctx = await createHoverContext();
      const oldRef = ctx.anchorEl;

      ctx.context.refs.anchorEl.value = null;
      await nextTick();

      oldRef.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      const newRef = trackElement(document.createElement("div"));
      document.body.appendChild(newRef);
      ctx.context.refs.anchorEl.value = newRef;
      await nextTick();

      newRef.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("disables functionality when enabled becomes false", async () => {
      const enabled = ref(true);
      const ctx = await createHoverContext({ enabled });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      enabled.value = false;
      await nextTick();

      ctx.context.state.setOpen(false);
      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  describe("delay configuration", () => {
    it("respects delay.open (object notation)", async () => {
      const ctx = await createHoverContext({ delay: { open: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(99);
      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("respects delay.close (object notation)", async () => {
      const ctx = await createHoverContext({ delay: { close: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      vi.advanceTimersByTime(99);
      expect(ctx.context.state.open.value).toBe(true);
      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("respects delay (number notation) for both open and close", async () => {
      const ctx = await createHoverContext({ delay: 150 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(150);
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);
      vi.advanceTimersByTime(150);
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  describe("ignorePointerLeave predicate", () => {
    it("keeps the parent open when the pointer leaves into an ignored element", async () => {
      const anchorEl = trackElement(document.createElement("div"));
      const floatingEl = trackElement(document.createElement("div"));
      const ignoredEl = trackElement(document.createElement("div"));

      anchorEl.getBoundingClientRect = () => makeDOMRect(0, 0, 100, 100);
      floatingEl.getBoundingClientRect = () => makeDOMRect(0, 110, 50, 50);

      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      document.body.appendChild(ignoredEl);

      const open = ref(false);
      const setOpen = vi.fn((val: boolean) => {
        open.value = val;
      });

      const scope = effectScope();
      activeScopes.push(scope);
      let rootContext!: FloatingContext;
      scope.run(() => {
        rootContext = {
          refs: {
            anchorEl: ref(anchorEl),
            floatingEl: ref(floatingEl),
            arrowEl: ref(null),
          },
          state: {
            open,
            setOpen,
          },
          position: {
            placement: ref("bottom"),
            strategy: ref("absolute"),
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
        } as unknown as FloatingContext;

        useHover(rootContext, {
          ignorePointerLeave: (target) => target === ignoredEl,
        });
      });

      await nextTick();
      await nextTick();

      anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();

      expect(rootContext.state.open.value).toBe(true);

      anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: ignoredEl,
          clientX: 15,
          clientY: 15,
        }),
      );
      await nextTick();

      expect(rootContext.state.open.value).toBe(true);
    });
  });

  describe("parent-linked contexts", () => {
    it("keeps a parent open when the pointer leaves into a child floating element", async () => {
      const parentAnchorEl = trackElement(document.createElement("div"));
      const parentFloatingEl = trackElement(document.createElement("div"));
      const childAnchorEl = trackElement(document.createElement("div"));
      const childFloatingEl = trackElement(document.createElement("div"));
      document.body.appendChild(parentAnchorEl);
      document.body.appendChild(parentFloatingEl);
      document.body.appendChild(childAnchorEl);
      document.body.appendChild(childFloatingEl);

      const parentOpen = ref(false);
      const childOpen = ref(true);
      const scope = effectScope();
      activeScopes.push(scope);
      let parentContext!: FloatingContext;

      scope.run(() => {
        parentContext = useFloatingContext({
          anchorEl: ref(parentAnchorEl),
          floatingEl: ref(parentFloatingEl),
          open: parentOpen,
        });
        useFloatingContext({
          anchorEl: ref(childAnchorEl),
          floatingEl: ref(childFloatingEl),
          parentContext,
          open: childOpen,
        });

        useHover(parentContext);
      });

      await nextTick();
      parentAnchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(parentContext.state.open.value).toBe(true);

      parentAnchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: childFloatingEl,
        }),
      );
      await nextTick();

      expect(parentContext.state.open.value).toBe(true);
    });

    it("closes a child when the pointer leaves into the parent floating element", async () => {
      const parentAnchorEl = trackElement(document.createElement("div"));
      const parentFloatingEl = trackElement(document.createElement("div"));
      const childAnchorEl = trackElement(document.createElement("div"));
      const childFloatingEl = trackElement(document.createElement("div"));
      document.body.appendChild(parentAnchorEl);
      document.body.appendChild(parentFloatingEl);
      document.body.appendChild(childAnchorEl);
      document.body.appendChild(childFloatingEl);

      const parentOpen = ref(true);
      const childOpen = ref(false);
      const scope = effectScope();
      activeScopes.push(scope);
      let childContext!: FloatingContext;

      scope.run(() => {
        const parentContext = useFloatingContext({
          anchorEl: ref(parentAnchorEl),
          floatingEl: ref(parentFloatingEl),
          open: parentOpen,
        });
        childContext = useFloatingContext({
          anchorEl: ref(childAnchorEl),
          floatingEl: ref(childFloatingEl),
          parentContext,
          open: childOpen,
        });

        useHover(childContext);
      });

      await nextTick();
      childAnchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(childContext.state.open.value).toBe(true);

      childAnchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: parentFloatingEl,
        }),
      );
      await nextTick();

      expect(childContext.state.open.value).toBe(false);
    });
  });

  describe("rest period (restMs)", () => {
    it("waits for restMs before opening if pointer rests", async () => {
      const ctx = await createHoverContext({ restMs: 50 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(49);
      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("resets rest timer if pointer moves significantly before restMs expires", async () => {
      const ctx = await createHoverContext({ restMs: 50 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(25);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointermove", { clientX: 30, clientY: 10 }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(30);
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(20);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("cancels rest period timer if pointer leaves before restMs expires", async () => {
      const ctx = await createHoverContext({ restMs: 50 });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();

      vi.advanceTimersByTime(30);
      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      vi.advanceTimersByTime(100);
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("ignores restMs if delay.open is greater than 0", async () => {
      const ctx = await createHoverContext({
        delay: { open: 100 },
        restMs: 50,
      });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(99);
      expect(ctx.context.state.open.value).toBe(true);
    });
  });

  describe("mouse-only mode (mouseOnly)", () => {
    it("ignores non-mouse pointer types when mouseOnly is true", async () => {
      const ctx = await createHoverContext({ mouseOnly: true });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "touch" }));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "pen" }));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "mouse" }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          pointerType: "touch",
          relatedTarget: document.body,
        }),
      );
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          pointerType: "mouse",
          relatedTarget: document.body,
        }),
      );
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  describe("edge case handling", () => {
    it("cancels pending open delay if pointer leaves reference", async () => {
      const ctx = await createHoverContext({ delay: { open: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(50);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      vi.runAllTimers();

      expect(ctx.context.state.open.value).toBe(false);
    });

    it("cancels pending close delay if pointer re-enters reference", async () => {
      const ctx = await createHoverContext({ delay: { close: 100 } });

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

      expect(ctx.context.state.open.value).toBe(true);
    });

    it("closes (respecting delay) if pointer leaves floating element", async () => {
      const ctx = await createHoverContext({ delay: { close: 100 } });

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(150);
      expect(ctx.context.state.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      vi.advanceTimersByTime(99);
      expect(ctx.context.state.open.value).toBe(true);
      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("reacts to external state changes", async () => {
      const ctx = await createHoverContext();

      ctx.context.state.setOpen(true);
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.context.state.setOpen(false);
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      ctx.anchorEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  describe("safePolygon behavior", () => {
    it("keeps open when leaving reference towards floating with safePolygon enabled", async () => {
      const ctx = await createHoverContext({ safePolygon: true });

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

      expect(ctx.context.state.open.value).toBe(true);

      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 25, clientY: 105 }));
      vi.advanceTimersByTime(20);
      expect(ctx.context.state.open.value).toBe(true);

      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 25, clientY: 110 }));
      expect(ctx.context.state.open.value).toBe(true);

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

      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  describe("lifecycle & cleanup", () => {
    it("removes event listeners on cleanup (simulated unmount)", async () => {
      const ctx = await createHoverContext();

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.scope.stop();
      await nextTick();

      ctx.context.state.setOpen(false);

      ctx.anchorEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      ctx.context.state.setOpen(true);
      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);
    });
  });
});
