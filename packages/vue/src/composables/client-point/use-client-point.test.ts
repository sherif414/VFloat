import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, onMounted, ref, shallowRef, useTemplateRef } from "vue";
import {
  type AnchorElement,
  type FloatingElement,
  type FloatingNode,
  useFloatingNode,
} from "@/composables";
import {
  type UseClientPointOptions,
  useClientPoint,
} from "@/composables/client-point/use-client-point";
import { isVirtualElement } from "@/shared/dom";
import { getTestEl, makeDOMRect, makePointerEvent } from "@/test-utils";
import { FollowTracker, StaticTracker } from "./tracking-strategies";
import { createVirtualElement } from "./virtual-element-factory";

const createPointerEventData = (
  type: "pointerdown" | "pointermove" | "pointerenter",
  coordinates: { x: number; y: number },
  pointerType: string = "mouse",
) => ({
  type,
  coordinates,
  originalEvent: makePointerEvent(type, {
    pointerType,
    clientX: coordinates.x,
    clientY: coordinates.y,
  }),
});

interface FixtureConfig {
  initialAnchor?: HTMLElement | null;
}

function createTestComponent(
  options: Partial<UseClientPointOptions> = {},
  config: FixtureConfig = {},
) {
  const open = ref(false);
  // Writable mirror so tests can swap or clear the tracking target mid-flight.
  const trackingAreaRef = shallowRef<HTMLElement | null>(null);
  let node!: FloatingNode;
  let result!: ReturnType<typeof useClientPoint>;

  const Component = defineComponent(() => {
    const trackingTemplateEl = useTemplateRef<HTMLElement>("tracking-area");

    node = useFloatingNode({
      anchorEl: ref<AnchorElement>(config.initialAnchor ?? null),
      floatingEl: ref<FloatingElement>(null),
      open,
    });
    result = useClientPoint(node, {
      trackingAreaEl: trackingAreaRef,
      ...options,
    });

    onMounted(() => {
      trackingAreaRef.value = trackingTemplateEl.value;
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("div", { ref: "tracking-area", "data-testid": "tracking-area" }, "Tracking area"),
        h("div", { "data-testid": "spare-target" }, "Spare target"),
      ]);
  });

  return { Component, getNode: () => node, getResult: () => result, open, trackingAreaRef };
}

async function renderClientPoint(
  options: Partial<UseClientPointOptions> = {},
  config: FixtureConfig = {},
) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  const result = fixture.getResult();
  return {
    open: fixture.open,
    node: fixture.getNode(),
    coordinates: result.coordinates,
    trackingAreaEl: getTestEl("tracking-area"),
    spareEl: getTestEl("spare-target"),
    trackingAreaRef: fixture.trackingAreaRef,
  };
}

