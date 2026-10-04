import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CreateSafePolygonHandlerContext,
  isPointInPolygon,
  type Polygon,
  safePolygon,
  type SafePolygonHandler,
  type SafePolygonOptions,
} from "@/composables/hover/polygon";
import { makeDOMRect } from "@/test-utils";

type RectTuple = [x: number, y: number, width: number, height: number];

// Deliberately local: fabricates `target` per call, which real MouseEvents
// cannot do. For dispatchable events use the shared builder instead.
function move(clientX: number, clientY: number, target: EventTarget = document.body): MouseEvent {
  return { type: "pointermove", clientX, clientY, target } as unknown as MouseEvent;
}

/**
 * Floating panel sits below-right of the anchor with no shared span, so there
 * is no gap strip and every move is judged by the cone and direction checks.
 * Leave point: (90, 40) on the anchor's bottom edge.
 */
const OFFSET = {
  anchor: [0, 0, 100, 40],
  floating: [150, 60, 200, 200],
  x: 90,
  y: 40,
} as const;

/**
 * Floating panel sits directly below the anchor with a 20px gap strip at
 * x 0..100, y 40..60. Leave point: (50, 40).
 */
const ALIGNED = {
  anchor: [0, 0, 100, 40],
  floating: [0, 60, 200, 200],
  x: 50,
  y: 40,
} as const;

const cleanupHandlers: SafePolygonHandler[] = [];

function setup(
  layout: { anchor: Readonly<RectTuple>; floating: Readonly<RectTuple>; x: number; y: number },
  options: SafePolygonOptions = {},
  overrides: Partial<CreateSafePolygonHandlerContext> = {},
) {
  const anchorEl = document.createElement("div");
  const floatingEl = document.createElement("div");
  anchorEl.getBoundingClientRect = () => makeDOMRect(...layout.anchor);
  floatingEl.getBoundingClientRect = () => makeDOMRect(...layout.floating);

  const onClose = vi.fn();
  const ctx: CreateSafePolygonHandlerContext = {
    x: layout.x,
    y: layout.y,
    elements: { domReference: anchorEl, floating: floatingEl },
    onClose,
    side: "bottom",
    ...overrides,
  };
  // Handlers arm a watchdog and may shield `document.body`; always tear down.
  const handler = safePolygon(options)(ctx);
  cleanupHandlers.push(handler);

  return { handler, onClose, anchorEl, floatingEl };
}

