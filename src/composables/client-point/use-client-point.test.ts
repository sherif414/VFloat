import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref, type Ref } from "vue";
import type { AnchorElement } from "@/composables";
import { isVirtualElement } from "@/shared/dom";
import {
  type UseClientPointContext,
  type UseClientPointOptions,
  useClientPoint,
} from "@/composables/client-point/use-client-point";
import { VirtualElementFactory } from "./virtual-element-factory";
import { FollowTracker, StaticTracker } from "./tracking-strategies";

// Track elements created during tests for cleanup
const elementsToCleanUp: HTMLElement[] = [];

function trackElement(el: HTMLElement): HTMLElement {
  elementsToCleanUp.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of elementsToCleanUp) {
    if (el.isConnected) {
      el.remove();
    }
  }

  elementsToCleanUp.length = 0;
}

function createRect({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect;
}

function createPointerEvent(
  type: "pointerdown" | "pointermove" | "pointerenter",
  options: Partial<PointerEventInit> = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType: "mouse",
    ...options,
  });
}

const createPointerEventData = (
  type: "pointerdown" | "pointermove" | "pointerenter",
  coordinates: { x: number; y: number },
  pointerType: string = "mouse",
) => ({
  type,
  coordinates,
  originalEvent: createPointerEvent(type, {
    pointerType,
    clientX: coordinates.x,
    clientY: coordinates.y,
  }),
});

type ClientPointHarness = {
  context: UseClientPointContext;
  open: Ref<boolean>;
  trackingAreaEl: Ref<HTMLElement | null>;
  scope: ReturnType<typeof effectScope> | null;
};

function createClientPointHarness(): ClientPointHarness {
  const trackingAreaEl = ref(trackElement(document.createElement("div")));
  const open = ref(false);

  document.body.appendChild(trackingAreaEl.value);

  return {
    open,
    trackingAreaEl,
    scope: null,
    context: {
      state: {
        open,
        setOpen: vi.fn(),
      },
      refs: {
        anchorEl: ref<AnchorElement>(null),
      },
    },
  };
}