describe("Feature: useClientPoint virtual anchor tracking", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Virtual element factory and geometry", () => {
    it("Given coordinates and a reference element, When creating a virtual element, Then it exposes matching bounding client rect dimensions", () => {
      const reference = document.createElement("div");
      const referenceRect = makeDOMRect(10, 20, 120, 40);
      const getBoundingClientRectSpy = vi
        .spyOn(reference, "getBoundingClientRect")
        .mockReturnValue(referenceRect);

      const virtualElement = createVirtualElement({
        coordinates: { x: 150, y: 260 },
        trackingTarget: reference,
      });

      const rect = virtualElement.getBoundingClientRect();
      expect(rect.x).toBe(150);
      expect(rect.y).toBe(260);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
      expect(getBoundingClientRectSpy).toHaveBeenCalled();
    });

    it("Given partial coordinates with baseline coordinates, When calculating rect, Then it falls back to baseline values", () => {
      const reference = document.createElement("div");
      const referenceRect = makeDOMRect(5, 15, 200, 80);
      vi.spyOn(reference, "getBoundingClientRect").mockReturnValue(referenceRect);

      const virtualElement = createVirtualElement({
        coordinates: { x: null, y: 220 },
        baselineCoordinates: { x: 120, y: null },
        trackingTarget: reference,
      });

      const rect = virtualElement.getBoundingClientRect();
      expect(rect.x).toBe(120);
      expect(rect.y).toBe(220);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
    });

    it("Given virtual element coordinates, When invoking getClientRects, Then it returns a single-item DOMRect array", () => {
      const virtualEl = createVirtualElement({
        coordinates: { x: 150, y: 250 },
        trackingTarget: null,
      });

      expect(typeof virtualEl.getClientRects).toBe("function");
      const rects = virtualEl.getClientRects?.();
      expect(Array.isArray(rects)).toBe(true);
      expect(rects).toHaveLength(1);
      expect(rects?.[0].x).toBe(150);
      expect(rects?.[0].y).toBe(250);
    });
  });

  describe("Scenario: FollowTracker pointer event evaluation", () => {
    it("Given a FollowTracker, When a pointerdown event occurs regardless of open state, Then it returns the pointer coordinates", () => {
      const tracker = new FollowTracker();
      const event = createPointerEventData("pointerdown", { x: 80, y: 120 });

      const result = tracker.process(event, { isOpen: false });

      expect(result).toEqual({ x: 80, y: 120 });
    });

    it("Given a FollowTracker, When pointermove events occur, Then it returns coordinates only when open and pointer is mouse-like", () => {
      const tracker = new FollowTracker();
      const mouseEvent = createPointerEventData("pointermove", { x: 40, y: 60 });
      const touchEvent = createPointerEventData("pointermove", { x: 50, y: 70 }, "touch");

      expect(tracker.process(mouseEvent, { isOpen: false })).toBeNull();
      expect(tracker.process(touchEvent, { isOpen: true })).toBeNull();
      expect(tracker.process(mouseEvent, { isOpen: true })).toEqual({
        x: 40,
        y: 60,
      });
    });
  });

  describe("Scenario: StaticTracker trigger coordinate capture and lifecycle", () => {
    it("Given a StaticTracker, When pointerdown occurs while closed, Then it stores coordinates and exposes them upon opening", () => {
      const tracker = new StaticTracker();
      const pointerdown = createPointerEventData("pointerdown", {
        x: 200,
        y: 300,
      });

      const resultWhenClosed = tracker.process(pointerdown, { isOpen: false });
      expect(resultWhenClosed).toBeNull();
      expect(tracker.getCoordinatesForOpening()).toEqual({ x: 200, y: 300 });

      const resultWhenOpen = tracker.process(pointerdown, { isOpen: true });
      expect(resultWhenOpen).toEqual({ x: 200, y: 300 });
    });

    it("Given a StaticTracker, When pointerenter occurs while closed, Then it captures coordinates for hover-open flows", () => {
      const tracker = new StaticTracker();
      const pointerenter = createPointerEventData("pointerenter", {
        x: 140,
        y: 240,
      });

      expect(tracker.process(pointerenter, { isOpen: false })).toBeNull();
      expect(tracker.getCoordinatesForOpening()).toEqual({ x: 140, y: 240 });
    });

    it("Given a StaticTracker with stored hover coordinates, When reset is called, Then coordinates are cleared", () => {
      const tracker = new StaticTracker();
      const hover = createPointerEventData("pointermove", { x: 90, y: 110 });

      expect(tracker.process(hover, { isOpen: false })).toBeNull();
      expect(tracker.getCoordinatesForOpening()).toEqual({ x: 90, y: 110 });

      tracker.reset();
      expect(tracker.getCoordinatesForOpening()).toBeNull();
    });

    it("Given a StaticTracker with stored coordinates, When onClose is called, Then stored coordinates are cleared", () => {
      const tracker = new StaticTracker();
      const pointerdown = createPointerEventData("pointerdown", {
        x: 200,
        y: 300,
      });

      tracker.process(pointerdown, { isOpen: false });
      tracker.onClose();

      expect(tracker.getCoordinatesForOpening()).toBeNull();
    });
  });

  describe("Scenario: Default initialization and basic coordination", () => {
    it("Given default options, When initialized, Then coordinates are null", async () => {
      const { coordinates } = await renderClientPoint();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });

    it("Given no tracking area element, When open and pointer moves on document, Then it tracks relative to documentElement", async () => {
      const { coordinates, node, open } = await renderClientPoint({
        trackingMode: "follow",
        trackingAreaEl: undefined,
      });

      open.value = true;
      await nextTick();

      document.documentElement.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      const virtualAnchor = node.refs.anchorEl.value;
      expect(coordinates.value).toEqual({ x: 100, y: 200 });
      expect(isVirtualElement(virtualAnchor)).toBe(true);
      expect((virtualAnchor as Exclude<AnchorElement, HTMLElement | null>).contextElement).toBe(
        document.documentElement,
      );
    });

    it("Given invalid coordinates like NaN or undefined, When sanitized, Then coordinates resolve to null", async () => {
      const { coordinates } = await renderClientPoint({
        x: Number.NaN,
        y: undefined,
      });

      await nextTick();
      expect(coordinates.value).toEqual({ x: null, y: null });
    });

    it("Given external coordinates during initialization, When rendered, Then it uses the external coordinates", async () => {
      const { coordinates } = await renderClientPoint({
        x: 100,
        y: 200,
      });

      await nextTick();
      expect(coordinates.value).toEqual({ x: 100, y: 200 });
    });

    it("Given a disabled useClientPoint instance, When pointer events occur, Then coordinates remain null and anchorEl is cleared", async () => {
      const originalAnchorEl = document.createElement("button");
      const { coordinates, node, trackingAreaEl } = await renderClientPoint(
        {
          enabled: false,
        },
        { initialAnchor: originalAnchorEl },
      );

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerenter", {
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(coordinates.value).toEqual({ x: null, y: null });
      expect(node.refs.anchorEl.value).toBeNull();
    });
  });

  describe("Scenario: Follow tracking mode cursor tracking", () => {
    it("Given follow mode, When open and cursor moves across the tracking area, Then coordinates update on every move", async () => {
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "follow",
      });

      open.value = true;
      await nextTick();

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 150,
          clientY: 250,
        }),
      );

      expect(coordinates.value).toEqual({ x: 150, y: 250 });
    });
  });

  describe("Scenario: Static tracking mode lifecycle and trigger precedence", () => {
    it("Given static mode, When closing and reopening, Then coordinates reset and capture the new trigger point", async () => {
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 100,
          clientY: 200,
        }),
      );

      open.value = true;
      await nextTick();
      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      open.value = false;
      await nextTick();
      expect(coordinates.value).toEqual({ x: null, y: null });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 150,
          clientY: 250,
        }),
      );

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: 150, y: 250 });
    });

    it("Given static mode, When pointermove followed by pointerdown occurs, Then it prioritizes pointerdown coordinates", async () => {
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
        }),
      );

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: 500, y: 300 });
    });

    it("Given static mode, When pointer moves after pointerdown before opening, Then it retains the trigger coordinates", async () => {
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
        }),
      );

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 150,
          clientY: 220,
        }),
      );

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: 500, y: 300 });
    });

    it("Given static mode, When opened via hover without movement, Then it uses pointerenter coordinates", async () => {
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerenter", {
          clientX: 320,
          clientY: 180,
        }),
      );

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: 320, y: 180 });
    });

    it("Given static mode, When closed, Then it does not reuse stale coordinates on subsequent open without new trigger", async () => {
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
        }),
      );

      open.value = true;
      await nextTick();
      expect(coordinates.value).toEqual({ x: 500, y: 300 });

      open.value = false;
      await nextTick();
      expect(coordinates.value).toEqual({ x: null, y: null });

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });

    it("Given static mode with pending coordinates, When opened while disabled, Then coordinates remain null", async () => {
      const enabled = ref(true);
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        enabled,
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
        }),
      );

      enabled.value = false;
      await nextTick();

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });

    it("Given static mode with pending coordinates, When disabled and closed, Then pending coordinates are cleared", async () => {
      const enabled = ref(true);
      const { coordinates, open, trackingAreaEl } = await renderClientPoint({
        enabled,
        trackingMode: "static",
      });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
        }),
      );

      open.value = true;
      await nextTick();
      expect(coordinates.value).toEqual({ x: 500, y: 300 });

      enabled.value = false;
      await nextTick();

      open.value = false;
      await nextTick();
      expect(coordinates.value).toEqual({ x: null, y: null });

      enabled.value = true;
      await nextTick();

      open.value = true;
      await nextTick();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });
  });

  describe("Scenario: External coordinates override and reactivity", () => {
    it("Given explicit external coordinates, When pointer events occur, Then pointer tracking is ignored", async () => {
      const { coordinates, trackingAreaEl } = await renderClientPoint({
        x: 100,
        y: 200,
      });

      await nextTick();
      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerenter", {
          clientX: 150,
          clientY: 250,
        }),
      );

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointerdown", {
          clientX: 200,
          clientY: 300,
        }),
      );

      expect(coordinates.value).toEqual({ x: 100, y: 200 });
    });

    it("Given reactive external coordinates, When coordinate refs change, Then coordinates reactively update", async () => {
      const externalX = ref(100);
      const externalY = ref(200);

      const { coordinates } = await renderClientPoint({
        x: externalX,
        y: externalY,
      });

      await nextTick();
      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      externalX.value = 300;
      externalY.value = 400;

      await nextTick();
      expect(coordinates.value).toEqual({ x: 300, y: 400 });
    });
  });

  describe("Scenario: Virtual anchor element creation and reactive area binding", () => {
    it("Given follow mode, When coordinates change while open, Then it creates a virtual anchor with getBoundingClientRect", async () => {
      const { node, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "follow",
      });

      open.value = true;
      await nextTick();

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(node.refs.anchorEl.value).toBeDefined();
      expect(node.refs.anchorEl.value?.getBoundingClientRect).toBeDefined();
    });

    it("Given follow mode, When closed and pointer moves, Then anchor element is not updated", async () => {
      const { node, open, trackingAreaEl } = await renderClientPoint({
        trackingMode: "follow",
      });

      open.value = false;
      await nextTick();

      const initialAnchor = node.refs.anchorEl.value;

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(node.refs.anchorEl.value).toBe(initialAnchor);
    });

    it("Given an active virtual anchor, When tracking area ref changes, Then contextElement updates to the new element", async () => {
      const { node, open, spareEl, trackingAreaEl, trackingAreaRef } = await renderClientPoint({
        trackingMode: "follow",
      });

      open.value = true;
      await nextTick();

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      const initialVirtualElement = node.refs.anchorEl.value;
      expect(initialVirtualElement).toBeDefined();
      expect(isVirtualElement(initialVirtualElement)).toBe(true);
      expect(
        (initialVirtualElement as Exclude<AnchorElement, HTMLElement | null>).contextElement,
      ).toBe(trackingAreaEl);

      trackingAreaRef.value = spareEl;
      await nextTick();

      const updatedVirtualElement = node.refs.anchorEl.value;
      expect(updatedVirtualElement).toBeDefined();
      expect(isVirtualElement(updatedVirtualElement)).toBe(true);
      expect(
        (updatedVirtualElement as Exclude<AnchorElement, HTMLElement | null>).contextElement,
      ).toBe(spareEl);
    });

    it("Given null tracking area ref, When pointer moves, Then contextElement falls back to documentElement", async () => {
      const { coordinates, node, open, trackingAreaRef } = await renderClientPoint({
        trackingMode: "follow",
      });
      trackingAreaRef.value = null;

      open.value = true;
      await nextTick();

      document.documentElement.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      const virtualAnchor = node.refs.anchorEl.value;
      expect(virtualAnchor).toBeDefined();
      expect(isVirtualElement(virtualAnchor)).toBe(true);
      expect((virtualAnchor as Exclude<AnchorElement, HTMLElement | null>).contextElement).toBe(
        document.documentElement,
      );
      expect(coordinates.value).toEqual({ x: 100, y: 200 });
    });

    it("Given active tracking, When tracking area changes, Then existing coordinates are preserved", async () => {
      const { coordinates, node, open, spareEl, trackingAreaEl, trackingAreaRef } =
        await renderClientPoint({
          trackingMode: "follow",
        });

      open.value = true;
      await nextTick();

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      trackingAreaRef.value = spareEl;
      await nextTick();

      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      const rect = node.refs.anchorEl.value?.getBoundingClientRect();
      expect(rect?.x).toBe(100);
      expect(rect?.y).toBe(200);
    });

    it("Given active tracking, When reactively disabled while open, Then virtual anchor is preserved until closed", async () => {
      const enabled = ref(true);

      const { coordinates, node, open, trackingAreaEl } = await renderClientPoint({
        enabled,
        trackingMode: "follow",
      });

      open.value = true;
      await nextTick();

      trackingAreaEl.dispatchEvent(
        makePointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      expect(coordinates.value).toEqual({ x: 100, y: 200 });
      const virtualAnchorEl = node.refs.anchorEl.value;

      enabled.value = false;
      await nextTick();

      expect(node.refs.anchorEl.value).toBe(virtualAnchorEl);

      open.value = false;
      await nextTick();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });
  });
});
