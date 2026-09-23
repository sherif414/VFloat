import type { MiddlewareData, Placement } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Ref, ShallowRef } from "vue";
import { computed, effectScope, nextTick, ref, shallowRef } from "vue";
import type { AnchorElement, FloatingElement, FloatingNode } from "@/composables";
import { useArrow, useFloatingNode, usePosition } from "@/composables";
import { floatingInternals } from "@/composables/floating-node/use-floating-node";

let scope: ReturnType<typeof effectScope> | undefined;

const cleanupElements: HTMLElement[] = [];

// Detached stubs: these tests assert middleware registration and style
// computeds, never layout, so the elements stay out of the document.
function createStubElement(tagName: "button" | "div"): HTMLElement {
  const el = document.createElement(tagName);
  cleanupElements.push(el);
  return el;
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

describe("Feature: useArrow positioning and style orchestration", () => {
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
    for (const el of cleanupElements) {
      el.remove();
    }
    cleanupElements.length = 0;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Arrow element reference ownership", () => {
    it("Given a pre-configured arrow element ref on node, When useArrow is invoked, Then the node-owned ref is preserved", () => {
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

    it("Given no arrow element ref provided to node, When useArrow is invoked, Then ref initializes as null fallback", () => {
      scope?.run(() => {
        usePosition(node);
        useArrow(node);
      });

      expect(node.refs.arrowEl.value).toBeNull();
    });
  });

  describe("Scenario: Dynamic middleware registration with positioning pipeline", () => {
    it("Given an active arrow element, When initialized, Then arrow middleware is registered into the position registry", () => {
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

    it("Given arrow element ref is null, When initialized, Then arrow middleware registration is deferred", () => {
      scope?.run(() => {
        usePosition(node);
        useArrow(node);
      });

      const internals = floatingInternals.get(node.id);
      const middlewares = internals?.middlewareRegistry?.middlewares.value ?? [];
      const arrowMiddleware = middlewares.find((m) => m.name === "arrow");
      expect(arrowMiddleware).toBeUndefined();
    });

    it("Given arrow element ref starts as null, When transitioning to an element, Then arrow middleware registers reactively", async () => {
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

    it("Given useArrow called before usePosition, When position registers later, Then arrow middleware registers correctly", () => {
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

  describe("Scenario: Coordinate extraction from middleware data", () => {
    it("Given arrow data in middlewareData, When evaluated, Then arrowX and arrowY expose the coordinates", () => {
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

    it("Given middlewareData lacks arrow data, When evaluated, Then arrowX and arrowY default to 0", () => {
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

    it("Given middlewareData updates reactively, When evaluated, Then arrowX and arrowY update to new coordinates", async () => {
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

  describe("Scenario: Style generation across placements and alignment variants", () => {
    it("Given arrow element is null, When styles are computed, Then empty style object is returned", () => {
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

    it("Given arrow data is absent from middlewareData, When styles are computed, Then empty style object is returned", () => {
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

    it("Given placement is 'bottom', When styles are computed, Then left coordinates and negative top offset are applied", () => {
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
        left: "16px",
        top: "-4px",
      });
    });

    it("Given placement is 'top', When styles are computed, Then left coordinates and negative bottom offset are applied", () => {
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
        left: "20px",
        bottom: "-4px",
      });
    });

    it("Given placement is 'right', When styles are computed, Then top coordinates and negative left offset are applied", () => {
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
        top: "12px",
        left: "-4px",
      });
    });

    it("Given placement is 'left', When styles are computed, Then top coordinates and negative right offset are applied", () => {
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
        top: "8px",
        right: "-4px",
      });
    });

    it("Given placement with start alignment suffix, When styles are computed, Then alignment suffix is stripped to base side", () => {
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
        left: "10px",
        top: "-4px",
      });
    });

    it("Given placement is 'top-end', When styles are computed, Then base top styles are computed correctly", () => {
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
        left: "30px",
        bottom: "-4px",
      });
    });

    it("Given placement is 'left-start', When styles are computed, Then base left styles are computed correctly", () => {
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
        top: "4px",
        right: "-4px",
      });
    });

    it("Given placement is 'right-end', When styles are computed, Then base right styles are computed correctly", () => {
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
        top: "18px",
        left: "-4px",
      });
    });

    it("Given a custom offset string option, When styles are computed, Then custom offset overrides default offset", () => {
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

      expect(arrowStyles.value.top).toBe("-8px");
    });

    it("Given placement changes reactively, When evaluated, Then opposite offset properties are replaced", async () => {
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
      expect(arrowStyles.value).toHaveProperty("bottom");

      stub._placement.value = "bottom";
      await nextTick();

      expect(arrowStyles.value).toHaveProperty("top");
      expect(arrowStyles.value).not.toHaveProperty("bottom");
    });

    it("Given middlewareData coordinates change reactively, When evaluated, Then arrow coordinates update reactively", async () => {
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
      expect(arrowStyles.value.left).toBe("5px");

      stub._middlewareData.value = {
        arrow: { x: 99, y: 0, centerOffset: 0 },
      };
      await nextTick();

      expect(arrowStyles.value.left).toBe("99px");
    });
  });

  describe("Scenario: DOM style synchronization and custom application", () => {
    it("Given default applyStyles, When coordinates update, Then styles are automatically synchronized to DOM element", async () => {
      const arrowEl = node.refs.arrowEl;
      const el = createStubElement("div");
      arrowEl.value = el;
      setupPositionInternals(node, {
        placement: "bottom",
        middlewareData: { arrow: { x: 24, y: 0, centerOffset: 0 } },
      });

      scope?.run(() => {
        useArrow(node);
      });
      await nextTick();

      expect(el.style.left).toBe("24px");
      expect(el.style.top).toBe("-4px");
    });

    it("Given applyStyles is false, When coordinates update, Then DOM mutation is bypassed while computed styles update", async () => {
      const arrowEl = node.refs.arrowEl;
      const el = createStubElement("div");
      arrowEl.value = el;
      setupPositionInternals(node, {
        placement: "bottom",
        middlewareData: { arrow: { x: 24, y: 0, centerOffset: 0 } },
      });

      scope?.run(() => {
        useArrow(node, { applyStyles: false });
      });
      await nextTick();

      expect(el.style.left).toBe("");
      expect(el.style.top).toBe("");
    });

    it("Given a custom applyStyles function, When coordinates update, Then custom applicator and cleanups are called", async () => {
      const arrowEl = node.refs.arrowEl;
      const el = createStubElement("div");
      arrowEl.value = el;
      const stub = setupPositionInternals(node, {
        placement: "bottom",
        middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
      });

      const customCleanup = vi.fn();
      const customApply = vi.fn().mockImplementation(() => customCleanup);

      scope?.run(() => {
        useArrow(node, { applyStyles: customApply });
      });
      await nextTick();

      expect(customApply).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ left: "10px", top: "-4px" }),
      );

      stub._middlewareData.value = { arrow: { x: 30, y: 0, centerOffset: 0 } };
      await nextTick();

      expect(customCleanup).toHaveBeenCalled();
      expect(customApply).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ left: "30px", top: "-4px" }),
      );
    });

    it("Given applyStyles transitions to false, When observed, Then previously applied styles are removed from DOM", async () => {
      const arrowEl = node.refs.arrowEl;
      const el = createStubElement("div");
      arrowEl.value = el;
      setupPositionInternals(node, {
        placement: "top",
        middlewareData: { arrow: { x: 15, y: 0, centerOffset: 0 } },
      });

      const applyStyles = ref(true);

      scope?.run(() => {
        useArrow(node, { applyStyles });
      });
      await nextTick();

      expect(el.style.left).toBe("15px");
      expect(el.style.bottom).toBe("-4px");

      applyStyles.value = false;
      await nextTick();

      expect(el.style.left).toBe("");
      expect(el.style.bottom).toBe("");
    });

    it("Given reactive offset ref changes, When observed, Then DOM style offset updates accordingly", async () => {
      const arrowEl = node.refs.arrowEl;
      const el = createStubElement("div");
      arrowEl.value = el;
      setupPositionInternals(node, {
        placement: "bottom",
        middlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
      });

      const offset = ref("-4px");

      scope?.run(() => {
        useArrow(node, { offset });
      });
      await nextTick();

      expect(el.style.top).toBe("-4px");

      offset.value = "-10px";
      await nextTick();

      expect(el.style.top).toBe("-10px");
    });
  });
});
