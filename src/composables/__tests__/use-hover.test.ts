import { userEvent } from "@vitest/browser/context"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, type Ref, ref, computed, type ComputedRef } from "vue"
import { useHover, type UseHoverOptions } from "@/composables"
import type { FloatingStyles } from "../use-floating"
import type { Strategy } from "@floating-ui/dom"

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

// Mock useHover implementation (if not importing the real one)
// This is useful if you want to test the *caller's* interaction with useHover,
// but here we assume we are *testing* useHover itself, so we import the real one.
// If the real one isn't available, you'd need a mock that simulates its behavior.

describe("useHover", () => {
  let context: FloatingContext
  let referenceEl: HTMLElement
  let floatingEl: HTMLElement
  let setOpenMock: ReturnType<typeof vi.fn>
  let scope: ReturnType<typeof effectScope>

  // Helper to initialize useHover and wait for effects
  const initHover = (options?: UseHoverOptions) => {
    // Create a proper effect scope for Vue composables
    scope = effectScope()
    scope.run(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      useHover(context as any, options)
    })
  }

  beforeEach(async () => {
    // Create fresh elements for each test
    referenceEl = document.createElement("div")
    referenceEl.id = "reference" // For debugging/clarity
    referenceEl.style.width = "100px" // Give elements size for potential coord checks
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

    setOpenMock = vi.fn()

    context = {
      refs: {
        anchorEl: ref(null), // Start as null, set after mount
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
        setOpenMock(v)
      },
      update: () => {},
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
    vi.useRealTimers() // Crucial to switch back
  })

  // --- Core Functionality ---
  describe("Core Functionality", () => {
    it("should open when pointer enters reference element", async () => {
      initHover()
      await userEvent.hover(referenceEl)
      expect(setOpenMock).toHaveBeenCalledOnce()
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)
    })

    it("should close when pointer leaves reference element (and floating is closed)", async () => {
      initHover()
      await userEvent.hover(referenceEl) // Open first
      setOpenMock.mockClear() // Clear mock after initial open

      await userEvent.unhover(referenceEl)
      expect(setOpenMock).toHaveBeenCalledOnce()
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("should not close immediately if pointer moves from reference to floating element (default behavior)", async () => {
      initHover({ delay: 10 })

      await userEvent.hover(referenceEl)
      vi.runAllTimers()
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledOnce()
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Simulate move from reference -> floating (userEvent doesn't have a direct 'moveBetween')
      // We simulate by unhovering reference (which would normally trigger close)
      // then immediately hovering floating. useHover should internally prevent the close.
      // NOTE: This relies on internal logic of useHover handling the transition smoothly.
      // A more robust test might need lower-level pointer events if this fails.
      await userEvent.unhover(referenceEl) // This triggers the potential close logic
      await userEvent.hover(floatingEl) // This should happen before any close delay timer fires

      // Advance timers to check if a close was scheduled and cancelled
      vi.runAllTimers()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)

      await userEvent.unhover(floatingEl)
      vi.runAllTimers()
      expect(setOpenMock).toHaveBeenCalledOnce()
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("should attach/reattach listeners when element refs change", async () => {
      initHover()

      // Detach original element
      const oldRef = referenceEl
      context.refs.anchorEl.value = null
      await nextTick() // Allow watcher to potentially clean up old listeners

      // Hovering old ref should do nothing now
      await userEvent.hover(oldRef)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Create and attach new element
      const newRef = document.createElement("div")
      newRef.innerText = "reference2"
      newRef.id = "reference2"
      document.body.appendChild(newRef)
      context.refs.anchorEl.value = newRef
      await nextTick() // Allow watcher to attach new listeners

      // Hovering new ref should work
      await userEvent.hover(newRef)
      expect(setOpenMock).toHaveBeenCalledWith(true)

      // Cleanup new element
      document.body.removeChild(newRef)
    })

    it("should disable the functionality when `enabled` becomes false", async () => {
      const enabled = ref(true)
      initHover({ enabled })

      // Check it works initially
      await userEvent.hover(referenceEl)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      setOpenMock.mockClear()

      // Disable
      enabled.value = false
      await nextTick() // Allow watcher to react

      // Try hovering again
      await userEvent.hover(referenceEl)
      vi.runAllTimers() // Check no delayed actions trigger either
      expect(setOpenMock).not.toHaveBeenCalled()

      // Try unhovering (e.g., if it was somehow open)
      await userEvent.unhover(referenceEl)
      vi.runAllTimers()
      expect(setOpenMock).not.toHaveBeenCalled()
    })
  })

  // // --- Delay Configuration ---
  describe("Delay configuration", () => {
    it("should respect `delay.open` (object notation)", async () => {
      initHover({ delay: { open: 100 } })
      await userEvent.hover(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(99)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(true)
    })

    it("should respect `delay.close` (object notation)", async () => {
      initHover({ delay: { close: 100 } })
      await userEvent.hover(referenceEl) // Open (no delay)
      setOpenMock.mockClear()

      await userEvent.unhover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(99)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(false)
    })

    it("should respect `delay` (number notation)", async () => {
      initHover({ delay: 150 })

      // Test open delay
      await userEvent.hover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(149)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(true)
      setOpenMock.mockClear()

      // Test close delay
      await userEvent.unhover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(149)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(false)
    })
  })

  // // --- Rest Period ---
  describe("Rest period (`restMs`)", () => {
    it("should wait for `restMs` before opening if pointer rests", async () => {
      initHover({ restMs: 50 })

      // Initial hover shouldn't open immediately
      await userEvent.hover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Simulate pointer resting by advancing time without moving
      vi.advanceTimersByTime(49)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
    })

    it("should NOT open if pointer moves significantly before `restMs` expires", async () => {
      initHover({ restMs: 50 }) // Initialize with restMs

      // --- Simulate Pointer Enter at initial position ---
      const pointerEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse", // restMs applies to mouse
        clientX: 10, // Initial X coordinate
        clientY: 10, // Initial Y coordinate
      })
      referenceEl.dispatchEvent(pointerEnterEvent)
      await nextTick()

      // Assert: Not opened yet
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Wait for less than restMs ---
      vi.advanceTimersByTime(25)
      await nextTick()

      // Assert: Still not opened
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Simulate Significant Pointer Move within the element ---
      // Move more than POINTER_MOVE_THRESHOLD (10px) on at least one axis
      const pointerMoveEvent = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        clientX: 30, // Moved 20px ( > 10 )
        clientY: 10, // Y hasn't changed, but X is enough
      })
      referenceEl.dispatchEvent(pointerMoveEvent)
      await nextTick() // Allow move handler to run

      // Assert: Still not opened, move should have reset the rest timer
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Advance time past the *original* restMs completion time ---
      // If the timer wasn't reset, it would have fired by now (25ms + 30ms > 50ms)
      vi.advanceTimersByTime(30)
      await nextTick()

      // Assert: Still not opened because the timer was reset
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Advance time to complete the *new* rest period ---
      // The new rest period started after the move. We already waited 30ms since the move.
      // We need to wait the remaining time for the *new* 50ms timer.
      vi.advanceTimersByTime(25) // Wait 20ms + 1ms buffer
      await nextTick()

      // Assert: NOW it should have opened, after 50ms of resting *since the move*
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(true)
    })

    it("should cancel rest period timer if pointer leaves before `restMs` expires", async () => {
      initHover({ restMs: 50 })
      await userEvent.hover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      vi.advanceTimersByTime(30)
      await userEvent.unhover(referenceEl)

      vi.advanceTimersByTime(100)
      expect(setOpenMock).not.toHaveBeenCalled()
    })

    it("should ignore `restMs` if `delay.open` is greater than 0", async () => {
      initHover({ delay: { open: 100 }, restMs: 50 })
      await userEvent.hover(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(setOpenMock).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(setOpenMock).toHaveBeenCalledWith(true)
    })
  })

  // // --- Mouse-only Mode ---
  describe("Mouse-only mode (`mouseOnly`)", () => {
    it("should ignore non-mouse pointer types when `mouseOnly` is true", async () => {
      initHover({ mouseOnly: true })

      // --- Simulate Touch Enter ---
      const touchEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch", // Non-mouse type
        isPrimary: true,
      })
      referenceEl.dispatchEvent(touchEnterEvent)
      await nextTick()
      vi.runAllTimers()
      await nextTick()

      // Assert: Ignored
      expect(context.open.value).toBe(false) // State should not change
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Simulate Pen Enter ---
      const penEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "pen", // Non-mouse type
        isPrimary: true,
      })
      referenceEl.dispatchEvent(penEnterEvent)
      await nextTick()
      vi.runAllTimers()
      await nextTick()

      // Assert: Ignored
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Simulate Mouse Enter ---
      const mouseEnterEvent = new PointerEvent("pointerenter", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse", // Mouse type
      })
      referenceEl.dispatchEvent(mouseEnterEvent)
      await nextTick()

      // Assert: Should open
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(true)
      setOpenMock.mockClear() // Clear for next steps

      // --- Simulate Touch Leave ---
      // Need to simulate leaving the reference element
      const touchLeaveEvent = new PointerEvent("pointerleave", {
        bubbles: true, // Leave events don't bubble from the element itself, but listeners might be on parents
        cancelable: true,
        pointerType: "touch", // Non-mouse type
        isPrimary: true,
        // relatedTarget simulation is tricky, often null or document.body is okay
        relatedTarget: document.body,
      })
      referenceEl.dispatchEvent(touchLeaveEvent)
      await nextTick()
      vi.runAllTimers()
      await nextTick()

      // Assert: Ignored (should still be open from mouse enter)
      expect(setOpenMock).not.toHaveBeenCalled()

      // --- Simulate Mouse Leave ---
      const mouseLeaveEvent = new PointerEvent("pointerleave", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse", // Mouse type
        clientX: 0, // Coords outside the element typical
        clientY: 0,
        relatedTarget: document.body, // Simulate moving to the body
      })
      referenceEl.dispatchEvent(mouseLeaveEvent)
      await nextTick()

      // Assert: Should close
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(false)
    })
  })

  // --- Edge Case Handling ---
  describe("Edge Case Handling", () => {
    it("should cancel pending open delay if pointer leaves reference", async () => {
      initHover({ delay: { open: 100 } })
      await userEvent.hover(referenceEl)
      vi.advanceTimersByTime(50)
      expect(setOpenMock).not.toHaveBeenCalled()

      await userEvent.unhover(referenceEl)
      vi.runAllTimers()
      expect(setOpenMock).not.toHaveBeenCalled()
    })

    it("should cancel pending close delay if pointer re-enters reference", async () => {
      initHover({ delay: { close: 100 } })
      await userEvent.hover(referenceEl)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      setOpenMock.mockClear()

      await userEvent.unhover(referenceEl)
      vi.advanceTimersByTime(50)
      expect(setOpenMock).not.toHaveBeenCalled()

      await userEvent.hover(referenceEl)
      await nextTick()
      expect(setOpenMock).not.toHaveBeenCalled() // its already open so nothing should happen

      vi.advanceTimersByTime(100)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })

    it("should close (respecting delay) if pointer leaves floating element (when not moving back to ref)", async () => {
      initHover({ delay: { close: 100 } })

      await userEvent.hover(referenceEl) // Open
      expect(context.open.value).toBe(true)
      await userEvent.unhover(referenceEl) // Move off ref (e.g., towards floating)
      await userEvent.hover(floatingEl) // Move onto floating

      vi.advanceTimersByTime(150) // Wait past close delay
      expect(setOpenMock).not.toHaveBeenCalledWith(false) // Should not close yet
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Now leave the floating element
      await userEvent.unhover(floatingEl)
      expect(setOpenMock).not.toHaveBeenCalled() // Close delay starts
      vi.advanceTimersByTime(99)
      expect(setOpenMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("should react to external state changes", async () => {
      initHover()

      // 1. External open -> hover -> external close -> unhover
      context.setOpen(true) // Externally open
      await nextTick()
      expect(context.open.value).toBe(true)

      setOpenMock.mockClear()
      await userEvent.hover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled() // Shouldn't try to open again

      context.setOpen(false)
      await nextTick()
      expect(context.open.value).toBe(false)

      setOpenMock.mockClear()
      await userEvent.unhover(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled() // Shouldn't try to close again

      // 2. External close -> unhover -> external open -> hover
      context.setOpen(true) // Open normally
      await userEvent.hover(referenceEl)
      setOpenMock.mockClear()
      await userEvent.unhover(referenceEl) // Close normally
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
      setOpenMock.mockClear()

      await userEvent.unhover(referenceEl) // Unhover again (while closed)
      await nextTick()
      expect(setOpenMock).not.toHaveBeenCalled()

      context.setOpen(true) // Externally open while not hovered
      await nextTick()
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.hover(referenceEl) // Hover while externally open
      await nextTick()
      expect(setOpenMock).not.toHaveBeenCalled() // Shouldn't try to open again
    })
  })

  // --- Cleanup ---
  describe("Cleanup", () => {
    // Test for enable/disable is already in Core Functionality
    // We need to test automatic cleanup on unmount (simulated)

    it("should remove event listeners on cleanup (simulated unmount)", async () => {
      // we already simulate a scope in the beforeEach hook
      initHover()

      // Verify it works initially
      await userEvent.hover(referenceEl)
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(true)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Stop the effect to simulate unmount and trigger cleanup
      scope.stop()
      await nextTick() // Allow cleanup logic to run

      // Try interacting again - listeners should be gone
      await userEvent.hover(referenceEl)
      vi.runAllTimers() // Check delays too
      expect(setOpenMock).not.toHaveBeenCalled()

      await userEvent.unhover(referenceEl)
      vi.runAllTimers()
      expect(setOpenMock).not.toHaveBeenCalled()

      // Also check floating element interaction is gone
      context.open.value = true // Manually set open to test leave from floating
      await userEvent.hover(floatingEl)
      await userEvent.unhover(floatingEl)
      vi.runAllTimers()
      expect(setOpenMock).not.toHaveBeenCalled() // No close call expected
    })
  })

  it("should handle hover events", () => {
    const { getReferenceProps, getFloatingProps } = useHover(context)
    const referenceProps = getReferenceProps()
    const floatingProps = getFloatingProps()

    expect(referenceProps.onMouseEnter).toBeDefined()
    expect(referenceProps.onMouseLeave).toBeDefined()
    expect(floatingProps.onMouseEnter).toBeDefined()
    expect(floatingProps.onMouseLeave).toBeDefined()
  })
})
