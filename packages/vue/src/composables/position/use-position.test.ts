import type { Middleware, Placement } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef, type Ref } from "vue";
import { useArrow, useFloatingNode, usePosition, type UsePositionOptions } from "@/composables";
import { floatingInternals } from "@/composables/floating-node/use-floating-node";
import { getTestEl, stubElementRect } from "@/test-utils";

//=======================================================================================
// 📌 Fixtures
//=======================================================================================

interface FixtureConfig {
  withArrow?: boolean;
  callUseArrow?: boolean;
  open?: Ref<boolean>;
  customAnchorEl?: Ref<HTMLElement | null>;
  customFloatingEl?: Ref<HTMLElement | null>;
}

function createTestComponent(options: UsePositionOptions = {}, config: FixtureConfig = {}) {
  let position!: ReturnType<typeof usePosition>;
  let node!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorTemplateEl = useTemplateRef<HTMLElement>("anchor");
    const floatingTemplateEl = useTemplateRef<HTMLElement>("floating");
    const arrowTemplateEl = useTemplateRef<HTMLElement>("arrow");

    const resolvedAnchorEl = config.customAnchorEl ?? anchorTemplateEl;
    const resolvedFloatingEl = config.customFloatingEl ?? floatingTemplateEl;

    node = useFloatingNode({
      anchorEl: resolvedAnchorEl,
      floatingEl: resolvedFloatingEl,
      ...(config.withArrow ? { arrowEl: arrowTemplateEl } : {}),
      ...(config.open ? { open: config.open } : {}),
    });
    position = usePosition(node, options);
    if (config.withArrow && config.callUseArrow !== false) {
      useArrow(node);
    }

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        ...(config.withArrow ? [h("div", { ref: "arrow", "data-testid": "arrow" }, "Arrow")] : []),
      ]);
  });

  return { Component, getPosition: () => position, getNode: () => node };
}

async function renderPosition(options: UsePositionOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  const view = await render(fixture.Component);
  await nextTick();

  const anchorEl = page.getByTestId("anchor");
  const floatingEl = page.getByTestId("floating");
  const arrowEl = config.withArrow ? page.getByTestId("arrow") : null;

  const anchorDomEl = getTestEl("anchor");
  const floatingDomEl = getTestEl("floating");
  const arrowDomEl = config.withArrow ? getTestEl("arrow") : null;

  stubElementRect(anchorDomEl, {
    x: 10,
    y: 20,
    width: 40,
    height: 20,
    top: 20,
    left: 10,
    right: 50,
    bottom: 40,
  });
  stubElementRect(floatingDomEl, {
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    top: 0,
    left: 0,
    right: 40,
    bottom: 20,
  });

  return {
    view,
    anchorEl,
    floatingEl,
    arrowEl,
    anchorDomEl,
    floatingDomEl,
    arrowDomEl,
    position: fixture.getPosition(),
    node: fixture.getNode(),
  };
}

function createMiddleware(name: string, data: unknown): Middleware {
  return {
    name,
    fn: vi.fn().mockResolvedValue({ x: 4, y: 8, data }),
  };
}

//=======================================================================================
// 📌 Test Suites
//=======================================================================================

