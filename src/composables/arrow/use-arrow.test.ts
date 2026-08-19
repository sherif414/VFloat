import type { MiddlewareData, Placement } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ref, ShallowRef } from "vue";
import { computed, effectScope, nextTick, ref, shallowRef } from "vue";
import type { AnchorElement, FloatingContext, FloatingElement } from "@/composables";
import { useArrow, useFloatingContext, usePosition } from "@/composables";
import { floatingInternals } from "@/composables/floating-context/use-floating-context";

const trackedElements: HTMLElement[] = [];
let scope: ReturnType<typeof effectScope> | undefined;

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

function createElement(tagName: string, rect: Partial<DOMRect> = {}): HTMLElement {
  const el = trackElement(document.createElement(tagName));
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
  return el;
}

interface MutableInternalsStub {
  _middlewareData: ShallowRef<MiddlewareData>;
  _placement: Ref<Placement>;
}

function setupPositionInternals(
  context: FloatingContext,
  overrides: { placement?: Placement; middlewareData?: MiddlewareData } = {},
): MutableInternalsStub {
  const middlewareData = shallowRef<MiddlewareData>(overrides.middlewareData ?? {});
  const placement = ref<Placement>(overrides.placement ?? "bottom");
  const registrations = ref<{ id: number; middleware: any }[]>([]);
  let nextId = 0;

  floatingInternals.set(context.id, {
    placement,
    middlewareData,
    middlewareRegistry: {
      middlewares: computed(() => {
        return registrations.value
          .map((r) =>
            typeof r.middleware === "function"
              ? r.middleware()
              : (r.middleware?.value ?? r.middleware),
          )
          .filter(Boolean);
      }),
      register: (middleware) => {
        const reg = { id: nextId++, middleware };
        registrations.value = [...registrations.value, reg];
        return () => {
          registrations.value = registrations.value.filter((r) => r.id !== reg.id);
        };
      },
    },
  });

  return {
    _middlewareData: middlewareData,
    _placement: placement,
  };
}

