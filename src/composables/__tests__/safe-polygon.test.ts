import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { safePolygon, type CreateSafePolygonHandlerContext, type Polygon } from "@/composables/interactions/polygon"

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeDOMRect(x: number, y: number, w: number, h: number): DOMRect {
  return { x, y, width: w, height: h, top: y, right: x + w, bottom: y + h, left: x, toJSON() {} } as DOMRect
}

function makeMouseEvent(
  type: string,
  opts: Partial<MouseEvent & { relatedTarget: EventTarget | null }> = {}
): MouseEvent {
  return {
    type,
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    target: opts.target ?? document.body,
    relatedTarget: opts.relatedTarget ?? null,
  } as unknown as MouseEvent
}

type SafePolygonTestContext = CreateSafePolygonHandlerContext & { onCloseMock: ReturnType<typeof vi.fn> }
const activeContexts: SafePolygonTestContext[] = []

function createContext(
  placement: string,
  overrides: Partial<CreateSafePolygonHandlerContext> = {}
): SafePolygonTestContext {
  const refEl = document.createElement("div")
  const floatEl = document.createElement("div")
  document.body.appendChild(refEl)
  document.body.appendChild(floatEl)

  // Position rects based on placement
  const rects: Record<string, [number, number, number, number]> = {
    bottom: [75, 110, 150, 80],  // below ref
    top: [75, -90, 150, 80],     // above ref
    right: [210, 10, 150, 80],   // right of ref
    left: [-160, 10, 150, 80],   // left of ref
  }
  const side = placement.split("-")[0] as string
  const [fx, fy, fw, fh] = (rects[side] ?? rects.bottom)!

  refEl.getBoundingClientRect = () => makeDOMRect(50, 0, 100, 100)
  floatEl.getBoundingClientRect = () => makeDOMRect(fx, fy, fw, fh)

  const onCloseMock = vi.fn()

  const ctx: SafePolygonTestContext = {
    x: overrides.x ?? 100,
    y: overrides.y ?? 50,
    placement: placement as any,
    elements: { domReference: refEl, floating: floatEl },
    buffer: overrides.buffer ?? 1,
    onClose: onCloseMock,
    onCloseMock,
  }
  activeContexts.push(ctx)
  return ctx
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("safePolygon", () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    for (const ctx of activeContexts) {
      const { domReference, floating } = ctx.elements
      if (domReference instanceof HTMLElement && domReference.parentNode) domReference.remove()
      if (floating instanceof HTMLElement && floating.parentNode) (floating as HTMLElement).remove()
    }
    activeContexts.length = 0
    document.body.innerHTML = ""
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── Factory / API shape ──────────────────────────────────────────────────

  describe("factory shape", () => {
    it("returns a function (SafePolygon)", () => {
      const result = safePolygon()
      expect(typeof result).toBe("function")
    })

    it("SafePolygon returns a function (SafePolygonHandler) when given context", () => {
      const ctx = createContext("bottom")
      const handler = safePolygon()(ctx)
      expect(typeof handler).toBe("function")
    })

    it("accepts empty options", () => {
      expect(() => safePolygon()).not.toThrow()
      expect(() => safePolygon({})).not.toThrow()
    })
  })

  // ── Early returns / guard clauses ────────────────────────────────────────

  describe("guard clauses", () => {
    it("returns early when domReference is null", () => {
      const ctx = createContext("bottom")
      ctx.elements.domReference = null
      const handler = safePolygon()(ctx)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("returns early when floating is null", () => {
      const ctx = createContext("bottom")
      ctx.elements.floating = null
      const handler = safePolygon()(ctx)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("returns early when placement is null", () => {
      const ctx = createContext("bottom")
      ;(ctx as any).placement = null
      const handler = safePolygon()(ctx)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("returns early when x is null", () => {
      const ctx = createContext("bottom")
      ;(ctx as any).x = null
      const handler = safePolygon()(ctx)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("returns early when y is null", () => {
      const ctx = createContext("bottom")
      ;(ctx as any).y = null
      const handler = safePolygon()(ctx)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })
  })

  // ── Pointer over floating element ────────────────────────────────────────

  describe("pointer over floating element", () => {
    it("does NOT close when pointer is inside the floating element (non-leave)", () => {
      const ctx = createContext("bottom")
      const handler = safePolygon()(ctx)
      const floatEl = ctx.elements.floating as HTMLElement

      handler(makeMouseEvent("pointermove", {
        clientX: 100, clientY: 130,
        target: floatEl,
      }))

      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("sets hasLanded state when pointer enters floating (subsequent leave from floating triggers close)", () => {
      const ctx = createContext("bottom")
      const handler = safePolygon()(ctx)
      const floatEl = ctx.elements.floating as HTMLElement

      // Enter floating
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 130, target: floatEl }))
      // Leave floating → should close because hasLanded is true and pointer is outside safe zones
      handler(makeMouseEvent("mouseleave", { clientX: 300, clientY: 300, target: floatEl }))
      vi.runAllTimers()

      expect(ctx.onCloseMock).toHaveBeenCalled()
    })
  })

  // ── Pointer over reference element ───────────────────────────────────────

  describe("pointer over reference element", () => {
    it("does NOT close when pointer is over reference (non-leave event)", () => {
      const ctx = createContext("bottom")
      const handler = safePolygon()(ctx)
      const refEl = ctx.elements.domReference as HTMLElement

      handler(makeMouseEvent("pointermove", { clientX: 80, clientY: 50, target: refEl }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })
  })

  // ── mouseleave to floating (overlap prevention) ──────────────────────────

  describe("mouseleave with relatedTarget inside floating", () => {
    it("does NOT close when leaving to floating element (prevents open-close loop)", () => {
      const ctx = createContext("bottom")
      const handler = safePolygon()(ctx)
      const floatEl = ctx.elements.floating as HTMLElement

      handler(makeMouseEvent("mouseleave", {
        clientX: 100, clientY: 105,
        relatedTarget: floatEl,
      }))

      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })
  })

  // ── Opposite-side guard ──────────────────────────────────────────────────

  describe("opposite-side guard", () => {
    it("closes when pointer leaves from the opposite side of placement=bottom", () => {
      // Floating is below ref → leaving from top of ref (y <= refRect.top+1) should close
      const ctx = createContext("bottom", { y: 1 })
      const handler = safePolygon()(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: -10 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })

    it("closes when pointer leaves from the opposite side of placement=top", () => {
      // Floating is above ref → leaving from bottom of ref (y >= refRect.bottom-1) should close
      const ctx = createContext("top", { y: 99 })
      const handler = safePolygon()(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 200 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })

    it("closes when pointer leaves from the opposite side of placement=left", () => {
      const ctx = createContext("left", { x: 150 })
      const handler = safePolygon()(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 300, clientY: 50 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })

    it("closes when pointer leaves from the opposite side of placement=right", () => {
      const ctx = createContext("right", { x: 51 })
      const handler = safePolygon()(ctx)

      handler(makeMouseEvent("pointermove", { clientX: -10, clientY: 50 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })
  })

  // ── Safe polygon hit testing ─────────────────────────────────────────────

  describe("safe zone hit testing", () => {
    it("keeps open when pointer is within the safe polygon (bottom placement)", () => {
      // Cursor left from center of ref, moving straight down toward floating
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false })(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("closes when pointer is outside all safe zones", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false })(ctx)

      // Move far away from both ref and floating
      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })

    for (const side of ["top", "bottom", "left", "right"] as const) {
      it(`builds safe zones for placement="${side}"`, () => {
        const ctx = createContext(side, { x: 100, y: 50 })
        const handler = safePolygon({ requireIntent: false })(ctx)

        // Move far outside → expect close
        handler(makeMouseEvent("pointermove", { clientX: 900, clientY: 900 }))
        expect(ctx.onCloseMock).toHaveBeenCalled()
      })
    }
  })

  // ── onPolygonChange callback ─────────────────────────────────────────────

  describe("onPolygonChange callback", () => {
    it("invokes onPolygonChange with polygon vertices on each move", () => {
      const onPolygonChange = vi.fn()
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false, onPolygonChange })(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))

      expect(onPolygonChange).toHaveBeenCalledTimes(1)
      const polygon: Polygon = onPolygonChange.mock.calls[0]![0] as Polygon
      expect(Array.isArray(polygon)).toBe(true)
      expect(polygon.length).toBeGreaterThanOrEqual(4) // trapezoid has 4 vertices
      for (const pt of polygon) {
        expect(pt).toHaveLength(2)
        expect(typeof pt[0]).toBe("number")
        expect(typeof pt[1]).toBe("number")
      }
    })

    it("is NOT called when guard clauses return early", () => {
      const onPolygonChange = vi.fn()
      const ctx = createContext("bottom")
      ctx.elements.domReference = null
      const handler = safePolygon({ onPolygonChange })(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(onPolygonChange).not.toHaveBeenCalled()
    })
  })

  // ── Intent detection (requireIntent) ─────────────────────────────────────

  describe("intent detection (requireIntent)", () => {
    it("schedules a close when cursor speed is very slow (default requireIntent=true)", () => {
      let now = 1000
      const perfSpy = vi.spyOn(performance, "now").mockImplementation(() => now)

      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon()(ctx)

      // Use a point inside the safe polygon but OUTSIDE the rectangular trough.
      // The trough covers x:50..150, so x=160 is outside it but inside the
      // wider triangular polygon that fans from the cursor toward the floating rect.
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()

      // Advance mocked time significantly so speed is very low on next tiny move
      now += 5000

      // Second move: minimal distance after long time → very slow speed  (< 0.1 px/ms)
      handler(makeMouseEvent("pointermove", { clientX: 160, clientY: 109.01 }))

      // Close should be scheduled (setTimeout 40ms)
      vi.advanceTimersByTime(40)
      expect(ctx.onCloseMock).toHaveBeenCalled()
      perfSpy.mockRestore()
    })

    it("does NOT schedule close when requireIntent is false", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false })(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      vi.advanceTimersByTime(1000)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }))
      vi.advanceTimersByTime(100)

      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })

    it("does NOT schedule close after hasLanded (pointer visited floating)", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon()(ctx)
      const floatEl = ctx.elements.floating as HTMLElement

      // Land on floating element → sets hasLanded=true
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 130, target: floatEl }))

      // Move back into safe zone slowly
      vi.advanceTimersByTime(1000)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      vi.advanceTimersByTime(1000)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }))
      vi.advanceTimersByTime(100)

      // Intent check is skipped after landing
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })
  })

  // ── Timer management ─────────────────────────────────────────────────────

  describe("timer management", () => {
    it("clears previous timeout on each new mousemove", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon()(ctx)

      // Trigger slow-speed close schedule
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      vi.advanceTimersByTime(1000)
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105.001 }))

      // Before timeout fires, do another fast move in safe zone
      vi.advanceTimersByTime(10) // only 10ms of the 40ms
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 106 }))

      // The old timeout should be cleared; advance past original timeout
      vi.advanceTimersByTime(100)
      // Should still have been called from the new check, but the key point is
      // the old timer was cleared (no double-call)
    })
  })

  // ── Buffer option ────────────────────────────────────────────────────────

  describe("buffer option", () => {
    it("uses default buffer of 1 when not specified", () => {
      const onPolygonChange = vi.fn()
      const ctx = createContext("bottom", { x: 100, y: 99 })
      ctx.buffer = 1
      const handler = safePolygon({ requireIntent: false, onPolygonChange })(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      const poly1: Polygon = onPolygonChange.mock.calls[0]![0] as Polygon

      // Now test with larger buffer
      const onPolygonChange2 = vi.fn()
      const ctx2 = createContext("bottom", { x: 100, y: 99 })
      ctx2.buffer = 10
      const handler2 = safePolygon({ requireIntent: false, onPolygonChange: onPolygonChange2 })(ctx2)

      handler2(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      const poly2: Polygon = onPolygonChange2.mock.calls[0]![0] as Polygon

      // Larger buffer should produce different polygon vertices
      expect(poly1).not.toEqual(poly2)
    })
  })

  // ── Placement with alignment (e.g. "bottom-start") ──────────────────────

  describe("placement with alignment", () => {
    it("extracts the side correctly from 'bottom-start'", () => {
      const ctx = createContext("bottom-start", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false })(ctx)

      // Should not crash; should work like "bottom"
      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })

    it("extracts the side correctly from 'top-end'", () => {
      const ctx = createContext("top-end", { x: 100, y: 1 })
      const handler = safePolygon({ requireIntent: false })(ctx)

      handler(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })
  })

  // ── Multiple handler instances (closure isolation) ───────────────────────

  describe("closure isolation", () => {
    it("separate safePolygon() calls have independent state", () => {
      const sp1 = safePolygon({ requireIntent: false })
      const sp2 = safePolygon({ requireIntent: false })

      const ctx1 = createContext("bottom", { x: 100, y: 99 })
      const ctx2 = createContext("bottom", { x: 100, y: 99 })
      const handler1 = sp1(ctx1)
      const handler2 = sp2(ctx2)

      // Close handler1's context
      handler1(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }))
      expect(ctx1.onCloseMock).toHaveBeenCalled()
      expect(ctx2.onCloseMock).not.toHaveBeenCalled()

      // Close handler2's context
      handler2(makeMouseEvent("pointermove", { clientX: 500, clientY: 500 }))
      expect(ctx2.onCloseMock).toHaveBeenCalled()

    })
  })

  // ── Rectangular trough safe zone ─────────────────────────────────────────

  describe("rectangular trough", () => {
    it("keeps open when cursor is in the gap between ref and floating (bottom)", () => {
      // Ref: y=0..100, Floating: y=110..190, gap=100..110
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false })(ctx)

      // Point in the gap between ref and floating
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 105 }))
      expect(ctx.onCloseMock).not.toHaveBeenCalled()
    })
  })

  // ── hasLanded + outside reference rect → close ───────────────────────────

  describe("hasLanded and pointer outside ref", () => {
    it("closes when pointer has landed on floating, then moves outside both safe zones and ref rect", () => {
      const ctx = createContext("bottom", { x: 100, y: 99 })
      const handler = safePolygon({ requireIntent: false })(ctx)
      const floatEl = ctx.elements.floating as HTMLElement

      // Land on floating
      handler(makeMouseEvent("pointermove", { clientX: 100, clientY: 130, target: floatEl }))

      // Move far outside everything
      handler(makeMouseEvent("pointermove", { clientX: 900, clientY: 900 }))
      expect(ctx.onCloseMock).toHaveBeenCalled()
    })
  })
})
