import type { Middleware, Placement } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, ref, useTemplateRef, type Ref } from "vue";
import { useArrow, useFloatingNode, usePosition, type UsePositionOptions } from "@/composables";
import { floatingInternals } from "@/composables/floating-node/use-floating-node";
import { getTestEl, stubElementRect } from "@/test-utils";

interface FixtureConfig {
  withArrow?: boolean;
  callUseArrow?: boolean;
  open?: Ref<boolean>;
}

function createTestComponent(options: UsePositionOptions = {}, config: FixtureConfig = {}) {
  let position!: ReturnType<typeof usePosition>;
  let node!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const arrowEl = useTemplateRef<HTMLElement>("arrow");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      ...(config.withArrow ? { arrowEl } : {}),
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
  await render(fixture.Component);
  await nextTick();
  const anchorEl = getTestEl("anchor");
  const floatingEl = getTestEl("floating");
  stubElementRect(anchorEl, {
    x: 10,
    y: 20,
    width: 40,
    height: 20,
    top: 20,
    left: 10,
    right: 50,
    bottom: 40,
  });
  stubElementRect(floatingEl, {
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
    anchorEl,
    floatingEl,
    arrowEl: config.withArrow ? getTestEl("arrow") : null,
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

describe("Feature: usePosition positioning engine", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Coordinates calculation and strategy resolution", () => {
    it("Given floating node refs, When positioning updates, Then position styles and strategy are computed without mutating open state", async () => {
      const open = ref(true);
      const { node, position } = await renderPosition(
        {
          placement: "top",
          strategy: "fixed",
        },
        { open },
      );

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
      const { node } = await renderPosition({}, { withArrow: true });

      expect(node.refs.arrowEl.value).toBe(getTestEl("arrow"));
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
  });

  describe("Scenario: Style synchronization and DOM mutation", () => {
    it("Given default style binding, When position updates, Then computed styles are automatically applied to floating element", async () => {
      const { floatingEl, position } = await renderPosition({
        strategy: "fixed",
      });

      await position.update();
      await nextTick();

      expect(floatingEl.style.position).toBe("fixed");
      expect(floatingEl.style.transform).toContain("translate");
    });

    it("Given applyStyles is false, When position updates, Then style mutation is skipped while styles ref remains computed", async () => {
      const { floatingEl, position } = await renderPosition({
        strategy: "fixed",
        applyStyles: false,
      });

      await position.update();
      await nextTick();

      expect(floatingEl.style.position).toBe("");
      expect(floatingEl.style.transform).toBe("");
      expect(position.styles.value.position).toBe("fixed");
    });

    it("Given a custom applyStyles callback, When position updates, Then custom applicator is invoked and prior cleanups are executed", async () => {
      const customCleanup = vi.fn();
      const customApply = vi.fn().mockImplementation(() => customCleanup);

      const { floatingEl, position } = await renderPosition({
        applyStyles: customApply,
      });

      await position.update();
      await nextTick();

      expect(customApply).toHaveBeenCalledWith(
        floatingEl,
        expect.objectContaining({ position: "absolute" }),
      );

      await position.update();
      await nextTick();

      expect(customCleanup).toHaveBeenCalled();
    });

    it("Given applyStyles toggles to false, When observed, Then previously applied styles are reactively removed from the DOM", async () => {
      const applyStyles = ref(true);
      const { floatingEl, position } = await renderPosition({
        applyStyles,
      });

      await position.update();
      await nextTick();

      expect(floatingEl.style.position).toBe("absolute");

      applyStyles.value = false;
      await nextTick();

      expect(floatingEl.style.position).toBe("");
      expect(floatingEl.style.transform).toBe("");
    });

    it("Given transform option toggles to false, When observed, Then transform is cleared in favor of top/left positioning", async () => {
      const transform = ref(true);
      const { floatingEl, position } = await renderPosition({
        transform,
      });

      await position.update();
      await nextTick();

      expect(floatingEl.style.transform).toContain("translate");

      transform.value = false;
      await nextTick();

      expect(floatingEl.style.transform).toBe("");
      expect(floatingEl.style.top).toBeDefined();
      expect(floatingEl.style.left).toBeDefined();
    });

    it("Given enabled toggles to false, When observed, Then applied styles are restored to pristine state", async () => {
      const enabled = ref(true);
      const { floatingEl, position } = await renderPosition({
        enabled,
      });

      await position.update();
      await nextTick();

      expect(floatingEl.style.position).toBe("absolute");

      enabled.value = false;
      await nextTick();

      expect(floatingEl.style.position).toBe("");
      expect(floatingEl.style.transform).toBe("");
    });

    it("Given style property transitions to null or undefined, When updated, Then the individual property is removed from DOM", async () => {
      const transform = ref<boolean | undefined>(true);
      const { floatingEl, position } = await renderPosition({
        transform,
      });

      await position.update();
      await nextTick();

      expect(floatingEl.style.transform).toContain("translate");

      transform.value = false;
      await nextTick();

      expect(floatingEl.style.transform).toBe("");
    });
  });
});
