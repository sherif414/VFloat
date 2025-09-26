import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { ref, nextTick } from "vue"
import {
  useClientPoint,
  VirtualElementFactory,
  FollowTracker,
  StaticTracker,
} from "../interactions/use-client-point"

const createRect = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
}): DOMRect => ({
  x,
  y,
  width,
  height,
  top: y,
  right: x + width,
  bottom: y + height,
  left: x,
  toJSON: () => ({ x, y, width, height }),
}) as DOMRect

const createPointerEventData = (
  type: "pointerdown" | "pointermove" | "pointerenter",
  coordinates: { x: number; y: number },
  pointerType: string = "mouse"
) => ({
  type,
  coordinates,
  originalEvent: new PointerEvent(type, {
    pointerType,
    clientX: coordinates.x,
    clientY: coordinates.y,
  }),
})

describe("VirtualElementFactory", () => {
  it("creates a virtual element using provided coordinates", () => {
    const reference = document.createElement("div")
    const referenceRect = createRect({ x: 10, y: 20, width: 120, height: 40 })
    vi.spyOn(reference, "getBoundingClientRect").mockReturnValue(referenceRect)

    const factory = new VirtualElementFactory()
    const virtualElement = factory.create({
      coordinates: { x: 150, y: 260 },
      referenceElement: reference,
      axis: "both",
    })

    const rect = virtualElement.getBoundingClientRect()
    expect(rect.x).toBe(150)
    expect(rect.y).toBe(260)
    expect(rect.width).toBe(0)
    expect(rect.height).toBe(0)
    expect(reference.getBoundingClientRect).toHaveBeenCalled()
  })

  it("falls back to baseline coordinates and reference sizing for constrained axes", () => {
    const reference = document.createElement("div")
    const referenceRect = createRect({ x: 5, y: 15, width: 200, height: 80 })
    vi.spyOn(reference, "getBoundingClientRect").mockReturnValue(referenceRect)

    const factory = new VirtualElementFactory()
    const virtualElement = factory.create({
      coordinates: { x: null, y: 220 },
      baselineCoordinates: { x: 120, y: null },
      referenceElement: reference,
      axis: "x",
    })

    const rect = virtualElement.getBoundingClientRect()
    expect(rect.x).toBe(120)
    expect(rect.y).toBe(15)
    expect(rect.width).toBe(200)
    expect(rect.height).toBe(0)
  })
})

describe("FollowTracker", () => {
  it("returns constrained coordinates on pointerdown regardless of open state", () => {
    const tracker = new FollowTracker()
    const event = createPointerEventData("pointerdown", { x: 80, y: 120 })

    const result = tracker.process(event, { isOpen: false })

    expect(result).toEqual({ x: 80, y: 120 })
  })

  it("returns coordinates for pointermove only when open and pointer is mouse-like", () => {
    const tracker = new FollowTracker()
    const mouseEvent = createPointerEventData("pointermove", { x: 40, y: 60 })
    const touchEvent = createPointerEventData("pointermove", { x: 50, y: 70 }, "touch")

    expect(tracker.process(mouseEvent, { isOpen: false })).toBeNull()
    expect(tracker.process(touchEvent, { isOpen: true })).toBeNull()
    expect(tracker.process(mouseEvent, { isOpen: true })).toEqual({ x: 40, y: 60 })
  })
})

describe("StaticTracker", () => {
  it("captures trigger coordinates on pointerdown and exposes them when opened", () => {
    const tracker = new StaticTracker()
    const pointerdown = createPointerEventData("pointerdown", { x: 200, y: 300 })

    const resultWhenClosed = tracker.process(pointerdown, { isOpen: false })
    expect(resultWhenClosed).toBeNull()
    expect(tracker.getCoordinatesForOpening()).toEqual({ x: 200, y: 300 })

    const resultWhenOpen = tracker.process(pointerdown, { isOpen: true })
    expect(resultWhenOpen).toEqual({ x: 200, y: 300 })
  })

  it("tracks hover coordinates as fallback and resets state", () => {
    const tracker = new StaticTracker()
    const hover = createPointerEventData("pointermove", { x: 90, y: 110 })

    expect(tracker.process(hover, { isOpen: false })).toBeNull()
    expect(tracker.getCoordinatesForOpening()).toEqual({ x: 90, y: 110 })

    tracker.reset()
    expect(tracker.getCoordinatesForOpening()).toBeNull()
  })
})

