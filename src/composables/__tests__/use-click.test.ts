import { userEvent } from "vitest/browser"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, ref, shallowRef } from "vue"
import { type UseClickOptions,type UseClickContext, useClick } from "@/composables/interactions"

// Track elements created during tests for cleanup
const elementsToCleanUp: HTMLElement[] = []

function trackElement(el: HTMLElement): HTMLElement {
  elementsToCleanUp.push(el)
  return el
}

describe("useClick", () => {
  let context: UseClickContext
  let referenceEl: HTMLElement
  let floatingEl: HTMLElement
  let scope: ReturnType<typeof effectScope>
  let setOpenMock: ReturnType<typeof vi.fn>

  const createElements = () => {
    referenceEl = trackElement(document.createElement("button"))
    referenceEl.id = "reference"
    referenceEl.textContent = "Trigger"
    document.body.appendChild(referenceEl)

    floatingEl = trackElement(document.createElement("div"))
    floatingEl.id = "floating"
    floatingEl.textContent = "Floating"
    document.body.appendChild(floatingEl)

    const openRef = ref(false)
    setOpenMock = vi.fn((open: boolean) => {
      openRef.value = open
    })
    context = {
      refs: {
        anchorEl: ref(referenceEl),
        floatingEl: ref(floatingEl),
        arrowEl: ref(null)
      },
      open: openRef,
      setOpen: setOpenMock as ()=> void,
    }
  }

  beforeEach(() => {
    createElements()
  })

  afterEach(() => {
    scope?.stop()
    // Clean up all tracked elements
    for (const el of elementsToCleanUp) {
      if (el.isConnected) {
        document.body.removeChild(el)
      }
    }
    elementsToCleanUp.length = 0
    vi.clearAllMocks()
  })

  const initClick = (options?: UseClickOptions) => {
    scope = effectScope()
    scope.run(() => {
      useClick(context, options)
    })
  }

  describe("basic toggle behavior", () => {
    it("toggles open state on click", async () => {
      initClick({ toggle: true })
      await nextTick()
      expect(context.open.value).toBe(false)

      await userEvent.click(referenceEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)

      await userEvent.click(referenceEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })

    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      initClick({ ignoreMouse: true })
      expect(context.open.value).toBe(false)

      await userEvent.click(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  describe("advanced behaviors", () => {
    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      initClick({ event: "mousedown", toggle: true })
      expect(context.open.value).toBe(false)

      await nextTick()
      referenceEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
      )
      await nextTick()

      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      referenceEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
      )
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })

    it("ignores outside click after drag that started inside when outsideEvent is 'click'", async () => {
      initClick({ outsideClick: true, outsideEvent: "click", handleDragEvents: true })

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      floatingEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))

      const outside = trackElement(document.createElement("div"))
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
      // outside is tracked and will be cleaned up in afterEach
    })


    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })

      const synthetic = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 })
      referenceEl.dispatchEvent(synthetic)
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  describe("disabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false)
      initClick({ enabled })

      expect(context.open.value).toBe(false)

      await userEvent.click(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)

      enabled.value = true
      await nextTick()

      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)
    })

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true)
      initClick({ enabled })

      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      enabled.value = false
      await nextTick()

      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })
  })

  describe("keyboard accessibility", () => {
    it("toggles on Enter key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      expect(document.activeElement).toBe(referenceEl)

      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)

      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })

    it("toggles on Space key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      expect(document.activeElement).toBe(referenceEl)

      await userEvent.keyboard(" ")
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)

      await userEvent.keyboard(" ")
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      // Create a non-focusable div to test ignoreKeyboard on space
      const nonFocusableEl = trackElement(document.createElement("div"))
      nonFocusableEl.id = "reference"
      nonFocusableEl.textContent = "Trigger"
      document.body.appendChild(nonFocusableEl)

      // Update context to use the new element
      context.refs.anchorEl.value = nonFocusableEl

      initClick({ ignoreKeyboard: true })
      expect(context.open.value).toBe(false)

      nonFocusableEl.focus()
      await userEvent.keyboard(" ")

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
      // nonFocusableEl is tracked and will be cleaned up in afterEach
    })

    it("does not trigger on Enter key press if ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await userEvent.keyboard("{Enter}")

      expect(setOpenMock).not.toHaveBeenCalled()
    })
  })

  describe("integration: inside and outside clicks", () => {
    it("supports complete interaction flow: open with inside click, close with outside click", async () => {
      const outsideElement = trackElement(document.createElement("div"))
      outsideElement.id = "outside"
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

      initClick({ outsideClick: true, toggle: true })
      expect(context.open.value).toBe(false)

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
    })

    it("supports toggle behavior with outside click enabled", async () => {
      const outsideElement = trackElement(document.createElement("div"))
      outsideElement.id = "outside"
      Object.assign(outsideElement.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100px",
        height: "100px",
        zIndex: "1",
      })
      document.body.appendChild(outsideElement)

      initClick({ outsideClick: true, toggle: true })

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
    })

    it("respects disabled state for both inside and outside clicks", async () => {
      const outsideElement = trackElement(document.createElement("div"))
      outsideElement.id = "outside"
      Object.assign(outsideElement.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100px",
        height: "100px",
        zIndex: "1",
      })
      document.body.appendChild(outsideElement)

      const enabled = ref(false)
      initClick({ enabled, outsideClick: true })

      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()

      enabled.value = true
      await nextTick()

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      enabled.value = false
      await nextTick()

      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })
  })
})
