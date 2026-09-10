import type { MiddlewareData, Placement } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ref, ShallowRef } from "vue";
import { computed, effectScope, nextTick, ref, shallowRef } from "vue";
import type { AnchorElement, FloatingNode, FloatingElement } from "@/composables";
import { useArrow, useFloatingNode, usePosition } from "@/composables";
import { floatingInternals } from "@/composables/floating-tree/use-floating-node";
import { clearTrackedElements, trackElement } from "@/test-utils";

let scope: ReturnType<typeof effectScope> | undefined;

// Detached stubs: these tests assert middleware registration and style
// computeds, never layout, so the elements stay out of the document.
function createStubElement(tagName: "button" | "div"): HTMLElement {
  return trackElement(document.createElement(tagName));
}

interface MutableInternalsStub {
  _middlewareData: ShallowRef<MiddlewareData>;
  _placement: Ref<Placement>;
}

function setupPositionInternals(
  node: FloatingNode,
  overrides: { placement?: Placement; middlewareData?: MiddlewareData } = {},
): MutableInternalsStub {
  const middlewareData = shallowRef<MiddlewareData>(overrides.middlewareData ?? {});
  const placement = ref<Placement>(overrides.placement ?? "bottom");
  const registrations = ref<{ id: number; middleware: any }[]>([]);
  let nextId = 0;

  floatingInternals.set(node.id, {
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
  let node: FloatingNode;

  beforeEach(() => {
    scope = effectScope();
    anchorEl = createStubElement("button");
    floatingEl = createStubElement("div");
    scope.run(() => {
      node = useFloatingNode({
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
    it("uses the node-owned arrow element ref", () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref<AnchorElement>(anchorEl),
          floatingEl: ref<FloatingElement>(floatingEl),
          arrowEl,
        });
        usePosition(node);
        useArrow(node);
      });

      expect(node.refs.arrowEl.value).toBe(arrowEl.value);
    });

    it("falls back to an internal arrow element ref", () => {
      scope?.run(() => {
        usePosition(node);
        useArrow(node);
      });

      expect(node.refs.arrowEl.value).toBeNull();
    });
  });

  describe("middleware registration", () => {
    it("registers arrow middleware in the position middleware registry", () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");
      scope?.run(() => {
        usePosition(node);
        useArrow(node);
      });

      const internals = floatingInternals.get(node.id);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
    });

    it("does not register the middleware when element is null", () => {
      scope?.run(() => {
        usePosition(node);
        useArrow(node);
      });

      const internals = floatingInternals.get(node.id);
      const middlewares = internals?.middlewareRegistry?.middlewares.value ?? [];
      const arrowMiddleware = middlewares.find((m) => m.name === "arrow");
      expect(arrowMiddleware).toBeUndefined();
    });

    it("adds arrow middleware reactively when element transitions from null to an element", async () => {
      const arrowEl = node.refs.arrowEl;
      scope?.run(() => {
        usePosition(node);
        useArrow(node);
      });

      const internals = floatingInternals.get(node.id);
      const hasArrow = () =>
        internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "arrow") ?? false;

      expect(hasArrow()).toBe(false);

      arrowEl.value = createStubElement("div");
      await nextTick();

      expect(hasArrow()).toBe(true);
    });

    it("registers arrow middleware even when useArrow is called before usePosition", () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");

      let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
      scope?.run(() => {
        const result = useArrow(node);
        arrowStyles = result.arrowStyles;
        usePosition(node);
      });

      expect(arrowStyles.value).toBeDefined();
      const internals = floatingInternals.get(node.id);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
    });
  });

  describe("coordinate extraction", () => {
    it("exposes arrowX and arrowY from middlewareData", () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");
      setupPositionInternals(node, {
        middlewareData: { arrow: { x: 15, y: 20, centerOffset: 0 } },
      });

      let arrowX!: ReturnType<typeof useArrow>["arrowX"];
      let arrowY!: ReturnType<typeof useArrow>["arrowY"];
      scope?.run(() => {
        const result = useArrow(node);
        arrowX = result.arrowX;
        arrowY = result.arrowY;
      });

      expect(arrowX.value).toBe(15);
      expect(arrowY.value).toBe(20);
    });

    it("defaults arrowX and arrowY to 0 when arrow data is absent", () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");
      setupPositionInternals(node, { middlewareData: {} });

      let arrowX!: ReturnType<typeof useArrow>["arrowX"];
      let arrowY!: ReturnType<typeof useArrow>["arrowY"];
      scope?.run(() => {
        const result = useArrow(node);
        arrowX = result.arrowX;
        arrowY = result.arrowY;
      });

      expect(arrowX.value).toBe(0);
      expect(arrowY.value).toBe(0);
    });

    it("reacts to changes in middlewareData", async () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");
      const stub = setupPositionInternals(node, {
        middlewareData: { arrow: { x: 5, y: 10, centerOffset: 0 } },
      });

      let arrowX!: ReturnType<typeof useArrow>["arrowX"];
      let arrowY!: ReturnType<typeof useArrow>["arrowY"];
      scope?.run(() => {
        const result = useArrow(node);
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
      setupPositionInternals(node, {
        middlewareData: { arrow: { x: 10, y: 10, centerOffset: 0 } },
      });

      let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
      scope?.run(() => {
        const result = useArrow(node);
        arrowStyles = result.arrowStyles;
      });

      expect(arrowStyles.value).toEqual({});
    });

    it("returns empty styles when arrow middlewareData is absent", () => {
      const arrowEl = node.refs.arrowEl;
      arrowEl.value = createStubElement("div");
      setupPositionInternals(node, { middlewareData: {} });

      let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
      scope?.run(() => {
        const result = useArrow(node);
        arrowStyles = result.arrowStyles;
      });

      expect(arrowStyles.value).toEqual({});
    });

    describe("placement: bottom", () => {
      it("uses inset-inline-start for X and inset-block-start for the offset", () => {
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "bottom",
          middlewareData: { arrow: { x: 16, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
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
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "top",
          middlewareData: { arrow: { x: 20, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
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
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "right",
          middlewareData: { arrow: { x: 0, y: 12, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
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
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "left",
          middlewareData: { arrow: { x: 0, y: 8, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
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
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "bottom-start",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "10px",
          "inset-block-start": "-4px",
        });
      });

      it("handles top-end placement correctly", () => {
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "top-end",
          middlewareData: { arrow: { x: 30, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value).toEqual({
          "inset-inline-start": "30px",
          "inset-block-end": "-4px",
        });
      });

      it("handles left-start placement correctly", () => {
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "left-start",
          middlewareData: { arrow: { x: 0, y: 4, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value).toEqual({
          "inset-block-start": "4px",
          "inset-inline-end": "-4px",
        });
      });

      it("handles right-end placement correctly", () => {
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "right-end",
          middlewareData: { arrow: { x: 0, y: 18, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
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
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        setupPositionInternals(node, {
          placement: "bottom",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node, {
            offset: "-8px",
          });
          arrowStyles = result.arrowStyles;
        });

        expect(arrowStyles.value["inset-block-start"]).toBe("-8px");
      });
    });

    describe("reactive styles", () => {
      it("recomputes styles when placement changes", async () => {
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        const stub = setupPositionInternals(node, {
          placement: "top",
          middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
          arrowStyles = result.arrowStyles;
        });
        expect(arrowStyles.value).toHaveProperty("inset-block-end");

        stub._placement.value = "bottom";
        await nextTick();

        expect(arrowStyles.value).toHaveProperty("inset-block-start");
        expect(arrowStyles.value).not.toHaveProperty("inset-block-end");
      });

      it("recomputes styles when middlewareData changes", async () => {
        const arrowEl = node.refs.arrowEl;
        arrowEl.value = createStubElement("div");
        const stub = setupPositionInternals(node, {
          placement: "bottom",
          middlewareData: { arrow: { x: 5, y: 0, centerOffset: 0 } },
        });

        let arrowStyles!: ReturnType<typeof useArrow>["arrowStyles"];
        scope?.run(() => {
          const result = useArrow(node);
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
