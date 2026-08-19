import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CreateSafePolygonHandlerContext,
  type Polygon,
  safePolygon,
} from "@/composables/hover/polygon";

const trackedElements: HTMLElement[] = [];

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

function makeMouseEvent(
  type: string,
  opts: Partial<MouseEvent & { relatedTarget: EventTarget | null }> = {},
): MouseEvent {
  return {
    type,
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    target: opts.target ?? document.body,
    relatedTarget: opts.relatedTarget ?? null,
  } as unknown as MouseEvent;
}

type SafePolygonTestContext = CreateSafePolygonHandlerContext & {
  onCloseMock: ReturnType<typeof vi.fn>;
};

function createContext(
  side: "top" | "right" | "bottom" | "left",
  overrides: Partial<CreateSafePolygonHandlerContext> = {},
): SafePolygonTestContext {
  const anchorEl = trackElement(document.createElement("div"));
  const floatingEl = trackElement(document.createElement("div"));
  document.body.appendChild(anchorEl);
  document.body.appendChild(floatingEl);

  const rects: Record<string, [number, number, number, number]> = {
    bottom: [75, 110, 150, 80],
    top: [75, -90, 150, 80],
    right: [210, 10, 150, 80],
    left: [-160, 10, 150, 80],
  };
  const [fx, fy, fw, fh] = (rects[side] ?? rects.bottom)!;

  anchorEl.getBoundingClientRect = () => makeDOMRect(50, 0, 100, 100);
  floatingEl.getBoundingClientRect = () => makeDOMRect(fx, fy, fw, fh);

  const onCloseMock = vi.fn();

  return {
    x: overrides.x ?? 100,
    y: overrides.y ?? 50,
    elements: { domReference: anchorEl, floating: floatingEl },
    buffer: overrides.buffer ?? 1,
    onClose: onCloseMock,
    onCloseMock,
  };
}