describe("Feature: safePolygon hover corridor protection", () => {
  afterEach(() => {
    for (const handler of cleanupHandlers) handler.cleanup?.();
    cleanupHandlers.length = 0;
    document.body.style.pointerEvents = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Travel toward the floating element", () => {
    it("Given the cursor left the anchor, When it moves toward the floating element inside the cone, Then the corridor stays open", () => {
      const { handler, onClose } = setup(OFFSET, { requireIntent: false });

      handler(move(110, 50));
      handler(move(130, 60));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("Given the cursor reaches the floating element, When it parks there, Then the corridor never closes", () => {
      vi.useFakeTimers();
      const { handler, onClose, floatingEl } = setup(OFFSET);

      handler(move(200, 100, floatingEl));
      vi.advanceTimersByTime(1000);

      expect(onClose).not.toHaveBeenCalled();
    });

    it.each([
      ["bottom", [100, 220, 100, 100], 150, 200],
      ["top", [100, -20, 100, 100], 150, 100],
      ["right", [220, 100, 100, 100], 200, 150],
      ["left", [-20, 100, 100, 100], 100, 150],
    ] as const)(
      "Given the floating element on the %s, When the cursor moves far outside the corridor, Then the corridor closes",
      (side, floating, x, y) => {
        const { handler, onClose } = setup(
          { anchor: [100, 100, 100, 100], floating, x, y },
          { requireIntent: false },
          { side },
        );

        handler(move(900, 900));

        expect(onClose).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("Scenario: Wrong-direction movement", () => {
    it("Given the cursor is inside the cone, When it moves away from the floating element, Then the corridor closes immediately", () => {
      const { handler, onClose } = setup(OFFSET, { requireIntent: false });

      handler(move(110, 50));
      handler(move(100, 50));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given the cursor is inside the cone, When it doubles back toward the anchor, Then the corridor closes immediately", () => {
      const { handler, onClose } = setup(OFFSET, { requireIntent: false });

      handler(move(110, 50));
      handler(move(105, 44));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given the cursor left the anchor, When it exits the cone, Then the corridor closes immediately", () => {
      const { handler, onClose } = setup(OFFSET, { requireIntent: false });

      handler(move(80, 60));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given the cursor is inside the cone, When it jitters by less than 4px in any direction, Then the corridor stays open", () => {
      const { handler, onClose } = setup(OFFSET, { requireIntent: false });

      handler(move(110, 50));
      handler(move(108, 51));
      handler(move(110, 48));
      handler(move(110, 50));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Gap between anchor and floating element", () => {
    it("Given the cursor is in the gap, When it moves sideways or back toward the anchor, Then the corridor stays open", () => {
      const { handler, onClose } = setup(ALIGNED, { requireIntent: false });

      handler(move(50, 50));
      handler(move(80, 50));
      handler(move(80, 44));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("Given the cursor landed on the floating element, When it returns through the gap to the anchor, Then the corridor stays open", () => {
      const { handler, onClose, floatingEl, anchorEl } = setup(ALIGNED, { requireIntent: false });

      handler(move(50, 100, floatingEl));
      handler(move(50, 50));
      handler(move(50, 20, anchorEl));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("Given the cursor landed on the floating element, When it leaves into empty space, Then the corridor closes", () => {
      const { handler, onClose, floatingEl } = setup(OFFSET, { requireIntent: false });

      handler(move(200, 100, floatingEl));
      handler(move(600, 600));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Scenario: Intent watchdog", () => {
    it("Given the cursor left the anchor, When no further pointer events arrive, Then the corridor closes after intentTimeout", () => {
      vi.useFakeTimers();
      const { onClose } = setup(OFFSET);

      vi.advanceTimersByTime(99);
      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given steady progress toward the floating element, When total travel exceeds intentTimeout, Then the corridor stays open until progress stops", () => {
      vi.useFakeTimers();
      const { handler, onClose } = setup(OFFSET);

      handler(move(110, 50));
      vi.advanceTimersByTime(90);
      handler(move(130, 60));
      vi.advanceTimersByTime(90);
      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given the cursor jitters in place, When intentTimeout elapses since the last real progress, Then the corridor closes", () => {
      vi.useFakeTimers();
      const { handler, onClose } = setup(OFFSET);

      handler(move(110, 50));
      vi.advanceTimersByTime(60);
      handler(move(108, 51));
      vi.advanceTimersByTime(40);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given the cursor parks in the gap, When intentTimeout elapses, Then the corridor closes", () => {
      vi.useFakeTimers();
      const { handler, onClose } = setup(ALIGNED);

      handler(move(50, 50));
      vi.advanceTimersByTime(100);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given a custom intentTimeout, When the cursor parks, Then the custom delay is respected", () => {
      vi.useFakeTimers();
      const { handler, onClose } = setup(OFFSET, { intentTimeout: 250 });

      handler(move(110, 50));
      vi.advanceTimersByTime(249);
      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Given requireIntent is false, When the cursor parks inside the corridor, Then the corridor stays open", () => {
      vi.useFakeTimers();
      const { handler, onClose } = setup(OFFSET, { requireIntent: false });

      handler(move(110, 50));
      vi.advanceTimersByTime(5000);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("Given a pending watchdog, When the handler is cleaned up, Then the stale timer never closes", () => {
      vi.useFakeTimers();
      const { handler, onClose } = setup(OFFSET);

      handler.cleanup?.();
      vi.advanceTimersByTime(1000);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Submenu preservation", () => {
    it("Given hasOpenChild returns true, When the cursor moves outside the corridor, Then the corridor stays open", () => {
      const { handler, onClose } = setup(
        OFFSET,
        { requireIntent: false },
        { hasOpenChild: () => true },
      );

      handler(move(600, 600));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Input guard clauses", () => {
    it("Given a missing floating element, When the cursor moves, Then the handler exits without closing", () => {
      const { handler, onClose } = setup(
        OFFSET,
        { requireIntent: false },
        { elements: { domReference: document.createElement("div"), floating: null } },
      );

      handler(move(600, 600));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("Given a missing reference element, When the cursor moves, Then the handler exits without closing", () => {
      const { handler, onClose } = setup(
        OFFSET,
        { requireIntent: false },
        { elements: { domReference: null, floating: document.createElement("div") } },
      );

      handler(move(600, 600));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Corridor polygon notification", () => {
    it("Given an onPolygonChange callback, When the cursor moves, Then the emitted cone spans the floating element and contains the cursor", () => {
      const onPolygonChange = vi.fn();
      const { handler } = setup(OFFSET, { requireIntent: false, onPolygonChange });

      handler(move(110, 50));

      const polygon = onPolygonChange.mock.calls[0]![0] as Polygon;
      expect(polygon).toEqual(
        expect.arrayContaining([
          [350, 60],
          [350, 260],
          [150, 260],
        ]),
      );
      expect(isPointInPolygon([110, 50], polygon)).toBe(true);
    });

    it("Given both a context and an options buffer, When the cone is built, Then the options buffer pads the apex", () => {
      const onPolygonChange = vi.fn();
      const { handler } = setup(
        OFFSET,
        { requireIntent: false, buffer: 2, onPolygonChange },
        { buffer: 10 },
      );

      handler(move(110, 50));

      expect(onPolygonChange.mock.calls[0]![0]).toEqual(
        expect.arrayContaining([
          [88, 38],
          [92, 38],
        ]),
      );
    });
  });

  describe("Scenario: Traversal state isolation", () => {
    it("Given one factory reused for two traversals, When the first lands on the floating element, Then the second is not treated as landed", () => {
      const factory = safePolygon({ requireIntent: false });
      const first = setup(OFFSET);
      const firstHandler = factory({
        x: OFFSET.x,
        y: OFFSET.y,
        elements: { domReference: first.anchorEl, floating: first.floatingEl },
        onClose: first.onClose,
        side: "bottom",
      });
      const second = setup(OFFSET);
      const secondHandler = factory({
        x: OFFSET.x,
        y: OFFSET.y,
        elements: { domReference: second.anchorEl, floating: second.floatingEl },
        onClose: second.onClose,
        side: "bottom",
      });
      cleanupHandlers.push(firstHandler, secondHandler);

      firstHandler(move(200, 100, first.floatingEl));
      secondHandler(move(110, 50));

      expect(second.onClose).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Background pointer event shielding", () => {
    it("Given blockPointerEvents is false by default, When the corridor starts, Then no shield is applied", () => {
      const { anchorEl, floatingEl } = setup(OFFSET);

      expect(document.body.style.pointerEvents).toBe("");
      expect(anchorEl.style.pointerEvents).toBe("");
      expect(floatingEl.style.pointerEvents).toBe("");
    });

    it("Given blockPointerEvents is true, When the corridor starts, Then the scope is shielded while both ends stay interactive", () => {
      const { anchorEl, floatingEl } = setup(OFFSET, { blockPointerEvents: true });

      expect(document.body.style.pointerEvents).toBe("none");
      expect(anchorEl.style.pointerEvents).toBe("auto");
      expect(floatingEl.style.pointerEvents).toBe("auto");
    });

    it("Given an active shield, When the corridor is torn down, Then previous inline values are restored", () => {
      const { handler, anchorEl, floatingEl } = setup(OFFSET, { blockPointerEvents: true });

      handler.cleanup?.();

      expect(document.body.style.pointerEvents).toBe("");
      expect(anchorEl.style.pointerEvents).toBe("");
      expect(floatingEl.style.pointerEvents).toBe("");
    });

    it("Given an active shield, When the corridor closes, Then the shield is released", () => {
      const { handler, onClose } = setup(OFFSET, {
        blockPointerEvents: true,
        requireIntent: false,
      });

      handler(move(600, 600));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given an active shield, When the cursor lands on the floating element, Then the shield is released", () => {
      const { handler, floatingEl } = setup(OFFSET, { blockPointerEvents: true });

      handler(move(200, 100, floatingEl));

      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given an active shield, When the cursor returns to the anchor, Then the shield is released", () => {
      const { handler, anchorEl } = setup(OFFSET, { blockPointerEvents: true });

      handler(move(50, 20, anchorEl));

      expect(document.body.style.pointerEvents).toBe("");
    });

    it("Given a getScope resolver, When the corridor starts and ends, Then only the resolved subtree is shielded and restored", () => {
      const scopeEl = document.createElement("div");
      const { handler } = setup(OFFSET, { blockPointerEvents: true, getScope: () => scopeEl });

      expect(scopeEl.style.pointerEvents).toBe("none");
      expect(document.body.style.pointerEvents).toBe("");

      handler.cleanup?.();
      expect(scopeEl.style.pointerEvents).toBe("");
    });

    it("Given two nested corridors sharing one scope, When the inner one ends first, Then the outer shield stays applied", () => {
      const outer = setup(OFFSET, { blockPointerEvents: true });
      const inner = setup(OFFSET, { blockPointerEvents: true });

      inner.handler.cleanup?.();
      expect(document.body.style.pointerEvents).toBe("none");

      outer.handler.cleanup?.();
      expect(document.body.style.pointerEvents).toBe("");
    });
  });

  describe("Scenario: Layout measurement caching", () => {
    it("Given rapid pointer movements, When they arrive within 16ms, Then element rects are measured once per frame", () => {
      let now = 1000;
      vi.spyOn(performance, "now").mockImplementation(() => now);
      const { handler, anchorEl, floatingEl } = setup(OFFSET, { requireIntent: false });
      const anchorRectSpy = vi.spyOn(anchorEl, "getBoundingClientRect");
      const floatingRectSpy = vi.spyOn(floatingEl, "getBoundingClientRect");

      handler(move(110, 50));
      now += 8;
      handler(move(130, 60));
      expect(anchorRectSpy).toHaveBeenCalledTimes(1);
      expect(floatingRectSpy).toHaveBeenCalledTimes(1);

      now += 20;
      handler(move(140, 70));
      expect(anchorRectSpy).toHaveBeenCalledTimes(2);
      expect(floatingRectSpy).toHaveBeenCalledTimes(2);
    });
  });
});
