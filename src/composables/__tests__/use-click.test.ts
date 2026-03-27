import { userEvent } from "vite-plus/test/browser"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { effectScope, nextTick, ref } from "vue"
import { type UseClickOptions,type UseClickContext, useClick } from "@/composables/interactions"

// Track elements created during tests for cleanup
const elementsToCleanUp: HTMLElement[] = []

function trackElement(el: HTMLElement): HTMLElement {
  elementsToCleanUp.push(el)
  return el
}

function clearTrackedElements() {
  for (const el of elementsToCleanUp) {
    if (el.isConnected) {
      document.body.removeChild(el)
    }
  }
  elementsToCleanUp.length = 0
}

function createOutsideElement(): HTMLElement {
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
  return outsideElement
}

describe("useClick", () => {
  let context: UseClickContext
  let anchorEl: HTMLElement
  let floatingEl: HTMLElement
  let scope: ReturnType<typeof effectScope>
  let setOpenMock: ReturnType<typeof vi.fn>

  const createElements = () => {
    anchorEl = trackElement(document.createElement("button"))
    anchorEl.id = "reference"
    anchorEl.textContent = "Trigger"
    document.body.appendChild(anchorEl)

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
        anchorEl: ref(anchorEl),
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
    clearTrackedElements()
    vi.clearAllMocks()
  })

  const initClick = (options?: UseClickOptions) => {
    scope = effectScope()
    scope.run(() => {
      useClick(context, options)
    })
  }

  describe("click behavior", () => {
    it("toggles open state on click", async () => {
      initClick({ toggle: true })
      await nextTick()
      expect(context.open.value).toBe(false)

      await userEvent.click(anchorEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)

      await userEvent.click(anchorEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })

    it("opens but does not toggle when toggle is false", async () => {
      initClick({ toggle: false })
      await nextTick()
      expect(context.open.value).toBe(false)

      // First click should open
      await userEvent.click(anchorEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)

      // Second click should NOT close (toggle behavior disabled)
      await userEvent.click(anchorEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1) // Still only called once
      expect(context.open.value).toBe(true)

      // Third click should also NOT close
      await userEvent.click(anchorEl)
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1) // Still only called once
      expect(context.open.value).toBe(true)
    })
  })

  describe("outside dismissal behavior", () => {
    it("closes on outside click when closeOnOutsideClick is enabled", async () => {
      const outsideElement = createOutsideElement()

      initClick({ toggle: false, closeOnOutsideClick: true, outsideClickEvent: "click" })
      await nextTick()
      expect(context.open.value).toBe(false)

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(outsideElement)
      await nextTick()

      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })

    it("does not close when clicking the anchor while outside dismissal is enabled", async () => {
      initClick({ closeOnOutsideClick: true, toggle: false, outsideClickEvent: "click" })
      await nextTick()

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.click(anchorEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })

    it("does not close when clicking the floating element while outside dismissal is enabled", async () => {
      initClick({ closeOnOutsideClick: true, toggle: false, outsideClickEvent: "click" })
      await nextTick()

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.click(floatingEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })
  })

  describe("pointer behavior", () => {
    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      initClick({ ignoreMouse: true })
      expect(context.open.value).toBe(false)

      await userEvent.click(anchorEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })

    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      initClick({ event: "mousedown", toggle: true })
      expect(context.open.value).toBe(false)

      await nextTick()
      anchorEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
      )
      await nextTick()

      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      anchorEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
      )
      await nextTick()
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(false)
    })
  })

  describe("drag behavior", () => {
    it("ignores outside click after drag that started inside when outsideClickEvent is 'click'", async () => {
      initClick({ closeOnOutsideClick: true, outsideClickEvent: "click", ignoreDrag: true })

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      floatingEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))

      const outside = createOutsideElement()
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })
  })

  describe("keyboard behavior", () => {
    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })

      const synthetic = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 })
      anchorEl.dispatchEvent(synthetic)
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })

    it("toggles on Enter key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      anchorEl.focus()
      expect(document.activeElement).toBe(anchorEl)

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

      anchorEl.focus()
      expect(document.activeElement).toBe(anchorEl)

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

      anchorEl.focus()
      await userEvent.keyboard("{Enter}")

      expect(setOpenMock).not.toHaveBeenCalled()
    })
  })

  describe("enabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false)
      initClick({ enabled })

      expect(context.open.value).toBe(false)

      await userEvent.click(anchorEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)

      enabled.value = true
      await nextTick()

      await userEvent.click(anchorEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      expect(context.open.value).toBe(true)
    })

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true)
      initClick({ enabled })

      await userEvent.click(anchorEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      enabled.value = false
      await nextTick()

      await userEvent.click(anchorEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)
    })
  })

  describe("combined interaction flows", () => {
    it("supports complete interaction flow: open with inside click, close with outside click", async () => {
      const outsideElement = createOutsideElement()

      initClick({ closeOnOutsideClick: true, toggle: true })
      expect(context.open.value).toBe(false)

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object))
    })
  })

  describe("combined behavior with outside clicks", () => {
    it("supports toggle behavior with outside click enabled", async () => {
      const outsideElement = createOutsideElement()

      initClick({ closeOnOutsideClick: true, toggle: true })

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
      setOpenMock.mockClear()

      await userEvent.click(anchorEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object))
    })
  })

  describe("combined behavior with disabled state", () => {
    it("respects disabled state for both inside and outside clicks", async () => {
      const outsideElement = createOutsideElement()

      const enabled = ref(false)
      initClick({ enabled, closeOnOutsideClick: true })

      await userEvent.click(anchorEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()

      enabled.value = true
      await nextTick()

      await userEvent.click(anchorEl)
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
