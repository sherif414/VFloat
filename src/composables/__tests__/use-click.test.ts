import { userEvent } from "@vitest/browser/context"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, type Ref, ref } from "vue"
import { useClick, type UseClickOptions } from "@/composables"

// a minimal FloatingContext type for the tests
interface FloatingContext {
  refs: {
    reference: Ref<HTMLElement | null>
    floating: Ref<HTMLElement | null>
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

    setOpenMock = vi.fn()

    context = {
      refs: {
        reference: ref(null),
        floating: ref(null),
      },
      open: ref(false),
      setOpen: (v) => {
        context.open.value = v
        setOpenMock(v)
      },
    }

    context.refs.reference.value = referenceEl
    context.refs.floating.value = floatingEl

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

    it("does not trigger on Space key press if keyboardHandlers is false", async () => {
      document.body.removeChild(referenceEl)
      referenceEl = document.createElement("div")
      referenceEl.id = "reference"
      referenceEl.textContent = "Trigger"
      document.body.appendChild(referenceEl)
      context.refs.reference.value = referenceEl

      initClick({ keyboardHandlers: false })
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await userEvent.keyboard(" ")

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

  // --- Cleanup ---
  describe("Cleanup", () => {
    it("should remove event listeners on cleanup (simulated unmount)", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // Stop the scope (simulates component unmount)
      scope.stop()
      await nextTick() // Allow cleanup effects

      // Try clicking - should not trigger setOpen
      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Try keyboard - should not trigger
      referenceEl.focus()
      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).not.toHaveBeenCalled()
    })
  })
})
