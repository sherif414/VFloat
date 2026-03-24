import { effectScope, ref } from "vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useEscapeKey } from "@/composables/interactions/use-escape-key"
import type { FloatingContext } from "../positioning/use-floating"

// Test utilities
function createMockFloatingContext(): FloatingContext {
  const open = ref(false)
  const setOpen = vi.fn((value: boolean, reason?: string, event?: KeyboardEvent) => {
    open.value = value
  })

  return {
    id: `mock-${Math.random().toString(36).substr(2, 9)}`,
    x: ref(0),
    y: ref(0),
    strategy: ref("absolute"),
    placement: ref("bottom"),
    middlewareData: ref({}),
    isPositioned: ref(false),
    floatingStyles: ref({ position: "absolute", top: "0px", left: "0px" }),
    update: vi.fn(),
    open,
    setOpen,
    refs: {
      anchorEl: ref(null),
      floatingEl: ref(null),
      arrowEl: ref(null),
    },
  } as any
}

describe("useEscapeKey", () => {
  let scope: ReturnType<typeof effectScope> | undefined

  afterEach(() => {
    scope?.stop()
    scope = undefined
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe("FloatingContext behavior", () => {
    it("should close floating element on escape key press", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context)
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })

    it("should not trigger when floating element is already closed", async () => {
      const context = createMockFloatingContext()
      context.setOpen(false)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context)
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should respect enabled option", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context, { enabled: false })
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should use custom onEscape handler when provided", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()
      const customHandler = vi.fn()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context, {
          onEscape: customHandler,
        })
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(customHandler).toHaveBeenCalled()
      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should ignore non-escape keys", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context)
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", keyCode: 32 } as any))

      expect(context.setOpen).not.toHaveBeenCalled()
    })
  })

  describe("Composition event handling", () => {
    it("should ignore escape during composition", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context)
      })

      // Start composition
      document.dispatchEvent(new CompositionEvent("compositionstart"))
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).not.toHaveBeenCalled()

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"))

      // Now escape should work
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })
  })

  describe("Options handling", () => {
    it("should respect reactive enabled option", async () => {
      const context = createMockFloatingContext()
      const enabled = ref(true)
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context, { enabled })
      })

      // Initially enabled
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))

      vi.clearAllMocks()
      enabled.value = false

      // Now disabled
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should handle capture option", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context, { capture: true })
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })

    it("should prevent default when preventDefault is enabled", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      scope = effectScope()
      scope.run(() => {
        useEscapeKey(context, { preventDefault: true })
      })

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })

      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })

    it("should share a single composition listener across multiple consumers", async () => {
      const contextA = createMockFloatingContext()
      const contextB = createMockFloatingContext()
      contextA.setOpen(true)
      contextB.setOpen(true)
      ;(contextA.setOpen as any).mockClear()
      ;(contextB.setOpen as any).mockClear()

      const addEventListenerSpy = vi.spyOn(document, "addEventListener")

      const scopeA = effectScope()
      const scopeB = effectScope()

      scopeA.run(() => {
        useEscapeKey(contextA)
      })

      scopeB.run(() => {
        useEscapeKey(contextB)
      })

      const compositionListeners = addEventListenerSpy.mock.calls.filter(
        ([type]) => type === "compositionstart" || type === "compositionend"
      )

      expect(compositionListeners).toHaveLength(2)

      scopeA.stop()
      scopeB.stop()
      addEventListenerSpy.mockRestore()
    })
  })
})
