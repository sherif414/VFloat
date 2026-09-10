import type { Middleware, Placement } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, ref, useTemplateRef, type Ref } from "vue";
import { useArrow, useFloatingNode, usePosition, type UsePositionOptions } from "@/composables";
import { floatingInternals } from "@/composables/floating-tree/use-floating-node";
import { getTestEl, stubElementRect } from "@/test-utils";

interface FixtureConfig {
  withArrow?: boolean;
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
    if (config.withArrow) {
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

describe("usePosition", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("computes position from node refs without mutating open state", async () => {
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

  it("reacts to positioning options and middleware data", async () => {
    const placement = ref<Placement>("top");
    const middleware = createMiddleware("custom", { ok: true });
    const { position } = await renderPosition({
      placement,
      middlewares: [middleware],
    });

    await position.update();
    placement.value = "bottom";
    await nextTick();

    expect(position.middlewareData.value.custom).toEqual({ ok: true });
    expect(position.placement.value).toBeDefined();
  });

  it("creates built-in middleware from declarative options", async () => {
    const { node } = await renderPosition({
      middleware: {
        inline: true,
        offset: 8,
        flip: true,
        shift: { padding: 8 },
        matchWidth: true,
      },
    });

    expect(
      floatingInternals
        .get(node.id)
        ?.middlewareRegistry?.middlewares.value.map((middleware) => middleware.name),
    ).toEqual(["inline", "offset", "flip", "shift", "size"]);
  });

  it("appends custom middleware after declarative middleware", async () => {
    const middleware = createMiddleware("custom", { ok: true });
    const { node } = await renderPosition({
      middleware: {
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

  it("gates computation when disabled", async () => {
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

  it("registers arrow middleware through positioning", async () => {
    const { node } = await renderPosition({}, { withArrow: true });

    expect(node.refs.arrowEl.value).toBe(getTestEl("arrow"));
    expect(
      floatingInternals
        .get(node.id)
        ?.middlewareRegistry?.middlewares.value.some((middleware) => middleware.name === "arrow"),
    ).toBe(true);
  });

  it("stores placement and middlewareData in floatingInternals", async () => {
    const { node, position } = await renderPosition({ placement: "top" });

    const internals = floatingInternals.get(node.id);
    expect(internals?.placement).toBe(position.placement);
    expect(internals?.middlewareData).toBe(position.middlewareData);
  });
});