describe("useClientPoint", () => {
  let mockFloatingContext: any
  let mockPointerTarget: any

  beforeEach(() => {
    mockPointerTarget = ref(document.createElement("div"))
    mockFloatingContext = {
      open: ref(false),
      setOpen: vi.fn(),
      update: vi.fn(),
      refs: {
        anchorEl: ref(null),
      },
    }

    // Add to DOM for event testing
    document.body.appendChild(mockPointerTarget.value)
  })

  afterEach(() => {
    // Clean up DOM
    if (mockPointerTarget.value && mockPointerTarget.value.parentNode) {
      mockPointerTarget.value.parentNode.removeChild(mockPointerTarget.value)
    }
  })

  describe("basic functionality", () => {
    it("should initialize with default options", () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext)
      
      expect(coordinates.value).toEqual({ x: null, y: null })
    })

    it("should handle invalid coordinates gracefully", async () => {
      const { coordinates, updatePosition } = useClientPoint(
        mockPointerTarget,
        mockFloatingContext,
        {
          x: Number.NaN,
          y: undefined,
        }
      )

      await nextTick()
      expect(coordinates.value).toEqual({ x: null, y: null })

      updatePosition(Number.NaN, Number.POSITIVE_INFINITY)
      await nextTick()

      expect(coordinates.value).toEqual({ x: null, y: null })
    })

    it("should use external coordinates when provided", async () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        x: 100,
        y: 200,
      })
      
      await nextTick()
      expect(coordinates.value).toEqual({ x: 100, y: 200 })
    })

    it("should be disabled when enabled is false", () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        enabled: false,
      })
      
      // Simulate pointer event
      const event = new PointerEvent("pointerenter", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      
      expect(coordinates.value).toEqual({ x: null, y: null })
    })
  })

  describe("tracking modes", () => {
    describe("follow mode (default)", () => {
      it("should continuously track cursor movement", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "follow",
        })
        
        mockFloatingContext.open.value = true
        await nextTick()
        
        // First movement
        const event1 = new PointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event1)
        
        expect(coordinates.value).toEqual({ x: 100, y: 200 })
        
        // Second movement
        const event2 = new PointerEvent("pointermove", {
          clientX: 150,
          clientY: 250,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event2)
        
        expect(coordinates.value).toEqual({ x: 150, y: 250 })
      })
    })

    describe("static mode", () => {
      it("should reset coordinates when floating element closes and allow new positioning", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })
        
        // user clicks on the element
        const event1 = new PointerEvent("pointerdown", {
          clientX: 100,
          clientY: 200,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event1)
        
        // Open floating element to capture position
        mockFloatingContext.open.value = true
        await nextTick()
        
        expect(coordinates.value).toEqual({ x: 100, y: 200 })
        
        // Close floating element
        mockFloatingContext.open.value = false
        await nextTick()
        
        // Coordinates should be reset
        expect(coordinates.value).toEqual({ x: null, y: null })
        
        // user clicks on the element
        const event2 = new PointerEvent("pointerdown", {
          clientX: 150,
          clientY: 250,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event2)
        
        // Open again to capture new position
        mockFloatingContext.open.value = true
        await nextTick()
        
        expect(coordinates.value).toEqual({ x: 150, y: 250 })
      })

      it("should prioritize trigger coordinates from pointerdown for context menu scenarios", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })
        
        // Simulate user moving mouse over the element
        const hoverEvent = new PointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(hoverEvent)
        
        // User then clicks at a different position (e.g., right-click for context menu)
        const clickEvent = new PointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(clickEvent)
        
        // External handler opens the floating element (context menu)
        mockFloatingContext.open.value = true
        await nextTick()
        
        // Should use the click coordinates, not the hover coordinates
        expect(coordinates.value).toEqual({ x: 500, y: 300 })
      })

      it("should retain trigger coordinates even if the pointer moves before opening", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })

        // User clicks to set trigger coordinates
        const clickEvent = new PointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(clickEvent)

        // User then moves the pointer prior to the floating element opening
        const moveEvent = new PointerEvent("pointermove", {
          clientX: 150,
          clientY: 220,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(moveEvent)

        // Floating element opens after the move
        mockFloatingContext.open.value = true
        await nextTick()

        // Should still use the trigger coordinates captured on click
        expect(coordinates.value).toEqual({ x: 500, y: 300 })
      })
    })

    describe("external coordinates", () => {
      it("should use external coordinates and disable mouse tracking", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          x: 100,
          y: 200,
        })
        
        await nextTick()
        expect(coordinates.value).toEqual({ x: 100, y: 200 })
        
        // Pointer events should be ignored when external coordinates are provided
        const event1 = new PointerEvent("pointerenter", {
          clientX: 150,
          clientY: 250,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event1)
        
        const event2 = new PointerEvent("pointerdown", {
          clientX: 200,
          clientY: 300,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event2)
        
        // Coordinates should remain unchanged
        expect(coordinates.value).toEqual({ x: 100, y: 200 })
      })

      it("should react to changes in external coordinates", async () => {
        const externalX = ref(100)
        const externalY = ref(200)
        
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          x: externalX,
          y: externalY,
        })
        
        await nextTick()
        expect(coordinates.value).toEqual({ x: 100, y: 200 })
        
        // Change external coordinates
        externalX.value = 300
        externalY.value = 400
        
        await nextTick()
        expect(coordinates.value).toEqual({ x: 300, y: 400 })
      })
    })
  })

  describe("axis constraints", () => {
    it("should respect x-axis constraint", () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        axis: "x",
      })
      
      const event = new PointerEvent("pointerdown", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      
      expect(coordinates.value.x).toBe(100)
      expect(coordinates.value.y).toBe(null)
    })

    it("should respect y-axis constraint", () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        axis: "y",
      })
      
      const event = new PointerEvent("pointerdown", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      
      expect(coordinates.value.x).toBe(null)
      expect(coordinates.value.y).toBe(200)
    })
  })

  describe("virtual element creation", () => {
    it("should update anchor element when coordinates change and floating is open", async () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = true
      await nextTick()
      
      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      
      expect(mockFloatingContext.refs.anchorEl.value).toBeDefined()
      expect(mockFloatingContext.refs.anchorEl.value.getBoundingClientRect).toBeDefined()
    })

    it("should not update anchor element when floating is closed", async () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = false
      await nextTick()
      
      const initialAnchor = mockFloatingContext.refs.anchorEl.value
      
      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      
      expect(mockFloatingContext.refs.anchorEl.value).toBe(initialAnchor)
    })
  })

  describe("updatePosition function", () => {
    it("should allow manual position updates", () => {
      const { coordinates, updatePosition } = useClientPoint(
        mockPointerTarget,
        mockFloatingContext
      )
      
      updatePosition(150, 300)
      
      expect(coordinates.value).toEqual({ x: 150, y: 300 })
    })
  })

  describe("reactive virtual element behavior", () => {
    it("should update virtual element when pointerTarget changes", async () => {
      const newTarget = ref(document.createElement("span"))
      document.body.appendChild(newTarget.value)
      
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = true
      await nextTick()
      
      // Set initial coordinates
      const event1 = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event1)
      await nextTick()
      
      const initialVirtualElement = mockFloatingContext.refs.anchorEl.value
      expect(initialVirtualElement).toBeDefined()
      expect(initialVirtualElement.contextElement).toBe(mockPointerTarget.value)
      
      // Change the pointer target
      mockPointerTarget.value = newTarget.value
      await nextTick()
      
      const updatedVirtualElement = mockFloatingContext.refs.anchorEl.value
      expect(updatedVirtualElement).toBeDefined()
      expect(updatedVirtualElement.contextElement).toBe(newTarget.value)
      
      // Cleanup
      if (newTarget.value.parentNode) {
        newTarget.value.parentNode.removeChild(newTarget.value)
      }
    })

    it("should update virtual element when axis configuration changes", async () => {
      const axis = ref<"x" | "y" | "both">("both")
      
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        axis: axis,
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = true
      await nextTick()
      
      // Set coordinates
      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      await nextTick()
      
      const initialRect = mockFloatingContext.refs.anchorEl.value.getBoundingClientRect()
      expect(initialRect.width).toBe(0) // both axis should give 0 width
      expect(initialRect.height).toBe(0) // both axis should give 0 height
      
      // Change axis to x-only
      axis.value = "x"
      await nextTick()
      
      const updatedRect = mockFloatingContext.refs.anchorEl.value.getBoundingClientRect()
      expect(updatedRect.width).toBeGreaterThan(0) // x-only should preserve reference width
      expect(updatedRect.height).toBe(0) // x-only should have 0 height
    })

    it("should not trigger position update when floating is closed", async () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = false
      await nextTick()
      
      const updateSpy = mockFloatingContext.update
      updateSpy.mockClear()
      
      // Trigger coordinate update while closed
      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      await nextTick()
      
      // Should not have called update
      expect(updateSpy).not.toHaveBeenCalled()
    })

    it("should handle null pointerTarget gracefully", async () => {
      mockPointerTarget.value = null
      
      const { coordinates, updatePosition } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = true
      await nextTick()
      
      // Set coordinates manually to trigger virtual element creation
      updatePosition(100, 200)
      await nextTick()
      
      // Should create a virtual element with null context when coordinates exist
      expect(mockFloatingContext.refs.anchorEl.value).toBeDefined()
      expect(mockFloatingContext.refs.anchorEl.value.contextElement).toBeUndefined()
      expect(coordinates.value).toEqual({ x: 100, y: 200 })
    })

    it("should preserve coordinate state across pointerTarget changes", async () => {
      const newTarget = ref(document.createElement("div"))
      document.body.appendChild(newTarget.value)
      
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
        trackingMode: "follow",
      })
      
      mockFloatingContext.open.value = true
      await nextTick()
      
      // Set initial coordinates
      const event = new PointerEvent("pointermove", {
        clientX: 100,
        clientY: 200,
        pointerType: "mouse",
      })
      mockPointerTarget.value.dispatchEvent(event)
      await nextTick()
      
      expect(coordinates.value).toEqual({ x: 100, y: 200 })
      
      // Change pointer target
      mockPointerTarget.value = newTarget.value
      await nextTick()
      
      // Coordinates should be preserved
      expect(coordinates.value).toEqual({ x: 100, y: 200 })
      
      // Virtual element should still use the preserved coordinates
      const rect = mockFloatingContext.refs.anchorEl.value.getBoundingClientRect()
      expect(rect.x).toBe(100)
      expect(rect.y).toBe(200)
      
      // Cleanup
      if (newTarget.value.parentNode) {
        newTarget.value.parentNode.removeChild(newTarget.value)
      }
    })
  })
})
