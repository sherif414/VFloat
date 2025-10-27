import type { Strategy } from "@floating-ui/dom"
import { userEvent } from "@vitest/browser/context"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type ComputedRef, computed, effectScope, nextTick, type Ref, ref } from "vue"
import { type UseHoverOptions, useHover } from "@/composables/interactions"
import type { FloatingStyles } from "../positioning/use-floating"

// Define a minimal FloatingContext type for the tests
interface FloatingContext {
  refs: {
    anchorEl: Ref<HTMLElement | null>
    floatingEl: Ref<HTMLElement | null>
  }
  placement: Ref<string>
  strategy: Ref<Strategy>
  middlewareData: Ref<Record<string, any>>
  x: Ref<number>
  y: Ref<number>
  isPositioned: Ref<boolean>
  open: Ref<boolean>
  setOpen: (open: boolean, event?: Event) => void
  update: () => void
  floatingStyles: ComputedRef<FloatingStyles>
}

describe("useHover", () => {
  let context: FloatingContext
  let referenceEl: HTMLElement
  let floatingEl: HTMLElement
  let scope: ReturnType<typeof effectScope>

  // Helper to initialize useHover and wait for effects
  const initHover = async (options?: UseHoverOptions) => {
    // Create a proper effect scope for Vue composables
    scope = effectScope()
    scope.run(() => {
      useHover(context as any, options)
    })
    // Wait for watchPostEffect to set up event listeners
    await nextTick()
    await nextTick()
  }

  beforeEach(async () => {
    // Create fresh elements for each test
    referenceEl = document.createElement("div")
    referenceEl.id = "reference"
    referenceEl.style.width = "100px"
    referenceEl.style.height = "100px"
    referenceEl.style.display = "block"
    referenceEl.style.border = "1px solid red"

    floatingEl = document.createElement("div")
    floatingEl.id = "floating"
    floatingEl.style.width = "50px"
    floatingEl.style.height = "50px"
    floatingEl.style.display = "block"
    floatingEl.style.border = "1px solid blue"

    document.body.appendChild(referenceEl)
    document.body.appendChild(floatingEl)

    context = {
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      placement: ref("bottom" as const),
      strategy: ref("absolute" as Strategy),
      middlewareData: ref({}),
      x: ref(0),
      y: ref(0),
      isPositioned: ref(true),
      open: ref(false),
      setOpen: (v) => {
        context.open.value = v
      },
      update: () => { },
      floatingStyles: computed<FloatingStyles>(() => ({
        position: "absolute" as Strategy,
        top: "0px",
        left: "0px",
      })),
    }

    // Assign elements after mount (simulates Vue template refs)
    context.refs.anchorEl.value = referenceEl
    context.refs.floatingEl.value = floatingEl

    await nextTick()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    // Ensure any pending timers are cleared and promises resolved
    vi.runAllTimers()
    await nextTick()

    // Stop the scope to clean up Vue effects
    if (scope) {
      scope.stop()
    }

    // Cleanup DOM
    if (referenceEl.parentNode) {
      document.body.removeChild(referenceEl)
    }
    if (floatingEl.parentNode) {
      document.body.removeChild(floatingEl)
    }

    // Restore mocks and timers
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // --- Core Functionality ---
  describe("Core Functionality", () => {
    it("should open when pointer enters reference element", async () => {
      await initHover()
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)
    })

    it("should close when pointer leaves reference element (and floating is closed)", async () => {
      await initHover()
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()

      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      expect(context.open.value).toBe(false)
    })

    it("should not close immediately if pointer moves from reference to floating element (default behavior)", async () => {
      await initHover({ delay: 10 })

      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(true)

      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: floatingEl }))
      floatingEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))

      vi.runAllTimers()

      expect(context.open.value).toBe(true)

      floatingEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      vi.runAllTimers()
      expect(context.open.value).toBe(false)
    })

    it("should attach/reattach listeners when element refs change", async () => {
      await initHover()

      // Detach original element
      const oldRef = referenceEl
      context.refs.anchorEl.value = null
      await nextTick()

      // Hovering old ref should do nothing now
      oldRef.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(false)

      // Create and attach new element
      const newRef = document.createElement("div")
      newRef.innerText = "reference2"
      newRef.id = "reference2"
      document.body.appendChild(newRef)
      context.refs.anchorEl.value = newRef
      await nextTick()

      // Hovering new ref should work
      newRef.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)

      // Cleanup new element
      document.body.removeChild(newRef)
    })

    it("should disable the functionality when `enabled` becomes false", async () => {
      const enabled = ref(true)
      await initHover({ enabled })

      // Check it works initially
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)

      // Disable
      enabled.value = false
      await nextTick()

      // Reset open state
      context.open.value = false
      await nextTick()

      // Try hovering again
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(false)

      // Try unhovering
      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(false)
    })
  })

  describe("Delay configuration", () => {
    it("should respect `delay.open` (object notation)", async () => {
      await initHover({ delay: { open: 100 } })
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()

      expect(context.open.value).toBe(false)
      vi.advanceTimersByTime(99)
      expect(context.open.value).toBe(false)
      vi.advanceTimersByTime(1)
      expect(context.open.value).toBe(true)
    })

    it("should respect `delay.close` (object notation)", async () => {
      await initHover({ delay: { close: 100 } })
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)

      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      expect(context.open.value).toBe(true)
      vi.advanceTimersByTime(99)
      expect(context.open.value).toBe(true)
      vi.advanceTimersByTime(1)
      expect(context.open.value).toBe(false)
    })

    it("should respect `delay` (number notation)", async () => {
      await initHover({ delay: 150 })

      // Test open delay
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(false)
      vi.advanceTimersByTime(149)
      expect(context.open.value).toBe(false)
      vi.advanceTimersByTime(1)
      expect(context.open.value).toBe(true)

      // Test close delay
      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      expect(context.open.value).toBe(true)
      vi.advanceTimersByTime(149)
      expect(context.open.value).toBe(true)
      vi.advanceTimersByTime(1)
      expect(context.open.value).toBe(false)
    })
  })

  describe("Rest period (`restMs`)", () => {
    it("should wait for `restMs` before opening if pointer rests", async () => {
      await initHover({ restMs: 50 })

      // Initial hover shouldn't open immediately
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse", clientX: 10, clientY: 10 }))
      await nextTick()
      expect(context.open.value).toBe(false)

      // Simulate pointer resting by advancing time without moving
      vi.advanceTimersByTime(49)
      expect(context.open.value).toBe(false)
      vi.advanceTimersByTime(1)
      expect(context.open.value).toBe(true)
    })

    it.skip("should NOT open if pointer moves significantly before `restMs` expires", async () => {
      // TODO: This test needs investigation - the timer reset logic may not work as expected
      await initHover({ restMs: 50 })

      const pointerEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        clientX: 10,
        clientY: 10,
      })
      referenceEl.dispatchEvent(pointerEnterEvent)
      await nextTick()

      expect(context.open.value).toBe(false)

      vi.advanceTimersByTime(25)
      await nextTick()

      expect(context.open.value).toBe(false)

      const pointerMoveEvent = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        clientX: 30,
        clientY: 10,
      })
      referenceEl.dispatchEvent(pointerMoveEvent)
      await nextTick()

      expect(context.open.value).toBe(false)

      vi.advanceTimersByTime(30)
      await nextTick()

      expect(context.open.value).toBe(false)

      // Wait the full 50ms rest period from the move
      vi.advanceTimersByTime(20)
      await nextTick()

      expect(context.open.value).toBe(true)
    })

    it("should cancel rest period timer if pointer leaves before `restMs` expires", async () => {
      await initHover({ restMs: 50 })
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse", clientX: 10, clientY: 10 }))
      await nextTick()
      expect(context.open.value).toBe(false)

      vi.advanceTimersByTime(30)
      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()

      vi.advanceTimersByTime(100)
      expect(context.open.value).toBe(false)
    })

    it("should ignore `restMs` if `delay.open` is greater than 0", async () => {
      await initHover({ delay: { open: 100 }, restMs: 50 })
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()

      expect(context.open.value).toBe(false)

      vi.advanceTimersByTime(50)
      expect(context.open.value).toBe(false)

      vi.advanceTimersByTime(50)
      expect(context.open.value).toBe(true)
    })
  })

  describe("Mouse-only mode (`mouseOnly`)", () => {
    it("should ignore non-mouse pointer types when `mouseOnly` is true", async () => {
      await initHover({ mouseOnly: true })

      const touchEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        isPrimary: true,
      })
      referenceEl.dispatchEvent(touchEnterEvent)
      await nextTick()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(false)

      const penEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "pen",
        isPrimary: true,
      })
      referenceEl.dispatchEvent(penEnterEvent)
      await nextTick()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(false)

      const mouseEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
      })
      referenceEl.dispatchEvent(mouseEnterEvent)
      await nextTick()

      expect(context.open.value).toBe(true)

      const touchLeaveEvent = new PointerEvent("pointerleave", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        isPrimary: true,
        relatedTarget: document.body,
      })
      referenceEl.dispatchEvent(touchLeaveEvent)
      await nextTick()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(true)

      const mouseLeaveEvent = new PointerEvent("pointerleave", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        clientX: 0,
        clientY: 0,
        relatedTarget: document.body,
      })
      referenceEl.dispatchEvent(mouseLeaveEvent)
      await nextTick()

      expect(context.open.value).toBe(false)
    })
  })

  describe("Edge Case Handling", () => {
    it("should cancel pending open delay if pointer leaves reference", async () => {
      await initHover({ delay: { open: 100 } })
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      vi.advanceTimersByTime(50)
      expect(context.open.value).toBe(false)

      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      vi.runAllTimers()
      expect(context.open.value).toBe(false)
    })

    it("should cancel pending close delay if pointer re-enters reference", async () => {
      await initHover({ delay: { close: 100 } })
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)

      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      vi.advanceTimersByTime(50)
      expect(context.open.value).toBe(true)

      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)

      vi.advanceTimersByTime(100)
      expect(context.open.value).toBe(true)
    })

    it("should close (respecting delay) if pointer leaves floating element (when not moving back to ref)", async () => {
      await initHover({ delay: { close: 100 } })

      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)
      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: floatingEl }))
      floatingEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()

      vi.advanceTimersByTime(150)
      expect(context.open.value).toBe(true)

      floatingEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      expect(context.open.value).toBe(true)
      vi.advanceTimersByTime(99)
      expect(context.open.value).toBe(true)
      vi.advanceTimersByTime(1)
      expect(context.open.value).toBe(false)
    })

    it("should react to external state changes", async () => {
      await initHover()

      // External open
      context.setOpen(true)
      await nextTick()
      expect(context.open.value).toBe(true)

      // Hover while already open - should stay open
      const initialValue = context.open.value
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(initialValue)

      // External close
      context.setOpen(false)
      await nextTick()
      expect(context.open.value).toBe(false)

      // Unhover while already closed - should stay closed
      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      await nextTick()
      expect(context.open.value).toBe(false)
    })
  })

  describe("safePolygon behavior", () => {
    it("keeps open when leaving reference towards floating with safePolygon enabled", async () => {
      await initHover({ safePolygon: true })

      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(true)

      const refRect = referenceEl.getBoundingClientRect()
      const leaveEvt = new PointerEvent("pointerleave", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        clientX: Math.floor(refRect.left + refRect.width / 2),
        clientY: Math.floor(refRect.bottom - 1),
        relatedTarget: floatingEl,
      })
      referenceEl.dispatchEvent(leaveEvt)

      floatingEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(true)

      floatingEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body, clientX: 0, clientY: 0 }))
      // Dispatch a pointermove event outside the polygon to trigger close
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse", clientX: 0, clientY: 0 }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(false)
    })
  })

  describe("tree-aware hover", () => {
    function createMockTreeNode(
      ctx: any,
      isRoot = false,
      parent: any = null
    ) {
      const children = ref<any[]>([])
      const parentRef = ref(parent)
      const node: any = {
        id: `node-${Math.random().toString(36).slice(2)}`,
        data: ctx,
        children,
        parent: parentRef,
        isRoot,
        getPath: vi.fn(() => ["root", node.id]),
      }
      return node
    }

    it.skip("does not close parent when pointer leaves to an open descendant", async () => {
      // TODO: This test needs investigation - tree-aware hover may need implementation fixes
      const parentRefEl = document.createElement("div")
      const parentFloatEl = document.createElement("div")
      parentFloatEl.tabIndex = -1
      document.body.appendChild(parentRefEl)
      document.body.appendChild(parentFloatEl)

      const childRefEl = document.createElement("div")
      const childFloatEl = document.createElement("div")
      childFloatEl.tabIndex = -1
      document.body.appendChild(childRefEl)
      document.body.appendChild(childFloatEl)

      const parentOpen = ref(false)
      const childOpen = ref(true)
      const parentSetOpen = vi.fn((v: boolean) => (parentOpen.value = v))

      const parentCtx = {
        id: "parent-node",
        refs: { anchorEl: ref(parentRefEl), floatingEl: ref(parentFloatEl) },
        placement: ref("bottom"),
        strategy: ref("absolute" as Strategy),
        middlewareData: ref({}),
        x: ref(0),
        y: ref(0),
        isPositioned: ref(true),
        open: parentOpen,
        setOpen: parentSetOpen,
        update: () => { },
        floatingStyles: computed(() => ({ position: "absolute", top: "0px", left: "0px" })),
      }
      const childCtx = {
        id: "child-node",
        refs: { anchorEl: ref(childRefEl), floatingEl: ref(childFloatEl) },
        placement: ref("bottom"),
        strategy: ref("absolute" as Strategy),
        middlewareData: ref({}),
        x: ref(0),
        y: ref(0),
        isPositioned: ref(true),
        open: childOpen,
        setOpen: vi.fn(),
        update: () => { },
        floatingStyles: computed(() => ({ position: "absolute", top: "0px", left: "0px" })),
      }

      const parentNode = createMockTreeNode(parentCtx, true)
      const childNode = createMockTreeNode(childCtx, false, parentNode)
      parentNode.children.value = [childNode]

      scope = effectScope()
      scope.run(() => {
        // biome-ignore lint/suspicious/noExplicitAny: testing setup
        useHover(parentNode as any, { delay: { close: 0 } })
      })

      const enterParent = new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
      parentRefEl.dispatchEvent(enterParent)
      await nextTick()
      expect(parentOpen.value).toBe(true)
      parentSetOpen.mockClear()

      const leaveToChild = new PointerEvent("pointerleave", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: childFloatEl,
      })
      parentRefEl.dispatchEvent(leaveToChild)
      vi.runAllTimers()
      await nextTick()

      expect(parentSetOpen).not.toHaveBeenCalledWith(false)
      expect(parentOpen.value).toBe(true)

      const outside = document.createElement("div")
      document.body.appendChild(outside)
      const childLeave = new PointerEvent("pointerleave", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: outside,
      })
      childFloatEl.dispatchEvent(childLeave)
      vi.runAllTimers()
      await nextTick()
      expect(parentSetOpen).toHaveBeenCalledWith(false)

      // Cleanup
      document.body.removeChild(parentRefEl)
      document.body.removeChild(parentFloatEl)
      document.body.removeChild(childRefEl)
      document.body.removeChild(childFloatEl)
      document.body.removeChild(outside)
      scope.stop()
    })
  })

  describe("Cleanup", () => {
    it("should remove event listeners on cleanup (simulated unmount)", async () => {
      await initHover()

      // Verify it works initially
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      await nextTick()
      expect(context.open.value).toBe(true)

      // Stop the effect to simulate unmount and trigger cleanup
      scope.stop()
      await nextTick()

      // Reset state
      context.open.value = false

      // Try interacting again - listeners should be gone
      referenceEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(false)

      referenceEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(false)

      // Also check floating element interaction is gone
      context.open.value = true
      floatingEl.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }))
      floatingEl.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }))
      vi.runAllTimers()
      await nextTick()
      expect(context.open.value).toBe(true) // Should stay true since no listeners
    })
  })
})

