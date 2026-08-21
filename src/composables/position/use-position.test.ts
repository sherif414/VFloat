import type { Middleware, Placement } from "@floating-ui/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { AnchorElement, FloatingElement } from "@/composables";
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

function createElement(tagName: string, rect: Partial<DOMRect> = {}) {
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
    scope = effectScope();
    anchorEl = createElement("button", {
      x: 10,
      y: 20,
      top: 20,
      left: 10,
      right: 50,
      bottom: 40,
    });
    floatingEl = createElement("div");
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("computes position from context refs without mutating open state", async () => {
    let position!: ReturnType<typeof usePosition>;
    let context!: ReturnType<typeof useFloatingContext>;
    const open = ref(true);

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
        open,
      });
      position = usePosition(context, {
        placement: "top",
        strategy: "fixed",
      });
    });

    await position.update();

    expect(context.state.open.value).toBe(true);
    expect(position.isPositioned.value).toBe(true);
    expect(position.strategy.value).toBe("fixed");
    expect(position.styles.value.position).toBe("fixed");
  });

  it("reacts to positioning options and middleware data", async () => {
    const placement = ref<Placement>("top");
    const middleware = createMiddleware("custom", { ok: true });
    let position!: ReturnType<typeof usePosition>;

    scope?.run(() => {
      const context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
      });
      position = usePosition(context, {
        placement,
        middlewares: [middleware],
      });
    });

    await position.update();
    placement.value = "bottom";
    await nextTick();

    expect(position.middlewareData.value.custom).toEqual({ ok: true });
    expect(position.placement.value).toBeDefined();
  });

  it("creates built-in middleware from declarative options", () => {
    let context!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
      });
      usePosition(context, {
        middleware: {
          inline: true,
          offset: 8,
          flip: true,
          shift: { padding: 8 },
          matchWidth: true,
        },
      });
    });

    expect(
      floatingInternals
        .get(context.id)
        ?.middlewareRegistry?.middlewares.value.map((middleware) => middleware.name),
    ).toEqual(["inline", "offset", "flip", "shift", "size"]);
  });

  it("appends custom middleware after declarative middleware", () => {
    const middleware = createMiddleware("custom", { ok: true });
    let context!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
      });
      usePosition(context, {
        middleware: {
          offset: 8,
          custom: [middleware],
        },
      });
    });

    expect(
      floatingInternals
        .get(context.id)
        ?.middlewareRegistry?.middlewares.value.map((middleware) => middleware.name),
    ).toEqual(["offset", "custom"]);
  });

  it("gates computation when disabled", async () => {
    const enabled = ref(false);
    const open = ref(true);
    let position!: ReturnType<typeof usePosition>;

    scope?.run(() => {
      const context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
        open,
      });
      position = usePosition(context, { enabled });
    });

    await position.update();
    expect(position.isPositioned.value).toBe(false);

    enabled.value = true;
    await nextTick();
    await position.update();

    expect(position.isPositioned.value).toBe(true);
  });

  it("registers arrow middleware through positioning", () => {
    const arrowEl = ref(createElement("div"));
    let context!: ReturnType<typeof useFloatingContext>;

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
    expect(
      floatingInternals
        .get(context.id)
        ?.middlewareRegistry?.middlewares.value.some((middleware) => middleware.name === "arrow"),
    ).toBe(true);
  });

  it("stores placement and middlewareData in floatingInternals", async () => {
    let position!: ReturnType<typeof usePosition>;
    let context!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
      });
      position = usePosition(context, { placement: "top" });
    });

    const internals = floatingInternals.get(context.id);
    expect(internals?.placement).toBe(position.placement);
    expect(internals?.middlewareData).toBe(position.middlewareData);
  });
});