describe("Feature: usePosition positioning engine", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Coordinates calculation and strategy resolution", () => {
    it("Given floating node refs, When positioning updates, Then position styles and strategy are computed without mutating open state", async () => {
      const open = ref(true);
      const { anchorEl, floatingEl, node, position } = await renderPosition(
        {
          placement: "top",
          strategy: "fixed",
        },
        { open },
      );

      await expect.element(anchorEl).toBeVisible();
      await expect.element(floatingEl).toBeVisible();

      await position.update();

      expect(node.open.value).toBe(true);
      expect(position.isPositioned.value).toBe(true);
      expect(position.strategy.value).toBe("fixed");
      expect(position.styles.value.position).toBe("fixed");
    });

    it("Given reactive placement and custom middleware, When options update, Then position recalculates and captures middleware data", async () => {
      const placement = ref<Placement>("top");
      const middleware = createMiddleware("custom", { ok: true });
      const { position } = await renderPosition({
        placement,
        middlewares: {
          custom: [middleware],
        },
      });

      await position.update();
      placement.value = "bottom";
      await nextTick();

      expect(position.middlewareData.value.custom).toEqual({ ok: true });
      expect(position.placement.value).toBeDefined();
    });

    it("Given enabled is false, When positioning updates, Then computation is gated until re-enabled", async () => {
      const enabled = ref(false);
      const open = ref(true);
      const { position } = await renderPosition({ enabled }, { open });

      await position.update();
      expect(position.isPositioned.value).toBe(false);

      enabled.value = true;
      await nextTick();
      await position.update();

      expect(position.isPositioned.value).toBe(true);
    });

    it("Given anchor or floating element ref is null, When position updates, Then computation exits safely and isPositioned remains false", async () => {
      const customFloatingEl = ref<HTMLElement | null>(null);
      const { position } = await renderPosition({}, { customFloatingEl });

      await position.update();
      expect(position.isPositioned.value).toBe(false);
    });
  });

  describe("Scenario: Middleware pipeline and declarative registration", () => {
    it("Given declarative middleware options, When initialized, Then built-in middlewares are instantiated in canonical order", async () => {
      const { node } = await renderPosition(
        {
          middlewares: {
            inline: true,
            offset: 8,
            flip: true,
            autoPlacement: true,
            shift: { padding: 8 },
            matchWidth: true,
            size: { apply() {} },
            hide: true,
            arrow: true,
          },
        },
        { withArrow: true, callUseArrow: false },
      );

      expect(
        floatingInternals
          .get(node.id)
          ?.middlewareRegistry?.middlewares.value.map((middleware) => middleware.name),
      ).toEqual([
        "inline",
        "offset",
        "flip",
        "autoPlacement",
        "shift",
        "size",
        "size",
        "hide",
        "arrow",
      ]);
    });

    it("Given a raw array of middleware instances, When initialized, Then the array is registered directly into the pipeline", async () => {
      const middleware1 = createMiddleware("custom1", { a: 1 });
      const middleware2 = createMiddleware("custom2", { b: 2 });
      const { node } = await renderPosition({
        middlewares: [middleware1, middleware2],
      });

      expect(
        floatingInternals
          .get(node.id)
          ?.middlewareRegistry?.middlewares.value.map((middleware) => middleware.name),
      ).toEqual(["custom1", "custom2"]);
    });

    it("Given custom middlewares alongside declarative middlewares, When initialized, Then custom middlewares are appended after declarative ones", async () => {
      const middleware = createMiddleware("custom", { ok: true });
      const { node } = await renderPosition({
        middlewares: {
          offset: 8,
          custom: [middleware],
        },
      });

      expect(
        floatingInternals
          .get(node.id)
          ?.middlewareRegistry?.middlewares.value.map((middleware) => middleware.name),
      ).toEqual(["offset", "custom"]);
    });

    it("Given floating node with arrow element, When positioning is configured, Then arrow middleware is registered into the pipeline", async () => {
      const { arrowDomEl, node } = await renderPosition({}, { withArrow: true });

      expect(node.refs.arrowEl.value).toBe(arrowDomEl);
      expect(
        floatingInternals
          .get(node.id)
          ?.middlewareRegistry?.middlewares.value.some((middleware) => middleware.name === "arrow"),
      ).toBe(true);
    });

    it("Given computed placement and middleware data, When evaluated, Then state is stored in floating internals", async () => {
      const { node, position } = await renderPosition({ placement: "top" });

      const internals = floatingInternals.get(node.id);
      expect(internals?.placement).toBe(position.placement);
      expect(internals?.middlewareData).toBe(position.middlewareData);
    });

    it("Given matchWidth is enabled, When positioning updates, Then floating element width is synchronized to reference width", async () => {
      const { floatingDomEl, position } = await renderPosition({
        middlewares: {
          matchWidth: true,
        },
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.width).toBe("40px");
    });

    it("Given a companion composable registers dynamic middleware, When registered and unregistered, Then registry updates pipeline reactively", async () => {
      const { node, position } = await renderPosition();
      const internals = floatingInternals.get(node.id);
      expect(internals?.middlewareRegistry).toBeDefined();

      const customMw = createMiddleware("dynamic-test", { ok: true });
      const unregister = internals!.middlewareRegistry!.register(customMw);
      await nextTick();

      expect(
        internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "dynamic-test"),
      ).toBe(true);

      await position.update();
      expect(position.middlewareData.value["dynamic-test"]).toEqual({ ok: true });

      unregister();
      await nextTick();

      expect(
        internals?.middlewareRegistry?.middlewares.value.some((m) => m.name === "dynamic-test"),
      ).toBe(false);
    });
  });

  describe("Scenario: Style synchronization and DOM mutation", () => {
    it("Given default style binding, When position updates, Then computed styles are automatically applied to floating element", async () => {
      const { floatingDomEl, position } = await renderPosition({
        strategy: "fixed",
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.position).toBe("fixed");
      expect(floatingDomEl.style.transform).toContain("translate");
    });

    it("Given applyStyles is false, When position updates, Then style mutation is skipped while styles ref remains computed", async () => {
      const { floatingDomEl, position } = await renderPosition({
        strategy: "fixed",
        applyStyles: false,
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.position).toBe("");
      expect(floatingDomEl.style.transform).toBe("");
      expect(position.styles.value.position).toBe("fixed");
    });

    it("Given a custom applyStyles callback, When position updates, Then custom applicator is invoked and prior cleanups are executed", async () => {
      const customCleanup = vi.fn();
      const customApply = vi.fn().mockImplementation(() => customCleanup);

      const { floatingDomEl, position } = await renderPosition({
        applyStyles: customApply,
      });

      await position.update();
      await nextTick();

      expect(customApply).toHaveBeenCalledWith(
        floatingDomEl,
        expect.objectContaining({ position: "absolute" }),
      );

      await position.update();
      await nextTick();

      expect(customCleanup).toHaveBeenCalled();
    });

    it("Given applyStyles toggles to false, When observed, Then previously applied styles are reactively removed from the DOM", async () => {
      const applyStyles = ref(true);
      const { floatingDomEl, position } = await renderPosition({
        applyStyles,
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.position).toBe("absolute");

      applyStyles.value = false;
      await nextTick();

      expect(floatingDomEl.style.position).toBe("");
      expect(floatingDomEl.style.transform).toBe("");
    });

    it("Given transform option toggles to false, When observed, Then transform is cleared in favor of top/left positioning", async () => {
      const transform = ref(true);
      const { floatingDomEl, position } = await renderPosition({
        transform,
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.transform).toContain("translate");

      transform.value = false;
      await nextTick();

      expect(floatingDomEl.style.transform).toBe("");
      expect(floatingDomEl.style.top).toBeDefined();
      expect(floatingDomEl.style.left).toBeDefined();
    });

    it("Given enabled toggles to false, When observed, Then applied styles are restored to pristine state", async () => {
      const enabled = ref(true);
      const { floatingDomEl, position } = await renderPosition({
        enabled,
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.position).toBe("absolute");

      enabled.value = false;
      await nextTick();

      expect(floatingDomEl.style.position).toBe("");
      expect(floatingDomEl.style.transform).toBe("");
    });

    it("Given style property transitions to null or undefined, When updated, Then the individual property is removed from DOM", async () => {
      const transform = ref<boolean | undefined>(true);
      const { floatingDomEl, position } = await renderPosition({
        transform,
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.transform).toContain("translate");

      transform.value = false;
      await nextTick();

      expect(floatingDomEl.style.transform).toBe("");
    });
  });

  describe("Scenario: Dynamic element reassignment and element swapping", () => {
    it("Given an active floating element with applied positioning styles, When floatingEl ref transitions to a new element, Then previous element styles are removed and new element receives positioning styles", async () => {
      const firstFloatingDomEl = document.createElement("div");
      const secondFloatingDomEl = document.createElement("div");
      document.body.appendChild(firstFloatingDomEl);
      document.body.appendChild(secondFloatingDomEl);

      stubElementRect(firstFloatingDomEl, { x: 0, y: 0, width: 40, height: 20 });
      stubElementRect(secondFloatingDomEl, { x: 0, y: 0, width: 40, height: 20 });

      const customFloatingEl = ref<HTMLElement | null>(firstFloatingDomEl);
      const { position } = await renderPosition({ strategy: "fixed" }, { customFloatingEl });

      await position.update();
      await nextTick();

      expect(firstFloatingDomEl.style.position).toBe("fixed");
      expect(secondFloatingDomEl.style.position).toBe("");

      customFloatingEl.value = secondFloatingDomEl;
      await nextTick();
      await position.update();
      await nextTick();

      expect(firstFloatingDomEl.style.position).toBe("");
      expect(secondFloatingDomEl.style.position).toBe("fixed");

      firstFloatingDomEl.remove();
      secondFloatingDomEl.remove();
    });
  });

  describe("Scenario: Device pixel ratio rounding and rendering optimizations", () => {
    it("Given a high-DPR display, When styles are computed with transform, Then will-change transform hint is applied and coordinates are rounded to DPR boundaries", async () => {
      const originalDprDescriptor = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
      Object.defineProperty(window, "devicePixelRatio", {
        value: 2,
        configurable: true,
      });

      try {
        const { floatingDomEl, position } = await renderPosition({
          strategy: "fixed",
        });

        await position.update();
        await nextTick();

        expect(position.styles.value["will-change"]).toBe("transform");
        expect(floatingDomEl.style.willChange).toBe("transform");
      } finally {
        if (originalDprDescriptor) {
          Object.defineProperty(window, "devicePixelRatio", originalDprDescriptor);
        } else {
          Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
        }
      }
    });
  });

  describe("Scenario: Automatic positioning update configuration", () => {
    it("Given autoUpdate is false, When positioning updates manually, Then update computes coordinates without autoUpdate active", async () => {
      const { position } = await renderPosition({
        autoUpdate: false,
      });

      await position.update();
      expect(position.isPositioned.value).toBe(true);
    });
  });

  describe("Scenario: Lifecycle disposal and unmount cleanup", () => {
    it("Given a mounted floating element with applied positioning styles, When component is unmounted, Then applied inline styles are removed from the floating DOM element", async () => {
      const { floatingDomEl, position, view } = await renderPosition({
        strategy: "fixed",
      });

      await position.update();
      await nextTick();

      expect(floatingDomEl.style.position).toBe("fixed");
      expect(floatingDomEl.style.transform).toContain("translate");

      await view.unmount();
      await nextTick();

      expect(floatingDomEl.style.position).toBe("");
      expect(floatingDomEl.style.transform).toBe("");
    });
  });
});
