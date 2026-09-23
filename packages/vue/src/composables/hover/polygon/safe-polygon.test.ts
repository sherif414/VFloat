import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CreateSafePolygonHandlerContext,
  type Polygon,
  safePolygon,
} from "@/composables/hover/polygon";
import { makeDOMRect } from "@/test-utils";

// Deliberately local: fabricates `target`/`relatedTarget` per call, which real
// MouseEvents cannot do. For dispatchable events use the shared builder instead.
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

const cleanupElements: HTMLElement[] = [];

function createContext(
  side: "top" | "right" | "bottom" | "left",
  overrides: Partial<CreateSafePolygonHandlerContext> = {},
): SafePolygonTestContext {
  const anchorEl = document.createElement("div");
  const floatingEl = document.createElement("div");
  document.body.appendChild(anchorEl);
  document.body.appendChild(floatingEl);
  cleanupElements.push(anchorEl, floatingEl);

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

describe("Feature: safePolygon hover corridor protection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const el of cleanupElements) {
      el.remove();
    }
    cleanupElements.length = 0;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Handler instantiation and contract validation", () => {
    it("Given factory invocation, When initialized without arguments, Then SafePolygon function is returned", () => {
      const result = safePolygon();
      expect(typeof result).toBe("function");
    });

    it("Given a valid context, When SafePolygon is invoked, Then a pointer event handler function is returned", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon()(ctx);
      expect(typeof handler).toBe("function");
    });

    it("Given empty options or undefined, When invoked, Then default options are accepted without throwing", () => {
      expect(() => safePolygon()).not.toThrow();
      expect(() => safePolygon({})).not.toThrow();
    });
  });

  describe("Scenario: Input guard clauses and null safety", () => {
    it("Given missing domReference element, When pointermove occurs, Then handler exits early without triggering close", () => {
      const ctx = createContext("bottom");
      ctx.elements.domReference = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("Given missing floating element, When pointermove occurs, Then handler exits early without triggering close", () => {
      const ctx = createContext("bottom");
      ctx.elements.floating = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("Given null x coordinate in context, When pointermove occurs, Then handler exits early without triggering close", () => {
      const ctx = createContext("bottom");
      (ctx as any).x = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("Given null y coordinate in context, When pointermove occurs, Then handler exits early without triggering close", () => {
      const ctx = createContext("bottom");
      (ctx as any).y = null;
      const handler = safePolygon()(ctx);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Pointer interactions over floating element", () => {
    it("Given pointer is inside the floating element, When pointermove occurs, Then close is not triggered", () => {
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

    it("Given pointer has entered floating element, When mouseleave subsequent to landing occurs, Then close is scheduled", () => {
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

  describe("Scenario: Pointer interactions over reference element", () => {
    it("Given pointer is over reference element, When pointermove occurs, Then close is not triggered", () => {
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

  describe("Scenario: Mouseleave transition into floating target", () => {
    it("Given mouseleave event targeting floating element as relatedTarget, When dispatched, Then close is prevented", () => {
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

  describe("Scenario: Opposite-side boundary breach detection", () => {
    it("Given floating element below reference, When pointer moves in opposite direction above reference, Then close is triggered", () => {
      const ctx = createContext("bottom", { y: 1 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: -10 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it("Given floating element above reference, When pointer moves in opposite direction below reference, Then close is triggered", () => {
      const ctx = createContext("top", { y: 99 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 200 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it("Given floating element to the left, When pointer moves in opposite direction to the right, Then close is triggered", () => {
      const ctx = createContext("left", { x: 150 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 300, clientY: 50 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it("Given floating element to the right, When pointer moves in opposite direction to the left, Then close is triggered", () => {
      const ctx = createContext("right", { x: 51 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: -10, clientY: 50 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });
  });

  describe("Scenario: Safe zone hit testing across placements", () => {
    it("Given pointer is within safe polygon buffer corridor, When moving toward floating element, Then floating element remains open", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("Given pointer leaves all safe zone corridors, When moving away, Then close is triggered", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
    });

    it.each(["top", "bottom", "left", "right"] as const)(
      "Given floating side '%s', When pointer moves far outside, Then close is triggered",
      (side) => {
        const ctx = createContext(side, { x: 100, y: 50 });
        const handler = safePolygon({ requireIntent: false })(ctx);

        handler(makeMouseEvent("pointermove", { clientX: 900, clientY: 900 }));
        expect(ctx.onCloseMock).toHaveBeenCalled();
      },
    );
  });

  describe("Scenario: Polygon vertices observer notification", () => {
    it("Given an onPolygonChange callback, When pointer moves, Then updated polygon vertices are emitted", () => {
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

    it("Given incomplete context geometry, When guard clause triggers, Then onPolygonChange is not invoked", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom");
      ctx.elements.domReference = null;
      const handler = safePolygon({ onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(onPolygonChange).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Intent detection and speed-based deceleration handling", () => {
    it("Given requireIntent is enabled, When cursor decelerates to slow speed within corridor, Then close timeout is scheduled", () => {
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

    it("Given custom intentTimeout, When cursor decelerates, Then custom delay is respected before closing", () => {
      let now = 1000;
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ intentTimeout: 120 })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      now += 5000;
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109.01 }));

      vi.advanceTimersByTime(40);
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(80);
      expect(ctx.onCloseMock).toHaveBeenCalled();
      perfSpy.mockRestore();
    });

    it("Given requireIntent is false, When cursor stops or decelerates, Then close is not scheduled", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      vi.advanceTimersByTime(1000);
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }));
      vi.advanceTimersByTime(100);

      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });

    it("Given pointer has landed on floating element, When cursor decelerates, Then close is not scheduled", () => {
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

  describe("Scenario: Timer management and continuous motion debounce", () => {
    it("Given continuous cursor motion, When subsequent moves occur, Then prior close timeouts are cancelled", () => {
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

  describe("Scenario: Corridor buffer expansion", () => {
    it("Given different buffer values, When constructing polygon, Then buffer expands polygon boundary coordinates", () => {
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

  describe("Scenario: Instance isolation across multiple safe polygons", () => {
    it("Given multiple independent safePolygon instances, When one triggers close, Then the other instance state is isolated", () => {
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

  describe("Scenario: Rectangular trough corridor between reference and floating gaps", () => {
    it.each([
      ["top", 100, 1, 100, -5],
      ["right", 149, 50, 180, 50],
      ["bottom", 100, 99, 100, 105],
      ["left", 51, 50, 20, 50],
    ] as const)(
      "Given side is '%s', When pointer is in intermediate gap trough, Then floating element remains open",
      (side, x, y, clientX, clientY) => {
        const ctx = createContext(side, { x, y });
        const handler = safePolygon({ requireIntent: false })(ctx);

        handler(makeMouseEvent("pointermove", { clientX, clientY }));
        expect(ctx.onCloseMock).not.toHaveBeenCalled();
      },
    );
  });

  describe("Scenario: Pointer event blocking overlay management", () => {
    it("Given blockPointerEvents is false by default, When initialized, Then no overlay DOM element is created", () => {
      const ctx = createContext("bottom");
      safePolygon()(ctx);

      const overlay = document.querySelector("[data-vfloat-safe-polygon-overlay]");
      expect(overlay).toBeNull();
    });

    it("Given blockPointerEvents is true, When initialized, Then fixed overlay element is mounted and cleans up on dispose", () => {
      const ctx = createContext("bottom");
      const handler = safePolygon({ blockPointerEvents: true })(ctx);

      const overlay = document.querySelector(
        "[data-vfloat-safe-polygon-overlay]",
      ) as HTMLElement | null;
      expect(overlay).not.toBeNull();
      expect(overlay?.style.position).toBe("fixed");
      expect(overlay?.style.zIndex).toBe("2147483647");

      handler.cleanup?.();
      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).toBeNull();
    });

    it("Given an active overlay, When close is triggered, Then overlay element is removed from DOM", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ blockPointerEvents: true, requireIntent: false })(ctx);

      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).not.toBeNull();

      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }));
      expect(ctx.onCloseMock).toHaveBeenCalled();
      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).toBeNull();
    });

    it("Given an active overlay, When cursor lands on floating element, Then overlay element is immediately cleaned up", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ blockPointerEvents: true, requireIntent: false })(ctx);

      const floatEl = ctx.elements.floating as HTMLElement;
      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).not.toBeNull();

      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatEl,
        }),
      );

      expect(document.querySelector("[data-vfloat-safe-polygon-overlay]")).toBeNull();
    });
  });

  describe("Scenario: Layout measurement caching and throttling", () => {
    it("Given rapid pointer movements, When inspected within 16ms, Then getBoundingClientRect is throttled and cached", () => {
      let now = 1000;
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

      const ctx = createContext("bottom", { x: 100, y: 99 });
      const anchorEl = ctx.elements.domReference as HTMLElement;
      const floatingEl = ctx.elements.floating as HTMLElement;

      const anchorRectSpy = vi.spyOn(anchorEl, "getBoundingClientRect");
      const floatingRectSpy = vi.spyOn(floatingEl, "getBoundingClientRect");

      const handler = safePolygon({ requireIntent: false })(ctx);

      // First event: initial rect measurements
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(anchorRectSpy).toHaveBeenCalledTimes(1);
      expect(floatingRectSpy).toHaveBeenCalledTimes(1);

      // Rapid move within 16ms: reuses cached rects
      now += 8;
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 106 }));
      expect(anchorRectSpy).toHaveBeenCalledTimes(1);
      expect(floatingRectSpy).toHaveBeenCalledTimes(1);

      // Move after > 16ms: refreshes rect measurements
      now += 20;
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 107 }));
      expect(anchorRectSpy).toHaveBeenCalledTimes(2);
      expect(floatingRectSpy).toHaveBeenCalledTimes(2);

      perfSpy.mockRestore();
    });
  });

  describe("Scenario: Landing state transitions and exit detection", () => {
    it("Given pointer has landed on floating element, When pointer subsequently moves outside safe zones and reference, Then close is triggered", () => {
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
