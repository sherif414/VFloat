import type { MiddlewareData, Placement } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page } from "vitest/browser";
import {
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
  type Ref,
} from "vue";
import type { FloatingNode, UseArrowOptions, UsePositionOptions } from "@/composables";
import { useArrow, useFloatingNode, usePosition } from "@/composables";
import { floatingInternals } from "@/composables/floating-node/use-floating-node";
import { getTestEl } from "@/test-utils";

//=======================================================================================
// 📌 Fixtures
//=======================================================================================

interface FixtureConfig {
  withArrowEl?: boolean;
  withPosition?: boolean;
  positionFirst?: boolean;
  placement?: Ref<Placement>;
  initialPlacement?: Placement;
  initialMiddlewareData?: MiddlewareData;
  customArrowEl?: Ref<HTMLElement | null>;
  positionOptions?: Partial<UsePositionOptions>;
}

function createTestComponent(options: UseArrowOptions = {}, config: FixtureConfig = {}) {
  let node!: FloatingNode;
  let arrowResult!: ReturnType<typeof useArrow>;
  let positionResult: ReturnType<typeof usePosition> | undefined;

  const placementRef = config.placement ?? ref<Placement>(config.initialPlacement ?? "bottom");
  const middlewareDataRef = shallowRef<MiddlewareData>(config.initialMiddlewareData ?? {});

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const arrowTemplateEl = useTemplateRef<HTMLElement>("arrow");

    const resolvedArrowEl =
      config.customArrowEl ??
      (config.withArrowEl !== false ? arrowTemplateEl : ref<HTMLElement | null>(null));

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      arrowEl: resolvedArrowEl,
    });

    const initPosition = () => {
      positionResult = usePosition(node, {
        placement: placementRef,
        enabled: false,
        ...config.positionOptions,
      });
      watch(
        placementRef,
        (val) => {
          if (positionResult) {
            (positionResult.placement as Ref<Placement>).value = val;
          }
        },
        { immediate: true },
      );
      if (Object.keys(middlewareDataRef.value).length > 0) {
        (positionResult.middlewareData as Ref<MiddlewareData>).value = middlewareDataRef.value;
      }
    };

    const initArrow = () => {
      arrowResult = useArrow(node, options);
    };

    if (config.withPosition !== false) {
      if (config.positionFirst === false) {
        initArrow();
        initPosition();
      } else {
        initPosition();
        initArrow();
      }
    } else {
      initArrow();
    }

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
        h("div", { ref: "floating", "data-testid": "floating" }, [
          config.withArrowEl !== false && !config.customArrowEl
            ? h("div", { ref: "arrow", "data-testid": "arrow" }, "Arrow")
            : null,
        ]),
        config.customArrowEl
          ? h("div", { ref: "custom-arrow", "data-testid": "custom-arrow" }, "Custom Arrow")
          : null,
      ]);
  });

  return {
    Component,
    getNode: () => node,
    getPosition: () => positionResult,
    getArrow: () => arrowResult,
    placementRef,
    middlewareDataRef,
  };
}

async function renderFixture(options: UseArrowOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  const view = await render(fixture.Component);
  await nextTick();

  return {
    view,
    node: fixture.getNode(),
    position: fixture.getPosition(),
    arrow: fixture.getArrow(),
    placementRef: fixture.placementRef,
    middlewareDataRef: fixture.middlewareDataRef,
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    arrowEl: page.getByTestId("arrow"),
    get arrowDomEl() {
      return getTestEl("arrow");
    },
    setMiddlewareData: (data: MiddlewareData) => {
      const pos = fixture.getPosition();
      if (pos) {
        (pos.middlewareData as Ref<MiddlewareData>).value = data;
      }
    },
  };
}

//=======================================================================================
// 📌 Test Suites
//=======================================================================================