describe("useArrow", () => {
  let anchorEl: HTMLElement;
  let floatingEl: HTMLElement;
  let context: FloatingContext;

  beforeEach(() => {
    scope = effectScope();
    anchorEl = createElement("button");
    floatingEl = createElement("div");
    scope.run(() => {
      context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
      });
    });
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("arrow ref ownership", () => {
    it("uses the context-owned arrow element ref", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      scope?.run(() => {
        context = useFloatingContext({
          anchorEl: ref<AnchorElement>(anchorEl),
          floatingEl: ref<FloatingElement>(floatingEl),
          arrowEl,
        });
        usePosition(context);
        useArrow(context);
      });

      expect(context.refs.arrowEl.value).toBe(arrowEl.value);
    });

    it("falls back to an internal arrow element ref", () => {
      scope?.run(() => {
        usePosition(context);
        useArrow(context);
      });

      expect(context.refs.arrowEl.value).toBeNull();
    });
  });

  describe("middleware registration", () => {
    it("registers arrow middleware in the position middleware registry", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      scope?.run(() => {
        usePosition(context);
        useArrow(context);
      });

      const internals = floatingInternals.get(context.id);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
    });

    it("does not register the middleware when element is null", () => {
      scope?.run(() => {
        usePosition(context);
        useArrow(context);
      });

      const internals = floatingInternals.get(context.id);
      const middlewares = internals?.middlewareRegistry?.middlewares.value ?? [];
      const arrowMiddleware = middlewares.find((m) => m.name === "arrow");
      expect(arrowMiddleware).toBeUndefined();
    });

    it("adds arrow middleware reactively when element transitions from null to an element", async () => {
      const arrowEl = context.refs.arrowEl;
      scope?.run(() => {
        usePosition(context);
        useArrow(context);
      });

      const internals = floatingInternals.get(context.id);
      const hasArrow = () =>
        internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "arrow") ?? false;

      expect(hasArrow()).toBe(false);

      arrowEl.value = createElement("div");
      await nextTick();

      expect(hasArrow()).toBe(true);
    });

    it("registers arrow middleware even when useArrow is called before usePosition", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");

      let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
      scope?.run(() => {
        const result = useArrow(context);
        arrowStyles = result.arrowStyles;
        usePosition(context);
      });

      expect(arrowStyles.value).toBeDefined();
      const internals = floatingInternals.get(context.id);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
    });
  });

  describe("coordinate extraction", () => {
    it("exposes arrowX and arrowY from middlewareData", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      setupPositionInternals(context, {
        middlewareData: { arrow: { x: 15, y: 20, centerOffset: 0 } },
      });

      let arrowX!: ReturnType<typeof useArrow>["arrowX"];
      let arrowY!: ReturnType<typeof useArrow>["arrowY"];
      scope?.run(() => {
        const result = useArrow(context);
        arrowX = result.arrowX;
        arrowY = result.arrowY;
      });

      expect(arrowX.value).toBe(15);
      expect(arrowY.value).toBe(20);
    });

    it("defaults arrowX and arrowY to 0 when arrow data is absent", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      setupPositionInternals(context, { middlewareData: {} });

      let arrowX!: ReturnType<typeof useArrow>["arrowX"];
      let arrowY!: ReturnType<typeof useArrow>["arrowY"];
      scope?.run(() => {
        const result = useArrow(context);
        arrowX = result.arrowX;
        arrowY = result.arrowY;
      });

      expect(arrowX.value).toBe(0);
      expect(arrowY.value).toBe(0);
    });

    it("reacts to changes in middlewareData", async () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      const stub = setupPositionInternals(context, {
        middlewareData: { arrow: { x: 5, y: 10, centerOffset: 0 } },
      });

      let arrowX!: ReturnType<typeof useArrow>["arrowX"];
      let arrowY!: ReturnType<typeof useArrow>["arrowY"];
      scope?.run(() => {
        const result = useArrow(context);
        arrowX = result.arrowX;
        arrowY = result.arrowY;
      });

      expect(arrowX.value).toBe(5);

      stub._middlewareData.value = {
        arrow: { x: 42, y: 84, centerOffset: 0 },
      };
      await nextTick();

      expect(arrowX.value).toBe(42);
      expect(arrowY.value).toBe(84);
    });
  });

  describe("style generation", () => {
    it("returns empty styles when element is null", () => {
      setupPositionInternals(context, {
        middlewareData: { arrow: { x: 10, y: 10, centerOffset: 0 } },
      });

      let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
      scope?.run(() => {
        const result = useArrow(context);
        arrowStyles = result.arrowStyles;
      });

      expect(arrowStyles.value).toEqual({});
    });

    it("returns empty styles when arrow middlewareData is absent", () => {
      const arrowEl = context.refs.arrowEl;
      arrowEl.value = createElement("div");
      setupPositionInternals(context, { middlewareData: {} });

      let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
      scope?.run(() => {
        const result = useArrow(context);
        arrowStyles = result.arrowStyles;
      });

      expect(arrowStyles.value).toEqual({});
    });

    describe("placement: bottom", () => {
      it("uses inset-inline-start for X and inset-block-start for the offset", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        setupPositionInternals(context, {
          placement: "bottom",
          middlewareData: { arrow: { x: 16, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

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
        setupPositionInternals(context, {
          placement: "top",
          middlewareData: { arrow: { x: 20, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

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
        setupPositionInternals(context, {
          placement: "right",
          middlewareData: { arrow: { x: 0, y: 12, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

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
        setupPositionInternals(context, {
          placement: "left",
          middlewareData: { arrow: { x: 0, y: 8, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

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
        setupPositionInternals(context, {
          placement: "bottom-start",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "10px",
          "inset-block-start": "-4px",
        });
      });

      it("handles top-end placement correctly", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        setupPositionInternals(context, {
          placement: "top-end",
          middlewareData: { arrow: { x: 30, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "30px",
          "inset-block-end": "-4px",
        });
      });

      it("handles left-start placement correctly", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        setupPositionInternals(context, {
          placement: "left-start",
          middlewareData: { arrow: { x: 0, y: 4, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value).toEqual({
          "inset-block-start": "4px",
          "inset-inline-end": "-4px",
        });
      });

      it("handles right-end placement correctly", () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        setupPositionInternals(context, {
          placement: "right-end",
          middlewareData: { arrow: { x: 0, y: 18, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });

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
        setupPositionInternals(context, {
          placement: "bottom",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context, {
            offset: "-8px",
          });
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value["inset-block-start"]).toBe("-8px");
      });
    });

    describe("reactive styles", () => {
      it("recomputes styles when placement changes", async () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const stub = setupPositionInternals(context, {
          placement: "top",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });
        expect(arrowStyles.value).toHaveProperty("inset-block-end");

        stub._placement.value = "bottom";
        await nextTick();

        expect(arrowStyles.value).toHaveProperty("inset-block-start");
        expect(arrowStyles.value).not.toHaveProperty("inset-block-end");
      });

      it("recomputes styles when middlewareData changes", async () => {
        const arrowEl = context.refs.arrowEl;
        arrowEl.value = createElement("div");
        const stub = setupPositionInternals(context, {
          placement: "bottom",
          middlewareData: { arrow: { x: 5, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(context);
          arrowStyles = result.arrowStyles;
        });
        expect(arrowStyles.value["inset-inline-start"]).toBe("5px");

        stub._middlewareData.value = {
          arrow: { x: 99, y: 0, centerOffset: 0 },
        };
        await nextTick();

        expect(arrowStyles.value["inset-inline-start"]).toBe("99px");
      });
    });
  });
});
