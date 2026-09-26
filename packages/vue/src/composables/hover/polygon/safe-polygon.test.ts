import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CreateSafePolygonHandlerContext,
  type Polygon,
  safePolygon,
  type SafePolygonHandler,
  type SafePolygonOptions,
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
const cleanupHandlers: SafePolygonHandler[] = [];

/**
 * Builds a handler and registers it for teardown. Shielded handlers mutate
 * `document.body`, so a leaked shield would bleed into unrelated tests.
 */
function createHandler(
  options: SafePolygonOptions,
  ctx: CreateSafePolygonHandlerContext,
): SafePolygonHandler {
  const handler = safePolygon(options)(ctx);
  cleanupHandlers.push(handler);
  return handler;
}

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
    buffer: "buffer" in overrides ? overrides.buffer : 1,
    onClose: onCloseMock,
    onCloseMock,
    hasOpenChild: overrides.hasOpenChild,
    side: overrides.side,
  };
}

describe("Feature: safePolygon hover corridor protection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const handler of cleanupHandlers) {
      handler.cleanup?.();
    }
    cleanupHandlers.length = 0;
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

    it("Given pointer re-enters reference after initial corridor entry, When pointer subsequently moves back into safe polygon triangle, Then corridor protection is preserved", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ requireIntent: false })(ctx);
      const refEl = ctx.elements.domReference as HTMLElement;

      // 1. Pointer moves from leave point into the polygon triangle area
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      // 2. Pointer re-enters reference element (geometric containment)
      handler(
        makeMouseEvent("pointermove", {
          clientX: 80,
          clientY: 50,
          target: refEl,
        }),
      );
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      // 3. Pointer leaves reference back into the safe polygon triangle.
      //    With the hasLanded bug, this would close because hasLanded was
      //    erroneously set to true on reference re-entry.
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
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
    it("Given requireIntent is enabled, When cursor decelerates to slow speed within corridor, Then close is triggered without waiting for the watchdog", () => {
      let now = 1000;
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      // A 0.5px crawl over 5000ms is far below the 0.1 px/ms intent speed.
      now += 5000;
      handler(makeMouseEvent("pointermove", { clientX: 160.5, clientY: 109 }));

      expect(ctx.onCloseMock).toHaveBeenCalledTimes(1);
      perfSpy.mockRestore();
    });

    it("Given a continuous sub-threshold crawl, When every move is slower than the intent speed, Then close is not deferred indefinitely", () => {
      let now = 1000;
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon()(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));

      // Each hop is 0.2px per 1000ms. A watchdog-only implementation would
      // rearm on every event and never fire.
      for (let hop = 0; hop < 5; hop += 1) {
        now += 1000;
        handler(makeMouseEvent("pointermove", { clientX: 160 + hop * 0.2, clientY: 109 }));
      }

      expect(ctx.onCloseMock).toHaveBeenCalled();
      perfSpy.mockRestore();
    });

    it("Given custom intentTimeout, When cursor moves at full speed then stops dispatching events, Then custom delay is respected before closing", () => {
      let now = 1000;
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now);

      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ intentTimeout: 120 })(ctx);

      // clientX 160 -> 200 over 10ms is 4px/ms, well above the intent speed, so
      // only the watchdog decides the outcome here.
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      now += 10;
      handler(makeMouseEvent("pointermove", { clientX: 200, clientY: 109 }));

      vi.advanceTimersByTime(40);
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(80);
      expect(ctx.onCloseMock).toHaveBeenCalled();
      perfSpy.mockRestore();
    });

    it("Given cursor moves into safe corridor and ceases motion, When intentTimeout elapses, Then close is triggered", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon({ intentTimeout: 50 })(ctx);

      // Rapid move into safe corridor (clientX 160 is in the polygon, outside the trough)
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      // Hand stops moving, zero events dispatched. Advance by intentTimeout
      vi.advanceTimersByTime(50);
      expect(ctx.onCloseMock).toHaveBeenCalledTimes(1);
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

    it("Given neither a context nor an options buffer, When constructing the polygon, Then the corridor defaults to half a pixel", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom", { x: 100, y: 99, buffer: undefined });
      const handler = safePolygon({ requireIntent: false, onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));

      expect(onPolygonChange.mock.calls[0]![0]).toEqual([
        [100.25, 98.5],
        [99.75, 98.5],
        [75, 110.5],
        [225, 110.5],
      ]);
    });

    it("Given both a context and an options buffer, When constructing the polygon, Then the options buffer takes precedence", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom", { x: 100, y: 99, buffer: 10 });
      const handler = safePolygon({ requireIntent: false, buffer: 0.5, onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));

      expect(onPolygonChange.mock.calls[0]![0]).toEqual([
        [100.25, 98.5],
        [99.75, 98.5],
        [75, 110.5],
        [225, 110.5],
      ]);
    });
  });

  describe("Scenario: Corridor traversal state isolation", () => {
    it("Given one factory reused for two traversals, When the first lands on the floating element, Then the second traversal is not treated as already landed", () => {
      const sp = safePolygon({ requireIntent: false });
      const first = createContext("bottom", { x: 100, y: 99 });
      const firstHandler = sp(first);

      firstHandler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: first.elements.floating,
        }),
      );
      expect(first.onCloseMock).not.toHaveBeenCalled();

      // A second traversal starts from a fresh leave point. If `hasLanded` were
      // shared across handlers this move would close immediately.
      const second = createContext("bottom", { x: 100, y: 99 });
      const secondHandler = sp(second);

      secondHandler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      expect(second.onCloseMock).not.toHaveBeenCalled();
    });

    it("Given one factory reused for two traversals, When the first parks inside the corridor, Then the second traversal still arms the intent watchdog", () => {
      const sp = safePolygon();
      const first = createContext("bottom", { x: 100, y: 99 });
      sp(first)(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));

      vi.advanceTimersByTime(1000);

      const second = createContext("bottom", { x: 100, y: 99 });
      const secondHandler = sp(second);

      secondHandler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      vi.advanceTimersByTime(40);

      expect(second.onCloseMock).toHaveBeenCalledTimes(1);
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

  describe("Scenario: Background pointer event shielding", () => {
    it("Given blockPointerEvents is false by default, When the corridor starts, Then no pointer-events shield is applied", () => {
      const ctx = createContext("bottom");
      createHandler({}, ctx);

      const anchorEl = ctx.elements.domReference as HTMLElement;
      const floatingEl = ctx.elements.floating as HTMLElement;

      expect(document.body.style.pointerEvents).toBe("");
      expect(anchorEl.style.pointerEvents).toBe("");
      expect(floatingEl.style.pointerEvents).toBe("");
    });

    it("Given blockPointerEvents is true, When the corridor starts, Then the scope is shielded while both corridor ends stay interactive", () => {
      const ctx = createContext("bottom");
      createHandler({ blockPointerEvents: true }, ctx);

      const anchorEl = ctx.elements.domReference as HTMLElement;
      const floatingEl = ctx.elements.floating as HTMLElement;

      expect(document.body.style.pointerEvents).toBe("none");
      expect(anchorEl.style.pointerEvents).toBe("auto");
      expect(floatingEl.style.pointerEvents).toBe("auto");
    });

    it("Given blockPointerEvents is true, When the corridor is torn down, Then previous inline pointer-events values are restored", () => {
      const ctx = createContext("bottom");
      const handler = createHandler({ blockPointerEvents: true }, ctx);

      handler.cleanup?.();

      expect(document.body.style.pointerEvents).toBe("");
      expect((ctx.elements.domReference as HTMLElement).style.pointerEvents).toBe("");
      expect((ctx.elements.floating as HTMLElement).style.pointerEvents).toBe("");
    });

    it("Given an active shield, When close is triggered, Then the shield is released", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = createHandler({ blockPointerEvents: true, requireIntent: false }, ctx);

      expect(document.body.style.pointerEvents).toBe("none");

      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }));

      expect(ctx.onCloseMock).toHaveBeenCalled();
      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given an active shield, When the cursor lands on the floating element, Then the shield is released immediately", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = createHandler({ blockPointerEvents: true, requireIntent: false }, ctx);
      const floatingEl = ctx.elements.floating as HTMLElement;

      expect(document.body.style.pointerEvents).toBe("none");

      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatingEl,
        }),
      );

      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given an active shield, When the cursor returns to the reference element, Then the shield is released immediately", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = createHandler({ blockPointerEvents: true }, ctx);

      expect(document.body.style.pointerEvents).toBe("none");

      handler(
        makeMouseEvent("pointermove", {
          clientX: 80,
          clientY: 50,
          target: ctx.elements.domReference as HTMLElement,
        }),
      );

      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given a pre-existing inline pointer-events value, When the shield is released, Then the original value is preserved", () => {
      const ctx = createContext("bottom");
      const anchorEl = ctx.elements.domReference as HTMLElement;
      anchorEl.style.pointerEvents = "all";

      const handler = createHandler({ blockPointerEvents: true }, ctx);
      expect(anchorEl.style.pointerEvents).toBe("auto");

      handler.cleanup?.();
      expect(anchorEl.style.pointerEvents).toBe("all");
    });

    it("Given a getScope resolver, When the corridor starts, Then only the resolved subtree is shielded", () => {
      const scopeEl = document.createElement("div");
      document.body.appendChild(scopeEl);
      cleanupElements.push(scopeEl);

      const ctx = createContext("bottom");
      createHandler({ blockPointerEvents: true, getScope: () => scopeEl }, ctx);

      expect(scopeEl.style.pointerEvents).toBe("none");
      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given a getScope resolver, When the corridor is torn down, Then the resolved subtree is restored", () => {
      const scopeEl = document.createElement("div");
      document.body.appendChild(scopeEl);
      cleanupElements.push(scopeEl);

      const ctx = createContext("bottom");
      const handler = createHandler({ blockPointerEvents: true, getScope: () => scopeEl }, ctx);

      expect(scopeEl.style.pointerEvents).toBe("none");

      handler.cleanup?.();
      expect(scopeEl.style.pointerEvents).toBe("");
    });

    it("Given two nested corridors sharing one scope, When the inner corridor is torn down first, Then the outer shield stays applied", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const inner = createContext("bottom", { x: 100, y: 99 });

      const outerHandler = createHandler({ blockPointerEvents: true, requireIntent: false }, ctx);
      const innerHandler = createHandler({ blockPointerEvents: true, requireIntent: false }, inner);

      expect(document.body.style.pointerEvents).toBe("none");

      innerHandler.cleanup?.();
      expect(document.body.style.pointerEvents).toBe("none");

      outerHandler.cleanup?.();
      expect(document.body.style.pointerEvents).toBe("");
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

    it("Given pointer has landed on floating element, When pointer moves backward into polygon triangle, Then close is immediately triggered", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      const handler = safePolygon()(ctx);
      const floatEl = ctx.elements.floating as HTMLElement;

      // 1. Move onto floating element
      handler(
        makeMouseEvent("pointermove", {
          clientX: 100,
          clientY: 130,
          target: floatEl,
        }),
      );
      expect(ctx.onCloseMock).not.toHaveBeenCalled();

      // 2. Move backward into safe corridor triangle (clientX: 160, clientY: 109 is inside polygon)
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }));
      expect(ctx.onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Scenario: Submenu preservation and open child protection", () => {
    it("Given hasOpenChild returns true, When pointer moves outside safe corridor, Then close is prevented", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 });
      ctx.hasOpenChild = () => true;
      const handler = safePolygon()(ctx);

      // Pointer moves completely outside safe areas
      handler(makeMouseEvent("pointermove", { clientX: 999, clientY: 999 }));
      expect(ctx.onCloseMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Authoritative side specification", () => {
    it("Given side is explicitly provided in context, When safe polygon is created, Then provided side takes precedence", () => {
      const onPolygonChange = vi.fn();
      const ctx = createContext("bottom", { x: 100, y: 99 });
      ctx.side = "right";
      const handler = safePolygon({ requireIntent: false, onPolygonChange })(ctx);

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }));
      expect(onPolygonChange).toHaveBeenCalledTimes(1);
      const poly = onPolygonChange.mock.calls[0]![0] as Polygon;
      expect(poly).toHaveLength(4);
    });
  });
});
