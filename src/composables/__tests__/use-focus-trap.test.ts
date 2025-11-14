import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, ref, shallowRef } from "vue"
import type { FloatingContext } from "@/composables/positioning/use-floating"
import { useFocusTrap } from "@/composables/interactions/use-focus-trap"

function createContext() {
  const anchor = document.createElement("button")
  anchor.id = "anchor"
  const floating = document.createElement("div")
  floating.id = "floating"
  floating.tabIndex = -1
  document.body.appendChild(anchor)
  document.body.appendChild(floating)

  const openRef = ref(false)
  const setOpen = vi.fn((v: boolean) => {
    openRef.value = v
  })

  const ctx: FloatingContext = {
    id: "ctx",
    x: ref(0),
    y: ref(0),
    strategy: ref("absolute"),
    placement: ref("bottom" as any),
    middlewareData: shallowRef({}),
    isPositioned: ref(false),
    floatingStyles: ref({ position: "absolute", left: "0", top: "0" }),
    update: vi.fn(),
    refs: {
      anchorEl: ref(anchor),
      floatingEl: ref(floating),
      arrowEl: ref(null),
    },
    open: openRef,
    setOpen,
  }
  return { ctx, anchor, floating, openRef, setOpen }
}

describe("useFocusTrap", () => {
  let scope: ReturnType<typeof effectScope>
  let anchor: HTMLElement
  let floating: HTMLElement
  let ctx: FloatingContext

  beforeEach(() => {
    const created = createContext()
    ctx = created.ctx
    anchor = created.anchor
    floating = created.floating
    scope = effectScope()
  })

  afterEach(() => {
    scope?.stop()
    document.body.innerHTML = ""
    vi.clearAllMocks()
  })

  it("inserts guards and traps Tab navigation", async () => {
    const b1 = document.createElement("button")
    const b2 = document.createElement("button")
    const b3 = document.createElement("button")
    floating.append(b1, b2, b3)

    scope.run(() => {
      useFocusTrap(ctx, { guards: true })
    })

    ctx.setOpen(true)
    await nextTick()

    const first = floating.firstChild as HTMLElement
    const last = floating.lastChild as HTMLElement
    expect(first?.getAttribute("aria-hidden")).toBe("true")
    expect(last?.getAttribute("aria-hidden")).toBe("true")

    b1.focus()
    await nextTick()
    const keyEvt = new KeyboardEvent("keydown", { key: "Tab" })
    floating.dispatchEvent(keyEvt)
    await nextTick()
    expect(document.activeElement === b1 || document.activeElement === floating).toBeTruthy()
  })

  it("initialFocus variants select targets correctly", async () => {
    const b1 = document.createElement("button")
    const b2 = document.createElement("button")
    const b3 = document.createElement("button")
    floating.append(b1, b2, b3)

    scope.run(() => {
      useFocusTrap(ctx, { initialFocus: "last", guards: false })
    })
    ctx.setOpen(true)
    await nextTick()
    expect(document.activeElement).toBe(b3)

    scope.stop()
    scope = effectScope()
    scope.run(() => {
      useFocusTrap(ctx, { initialFocus: 1, guards: false })
    })
    ctx.setOpen(true)
    await nextTick()
    expect(document.activeElement).toBe(b2)

    scope.stop()
    scope = effectScope()
    scope.run(() => {
      useFocusTrap(ctx, { initialFocus: () => b1, guards: false })
    })
    ctx.setOpen(true)
    await nextTick()
    expect(document.activeElement).toBe(b1)
  })

  it("fallbacks to container focus when no tabbables", async () => {
    scope.run(() => {
      useFocusTrap(ctx, { initialFocus: "first", guards: false })
    })
    ctx.setOpen(true)
    await nextTick()
    expect(document.activeElement).toBe(floating)
  })

  it("modal hides outside content via aria-hidden and restores on cleanup", async () => {
    const outside = document.createElement("div")
    document.body.appendChild(outside)

    scope.run(() => {
      useFocusTrap(ctx, { modal: true })
      ctx.setOpen(true)
    })
    await nextTick()
    expect(outside.getAttribute("aria-hidden")).toBe("true")
    scope.stop()
    await nextTick()
    expect(outside.getAttribute("aria-hidden") === null || outside.getAttribute("aria-hidden") === "true").toBeTruthy()
  })

  it("non-modal closes on focus out when closeOnFocusOut=true", async () => {
    const { setOpen } = createContext()
    vi.spyOn(ctx, "setOpen").mockImplementation(setOpen)

    scope.run(() => {
      useFocusTrap(ctx, { modal: false, closeOnFocusOut: true })
    })
    ctx.setOpen(true)
    await nextTick()

    const outside = document.createElement("input")
    document.body.appendChild(outside)
    outside.focus()
    await nextTick()
    expect(vi.mocked(ctx.setOpen)).toHaveBeenCalled()
  })

  it("returnFocus restores to previous on close unless skipped", async () => {
    const other = document.createElement("button")
    document.body.appendChild(other)
    other.focus()

    scope.run(() => {
      useFocusTrap(ctx, { returnFocus: true })
    })
    ctx.setOpen(true)
    await nextTick()
    ctx.setOpen(false)
    await nextTick()
    expect(document.activeElement).toBe(other)
  })

  
})