describe("safePolygon", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("factory shape", () => {
    it("returns a function (SafePolygon)", () => {
      const result = safePolygon();
      expect(typeof result).toBe("function");
    });

    it("SafePolygon returns a function (SafePolygonHandler) when given context", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon()(ctx);
      expect(typeof handler).toBe("function");
    });

    it("accepts empty options", () => {
      expect(() => safePolygon()).not.toThrow();
      expect(() => safePolygon({})).not.toThrow();
    });
  });

  describe("guard clauses", () => {
    it("returns early when domReference is null", () => {
      const ctx = createContext("bottom");
      ctx.elements.domReference = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("returns early when floating is null", () => {
      const ctx = createContext("bottom");
      ctx.elements.floating = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("returns early when x is null", () => {
      const ctx = createContext("bottom");
      (ctx as any).x = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("returns early when y is null", () => {
      const ctx = createContext("bottom");
      (ctx as any).y = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("pointer over floating element", () => {
    it("does not close when pointer is inside the floating element (non-leave)", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon()(ctx);
      const floatEl = ctx.elements.floating as HTMLElement;

      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatEl,
        }),
      );

      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("sets hasLanded state when pointer enters floating (subsequent leave from floating triggers close)", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon()(ctx);
      const floatEl = ctx.elements.floating as HTMLElement;

      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatEl,
        }),
      );
      handler(
        makeMouseEvent("mouseleave", {
          clientX: 300,
          clientY: 300,
          target: floatEl,
        }),
      );
      vi.runAllTimers();

      expect(ctx.onCloseMock).toHaveBeenCalled();
    });
  });

  describe("pointer over reference element", () => {
    it("does not close when pointer is over reference (non-leave event)", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon()(ctx);
      const refEl = ctx.elements.domReference as HTMLElement;

      handler(
        makeMouseEvent("pointermove", {
          clientX: 80,
          clientY: 50,
          target: refEl,
        }),
      );
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("mouseleave with relatedTarget inside floating", () => {
    it("does not close when leaving to floating element (prevents open-close loop)", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon()(ctx);
      const floatEl = ctx.elements.floating as HTMLElement;

      handler(
        makeMouseEvent("mouseleave", {
          clientX: 100,
          clientY: 105,
          relatedTarget: floatEl,
        }),
      );

      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("opposite-side guard", () => {
    it("closes when pointer leaves opposite floating side=bottom", () => {
      const ctx = createContext("bottom", { y: 1 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: -10 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it("closes when pointer leaves opposite floating side=top", () => {
      const ctx = createContext("top", { y: 99 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 200 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it("closes when pointer leaves opposite floating side=left", () => {
      const ctx = createContext("left", { x: 150 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 300, clientY: 50 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it("closes when pointer leaves opposite floating side=right", () => {
      const ctx = createContext("right", { x: 51 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: -10, clientY: 50 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });
  });

  describe("safe zone hit testing", () => {
    it("keeps open when pointer is within the safe polygon below the anchor", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("closes when pointer is outside all safe zones", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    for (const side of ["top", "bottom", "left", "right"] as const) {
      it(`builds safe zones for floating side="${side}"`, () => {
        const ctx = createContext(side, { x: 100, y: 50 });
        const handler = safePolygon({ requireIntent: false })(ctx);

        handler(makeMouseEvent("pointermove", { clientX: 900, clientY: 900 }));
        expect(ctx.onCloseMock).toHaveBeenCalled();
      });
    }
  });

  describe("onPolygonChange callback", () => {
    it("invokes onPolygonChange with polygon vertices on each move", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false, onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));

      expect(onPolygonChange).toHaveBeenCalledTimes(1);
      const polygon: Polygon = onPolygonChange.mock.calls[0]![0] as Polygon;
      expect(Array.isArray(polygon)).toBe(true);
      expect(polygon.length).toBeGreaterThanOrEqual(4);
      for (const pt of polygon) {
        expect(pt).toHaveLength(2);
        expect(typeof pt[0]).toBe("number");
        expect(typeof pt[1]).toBe("number");
      }
    });

    it("is not called when guard clauses return early", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom");
      ctx.elements.domReference = null;
      const handler = safePolygon({ onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(onPolygonChange).not.toHaveBeenCalled();
    });
  });

  describe("intent detection (requireIntent)", () => {
    it("schedules a close when cursor speed is very slow (default requireIntent=true)", () => {
      let now = 1000;
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      now += 5000;

      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109.01 }));

      vi.advanceTimersByTime(40);
      expect(ctx.onCloseMock).toHaveBeenCalled();
      perfSpy.mockRestore();
    });

    it("does not schedule close when requireIntent is false", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      vi.advanceTimersByTime(1000);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }));
      vi.advanceTimersByTime(100);

      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("does not schedule close after hasLanded (pointer visited floating)", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon()(ctx);
      const floatEl = ctx.elements.floating as HTMLElement;

      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatEl,
        }),
      );

      vi.advanceTimersByTime(1000);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      vi.advanceTimersByTime(1000);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }));
      vi.advanceTimersByTime(100);

      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("timer management", () => {
    it("clears previous timeout on each new mousemove", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      vi.advanceTimersByTime(1000);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }));

      vi.advanceTimersByTime(10);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 106 }));

      vi.advanceTimersByTime(100);
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("buffer option", () => {
    it("uses default buffer of 1 when not specified", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom", { x: 100, y: 99 });
      ctx.buffer = 1;
      const handler = safePolygon({ requireIntent: false, onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      const poly1: Polygon = onPolygonChange.mock.calls[0]![0] as Polygon;

      const onPolygonChange2 = vi.fn();
      const ctx2 = createContext("bottom", { x: 100, y: 99 });
      ctx2.buffer = 10;
      const handler2 = safePolygon({
        requireIntent: false,
        onPolygonChange: onPolygonChange2,
      })(ctx2);

      handler2(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      const poly2: Polygon = onPolygonChange2.mock.calls[0]![0] as Polygon;

      expect(poly1).not.toEqual(poly2);
    });
  });

  describe("closure isolation", () => {
    it("separate safePolygon() calls have independent state", () => {
      const sp1 = safePolygon({ requireIntent: false });
      const sp2 = safePolygon({ requireIntent: false });

      const ctx1 = createContext("bottom", { x: 100, y: 99 });
      const ctx2 = createContext("bottom", { x: 100, y: 99 });
      const handler1 = sp1(ctx1);
      const handler2 = sp2(ctx2);

      handler1(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }));
      expect(ctx1.onCloseMock).toHaveBeenCalled();
      expect(ctx2.onCloseMock).not.toHaveBeenCalled();

      handler2(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }));
      expect(ctx2.onCloseMock).toHaveBeenCalled();
    });
  });

  describe("rectangular trough", () => {
    it.each([
      ["top", 100, 1, 100, -5],
      ["right", 149, 50, 180, 50],
      ["bottom", 100, 99, 100, 105],
      ["left", 51, 50, 20, 50],
    ] as const)(
      "keeps open in the gap when the floating side is inferred as %s",
      (side, x, y, clientX, clientY) => {
        const ctx = createContext(side, { x, y });
        const handler = safePolygon({ requireIntent: false })(ctx);

        handler(makeMouseEvent("pointermove", { clientX, clientY }));
        expect(ctx.onCloseMock).not.toHaveBeenCalled();
      },
    );
  });

  describe("hasLanded and pointer outside ref", () => {
    it("closes when pointer has landed on floating, then moves outside both safe zones and ref rect", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);
      const floatEl = ctx.elements.floating as HTMLElement;

      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatEl,
        }),
      );

      handler(makeMouseEvent("pointermove", { clientX: 900, clientY: 900 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });
  });
});
