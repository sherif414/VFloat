import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import { effectScope, nextTick, ref } from "vue"
import { getFloatingInternals } from "@/core/floating-internals"
import { useHover } from "@/composables/interactions"
import { useArrow, useClientPoint, useFloating } from "@/composables/positioning"

const createdElements: HTMLElement[] = []

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K) {
  const element = document.createElement(tag)
  createdElements.push(element)
  document.body.appendChild(element)
  return element
}

function createRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect
}

afterEach(() => {
  for (const element of createdElements) {
    element.remove()
  }

  createdElements.length = 0
  vi.restoreAllMocks()
})

describe("floating root contract", () => {
  it("returns grouped state and position sections while preserving flat aliases", () => {
    const anchorEl = createElement("button")
    const floatingEl = createElement("div")
    anchorEl.getBoundingClientRect = () => createRect(10, 20, 80, 30)
    floatingEl.getBoundingClientRect = () => createRect(0, 0, 120, 60)

    const context = useFloating(ref(anchorEl), ref(floatingEl))

    expect(context.state.open).toBe(context.open)
    expect(context.state.setOpen).toBe(context.setOpen)
    expect(context.position.x).toBe(context.x)
    expect(context.position.placement).toBe(context.placement)
    expect(context.position.styles).toBe(context.floatingStyles)
    expect(context.position.update).toBe(context.update)
    expect(context.refs.setAnchor).toBeTypeOf("function")
    expect(context.refs.setFloating).toBeTypeOf("function")
    expect(context.refs.setArrow).toBeTypeOf("function")
  })

  it("registers arrow middleware when useArrow owns the arrow element", () => {
    const anchorEl = createElement("button")
    const floatingEl = createElement("div")
    const arrowEl = ref(createElement("div"))
    const context = useFloating(ref(anchorEl), ref(floatingEl))

    useArrow(context, { element: arrowEl })

    expect(context.refs.arrowEl.value).toBe(arrowEl.value)
    expect(
      getFloatingInternals(context)?.middlewareRegistry.middlewares.value.some(
        (middleware) => middleware.name === "arrow"
      )
    ).toBe(true)
  })

  it("supports the root-first useClientPoint overload", async () => {
    const triggerEl = createElement("div")
    const anchorEl = createElement("button")
    const floatingEl = createElement("div")

    const context = useFloating(ref(anchorEl), ref(floatingEl), {
      open: ref(true),
    })

    const { coordinates } = useClientPoint(context, {
      pointerTarget: ref(triggerEl),
      trackingMode: "follow",
    })

    triggerEl.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: 140,
        clientY: 240,
        pointerType: "mouse",
      })
    )

    await nextTick()

    expect(coordinates.value).toEqual({ x: 140, y: 240 })
  })

  it("does not emit scope-dispose warnings during normal hook usage", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const scope = effectScope()
    const anchorEl = createElement("button")
    const floatingEl = createElement("div")
    const context = useFloating(ref(anchorEl), ref(floatingEl))

    scope.run(() => {
      useHover(context)
    })

    scope.stop()

    expect(
      warnSpy.mock.calls.some(([message]) =>
        String(message).includes("onScopeDispose() is called when there is no active effect scope")
      )
    ).toBe(false)
  })
})
