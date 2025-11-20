import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import type { AnchorElement, FloatingElement } from "@/composables/positioning"
import { useFloating, useFloatingTree } from "@/composables/positioning"
import { useListNavigation } from "@/composables/interactions"

const createMockElement = (tagName = "div", attributes: Record<string, any> = {}) => {
  const element = document.createElement(tagName)
  Object.assign(element, attributes)
  return element
}

describe("useListNavigation", () => {
  let anchorEl: HTMLElement
  let floatingEl: HTMLElement
  let items: HTMLElement[]
  let listRef: ReturnType<typeof ref<Array<HTMLElement | null>>>
  let open: ReturnType<typeof ref<boolean>>
  let activeIndex: ReturnType<typeof ref<number | null>>

  beforeEach(() => {
    anchorEl = createMockElement("button")
    floatingEl = createMockElement("div")
    document.body.appendChild(anchorEl)
    document.body.appendChild(floatingEl)
    items = Array.from({ length: 8 }, () => createMockElement("button"))
    items.forEach((el) => floatingEl.appendChild(el))
    listRef = ref(items)
    open = ref(false)
    activeIndex = ref(null)
  })

  afterEach(() => {
    document.body.innerHTML = ""
    vi.clearAllMocks()
  })

  const makeContext = () => {
    const anchorRef = ref<AnchorElement>(anchorEl)
    const floatingRef = ref<FloatingElement>(floatingEl)
    return useFloating(anchorRef, floatingRef, { open })
  }

  it("opens on arrow and selects first enabled", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      openOnArrowKeyDown: true,
      orientation: "vertical",
    })
    const e = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    anchorEl.dispatchEvent(e)
    await nextTick()
    expect(ctx.open.value).toBe(true)
    expect(onNavigate).toHaveBeenCalled()
    expect(activeIndex.value).toBe(0)
  })

  it("opens on ArrowUp and selects last enabled", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      openOnArrowKeyDown: true,
      orientation: "vertical",
    })
    const e = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })
    anchorEl.dispatchEvent(e)
    await nextTick()
    expect(ctx.open.value).toBe(true)
    expect(activeIndex.value).toBe(items.length - 1)
  })

  it("uses selectedIndex on open", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    const selectedIndex = ref(3)
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      selectedIndex,
      openOnArrowKeyDown: true,
      orientation: "vertical",
    })
    anchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(3)
  })

  it("vertical navigation skips disabled and no wrap when loop=false", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    const disabled = [1]
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      disabledIndices: disabled,
      loop: false,
      orientation: "vertical",
    })
    open.value = true
    activeIndex.value = 0
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(2)
    activeIndex.value = items.length - 1
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(items.length - 1)
  })

  it("wraps when loop=true", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      loop: true,
      orientation: "vertical",
    })
    open.value = true
    activeIndex.value = items.length - 1
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(0)
  })

  it("home and end jump", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, { listRef, activeIndex, onNavigate, orientation: "vertical" })
    open.value = true
    activeIndex.value = 3
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(0)
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(items.length - 1)
  })

  it("horizontal with RTL", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, { listRef, activeIndex, onNavigate, orientation: "horizontal", rtl: true })
    open.value = true
    activeIndex.value = 0
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(1)
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(0)
  })

  it("grid navigation with cols and wrap", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, { listRef, activeIndex, onNavigate, orientation: "both", cols: 4, loop: true })
    open.value = true
    activeIndex.value = 2
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(6)
    activeIndex.value = items.length - 2
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(2)
  })

  it("hover updates active index when enabled", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, { listRef, activeIndex, onNavigate, focusItemOnHover: true })
    open.value = true
    await nextTick()
    const target = items[4]
    // Simulate mouse move with coordinates to bypass the "ghost hover" check
    target.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }))
    await nextTick()
    expect(activeIndex.value).toBe(4)
  })

  it("focuses item on open when configured", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    useListNavigation(ctx, { listRef, activeIndex, onNavigate, focusItemOnOpen: "auto", orientation: "vertical" })
    anchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(items[0])
  })

  it("virtual sets aria-activedescendant and supports escape to null", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    const virtualItemRef = ref<HTMLElement | null>(null)
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      virtual: true,
      virtualItemRef,
      allowEscape: true,
      loop: true,
      orientation: "vertical",
      disabledIndices: Array.from({ length: items.length }, (_, i) => i),
    })
    open.value = true
    activeIndex.value = 0
    await nextTick()
    expect(anchorEl.getAttribute("aria-activedescendant")).toBe(items[0].id)
    expect(virtualItemRef.value).toBe(items[0])
    activeIndex.value = items.length - 1
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBeNull()
  })

  it("nested close focuses parent", async () => {
    const tree = useFloatingTree()
    const parentAnchor = createMockElement("button")
    const parentFloating = createMockElement("div")
    document.body.appendChild(parentAnchor)
    document.body.appendChild(parentFloating)
    const parentNode = tree.addNode(ref<AnchorElement>(parentAnchor), ref<FloatingElement>(parentFloating), { open: ref(true) })!
    const childNode = tree.addNode(ref<AnchorElement>(anchorEl), ref<FloatingElement>(floatingEl), { parentId: parentNode.id, open })!
    const items2 = Array.from({ length: 4 }, () => createMockElement("button"))
    items2.forEach((el) => floatingEl.appendChild(el))
    const listRef2 = ref(items2)
    const active2 = ref<number | null>(null)
    const onNavigate2 = vi.fn((idx: number | null) => (active2.value = idx))
    useListNavigation(childNode, { listRef: listRef2, activeIndex: active2, onNavigate: onNavigate2, nested: true, orientation: "vertical" })
    open.value = true
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }))
    await nextTick()
    expect(open.value).toBe(false)
    expect(document.activeElement).toBe(parentAnchor)
  })

  it("cleanup removes listeners", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    const { cleanup } = useListNavigation(ctx, { listRef, activeIndex, onNavigate, orientation: "vertical" })
    cleanup()
    anchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    await nextTick()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("grid navigation with loopDirection='next'", async () => {
    const ctx = makeContext()
    const onNavigate = vi.fn((idx: number | null) => (activeIndex.value = idx))
    // 4 cols, 8 items. Row 0: [0, 1, 2, 3], Row 1: [4, 5, 6, 7]
    useListNavigation(ctx, {
      listRef,
      activeIndex,
      onNavigate,
      orientation: "both",
      cols: 4,
      loop: true,
      gridLoopDirection: "next",
    })
    open.value = true
    
    // Move right from end of row 0 -> start of row 1
    activeIndex.value = 3
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(4)

    // Move left from start of row 1 -> end of row 0
    activeIndex.value = 4
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(3)

    // Move right from end of last row -> start of first row (full loop)
    activeIndex.value = 7
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(0)

    // Move left from start of first row -> end of last row (full loop)
    activeIndex.value = 0
    floatingEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }))
    await nextTick()
    expect(activeIndex.value).toBe(7)
  })
})
