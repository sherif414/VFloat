import { describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { useDismiss } from "../interactions/use-dismiss"

describe("useDismiss", () => {
  const mockContext = {
    open: ref(true),
    setOpen: vi.fn(),
    reference: document.createElement("div"),
    floating: document.createElement("div"),
  }

  it("should close on outside press", () => {
    const _dismiss = useDismiss(mockContext, {
      outsidePress: true,
    })

    // Simulate click outside
    const outsideElement = document.createElement("div")
    const event = new MouseEvent("mousedown")
    Object.defineProperty(event, "target", { value: outsideElement })
    document.dispatchEvent(event)

    expect(mockContext.setOpen).toHaveBeenCalledWith(false)
  })

  it("should close on escape press", () => {
    const _dismiss = useDismiss(mockContext, {
      escapeKey: true,
    })

    // Simulate escape key press
    const event = new KeyboardEvent("keydown", { key: "Escape" })
    document.dispatchEvent(event)

    expect(mockContext.setOpen).toHaveBeenCalledWith(false)
  })

  it("should not close when disabled", () => {
    const _dismiss = useDismiss(mockContext, {
      enabled: false,
      outsidePress: true,
      escapeKey: true,
    })

    // Simulate outside click
    const outsideElement = document.createElement("div")
    const clickEvent = new MouseEvent("mousedown")
    Object.defineProperty(clickEvent, "target", { value: outsideElement })
    document.dispatchEvent(clickEvent)

    // Simulate escape key
    const keyEvent = new KeyboardEvent("keydown", { key: "Escape" })
    document.dispatchEvent(keyEvent)

    expect(mockContext.setOpen).not.toHaveBeenCalled()
  })

  it("should close on reference press when referencePress is true", () => {
    const _dismiss = useDismiss(mockContext, {
      referencePress: true,
    })

    // Simulate reference click
    const event = new MouseEvent("mousedown")
    mockContext.reference.dispatchEvent(event)

    expect(mockContext.setOpen).toHaveBeenCalledWith(false)
  })
})
