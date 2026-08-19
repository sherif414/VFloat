import type { MiddlewareArguments } from "@floating-ui/dom";
import { platform } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { arrow } from "./arrow";

const trackedElements: HTMLElement[] = [];

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

describe("arrow middleware", () => {
  afterEach(() => {
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("exposes the arrow middleware name and options", () => {
    const arrowEl = ref<HTMLElement | null>(null);
    const middleware = arrow({ element: arrowEl, padding: 5 });

    expect(middleware.name).toBe("arrow");
    expect(middleware.options).toEqual({ element: arrowEl, padding: 5 });
  });

  it("returns an empty object when arrow element is null", async () => {
    const arrowEl = ref<HTMLElement | null>(null);
    const middleware = arrow({ element: arrowEl });

    const mockArgs = {
      x: 0,
      y: 0,
      initialPlacement: "bottom",
      placement: "bottom",
      strategy: "absolute",
      middlewareData: {},
      rects: {
        reference: { x: 0, y: 0, width: 100, height: 50 },
        floating: { x: 0, y: 50, width: 200, height: 100 },
      },
      platform,
      elements: {
        reference: document.createElement("button"),
        floating: document.createElement("div"),
      },
    } as unknown as MiddlewareArguments;

    const result = await middleware.fn(mockArgs);
    expect(result).toEqual({});
  });

  it("delegates to Floating UI arrow when element is provided", async () => {
    const arrowEl = trackElement(document.createElement("div"));
    document.body.appendChild(arrowEl);
    Object.defineProperty(arrowEl, "offsetWidth", { value: 10, configurable: true });
    Object.defineProperty(arrowEl, "offsetHeight", { value: 10, configurable: true });

    const middleware = arrow({ element: ref(arrowEl), padding: 4 });

    const mockArgs = {
      x: 0,
      y: 50,
      initialPlacement: "bottom",
      placement: "bottom",
      strategy: "absolute",
      middlewareData: {},
      rects: {
        reference: { x: 0, y: 0, width: 100, height: 50 },
        floating: { x: 0, y: 50, width: 200, height: 100 },
      },
      platform,
      elements: {
        reference: document.createElement("button"),
        floating: document.createElement("div"),
      },
    } as unknown as MiddlewareArguments;

    const result = await middleware.fn(mockArgs);
    expect(result.data).toBeDefined();
    expect(result.data).toHaveProperty("x");
  });
});
