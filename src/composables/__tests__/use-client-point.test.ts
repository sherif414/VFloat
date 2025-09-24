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
