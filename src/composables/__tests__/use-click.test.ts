import { userEvent } from "@vitest/browser/context"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, type Ref, ref } from "vue"
import { type UseClickOptions, useClick } from "@/composables"

// a minimal FloatingContext type for the tests
interface FloatingContext {
  refs: {
    anchorEl: Ref<HTMLElement | null>
    floatingEl: Ref<HTMLElement | null>
  }
  open: Ref<boolean>
  setOpen: (open: boolean, event?: Event) => void
}

describe("useClick", () => {
  let context: FloatingContext
  let referenceEl: HTMLElement
  let floatingEl: HTMLElement
  let setOpenMock: ReturnType<typeof vi.fn>
  let scope: ReturnType<typeof effectScope>

  const dispatchTouchPointerSequence = async (element: HTMLElement) => {
    // Ensure watchers in useClick have attached event listeners before dispatching
    await nextTick()
    const pointerDownEvent = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
      pointerId: 1,
      isPrimary: true,
      button: 0,
    })
    element.dispatchEvent(pointerDownEvent)

    const pointerUpEvent = new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
      pointerId: 1,
      isPrimary: true,
      button: 0,
    })
    element.dispatchEvent(pointerUpEvent)

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    element.dispatchEvent(clickEvent)
  }

  // Helper to initialize useClick and wait for effects
  const initClick = (options?: UseClickOptions) => {
    scope = effectScope()
    scope.run(() => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      useClick(context as any, options)
    })
  }

  beforeEach(async () => {
    referenceEl = document.createElement("button")
    referenceEl.id = "reference"
    referenceEl.textContent = "Trigger"
    document.body.appendChild(referenceEl)
    
    floatingEl = document.createElement("div")
    floatingEl.id = "floating"
    floatingEl.textContent = "Content"
    document.body.appendChild(floatingEl)

    setOpenMock = vi.fn()

    context = {
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      open: ref(false),
      setOpen: (v) => {
        context.open.value = v
        setOpenMock(v)
      },
    }

    context.refs.anchorEl.value = referenceEl
    context.refs.floatingEl.value = floatingEl

    await nextTick()
  })

  afterEach(async () => {
    if (scope) {
      scope.stop()
    }

    if (referenceEl.isConnected) {
      document.body.removeChild(referenceEl)
    }
    if (floatingEl.isConnected) {
      document.body.removeChild(floatingEl)
    }

    vi.restoreAllMocks()
  })

  // --- Basic Functionality ---
  describe("basic functionality", () => {
    it("toggles floating element on click by default", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // First click - opens
      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)

      // Second click - closes
      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("only opens floating element when toggle is false", async () => {
      initClick({ toggle: false })
      expect(context.open.value).toBe(false)

      // First click - opens
      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledExactlyOnceWith(true)
      expect(context.open.value).toBe(true)

      // Second click - should stay open (no call to setOpen)
      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledOnce()
      expect(context.open.value).toBe(true)
    })
  })

  // --- Disabled State ---
  describe("disabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false)
      initClick({ enabled }) // Start disabled

      expect(context.open.value).toBe(false)

      // Click trigger
      await userEvent.click(referenceEl)

      // Should remain closed
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)

      // Enable and test again
      enabled.value = true
      await nextTick() // Allow effect to re-run

      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)
    })

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true)
      initClick({ enabled }) // Start enabled

      // Click trigger - works
      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear() // Clear for next check

      // Disable
      enabled.value = false
      await nextTick()

      // Click again - should not work
      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true) // State remains unchanged
    })
  })

  // --- Keyboard Accessibility ---
  describe("keyboard accessibility", () => {
    it("toggles on Enter key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // Ensure trigger has focus
      referenceEl.focus()
      expect(document.activeElement).toBe(referenceEl)

      // Press Enter key - opens
      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)

      // Press Enter key again - closes
      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("toggles on Space key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // Ensure trigger has focus
      referenceEl.focus()
      expect(document.activeElement).toBe(referenceEl)

      // Press Space key - opens
      await userEvent.keyboard(" ")
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)

      // Press Space key again - closes
      await userEvent.keyboard(" ")
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      document.body.removeChild(referenceEl)
      referenceEl = document.createElement("div")
      referenceEl.id = "reference"
      referenceEl.textContent = "Trigger"
      document.body.appendChild(referenceEl)
      context.refs.anchorEl.value = referenceEl

      initClick({ ignoreKeyboard: true })
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await userEvent.keyboard(" ")

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })

    it("does not trigger on Enter key press if ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await userEvent.keyboard("{Enter}")

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  // --- Pointer Event Handling ---
  describe("pointer event handling", () => {
    it("toggles on touch event by default", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // Simulate a touch pointer event
      await dispatchTouchPointerSequence(referenceEl)

      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)
    })

    it("does not toggle on touch event if ignoreTouch is true", async () => {
      initClick({ ignoreTouch: true })
      expect(context.open.value).toBe(false)

      // Simulate a touch pointer event
      await dispatchTouchPointerSequence(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })

    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      initClick({ ignoreMouse: true })
      expect(context.open.value).toBe(false)

      // userEvent.click simulates a mouse click.
      await userEvent.click(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  // --- Programmatic Control (Testing via context) ---
  describe("programmatic control", () => {
    it("can be controlled via setOpen", () => {
      initClick() // Initialize listeners
      expect(context.open.value).toBe(false)

      // Programmatically open
      context.setOpen(true)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true) // No event passed
      expect(context.open.value).toBe(true)

      // Programmatically close
      context.setOpen(false)
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })
  })

  // --- Integration Testing ---
  describe("integration: inside and outside clicks", () => {
    let outsideElement: HTMLElement

    beforeEach(() => {
      outsideElement = document.createElement("div")
      outsideElement.id = "outside"
      // Ensure the element is visible and clickable in Playwright (non-zero size within viewport)
      outsideElement.textContent = "Outside"
      Object.assign(outsideElement.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100px",
        height: "100px",
        zIndex: "1",
      })
      document.body.appendChild(outsideElement)
    })

    afterEach(() => {
      if (outsideElement.isConnected) {
        document.body.removeChild(outsideElement)
      }
    })

    it("supports complete interaction flow: open with inside click, close with outside click", async () => {
      initClick({ outsideClick: true, toggle: true })
      expect(context.open.value).toBe(false)

      // Open with inside click
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      setOpenMock.mockClear()

      // Close with outside click
      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      setOpenMock.mockClear()

      // Open again with inside click
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenCalledWith(true)
    })

    it("supports toggle behavior with outside click enabled", async () => {
      initClick({ outsideClick: true, toggle: true })

      // Open with inside click
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Close with inside click (toggle)
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      setOpenMock.mockClear()

      // Open again
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Close with outside click
      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenCalledWith(false)
    })

    it("respects disabled state for both inside and outside clicks", async () => {
      const enabled = ref(false)
      initClick({ enabled, outsideClick: true })

      // Try inside click when disabled
      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Try outside click when disabled
      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Enable and open
      enabled.value = true
      await nextTick()

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Disable again
      enabled.value = false
      await nextTick()

      // Outside click should not work when disabled
      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true) // Remains open
    })
  })
})