describe("Feature: useArrow positioning and style orchestration", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Arrow element reference ownership", () => {
    it("Given a pre-configured arrow element ref on node, When useArrow is invoked, Then the node-owned ref is preserved", async () => {
      const customArrowEl = ref<HTMLElement | null>(document.createElement("div"));
      const { node } = await renderFixture({}, { customArrowEl });

      expect(node.refs.arrowEl.value).toBe(customArrowEl.value);
    });

    it("Given no arrow element ref provided to node, When useArrow is invoked, Then ref initializes as null fallback", async () => {
      const { node } = await renderFixture({}, { withArrowEl: false });

      expect(node.refs.arrowEl.value).toBeNull();
    });
  });

  describe("Scenario: Dynamic middleware registration with positioning pipeline", () => {
    it("Given an active arrow element, When initialized, Then arrow middleware is registered into the position registry", async () => {
      const { node } = await renderFixture();

      const internals = floatingInternals.get(node.id);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
    });

    it("Given arrow element ref is null, When initialized, Then arrow middleware registration is deferred", async () => {
      const { node } = await renderFixture({}, { withArrowEl: false });

      const internals = floatingInternals.get(node.id);
      const middlewares = internals?.middlewareRegistry?.middlewares.value ?? [];
      const arrowMiddleware = middlewares.find((m) => m.name === "arrow");
      expect(arrowMiddleware).toBeUndefined();
    });

    it("Given arrow element ref starts as null, When transitioning to an element, Then arrow middleware registers reactively", async () => {
      const arrowElRef = ref<HTMLElement | null>(null);
      const { node } = await renderFixture({}, { customArrowEl: arrowElRef });

      const internals = floatingInternals.get(node.id);
      const hasArrow = () =>
        internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "arrow") ?? false;

      expect(hasArrow()).toBe(false);

      arrowElRef.value = document.createElement("div");
      await nextTick();

      expect(hasArrow()).toBe(true);
    });

    it("Given useArrow is called before usePosition in setup, When position registers later, Then onMounted resolves internals and registers middleware", async () => {
      const { node, arrow } = await renderFixture(
        {},
        {
          positionFirst: false,
          initialMiddlewareData: { arrow: { x: 15, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      const internals = floatingInternals.get(node.id);
      const names = internals?.middlewareRegistry?.middlewares.value.map((m) => m.name);
      expect(names).toContain("arrow");
      expect(arrow.arrowX.value).toBe(15);
    });

    it("Given useArrow is invoked before usePosition without element attached during setup, When component mounts, Then onMounted hook resolves internals", async () => {
      const { node } = await renderFixture(
        {},
        {
          positionFirst: false,
          withArrowEl: false,
        },
      );
      await nextTick();

      const internals = floatingInternals.get(node.id);
      expect(internals).toBeDefined();
    });
  });

  describe("Scenario: Padding configuration and middleware integration", () => {
    it("Given a static padding option, When arrow middleware is registered, Then padding is configured on the middleware", async () => {
      const { node } = await renderFixture({ padding: 8 });
      const internals = floatingInternals.get(node.id);
      const arrowMw = internals?.middlewareRegistry?.middlewares.value.find(
        (m) => m.name === "arrow",
      );

      expect(arrowMw).toBeDefined();
      expect(arrowMw?.options).toEqual(expect.objectContaining({ padding: 8 }));
    });

    it("Given a reactive padding ref, When padding updates, Then arrow middleware receives updated padding", async () => {
      const padding = ref(6);
      const { node } = await renderFixture({ padding });
      const internals = floatingInternals.get(node.id);

      const getArrowMw = () =>
        internals?.middlewareRegistry?.middlewares.value.find((m) => m.name === "arrow");

      expect(getArrowMw()?.options).toEqual(expect.objectContaining({ padding: 6 }));

      padding.value = 14;
      await nextTick();

      expect(getArrowMw()?.options).toEqual(expect.objectContaining({ padding: 14 }));
    });

    it("Given a padding getter function, When evaluated, Then arrow middleware resolves getter dynamically", async () => {
      const padValue = ref(5);
      const { node } = await renderFixture({ padding: () => padValue.value });
      const internals = floatingInternals.get(node.id);

      const getArrowMw = () =>
        internals?.middlewareRegistry?.middlewares.value.find((m) => m.name === "arrow");

      expect(getArrowMw()?.options).toEqual(expect.objectContaining({ padding: 5 }));

      padValue.value = 18;
      await nextTick();

      expect(getArrowMw()?.options).toEqual(expect.objectContaining({ padding: 18 }));
    });
  });

  describe("Scenario: Coordinate extraction from middleware data", () => {
    it("Given arrow data in middlewareData, When evaluated, Then arrowX and arrowY expose the coordinates", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialMiddlewareData: { arrow: { x: 15, y: 20, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowX.value).toBe(15);
      expect(arrow.arrowY.value).toBe(20);
    });

    it("Given middlewareData lacks arrow data, When evaluated, Then arrowX and arrowY default to 0", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialMiddlewareData: {},
        },
      );

      expect(arrow.arrowX.value).toBe(0);
      expect(arrow.arrowY.value).toBe(0);
    });

    it("Given middlewareData updates reactively, When evaluated, Then arrowX and arrowY update to new coordinates", async () => {
      const { arrow, setMiddlewareData } = await renderFixture(
        {},
        {
          initialMiddlewareData: { arrow: { x: 5, y: 10, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowX.value).toBe(5);

      setMiddlewareData({
        arrow: { x: 42, y: 84, centerOffset: 0 },
      });
      await nextTick();

      expect(arrow.arrowX.value).toBe(42);
      expect(arrow.arrowY.value).toBe(84);
    });
  });

  describe("Scenario: Style generation across placements and alignment variants", () => {
    it("Given arrow element is null, When styles are computed, Then empty style object is returned", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          withArrowEl: false,
          initialMiddlewareData: { arrow: { x: 10, y: 10, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({});
    });

    it("Given arrow data is absent from middlewareData, When styles are computed, Then empty style object is returned", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialMiddlewareData: {},
        },
      );

      expect(arrow.arrowStyles.value).toEqual({});
    });

    it("Given placement is 'bottom', When styles are computed, Then left coordinates and negative top offset are applied", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 16, y: 0, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        left: "16px",
        top: "-4px",
      });
    });

    it("Given placement is 'top', When styles are computed, Then left coordinates and negative bottom offset are applied", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "top",
          initialMiddlewareData: { arrow: { x: 20, y: 0, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        left: "20px",
        bottom: "-4px",
      });
    });

    it("Given placement is 'right', When styles are computed, Then top coordinates and negative left offset are applied", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "right",
          initialMiddlewareData: { arrow: { x: 0, y: 12, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        top: "12px",
        left: "-4px",
      });
    });

    it("Given placement is 'left', When styles are computed, Then top coordinates and negative right offset are applied", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "left",
          initialMiddlewareData: { arrow: { x: 0, y: 8, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        top: "8px",
        right: "-4px",
      });
    });

    it("Given placement with start alignment suffix, When styles are computed, Then alignment suffix is stripped to base side", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "bottom-start",
          initialMiddlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        left: "10px",
        top: "-4px",
      });
    });

    it("Given placement is 'top-end', When styles are computed, Then base top styles are computed correctly", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "top-end",
          initialMiddlewareData: { arrow: { x: 30, y: 0, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        left: "30px",
        bottom: "-4px",
      });
    });

    it("Given placement is 'left-start', When styles are computed, Then base left styles are computed correctly", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "left-start",
          initialMiddlewareData: { arrow: { x: 0, y: 4, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        top: "4px",
        right: "-4px",
      });
    });

    it("Given placement is 'right-end', When styles are computed, Then base right styles are computed correctly", async () => {
      const { arrow } = await renderFixture(
        {},
        {
          initialPlacement: "right-end",
          initialMiddlewareData: { arrow: { x: 0, y: 18, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value).toEqual({
        top: "18px",
        left: "-4px",
      });
    });

    it("Given a custom offset string option, When styles are computed, Then custom offset overrides default offset", async () => {
      const { arrow } = await renderFixture(
        { offset: "-8px" },
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        },
      );

      expect(arrow.arrowStyles.value.top).toBe("-8px");
    });

    it("Given offset configured as a getter function, When evaluated, Then offset value is resolved dynamically", async () => {
      const offsetVal = ref("-6px");
      const { arrow, arrowDomEl } = await renderFixture(
        { offset: () => offsetVal.value },
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrow.arrowStyles.value.top).toBe("-6px");
      expect(arrowDomEl.style.top).toBe("-6px");

      offsetVal.value = "-12px";
      await nextTick();

      expect(arrow.arrowStyles.value.top).toBe("-12px");
      expect(arrowDomEl.style.top).toBe("-12px");
    });

    it("Given placement changes reactively, When evaluated, Then opposite offset properties are replaced", async () => {
      const placementRef = ref<Placement>("top");
      const { arrow } = await renderFixture(
        {},
        {
          placement: placementRef,
          initialMiddlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        },
      );
      expect(arrow.arrowStyles.value).toHaveProperty("bottom");

      placementRef.value = "bottom";
      await nextTick();

      expect(arrow.arrowStyles.value).toHaveProperty("top");
      expect(arrow.arrowStyles.value).not.toHaveProperty("bottom");
    });

    it("Given middlewareData coordinates change reactively, When evaluated, Then arrow coordinates update reactively", async () => {
      const { arrow, setMiddlewareData } = await renderFixture(
        {},
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 5, y: 0, centerOffset: 0 } },
        },
      );
      expect(arrow.arrowStyles.value.left).toBe("5px");

      setMiddlewareData({
        arrow: { x: 99, y: 0, centerOffset: 0 },
      });
      await nextTick();

      expect(arrow.arrowStyles.value.left).toBe("99px");
    });
  });

  describe("Scenario: DOM style synchronization and custom application", () => {
    it("Given default applyStyles, When coordinates update, Then styles are automatically synchronized to DOM element", async () => {
      const { arrowDomEl } = await renderFixture(
        {},
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 24, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("24px");
      expect(arrowDomEl.style.top).toBe("-4px");
    });

    it("Given applyStyles is false, When coordinates update, Then DOM mutation is bypassed while computed styles update", async () => {
      const { arrowDomEl, arrow } = await renderFixture(
        { applyStyles: false },
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 24, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("");
      expect(arrowDomEl.style.top).toBe("");
      expect(arrow.arrowStyles.value.left).toBe("24px");
    });

    it("Given a custom applyStyles function with cleanup, When coordinates update, Then custom applicator and cleanups are called", async () => {
      const customCleanup = vi.fn();
      const customApply = vi.fn().mockImplementation(() => customCleanup);

      const { setMiddlewareData } = await renderFixture(
        { applyStyles: customApply },
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(customApply).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ left: "10px", top: "-4px" }),
      );

      setMiddlewareData({ arrow: { x: 30, y: 0, centerOffset: 0 } });
      await nextTick();

      expect(customCleanup).toHaveBeenCalled();
      expect(customApply).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ left: "30px", top: "-4px" }),
      );
    });

    it("Given a custom applyStyles function returning void, When coordinates update, Then styles are applied without throwing", async () => {
      const customApply = vi.fn();

      await renderFixture(
        { applyStyles: customApply },
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 15, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(customApply).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ left: "15px", top: "-4px" }),
      );
    });

    it("Given applyStyles transitions to false, When observed, Then previously applied styles are removed from DOM", async () => {
      const applyStyles = ref(true);
      const { arrowDomEl } = await renderFixture(
        { applyStyles },
        {
          initialPlacement: "top",
          initialMiddlewareData: { arrow: { x: 15, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("15px");
      expect(arrowDomEl.style.bottom).toBe("-4px");

      applyStyles.value = false;
      await nextTick();

      expect(arrowDomEl.style.left).toBe("");
      expect(arrowDomEl.style.bottom).toBe("");
    });

    it("Given applyStyles transitions from false to true, When observed, Then styles are immediately applied to DOM", async () => {
      const applyStyles = ref(false);
      const { arrowDomEl } = await renderFixture(
        { applyStyles },
        {
          initialPlacement: "top",
          initialMiddlewareData: { arrow: { x: 15, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("");
      expect(arrowDomEl.style.bottom).toBe("");

      applyStyles.value = true;
      await nextTick();

      expect(arrowDomEl.style.left).toBe("15px");
      expect(arrowDomEl.style.bottom).toBe("-4px");
    });

    it("Given reactive offset ref changes, When observed, Then DOM style offset updates accordingly", async () => {
      const offset = ref("-4px");
      const { arrowDomEl } = await renderFixture(
        { offset },
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 10, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.top).toBe("-4px");

      offset.value = "-10px";
      await nextTick();

      expect(arrowDomEl.style.top).toBe("-10px");
    });
  });

  describe("Scenario: Stale style property removal on placement change", () => {
    it("Given placement changes from top to bottom, When observed on DOM element, Then bottom style is removed and top style is applied", async () => {
      const placementRef = ref<Placement>("top");
      const { arrowDomEl } = await renderFixture(
        {},
        {
          placement: placementRef,
          initialMiddlewareData: { arrow: { x: 12, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("12px");
      expect(arrowDomEl.style.bottom).toBe("-4px");
      expect(arrowDomEl.style.top).toBe("");

      placementRef.value = "bottom";
      await nextTick();

      expect(arrowDomEl.style.left).toBe("12px");
      expect(arrowDomEl.style.top).toBe("-4px");
      expect(arrowDomEl.style.bottom).toBe("");
    });

    it("Given placement changes from bottom to left, When observed on DOM element, Then horizontal and vertical properties swap cleanly", async () => {
      const placementRef = ref<Placement>("bottom");
      const { arrowDomEl } = await renderFixture(
        {},
        {
          placement: placementRef,
          initialMiddlewareData: { arrow: { x: 10, y: 15, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("10px");
      expect(arrowDomEl.style.top).toBe("-4px");
      expect(arrowDomEl.style.right).toBe("");

      placementRef.value = "left";
      await nextTick();

      expect(arrowDomEl.style.top).toBe("15px");
      expect(arrowDomEl.style.right).toBe("-4px");
      expect(arrowDomEl.style.left).toBe("");
    });
  });

  describe("Scenario: Dynamic element reassignment and element swapping", () => {
    it("Given an active arrow element with applied styles, When arrowEl ref transitions to a new element, Then previous element styles are removed and new element receives styles", async () => {
      const arrowElRef = ref<HTMLElement | null>(null);
      const firstArrowEl = document.createElement("div");
      const secondArrowEl = document.createElement("div");
      arrowElRef.value = firstArrowEl;

      await renderFixture(
        {},
        {
          customArrowEl: arrowElRef,
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 25, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(firstArrowEl.style.left).toBe("25px");
      expect(firstArrowEl.style.top).toBe("-4px");
      expect(secondArrowEl.style.left).toBe("");
      expect(secondArrowEl.style.top).toBe("");

      arrowElRef.value = secondArrowEl;
      await nextTick();

      expect(firstArrowEl.style.left).toBe("");
      expect(firstArrowEl.style.top).toBe("");
      expect(secondArrowEl.style.left).toBe("25px");
      expect(secondArrowEl.style.top).toBe("-4px");
    });
  });

  describe("Scenario: Lifecycle disposal and unmount cleanup", () => {
    it("Given a mounted component with applied arrow styles, When component is unmounted, Then applied inline styles are removed from the arrow element", async () => {
      const { view, arrowDomEl } = await renderFixture(
        {},
        {
          initialPlacement: "bottom",
          initialMiddlewareData: { arrow: { x: 20, y: 0, centerOffset: 0 } },
        },
      );
      await nextTick();

      expect(arrowDomEl.style.left).toBe("20px");
      expect(arrowDomEl.style.top).toBe("-4px");

      await view.unmount();
      await nextTick();

      expect(arrowDomEl.style.left).toBe("");
      expect(arrowDomEl.style.top).toBe("");
    });

    it("Given an active arrow middleware registration, When component is unmounted, Then arrow middleware is unregistered from the position pipeline", async () => {
      const { view, node } = await renderFixture();
      const internals = floatingInternals.get(node.id);
      expect(internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "arrow")).toBe(
        true,
      );

      await view.unmount();
      await nextTick();

      expect(internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "arrow")).toBe(
        false,
      );
    });
  });
});
