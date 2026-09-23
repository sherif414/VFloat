import type { MiddlewareArguments } from "@floating-ui/dom";
import { platform } from "@floating-ui/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { arrow } from "./arrow";

const cleanupElements: HTMLElement[] = [];

describe("Feature: Arrow positioning middleware", () => {
  afterEach(() => {
    for (const el of cleanupElements) {
      el.remove();
    }
    cleanupElements.length = 0;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Middleware metadata and options normalization", () => {
    it("Given middleware options, When instantiated, Then exposes the arrow middleware name and options", () => {
      const arrowEl = ref<HTMLElement | null>(null);
      const middleware = arrow({ element: arrowEl, padding: 5 });

      expect(middleware.name).toBe("arrow");
      expect(middleware.options).toEqual({ element: arrowEl, padding: 5 });
    });
  });

  describe("Scenario: Arrow positioning execution and null element safety", () => {
    it("Given arrow element ref is null, When middleware runs, Then returns an empty object without computation", async () => {
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

    it("Given arrow element is provided, When middleware runs, Then computes arrow offset coordinates via underlying positioning engine", async () => {
      const arrowEl = document.createElement("div");
      document.body.appendChild(arrowEl);
      cleanupElements.push(arrowEl);
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
});
