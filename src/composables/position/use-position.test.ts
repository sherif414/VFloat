import type { Middleware, Placement } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { nextTick, ref } from "vue";
import { getFloatingInternals, useArrow, useFloatingContext, usePosition } from "@/composables";
import type { AnchorElement, FloatingElement } from "@/composables";

const elements: HTMLElement[] = [];

function createElement(tagName: string, rect: Partial<DOMRect> = {}) {
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

function createMiddleware(name: string, data: unknown): Middleware {
  return {
    name,
    fn: vi.fn().mockResolvedValue({ x: 4, y: 8, data }),
  };
}

describe("usePosition", () => {
  let anchorEl: HTMLElement;
  let floatingEl: HTMLElement;

  beforeEach(() => {
    anchorEl = createElement("button", { x: 10, y: 20, top: 20, left: 10, right: 50, bottom: 40 });
    floatingEl = createElement("div");
  });

  afterEach(() => {
    for (const el of elements.splice(0)) el.remove();
    vi.restoreAllMocks();
  });

  it("computes position from context refs without mutating open state", async () => {
    const context = useFloatingContext(
      ref<AnchorElement>(anchorEl),
      ref<FloatingElement>(floatingEl),
    );
    const position = usePosition(context, { placement: "top", strategy: "fixed" });

    await position.update();

    expect(context.state.open.value).toBe(false);
    expect(position.isPositioned.value).toBe(true);
    expect(position.strategy.value).toBe("fixed");
    expect(position.styles.value.position).toBe("fixed");
  });

  it("reacts to positioning options and middleware data", async () => {
    const placement = ref<Placement>("top");
    const middleware = createMiddleware("custom", { ok: true });
    const context = useFloatingContext(
      ref<AnchorElement>(anchorEl),
      ref<FloatingElement>(floatingEl),
    );
    const position = usePosition(context, { placement, middlewares: [middleware] });

    await position.update();
    placement.value = "bottom";
    await nextTick();

    expect(position.middlewareData.value.custom).toEqual({ ok: true });
    expect(position.placement.value).toBeDefined();
  });

  it("gates computation when disabled", async () => {
    const enabled = ref(false);
    const context = useFloatingContext(
      ref<AnchorElement>(anchorEl),
      ref<FloatingElement>(floatingEl),
    );
    const position = usePosition(context, { enabled });

    await position.update();
    expect(position.isPositioned.value).toBe(false);

    enabled.value = true;
    await nextTick();
    await position.update();

    expect(position.isPositioned.value).toBe(true);
  });

  it("registers arrow middleware through positioning", () => {
    const context = useFloatingContext(
      ref<AnchorElement>(anchorEl),
      ref<FloatingElement>(floatingEl),
    );
    const position = usePosition(context);
    const arrowEl = ref(createElement("div"));

    useArrow(context, position, { element: arrowEl });

    expect(context.refs.arrowEl.value).toBe(arrowEl.value);
    expect(
      getFloatingInternals(position)?.middlewareRegistry?.middlewares.value.some(
        (middleware) => middleware.name === "arrow",
      ),
    ).toBe(true);
  });
});
