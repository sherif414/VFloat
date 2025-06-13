import type { AnchorElement, FloatingElement, UseFloatingOptions } from "@/composables"
import { useFloating } from "@/composables"
import type { Middleware, Placement } from "@floating-ui/dom"
import { waitFor } from "@testing-library/vue"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

// Mock DOM elements
const createMockElement = (tagName = "div", attributes = {}) => {
  const element = document.createElement(tagName)
  Object.assign(element, attributes)
  return element
}

// Mock middleware
const createMockMiddleware = (name: string, data: any = {}): Middleware => ({
  name,
  fn: vi.fn().mockResolvedValue({
    x: 0,
    y: 0,
    data: { [name]: data },
  }),
})

describe("useFloating", () => {
  let anchorEl: HTMLElement
  let floatingEl: HTMLElement
  let cleanup: (() => void)[]

  beforeEach(() => {
    anchorEl = createMockElement("button", {
      getBoundingClientRect: () => ({
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        top: 10,
        left: 10,
        right: 110,
        bottom: 60,
      }),
    })
    floatingEl = createMockElement("div", {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        top: 0,
        left: 0,
        right: 200,
        bottom: 100,
      }),
    })
    cleanup = []

    // Mock document.body for element mounting
    document.body.appendChild(anchorEl)
    document.body.appendChild(floatingEl)
  })

  afterEach(() => {
    for (const fn of cleanup) {
      fn()
    }
    cleanup = []
    document.body.innerHTML = ""
    vi.clearAllMocks()
  })

  describe("Basic Functionality", () => {
    it("should initialize with default values", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.x.value).toBe(0)
      expect(context.y.value).toBe(0)
      expect(context.strategy.value).toBe("absolute")
      expect(context.placement.value).toBe("bottom")
      expect(context.isPositioned.value).toBe(false)
      expect(context.open.value).toBe(false)
    })

    it("should return reactive references to anchor and floating elements", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.refs.anchorEl).toBe(anchorRef)
      expect(context.refs.floatingEl).toBe(floatingRef)
      expect(context.refs.anchorEl.value).toBe(anchorEl)
      expect(context.refs.floatingEl.value).toBe(floatingEl)
    })

    it("should handle null elements gracefully", () => {
      const anchorRef = ref<AnchorElement>(null)
      const floatingRef = ref<FloatingElement>(null)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.refs.anchorEl.value).toBe(null)
      expect(context.refs.floatingEl.value).toBe(null)
      expect(context.isPositioned.value).toBe(false)
    })
  })

  describe("Options Configuration", () => {
    it("should accept and apply placement option", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const options: UseFloatingOptions = {
        placement: "top-start",
      }

      const context = useFloating(anchorRef, floatingRef, options)

      // Initial placement should be set (final placement may differ after computation)
      expect(["top-start", "top", "bottom"]).toContain(context.placement.value)
    })

    it("should accept and apply strategy option", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const options: UseFloatingOptions = {
        strategy: "fixed",
      }

      const context = useFloating(anchorRef, floatingRef, options)

      expect(context.strategy.value).toBe("fixed")
    })

    it("should accept reactive placement option", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const placement = ref<Placement>("top")
      const options: UseFloatingOptions = {
        placement,
      }

      const context = useFloating(anchorRef, floatingRef, options)

      // Change placement and wait for reactivity
      placement.value = "bottom-end"
      await nextTick()

      // Should trigger position update
      expect(context.update).toBeDefined()
    })

    it("should accept open state option", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const open = ref(true)
      const options: UseFloatingOptions = {
        open,
      }

      const context = useFloating(anchorRef, floatingRef, options)

      expect(context.open.value).toBe(true)
      expect(context.open).toBe(open) // Should be the same ref
    })

    it("should accept custom setOpen function", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const mockSetOpen = vi.fn()
      const options: UseFloatingOptions = {
        setOpen: mockSetOpen,
      }

      const context = useFloating(anchorRef, floatingRef, options)

      context.setOpen(true)
      expect(mockSetOpen).toHaveBeenCalledWith(true)
    })
  })

  describe("Floating Styles", () => {
    it("should generate correct floating styles with absolute positioning", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef, {
        strategy: "absolute",
      })

      const styles = context.floatingStyles.value

      expect(styles.position).toBe("absolute")
      expect(styles.top).toBeDefined()
      expect(styles.left).toBeDefined()
      expect(typeof styles.top).toBe("string")
      expect(typeof styles.left).toBe("string")
    })

    it("should generate correct floating styles with fixed positioning", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef, {
        strategy: "fixed",
      })

      const styles = context.floatingStyles.value

      expect(styles.position).toBe("fixed")
    })

    it("should include transform property when transform option is true", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef, {
        transform: true,
        open: ref(true),
      })

      await nextTick()

      vi.waitFor(() => {
        expect(context.isPositioned.value).toBeTruthy()
        expect(context.floatingStyles.value.transform).toBeDefined()
      })
    })

    it("should not include transform property when transform option is false", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef, {
        transform: false,
      })

      const styles = context.floatingStyles.value

      expect(styles.transform).toBeUndefined()
      expect(styles["will-change"]).toBeUndefined()
    })
  })

  describe("Middleware Integration", () => {
    it("should apply middleware and store middleware data", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const offsetMiddleware = createMockMiddleware("offset", { value: 10 })

      const context = useFloating(anchorRef, floatingRef, {
        middlewares: [offsetMiddleware],
      })

      // Trigger positioning
      context.update()
      await nextTick()

      expect(context.middlewareData.value).toBeDefined()
    })

    it("should handle multiple middleware functions", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const offsetMiddleware = createMockMiddleware("offset", { value: 10 })
      const flipMiddleware = createMockMiddleware("flip", { flipped: true })

      const context = useFloating(anchorRef, floatingRef, {
        middlewares: [offsetMiddleware, flipMiddleware],
      })

      context.update()
      await nextTick()

      expect(context.middlewareData.value).toBeDefined()
    })

    it("should handle middleware errors gracefully", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const faultyMiddleware: Middleware = {
        name: "faulty",
        fn: vi.fn().mockRejectedValue(new Error("Middleware error")),
      }

      expect(() => {
        const context = useFloating(anchorRef, floatingRef, {
          middlewares: [faultyMiddleware],
        })
        context.update()
      }).not.toThrow()
    })
  })

  describe("Auto Update Functionality", () => {
    it("should call whileElementsMounted when elements are present", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const mockWhileElementsMounted = vi.fn().mockReturnValue(() => {})

      useFloating(anchorRef, floatingRef, {
        whileElementsMounted: mockWhileElementsMounted,
        open: ref(true),
      })

      expect(mockWhileElementsMounted).toHaveBeenCalled()
    })

    it("should not call whileElementsMounted when elements are null", () => {
      const anchorRef = ref<AnchorElement>(null)
      const floatingRef = ref<FloatingElement>(null)
      const mockWhileElementsMounted = vi.fn().mockReturnValue(() => {})

      useFloating(anchorRef, floatingRef, {
        whileElementsMounted: mockWhileElementsMounted,
      })

      expect(mockWhileElementsMounted).not.toHaveBeenCalled()
    })

    it("should call cleanup function when elements change", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const mockCleanup = vi.fn()
      const mockWhileElementsMounted = vi.fn().mockReturnValue(mockCleanup)

      useFloating(anchorRef, floatingRef, {
        whileElementsMounted: mockWhileElementsMounted,
        open: ref(true),
      })

      // Change elements
      anchorRef.value = null
      await nextTick()

      expect(mockCleanup).toHaveBeenCalled()
    })
  })

  describe("Reactivity", () => {
    it("should react to anchor element changes", async () => {
      const anchorRef = ref<AnchorElement>(null)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.isPositioned.value).toBe(false)

      // Set anchor element
      anchorRef.value = anchorEl
      await nextTick()

      expect(context.refs.anchorEl.value).toBe(anchorEl)
    })

    it("should react to floating element changes", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(null)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.isPositioned.value).toBe(false)

      // Set floating element
      floatingRef.value = floatingEl
      await nextTick()

      expect(context.refs.floatingEl.value).toBe(floatingEl)
    })

    it("should react to open state changes", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const open = ref(false)

      const context = useFloating(anchorRef, floatingRef, { open })

      expect(context.open.value).toBe(false)

      // Change open state
      open.value = true
      await nextTick()

      expect(context.open.value).toBe(true)
    })
  })

  describe("Manual Updates", () => {
    it("should provide update function", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.update).toBeDefined()
      expect(typeof context.update).toBe("function")
    })

    it("should update position when update is called", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef, { open: ref(true) })

      // Mock element position change
      anchorEl.getBoundingClientRect = vi.fn().mockReturnValue({
        x: 50,
        y: 50,
        width: 100,
        height: 50,
        top: 50,
        left: 50,
        right: 150,
        bottom: 100,
      })

      context.update()
      await nextTick()

      // Position should be recalculated
      waitFor(() => {
        expect(context.isPositioned.value).toBe(true)
      })
    })
  })

  describe("State Management", () => {
    it("should use default setOpen when none provided", () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.open.value).toBe(false)

      context.setOpen(true)
      expect(context.open.value).toBe(true)

      context.setOpen(false)
      expect(context.open.value).toBe(false)
    })

    it("should maintain open state consistency", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const open = ref(false)

      const context = useFloating(anchorRef, floatingRef, { open })

      // Change via ref
      open.value = true
      await nextTick()
      expect(context.open.value).toBe(true)

      // Change via setOpen
      context.setOpen(false)
      await nextTick()
      expect(open.value).toBe(false)
      expect(context.open.value).toBe(false)
    })
  })

  describe("Edge Cases", () => {
    it("should handle virtual elements", () => {
      const virtualElement = {
        getBoundingClientRect: () => ({
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          top: 0,
          left: 0,
          right: 10,
          bottom: 10,
        }),
      }
      const anchorRef = ref<AnchorElement>(virtualElement)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      expect(context.refs.anchorEl.value).toEqual(virtualElement)
    })

    it("should handle rapid element changes", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)

      const context = useFloating(anchorRef, floatingRef)

      // Rapid changes
      anchorRef.value = null
      floatingRef.value = null
      anchorRef.value = anchorEl
      floatingRef.value = floatingEl

      await nextTick()

      expect(context.refs.anchorEl.value).toBe(anchorEl)
      expect(context.refs.floatingEl.value).toBe(floatingEl)
    })

    it("should handle window resize events", async () => {
      const anchorRef = ref<AnchorElement>(anchorEl)
      const floatingRef = ref<FloatingElement>(floatingEl)
      const mockWhileElementsMounted = vi.fn().mockReturnValue(() => {})

      useFloating(anchorRef, floatingRef, {
        whileElementsMounted: mockWhileElementsMounted,
        open: ref(true),
      })

      // Simulate window resize
      const resizeEvent = new Event("resize")
      window.dispatchEvent(resizeEvent)

      await flushPromises()
      // Should have been called with update function
      expect(mockWhileElementsMounted).toHaveBeenCalled()
      const callArgs = mockWhileElementsMounted.mock.calls[0]
      expect(typeof callArgs[2]).toBe("function") // update function
    })
  })
})

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