describe("VirtualElementFactory", () => {
  it("creates a virtual element using provided coordinates", () => {
    const reference = document.createElement("div");
    const referenceRect = createRect({ x: 10, y: 20, width: 120, height: 40 });
    const getBoundingClientRectSpy = vi
      .spyOn(reference, "getBoundingClientRect")
      .mockReturnValue(referenceRect);

    const factory = new VirtualElementFactory();
    const virtualElement = factory.create({
      coordinates: { x: 150, y: 260 },
      referenceElement: reference,
    });

    const rect = virtualElement.getBoundingClientRect();
    expect(rect.x).toBe(150);
    expect(rect.y).toBe(260);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
    expect(getBoundingClientRectSpy).toHaveBeenCalled();
  });

  it("falls back to baseline coordinates and reference coordinates", () => {
    const reference = document.createElement("div");
    const referenceRect = createRect({ x: 5, y: 15, width: 200, height: 80 });
    vi.spyOn(reference, "getBoundingClientRect").mockReturnValue(referenceRect);

    const factory = new VirtualElementFactory();
    const virtualElement = factory.create({
      coordinates: { x: null, y: 220 },
      baselineCoordinates: { x: 120, y: null },
      referenceElement: reference,
    });

    const rect = virtualElement.getBoundingClientRect();
    expect(rect.x).toBe(120);
    expect(rect.y).toBe(220);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});

describe("FollowTracker", () => {
  it("returns pointer coordinates on pointerdown regardless of open state", () => {
    const tracker = new FollowTracker();
    const event = createPointerEventData("pointerdown", { x: 80, y: 120 });

    const result = tracker.process(event, { isOpen: false });

    expect(result).toEqual({ x: 80, y: 120 });
  });

  it("returns coordinates for pointermove only when open and pointer is mouse-like", () => {
    const tracker = new FollowTracker();
    const mouseEvent = createPointerEventData("pointermove", { x: 40, y: 60 });
    const touchEvent = createPointerEventData("pointermove", { x: 50, y: 70 }, "touch");

    expect(tracker.process(mouseEvent, { isOpen: false })).toBeNull();
    expect(tracker.process(touchEvent, { isOpen: true })).toBeNull();
    expect(tracker.process(mouseEvent, { isOpen: true })).toEqual({ x: 40, y: 60 });
  });
});

describe("StaticTracker", () => {
  it("captures trigger coordinates on pointerdown and exposes them when opened", () => {
    const tracker = new StaticTracker();
    const pointerdown = createPointerEventData("pointerdown", { x: 200, y: 300 });

    const resultWhenClosed = tracker.process(pointerdown, { isOpen: false });
    expect(resultWhenClosed).toBeNull();
    expect(tracker.getCoordinatesForOpening()).toEqual({ x: 200, y: 300 });

    const resultWhenOpen = tracker.process(pointerdown, { isOpen: true });
    expect(resultWhenOpen).toEqual({ x: 200, y: 300 });
  });

  it("captures pointerenter coordinates for hover-open flows", () => {
    const tracker = new StaticTracker();
    const pointerenter = createPointerEventData("pointerenter", { x: 140, y: 240 });

    expect(tracker.process(pointerenter, { isOpen: false })).toBeNull();
    expect(tracker.getCoordinatesForOpening()).toEqual({ x: 140, y: 240 });
  });

  it("tracks hover coordinates as fallback and resets state", () => {
    const tracker = new StaticTracker();
    const hover = createPointerEventData("pointermove", { x: 90, y: 110 });

    expect(tracker.process(hover, { isOpen: false })).toBeNull();
    expect(tracker.getCoordinatesForOpening()).toEqual({ x: 90, y: 110 });

    tracker.reset();
    expect(tracker.getCoordinatesForOpening()).toBeNull();
  });

  it("clears stored coordinates on close", () => {
    const tracker = new StaticTracker();
    const pointerdown = createPointerEventData("pointerdown", { x: 200, y: 300 });

    tracker.process(pointerdown, { isOpen: false });
    tracker.onClose();

    expect(tracker.getCoordinatesForOpening()).toBeNull();
  });
});

describe("useClientPoint", () => {
  let harness: ClientPointHarness;

  const initClientPoint = (options: Partial<UseClientPointOptions> = {}) => {
    harness.scope = effectScope();

    let result!: ReturnType<typeof useClientPoint>;
    harness.scope.run(() => {
      result = useClientPoint(harness.context, {
        trackingAreaEl: harness.trackingAreaEl,
        ...options,
      });
    });

    return result;
  };

  beforeEach(() => {
    harness = createClientPointHarness();
  });

  afterEach(() => {
    harness.scope?.stop();
    clearTrackedElements();
    vi.restoreAllMocks();
  });

  describe("basic functionality", () => {
    it("initializes with default options", () => {
      const { coordinates } = initClientPoint();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });

    it("uses the document element as the default tracking area", async () => {
      const { coordinates } = initClientPoint({
        trackingMode: "follow",
        trackingAreaEl: undefined,
      });

      harness.open.value = true;
      await nextTick();

      document.documentElement.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      const virtualAnchor = harness.context.refs.anchorEl.value;
      expect(coordinates.value).toEqual({ x: 100, y: 200 });
      expect(isVirtualElement(virtualAnchor)).toBe(true);
      expect((virtualAnchor as Exclude<AnchorElement, HTMLElement | null>).contextElement).toBe(
        document.documentElement,
      );
    });

    it("sanitizes invalid coordinates", async () => {
      const { coordinates } = initClientPoint({
        x: Number.NaN,
        y: undefined,
      });

      await nextTick();
      expect(coordinates.value).toEqual({ x: null, y: null });
    });

    it("uses external coordinates when provided", async () => {
      const { coordinates } = initClientPoint({
        x: 100,
        y: 200,
      });

      await nextTick();
      expect(coordinates.value).toEqual({ x: 100, y: 200 });
    });
  });

  describe("tracking modes", () => {
    describe("follow mode (default)", () => {
      it("tracks cursor movement while open", async () => {
        const { coordinates } = initClientPoint({
          trackingMode: "follow",
        });

        harness.open.value = true;
        await nextTick();

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointermove", {
            clientX: 100,
            clientY: 200,
          }),
        );

        expect(coordinates.value).toEqual({ x: 100, y: 200 });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointermove", {
            clientX: 150,
            clientY: 250,
          }),
        );

        expect(coordinates.value).toEqual({ x: 150, y: 250 });
      });
    });

    describe("static mode", () => {
      it("resets coordinates on close and captures a new trigger point on reopen", async () => {
        const { coordinates } = initClientPoint({
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 100,
            clientY: 200,
          }),
        );

        harness.open.value = true;
        await nextTick();
        expect(coordinates.value).toEqual({ x: 100, y: 200 });

        harness.open.value = false;
        await nextTick();
        expect(coordinates.value).toEqual({ x: null, y: null });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 150,
            clientY: 250,
          }),
        );

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: 150, y: 250 });
      });

      it("prioritizes pointerdown coordinates over hover coordinates", async () => {
        const { coordinates } = initClientPoint({
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointermove", {
            clientX: 100,
            clientY: 200,
          }),
        );

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 500,
            clientY: 300,
          }),
        );

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: 500, y: 300 });
      });

      it("retains the trigger coordinates even if the pointer moves before opening", async () => {
        const { coordinates } = initClientPoint({
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 500,
            clientY: 300,
          }),
        );

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointermove", {
            clientX: 150,
            clientY: 220,
          }),
        );

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: 500, y: 300 });
      });

      it("uses pointerenter coordinates when opened from hover without movement", async () => {
        const { coordinates } = initClientPoint({
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerenter", {
            clientX: 320,
            clientY: 180,
          }),
        );

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: 320, y: 180 });
      });

      it("does not reuse stale coordinates after closing", async () => {
        const { coordinates } = initClientPoint({
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 500,
            clientY: 300,
          }),
        );

        harness.open.value = true;
        await nextTick();
        expect(coordinates.value).toEqual({ x: 500, y: 300 });

        harness.open.value = false;
        await nextTick();
        expect(coordinates.value).toEqual({ x: null, y: null });

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: null, y: null });
      });

      it("does not capture pending trigger coordinates when opened while disabled", async () => {
        const enabled = ref(true);
        const { coordinates } = initClientPoint({
          enabled,
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 500,
            clientY: 300,
          }),
        );

        enabled.value = false;
        await nextTick();

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: null, y: null });
      });

      it("clears pending trigger coordinates when closed while disabled", async () => {
        const enabled = ref(true);
        const { coordinates } = initClientPoint({
          enabled,
          trackingMode: "static",
        });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 500,
            clientY: 300,
          }),
        );

        harness.open.value = true;
        await nextTick();
        expect(coordinates.value).toEqual({ x: 500, y: 300 });

        enabled.value = false;
        await nextTick();

        harness.open.value = false;
        await nextTick();
        expect(coordinates.value).toEqual({ x: null, y: null });

        enabled.value = true;
        await nextTick();

        harness.open.value = true;
        await nextTick();

        expect(coordinates.value).toEqual({ x: null, y: null });
      });
    });

    describe("external coordinates", () => {
      it("uses external coordinates and disables pointer tracking", async () => {
        const { coordinates } = initClientPoint({
          x: 100,
          y: 200,
        });

        await nextTick();
        expect(coordinates.value).toEqual({ x: 100, y: 200 });

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerenter", {
            clientX: 150,
            clientY: 250,
          }),
        );

        harness.trackingAreaEl.value?.dispatchEvent(
          createPointerEvent("pointerdown", {
            clientX: 200,
            clientY: 300,
          }),
        );

        expect(coordinates.value).toEqual({ x: 100, y: 200 });
      });

      it("reacts to changes in external coordinates", async () => {
        const externalX = ref(100);
        const externalY = ref(200);

        const { coordinates } = initClientPoint({
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
  });

  describe("virtual element creation", () => {
    it("updates the anchor element when coordinates change while open", async () => {
      initClientPoint({
        trackingMode: "follow",
      });

      harness.open.value = true;
      await nextTick();

      harness.trackingAreaEl.value?.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(harness.context.refs.anchorEl.value).toBeDefined();
      expect(harness.context.refs.anchorEl.value?.getBoundingClientRect).toBeDefined();
    });

    it("does not replace the anchor element when pointer movement is ignored while closed", async () => {
      initClientPoint({
        trackingMode: "follow",
      });

      harness.open.value = false;
      await nextTick();

      const initialAnchor = harness.context.refs.anchorEl.value;

      harness.trackingAreaEl.value?.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );

      expect(harness.context.refs.anchorEl.value).toBe(initialAnchor);
    });
  });

  describe("reactive virtual element behavior", () => {
    it("updates the virtual element when the tracking area changes", async () => {
      const newTarget = trackElement(document.createElement("span"));
      document.body.appendChild(newTarget);

      initClientPoint({
        trackingMode: "follow",
      });

      harness.open.value = true;
      await nextTick();

      harness.trackingAreaEl.value?.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      const initialVirtualElement = harness.context.refs.anchorEl.value;
      expect(initialVirtualElement).toBeDefined();
      expect(isVirtualElement(initialVirtualElement)).toBe(true);
      expect(
        (initialVirtualElement as Exclude<AnchorElement, HTMLElement | null>).contextElement,
      ).toBe(harness.trackingAreaEl.value);

      harness.trackingAreaEl.value = newTarget;
      await nextTick();

      const updatedVirtualElement = harness.context.refs.anchorEl.value;
      expect(updatedVirtualElement).toBeDefined();
      expect(isVirtualElement(updatedVirtualElement)).toBe(true);
      expect(
        (updatedVirtualElement as Exclude<AnchorElement, HTMLElement | null>).contextElement,
      ).toBe(newTarget);
    });

    it("falls back to the document element when the tracking area is null", async () => {
      harness.trackingAreaEl.value = null;

      const { coordinates } = initClientPoint({
        trackingMode: "follow",
      });

      harness.open.value = true;
      await nextTick();

      document.documentElement.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      const virtualAnchor = harness.context.refs.anchorEl.value;
      expect(virtualAnchor).toBeDefined();
      expect(isVirtualElement(virtualAnchor)).toBe(true);
      expect((virtualAnchor as Exclude<AnchorElement, HTMLElement | null>).contextElement).toBe(
        document.documentElement,
      );
      expect(coordinates.value).toEqual({ x: 100, y: 200 });
    });

    it("preserves coordinates across tracking area changes", async () => {
      const newTarget = trackElement(document.createElement("div"));
      document.body.appendChild(newTarget);

      const { coordinates } = initClientPoint({
        trackingMode: "follow",
      });

      harness.open.value = true;
      await nextTick();

      harness.trackingAreaEl.value?.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      harness.trackingAreaEl.value = newTarget;
      await nextTick();

      expect(coordinates.value).toEqual({ x: 100, y: 200 });

      const rect = harness.context.refs.anchorEl.value?.getBoundingClientRect();
      expect(rect?.x).toBe(100);
      expect(rect?.y).toBe(200);
    });

    it("keeps the virtual anchor when disabled reactively and clears state on close", async () => {
      const enabled = ref(true);

      const { coordinates } = initClientPoint({
        enabled,
        trackingMode: "follow",
      });

      harness.open.value = true;
      await nextTick();

      harness.trackingAreaEl.value?.dispatchEvent(
        createPointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
        }),
      );
      await nextTick();

      expect(coordinates.value).toEqual({ x: 100, y: 200 });
      const virtualAnchorEl = harness.context.refs.anchorEl.value;

      enabled.value = false;
      await nextTick();

      expect(harness.context.refs.anchorEl.value).toBe(virtualAnchorEl);

      harness.open.value = false;
      await nextTick();

      expect(coordinates.value).toEqual({ x: null, y: null });
    });
  });
});
