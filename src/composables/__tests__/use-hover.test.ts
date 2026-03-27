import type { Strategy } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { computed, effectScope, nextTick, ref } from "vue";
import { type UseHoverOptions, useHover } from "@/composables/interactions";
import type { FloatingContext } from "../positioning/use-floating";

// ─── Test Helpers ────────────────────────────────────────────────────────────

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
  referenceEl: HTMLDivElement;
  floatingEl: HTMLDivElement;
  context: FloatingContext;
  scope: ReturnType<typeof effectScope>;
  setOpen: ReturnType<typeof vi.fn>;
  cleanup: () => void;
};

// Track contexts for cleanup - but register at creation time to ensure cleanup always happens
const activeContexts = new Set<HoverTestContext>();

async function createHoverContext(options: UseHoverOptions = {}): Promise<HoverTestContext> {
  const referenceEl = document.createElement("div");
  const floatingEl = document.createElement("div");

  referenceEl.getBoundingClientRect = () => makeDOMRect(0, 0, 100, 100);
  floatingEl.getBoundingClientRect = () => makeDOMRect(0, 110, 50, 50);

  document.body.appendChild(referenceEl);
  document.body.appendChild(floatingEl);

  const open = ref(false);
  const setOpen = vi.fn((val: boolean) => {
    open.value = val;
  });

  // Mock standard FloatingContext
  const context = {
    refs: {
      anchorEl: ref(referenceEl),
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
      styles: computed(() => ({ position: "absolute", top: "0px", left: "0px" })),
    },
  } as unknown as FloatingContext;

  const scope = effectScope();
  scope.run(() => {
    useHover(context, options);
  });

  // Wait for watchPostEffect to attach event listeners
  await nextTick();
  await nextTick();

  const cleanup = () => {
    scope.stop();
    if (referenceEl.parentNode) referenceEl.remove();
    if (floatingEl.parentNode) floatingEl.remove();
    activeContexts.delete(ctx);
  };

  const ctx: HoverTestContext = { referenceEl, floatingEl, context, scope, setOpen, cleanup };
  // Register cleanup at creation time, not at the end
  activeContexts.add(ctx);
  return ctx;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useHover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    // Clean up all registered contexts
    for (const ctx of activeContexts) {
      ctx.cleanup();
    }
    // Verify cleanup happened
    activeContexts.clear();
    await nextTick();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Core Functionality ───────────────────────────────────────────────────

  describe("core functionality", () => {
    it("opens when pointer enters reference element", async () => {
      const ctx = await createHoverContext();

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.setOpen).toHaveBeenCalledWith(true, "hover", expect.any(Event));
    });

    it("closes when pointer leaves reference element", async () => {
      const ctx = await createHoverContext();

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      // leaves to body
      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
      expect(ctx.setOpen).toHaveBeenCalledWith(false, "hover", expect.any(Event));
    });

    it("does NOT close immediately if pointer moves from reference to floating element", async () => {
      // delay helps us check timer logic, but even without delay, pointer leave is handled
      const ctx = await createHoverContext({ delay: 10 });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      // Leave ref towards floating
      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: ctx.floatingEl }),
      );
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);

      // Leave floating to body
      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
    });

    it("attaches/reattaches listeners when element refs change", async () => {
      const ctx = await createHoverContext();
      const oldRef = ctx.referenceEl;

      // Detach old
      ctx.context.refs.anchorEl.value = null;
      await nextTick();

      oldRef.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      // Attach new
      const newRef = document.createElement("div");
      document.body.appendChild(newRef);
      ctx.context.refs.anchorEl.value = newRef;
      await nextTick();

      newRef.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      newRef.remove();
    });

    it("disables functionality when enabled becomes false", async () => {
      const enabled = ref(true);
      const ctx = await createHoverContext({ enabled });

      // verify initial
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      // toggle off
      enabled.value = false;
      await nextTick();

      ctx.context.state.setOpen(false); // reset
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  // ── Delay Configuration ──────────────────────────────────────────────────

  describe("delay configuration", () => {
    it("respects delay.open (object notation)", async () => {
      const ctx = await createHoverContext({ delay: { open: 100 } });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(99);
      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("respects delay.close (object notation)", async () => {
      const ctx = await createHoverContext({ delay: { close: 100 } });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.referenceEl.dispatchEvent(
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

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(150);
      expect(ctx.context.state.open.value).toBe(true);

      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);
      vi.advanceTimersByTime(150);
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  // ── Rest Period (restMs) ─────────────────────────────────────────────────

  describe("rest period (restMs)", () => {
    it("waits for restMs before opening if pointer rests", async () => {
      const ctx = await createHoverContext({ restMs: 50 });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(49);
      expect(ctx.context.state.open.value).toBe(false);
      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("resets rest timer if pointer moves significantly before restMs expires", async () => {
      const ctx = await createHoverContext({ restMs: 50 });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(25);

      // move significantly > threshold (10px)
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointermove", { clientX: 30, clientY: 10 }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      // previous timer finishes but should be cancelled
      vi.advanceTimersByTime(30);
      expect(ctx.context.state.open.value).toBe(false);

      // full 50ms from move
      vi.advanceTimersByTime(20);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("cancels rest period timer if pointer leaves before restMs expires", async () => {
      const ctx = await createHoverContext({ restMs: 50 });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 10, clientY: 10 }));
      await nextTick();

      vi.advanceTimersByTime(30);
      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();

      vi.advanceTimersByTime(100);
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("ignores restMs if delay.open is greater than 0", async () => {
      const ctx = await createHoverContext({ delay: { open: 100 }, restMs: 50 });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      vi.advanceTimersByTime(1);
      expect(ctx.context.state.open.value).toBe(false);

      vi.advanceTimersByTime(99);
      expect(ctx.context.state.open.value).toBe(true);
    });
  });

  // ── Mouse-only Mode (mouseOnly) ──────────────────────────────────────────

  describe("mouse-only mode (mouseOnly)", () => {
    it("ignores non-mouse pointer types when mouseOnly is true", async () => {
      const ctx = await createHoverContext({ mouseOnly: true });

      // Touch enter
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "touch" }));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      // Pen enter
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "pen" }));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      // Mouse enter (valid)
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter", { pointerType: "mouse" }));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      // Touch leave (ignored)
      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { pointerType: "touch", relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      // Mouse leave (valid)
      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { pointerType: "mouse", relatedTarget: document.body }),
      );
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  // ── Edge Cases & External State ──────────────────────────────────────────

  describe("edge case handling", () => {
    it("cancels pending open delay if pointer leaves reference", async () => {
      const ctx = await createHoverContext({ delay: { open: 100 } });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(50);

      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      vi.runAllTimers();

      expect(ctx.context.state.open.value).toBe(false);
    });

    it("cancels pending close delay if pointer re-enters reference", async () => {
      const ctx = await createHoverContext({ delay: { close: 100 } });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      vi.advanceTimersByTime(50);

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      vi.advanceTimersByTime(100);

      expect(ctx.context.state.open.value).toBe(true);
    });

    it("closes (respecting delay) if pointer leaves floating element", async () => {
      const ctx = await createHoverContext({ delay: { close: 100 } });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      ctx.referenceEl.dispatchEvent(
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

      // hover while open
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      // external close
      ctx.context.state.setOpen(false);
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      // leave while closed
      ctx.referenceEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  // ── safePolygon Behavior ─────────────────────────────────────────────────

  describe("safePolygon behavior", () => {
    it("keeps open when leaving reference towards floating with safePolygon enabled", async () => {
      const ctx = await createHoverContext({ safePolygon: true });

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();

      // Leave reference towards safe polygon
      const leaveEvt = makePointerEvent("pointerleave", {
        clientX: 25,
        clientY: 100, // right on edge towards floating
        relatedTarget: document.body, // simulating leaving to space between elements
      });
      ctx.referenceEl.dispatchEvent(leaveEvt);

      // wait for safePolygon setTimeout(..., 0) to attach listener
      vi.advanceTimersByTime(0);
      await nextTick();

      expect(ctx.context.state.open.value).toBe(true);

      // Move inside polygon towards floating
      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 25, clientY: 105 }));
      vi.advanceTimersByTime(20);
      expect(ctx.context.state.open.value).toBe(true);

      // Enter floating
      ctx.floatingEl.dispatchEvent(makePointerEvent("pointerenter", { clientX: 25, clientY: 110 }));
      expect(ctx.context.state.open.value).toBe(true);

      // Leave floating and move completely outside
      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", {
          relatedTarget: document.body,
          clientX: 25,
          clientY: 110,
        }),
      );

      // Let the setTimeout delay in use-hover to execute and register safePolygon listener
      vi.advanceTimersByTime(0);
      await nextTick();

      document.dispatchEvent(makePointerEvent("pointermove", { clientX: 500, clientY: 500 }));

      vi.runAllTimers();
      await nextTick();

      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  // ── Lifecycle & Cleanup ──────────────────────────────────────────────────

  describe("lifecycle & cleanup", () => {
    it("removes event listeners on cleanup (simulated unmount)", async () => {
      const ctx = await createHoverContext();

      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true);

      // Stop effect scope
      ctx.scope.stop();
      await nextTick();

      ctx.context.state.setOpen(false);

      // Listener shouldn't trigger anymore
      ctx.referenceEl.dispatchEvent(makePointerEvent("pointerenter"));
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(false);

      ctx.context.state.setOpen(true);
      ctx.floatingEl.dispatchEvent(
        makePointerEvent("pointerleave", { relatedTarget: document.body }),
      );
      vi.runAllTimers();
      await nextTick();
      expect(ctx.context.state.open.value).toBe(true); // stayed true because leave didn't fire hide
    });
  });
});
