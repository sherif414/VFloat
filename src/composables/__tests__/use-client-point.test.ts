import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { ref, nextTick } from "vue"
import { useClientPoint } from "../interactions/use-client-point"

describe("useClientPoint", () => {
  let mockFloatingContext: any
  let mockPointerTarget: any

  beforeEach(() => {
    mockPointerTarget = ref(document.createElement("div"))
    mockFloatingContext = {
      open: ref(false),
      setOpen: vi.fn(),
      refs: {
        anchorEl: ref(null),
      },
    }

    // Add to DOM for event testing
    document.body.appendChild(mockPointerTarget.value)
  })

  afterEach(() => {
    // Clean up DOM
    if (mockPointerTarget.value.parentNode) {
      mockPointerTarget.value.parentNode.removeChild(mockPointerTarget.value)
    }
  })

  describe("basic functionality", () => {
    it("should initialize with default options", () => {
      const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext)
      
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
      it("should track coordinates continuously but only set position when floating element opens", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })
        
        // Initially no coordinates set
        expect(coordinates.value).toEqual({ x: null, y: null })
        
        // Mouse movements while closed should not set coordinates in the context
        const event1 = new PointerEvent("pointerenter", {
          clientX: 100,
          clientY: 200,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event1)
        
        // Coordinates should still be null since floating element is not open
        expect(coordinates.value).toEqual({ x: null, y: null })
        
        // Move mouse to a different position
        const event2 = new PointerEvent("pointermove", {
          clientX: 150,
          clientY: 250,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event2)
        
        // Still no coordinates set in context
        expect(coordinates.value).toEqual({ x: null, y: null })
        
        // Now open the floating element
        mockFloatingContext.open.value = true
        await nextTick()
        
        // Should capture the last known position (150, 250)
        expect(coordinates.value).toEqual({ x: 150, y: 250 })
        
        // Further movements should not update the position
        const event3 = new PointerEvent("pointermove", {
          clientX: 200,
          clientY: 300,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(event3)
        
        // Position should remain static at the captured coordinates
        expect(coordinates.value).toEqual({ x: 150, y: 250 })
      })

      it("should reset coordinates when floating element closes and allow new positioning", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })
        
        // Move mouse to initial position
        const event1 = new PointerEvent("pointermove", {
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
        
        // Move to new position
        const event2 = new PointerEvent("pointermove", {
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

      it("should fall back to last hover coordinates when no trigger event occurred", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })
        
        // User moves mouse over the element
        const hoverEvent1 = new PointerEvent("pointermove", {
          clientX: 100,
          clientY: 200,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(hoverEvent1)
        
        // User continues moving
        const hoverEvent2 = new PointerEvent("pointermove", {
          clientX: 150,
          clientY: 220,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(hoverEvent2)
        
        // After delay, tooltip opens (no pointerdown event)
        mockFloatingContext.open.value = true
        await nextTick()
        
        // Should use the last hover position
        expect(coordinates.value).toEqual({ x: 150, y: 220 })
      })

      it("should clear trigger coordinates on mouse movement after click", async () => {
        const { coordinates } = useClientPoint(mockPointerTarget, mockFloatingContext, {
          trackingMode: "static",
        })
        
        // User clicks at a position
        const clickEvent = new PointerEvent("pointerdown", {
          clientX: 500,
          clientY: 300,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(clickEvent)
        
        // User then moves mouse (invalidating the click context)
        const moveEvent = new PointerEvent("pointermove", {
          clientX: 150,
          clientY: 220,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(moveEvent)
        
        // Tooltip opens after delay
        mockFloatingContext.open.value = true
        await nextTick()
        
        // Should use the hover position, not the click position
        expect(coordinates.value).toEqual({ x: 150, y: 220 })
      })

      it("should clear trigger coordinates when floating element closes", async () => {
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
        
        // Open and then close the floating element
        mockFloatingContext.open.value = true
        await nextTick()
        mockFloatingContext.open.value = false
        await nextTick()
        
        // User moves mouse to new position
        const moveEvent = new PointerEvent("pointermove", {
          clientX: 200,
          clientY: 250,
          pointerType: "mouse",
        })
        mockPointerTarget.value.dispatchEvent(moveEvent)
        
        // Open again
        mockFloatingContext.open.value = true
        await nextTick()
        
        // Should use the new hover position, not the old click position
        expect(coordinates.value).toEqual({ x: 200, y: 250 })
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
      expect(coordinates.value.y).toBe(200)
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
      
      expect(coordinates.value.x).toBe(100)
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
})
