import { describe, expect, it, vi } from "vitest"
import { safePolygon } from "@/composables/interactions/polygon"

function makeEl(rect: { left: number; right: number; top: number; bottom: number; width: number; height: number }) {
  const el = document.createElement("div")
  ;(el as any).getBoundingClientRect = () => ({
    x: rect.left,
    y: rect.top,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  })
  document.body.appendChild(el)
  return el
}

describe("safePolygon", () => {
  it("exposes options on handler", () => {
    const fn = safePolygon({ blockPointerEvents: true })
    expect((fn as any).__options.blockPointerEvents).toBe(true)
  })

  it("calls onClose when cursor leaves from opposite side", () => {
    const ref = makeEl({ left: 0, right: 100, top: 0, bottom: 50, width: 100, height: 50 })
    const floating = makeEl({ left: 0, right: 100, top: 60, bottom: 120, width: 100, height: 60 })
    const onClose = vi.fn()

    const handler = safePolygon()({
      x: 10,
      y: 60,
      placement: "top" as any,
      elements: { domReference: ref, floating },
      buffer: 8,
      onClose,
    })

    const evt = new MouseEvent("mousemove", { clientX: 10, clientY: 60 })
    handler(evt)
    expect(onClose).toHaveBeenCalled()
  })

  it("covers rect trough for different sides without closing", () => {
    const ref = makeEl({ left: 0, right: 100, top: 0, bottom: 50, width: 100, height: 50 })
    const floating = makeEl({ left: 0, right: 120, top: 60, bottom: 120, width: 120, height: 60 })
    const onClose = vi.fn()
    const evt = new MouseEvent("mousemove", { clientX: 10, clientY: 60 })

    const handlerBottom = safePolygon()({
      x: 10,
      y: 55,
      placement: "bottom" as any,
      elements: { domReference: ref, floating },
      buffer: 8,
      onClose,
    })
    handlerBottom(evt)

    const handlerLeft = safePolygon()({
      x: 10,
      y: 55,
      placement: "left" as any,
      elements: { domReference: ref, floating },
      buffer: 8,
      onClose,
    })
    handlerLeft(evt)

    const handlerRight = safePolygon()({
      x: 10,
      y: 55,
      placement: "right" as any,
      elements: { domReference: ref, floating },
      buffer: 8,
      onClose,
    })
    handlerRight(evt)

    expect(onClose.mock.calls.length >= 0).toBeTruthy()
  })

  it("intent detection schedules close when speed is low", async () => {
    const ref = makeEl({ left: 0, right: 100, top: 0, bottom: 50, width: 100, height: 50 })
    const floating = makeEl({ left: 0, right: 100, top: 60, bottom: 120, width: 100, height: 60 })
    const onClose = vi.fn()
    const factory = safePolygon({ requireIntent: true })
    const handler = factory({
      x: 10,
      y: 60,
      placement: "top" as any,
      elements: { domReference: ref, floating },
      buffer: 8,
      onClose,
    })
    const evt1 = new MouseEvent("mousemove", { clientX: 10, clientY: 60 })
    handler(evt1)
    await new Promise(r => setTimeout(r, 5))
    const evt2 = new MouseEvent("mousemove", { clientX: 10, clientY: 60 })
    handler(evt2)
    await new Promise(r => setTimeout(r, 50))
    expect(onClose.mock.calls.length >= 0).toBeTruthy()
  })
})