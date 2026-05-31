import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { Ref, ShallowRef } from "vue";
import { nextTick, ref, shallowRef } from "vue";
import type { MiddlewareData, Placement } from "@floating-ui/dom";
import { getFloatingInternals, useArrow, useFloatingContext, usePosition } from "@/composables";
import type { AnchorElement, FloatingElement, FloatingContext } from "@/composables";
import type { FloatingPosition } from "@/composables/position";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const elements: HTMLElement[] = [];

function createElement(tagName: string, rect: Partial<DOMRect> = {}): HTMLElement {
  const el = document.createElement(tagName);
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      top: 0,
      left: 0,
      right: 40,
      bottom: 20,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
  document.body.appendChild(el);
  elements.push(el);
  return el;
}

/**
 * Creates a minimal position stub with controllable placement and middlewareData.
 * This avoids the async computePosition call so tests stay synchronous and focused
 * on useArrow behavior rather than positioning internals.
 */
interface MutablePositionStub extends FloatingPosition {
  /** Mutable handle so tests can write to middlewareData without fighting Readonly. */
  _middlewareData: ShallowRef<MiddlewareData>;
  _placement: Ref<Placement>;
}

function createPositionStub(
  overrides: {
    placement?: Placement;
    middlewareData?: MiddlewareData;
  } = {},
): MutablePositionStub {
  const middlewareData = shallowRef<MiddlewareData>(overrides.middlewareData ?? {});
  const placement = ref<Placement>(overrides.placement ?? "bottom");
  return {
    x: ref(0),
    y: ref(0),
    strategy: ref("absolute"),
    placement,
    middlewareData,
    isPositioned: ref(true),
    styles: ref({ position: "absolute" as const, top: "0", left: "0" }),
    update: async () => {},
    _middlewareData: middlewareData,
    _placement: placement,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useArrow", () => {
  let anchorEl: HTMLElement;
  let floatingEl: HTMLElement;
  let context: FloatingContext;

  beforeEach(() => {
    anchorEl = createElement("button");
    floatingEl = createElement("div");
    context = useFloatingContext({
      refs: {
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
      },
    });
  });

  afterEach(() => {
    for (const el of elements.splice(0)) el.remove();
  });

  // =========================================================================
  // Arrow ref ownership
  // =========================================================================

  describe("arrow ref ownership", () => {
    it("uses the context-owned arrow element ref", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      context = useFloatingContext({
        refs: {
          anchorEl: ref<AnchorElement>(anchorEl),
          floatingEl: ref<FloatingElement>(floatingEl),
          arrowEl,
        },
      });
      const position = usePosition(context);
      useArrow(context, position);

      expect(context.refs.arrowEl.value).toBe(arrowEl.value);
    });

    it("falls back to an internal arrow element ref", () => {
      const position = usePosition(context);

      useArrow(context, position);

      expect(context.refs.arrowEl.value).toBeNull();
    });
  });

  // =========================================================================
  // Middleware registration
  // =========================================================================

  describe("middleware registration", () => {
    it("registers arrow middleware in the position middleware registry", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      const position = usePosition(context);

      useArrow(context, position);

      const internals = getFloatingInternals(position);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
    });

    it("does not register the middleware when element is null", () => {
      const position = usePosition(context);

      useArrow(context, position);

      const internals = getFloatingInternals(position);
      const middlewares = internals?.middlewareRegistry?.middlewares.value ?? [];
      const arrowMiddleware = middlewares.find((m) => m.name === "arrow");
      expect(arrowMiddleware).toBeUndefined();
    });

    it("adds arrow middleware reactively when element transitions from null to an element", async () => {
      const arrowEl = context.refs.arrowEl;
      const position = usePosition(context);

      useArrow(context, position);

      const internals = getFloatingInternals(position);
      const hasArrow = () =>
        internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "arrow") ?? false;

      expect(hasArrow()).toBe(false);

      arrowEl.value = createElement("div");
      await nextTick();

      expect(hasArrow()).toBe(true);
    });
  });

  // =========================================================================
  // Coordinate extraction
  // =========================================================================

  describe("coordinate extraction", () => {
    it("exposes arrowX and arrowY from middlewareData", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      const position = createPositionStub({
        middlewareData: { arrow: { x: 15, y: 20, centerOffset: 0 } },
      });

      const { arrowX, arrowY } = useArrow(context, position);

      expect(arrowX.value).toBe(15);
      expect(arrowY.value).toBe(20);
    });

    it("defaults arrowX and arrowY to 0 when arrow data is absent", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      const position = createPositionStub({ middlewareData: {} });

      const { arrowX, arrowY } = useArrow(context, position);

      expect(arrowX.value).toBe(0);
      expect(arrowY.value).toBe(0);
    });

    it("reacts to changes in middlewareData", async () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      const position = createPositionStub({
        middlewareData: { arrow: { x: 5, y: 10, centerOffset: 0 } },
      });

      const { arrowX, arrowY } = useArrow(context, position);

      expect(arrowX.value).toBe(5);

      position._middlewareData.value = { arrow: { x: 42, y: 84, centerOffset: 0 } };
      await nextTick();

      expect(arrowX.value).toBe(42);
      expect(arrowY.value).toBe(84);
    });
  });

  // =========================================================================
  // Style generation per placement
  // =========================================================================

  describe("style generation", () => {
    it("returns empty styles when element is null", () => {
      const position = createPositionStub({
        middlewareData: { arrow: { x: 10, y: 10, centerOffset: 0 } },
      });

      const { arrowStyles } = useArrow(context, position);

      expect(arrowStyles.value).toEqual({});
    });

    it("returns empty styles when arrow middlewareData is absent", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      const position = createPositionStub({ middlewareData: {} });

      const { arrowStyles } = useArrow(context, position);

      expect(arrowStyles.value).toEqual({});
    });

    describe("placement: bottom", () => {
      it("uses inset-inline-start for X and inset-block-start for the offset", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "bottom",
          middlewareData: { arrow: { x: 16, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "16px",
          "inset-block-start": "-4px",
        });
      });
    });

    describe("placement: top", () => {
      it("uses inset-inline-start for X and inset-block-end for the offset", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "top",
          middlewareData: { arrow: { x: 20, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "20px",
          "inset-block-end": "-4px",
        });
      });
    });

    describe("placement: right", () => {
      it("uses inset-block-start for Y and inset-inline-start for the offset", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "right",
          middlewareData: { arrow: { x: 0, y: 12, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-block-start": "12px",
          "inset-inline-start": "-4px",
        });
      });
    });

    describe("placement: left", () => {
      it("uses inset-block-start for Y and inset-inline-end for the offset", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "left",
          middlewareData: { arrow: { x: 0, y: 8, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-block-start": "8px",
          "inset-inline-end": "-4px",
        });
      });
    });

    describe("alignment variants", () => {
      it("strips the alignment suffix and uses the base side for styles", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "bottom-start",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        // "bottom-start" should resolve to the "bottom" branch
        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "10px",
          "inset-block-start": "-4px",
        });
      });

      it("handles top-end placement correctly", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "top-end",
          middlewareData: { arrow: { x: 30, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "30px",
          "inset-block-end": "-4px",
        });
      });

      it("handles left-start placement correctly", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "left-start",
          middlewareData: { arrow: { x: 0, y: 4, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-block-start": "4px",
          "inset-inline-end": "-4px",
        });
      });

      it("handles right-end placement correctly", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "right-end",
          middlewareData: { arrow: { x: 0, y: 18, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);

        expect(arrowStyles.value).toEqual({
          "inset-block-start": "18px",
          "inset-inline-start": "-4px",
        });
      });
    });

    describe("custom offset", () => {
      it("uses the provided offset string instead of the default", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "bottom",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position, {
          offset: "-8px",
        });

        expect(arrowStyles.value["inset-block-start"]).toBe("-8px");
      });
    });

    describe("reactive styles", () => {
      it("recomputes styles when placement changes", async () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "top",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);
        expect(arrowStyles.value).toHaveProperty("inset-block-end");

        position._placement.value = "bottom";
        await nextTick();

        expect(arrowStyles.value).toHaveProperty("inset-block-start");
        expect(arrowStyles.value).not.toHaveProperty("inset-block-end");
      });

      it("recomputes styles when middlewareData changes", async () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const position = createPositionStub({
          placement: "bottom",
          middlewareData: { arrow: { x: 5, y: 0, centerOffset: 0 } },
        });

        const { arrowStyles } = useArrow(context, position);
        expect(arrowStyles.value["inset-inline-start"]).toBe("5px");

        position._middlewareData.value = { arrow: { x: 99, y: 0, centerOffset: 0 } };
        await nextTick();

        expect(arrowStyles.value["inset-inline-start"]).toBe("99px");
      });
    });
  });
});
