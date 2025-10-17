import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, type Ref, ref, shallowRef } from "vue"
import { type UseFocusOptions, useFocus } from "@/composables"

// Mock the utils module to allow spying on matchesFocusVisible
vi.mock("@/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils")>()
  return {
    ...actual,
    matchesFocusVisible: vi.fn(actual.matchesFocusVisible),
  }
})

import { matchesFocusVisible } from "@/utils"

// Minimal FloatingContext used by tests (mirrors the shape expected by useFocus)
interface FloatingContext {
  id: string
  refs: {
    anchorEl: Ref<HTMLElement | null>
    floatingEl: Ref<HTMLElement | null>
  }
  open: Ref<boolean>
  setOpen: (open: boolean, event?: Event) => void
}

describe("useFocus", () => {
  let context: FloatingContext
  let referenceEl: HTMLElement
  let floatingEl: HTMLElement
  let scope: ReturnType<typeof effectScope>

  const initFocus = (options?: UseFocusOptions) => {
    scope = effectScope()
    scope.run(() => {
      // biome-ignore lint/suspicious/noExplicitAny: testing setup
      useFocus(context as any, options)
    })
  }

  beforeEach(async () => {
    vi.useFakeTimers()

    referenceEl = document.createElement("button")
    referenceEl.id = "reference"
    referenceEl.textContent = "Trigger"
    document.body.appendChild(referenceEl)

    floatingEl = document.createElement("div")
    floatingEl.id = "floating"
    floatingEl.tabIndex = -1 // make focusable
    floatingEl.textContent = "Content"
    document.body.appendChild(floatingEl)

    context = {
      id: "ctx-standalone",
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      open: ref(false),
      setOpen: (v) => {
        context.open.value = v
      },
    }

    context.refs.anchorEl.value = referenceEl
    context.refs.floatingEl.value = floatingEl

    await nextTick()
  })

  afterEach(() => {
    if (scope) scope.stop()

    if (referenceEl.isConnected) document.body.removeChild(referenceEl)
    if (floatingEl.isConnected) document.body.removeChild(floatingEl)

    vi.clearAllMocks()
    vi.mocked(matchesFocusVisible).mockRestore()
    vi.useRealTimers()
  })

  // --- Basic Functionality ---
  describe("basic functionality", () => {
    it("opens on focus (requireFocusVisible = false)", async () => {
      initFocus({ requireFocusVisible: false })
      await nextTick() // Wait for watchPostEffect to attach listeners

      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await nextTick()
      expect(context.open.value).toBe(true)
    })

    it("closes on blur (requireFocusVisible = false)", async () => {
      initFocus({ requireFocusVisible: false })
      await nextTick()

      // Open first
      referenceEl.focus()
      await nextTick()
      expect(context.open.value).toBe(true)
      // no-op: we no longer track calls; we assert on state only

      // Blur should schedule a close on next tick (timeout 0)
      referenceEl.blur()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(false)
    })
  })

  // --- requireFocusVisible option ---
  describe("requireFocusVisible option", () => {
    it("only opens when element matches :focus-visible", async () => {
      // Control the utility used by the composable to detect focus-visible
      vi.mocked(matchesFocusVisible).mockReturnValue(false)

      initFocus({ requireFocusVisible: true })
      await nextTick()

      // Focus not considered focus-visible -> should not open
      referenceEl.focus()
      await nextTick()
      expect(context.open.value).toBe(false)

      // Now simulate focus-visible
      vi.mocked(matchesFocusVisible).mockReturnValue(true)

      // Re-focus to trigger the handler again
      referenceEl.blur()
      vi.runAllTimers()
      await nextTick()

      referenceEl.focus()
      await nextTick()

      expect(context.open.value).toBe(true)
    })
  })

  // --- Disabled State ---
  describe("disabled state", () => {
    it("does not respond to focus when disabled", async () => {
      const enabled = ref(false)
      initFocus({ enabled, requireFocusVisible: false })
      await nextTick()

      referenceEl.focus()
      await nextTick()

      expect(context.open.value).toBe(false)
    })
  })

  // --- Focus strategy behavior ---
  describe("focus strategy", () => {
    it("remains open when focus moves into the floating element", async () => {
      initFocus({ requireFocusVisible: false })
      await nextTick()

      // Open via focus on reference
      referenceEl.focus()
      await nextTick()
      expect(context.open.value).toBe(true)

      // Move focus to floating (should remain open according to strategy)
      floatingEl.focus()
      // The blur handler uses a timeout, flush it
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(true)
    })
  })

  // --- Window blur/focus blocking behavior ---
  describe("window focus/blur blocking", () => {
    it("prevents auto-open when window was blurred while anchor remained focused and closed", async () => {
      initFocus({ requireFocusVisible: false })
      await nextTick()

      // Open first
      referenceEl.focus()
      await nextTick()
      expect(context.open.value).toBe(true)

      // Programmatically close while the anchor stays focused
      context.setOpen(false)
      await nextTick()
      expect(context.open.value).toBe(false)

      // Window loses focus while the anchor is focused and popover is closed
      window.dispatchEvent(new Event("blur"))

      // Refocus sequence should be blocked once due to isFocusBlocked flag
      referenceEl.blur()
      referenceEl.focus()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(false)

      // Regaining window focus resets the block; focusing again should open
      window.dispatchEvent(new Event("focus"))
      referenceEl.blur()
      referenceEl.focus()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(true)
    })
  })

  // --- Cleanup handling ---
  describe("cleanup return", () => {
    it("removes listeners so further focus/blur do not change state", async () => {
      // Initialize and capture cleanup explicitly
      let cleanup: (() => void) | undefined
      scope = effectScope()
      scope.run(() => {
        const ret = useFocus(context as any, { requireFocusVisible: false })
        cleanup = ret.cleanup
      })
      await nextTick()

      // Sanity: focusing opens
      referenceEl.focus()
      await nextTick()
      expect(context.open.value).toBe(true)

      // Call cleanup and verify no further reactions
      cleanup?.()

      referenceEl.blur()
      vi.runAllTimers()
      await nextTick()
      referenceEl.focus()
      vi.runAllTimers()
      await nextTick()

      expect(context.open.value).toBe(true) // unchanged since last open
    })
  })

  // --- Tree-aware behavior ---
  describe("tree-aware focus strategy", () => {
    // Minimal TreeNode factory (aligned with use-escape-key tests)
    function createMockTreeNode(ctx: any, isRoot = false, parent: any = null) {
      const children = shallowRef<any[]>([])
      const parentRef = shallowRef(parent)
      const node: any = {
        id: `node-${Math.random().toString(36).slice(2)}`,
        data: ctx,
        children,
        parent: parentRef,
        isRoot,
        getPath: vi.fn(() => {
          const path: string[] = []
          let current: any = node
          while (current && !current.isRoot) {
            path.unshift(current.id)
            current = current.parent.value
          }
          if (current?.isRoot) path.unshift(current.id)
          return path
        }),
      }
      return node
    }

    it("keeps parent open when focus moves to an open descendant", async () => {
      // Build parent/child DOM
      const parentRef = document.createElement("button")
      const parentFloat = document.createElement("div")
      parentFloat.tabIndex = -1
      parentRef.textContent = "Parent Anchor"
      parentFloat.textContent = "Parent Floating Content"
      document.body.appendChild(parentRef)
      document.body.appendChild(parentFloat)

      const childRef = document.createElement("button")
      const childFloat = document.createElement("div")
      childFloat.tabIndex = -1
      childRef.textContent = "Child Anchor"
      childFloat.textContent = "Child Floating Content"
      document.body.appendChild(childRef)
      document.body.appendChild(childFloat)

      const parentOpen = ref(false)
      const childOpen = ref(true) // descendant is open

      const parentCtx = {
        id: "",
        refs: { anchorEl: ref(parentRef), floatingEl: ref(parentFloat) },
        open: parentOpen,
        setOpen: (v: boolean) => (parentOpen.value = v),
      }
      const childCtx = {
        id: "",
        refs: { anchorEl: ref(childRef), floatingEl: ref(childFloat) },
        open: childOpen,
        setOpen: (v: boolean) => (childOpen.value = v),
      }

      const parentNode = createMockTreeNode(parentCtx, true)
      const childNode = createMockTreeNode(childCtx, false, parentNode)
      parentNode.children.value = [childNode]

      // Sync context ids with node ids as in real tree integration
      parentCtx.id = parentNode.id
      childCtx.id = childNode.id

      // Minimal tree impl for this test
      const tree = {
        findNodeById: (id: string) => {
          if (id === parentNode.id) return parentNode
          if (id === childNode.id) return childNode
          return null
        },
      } as any

      // Attach useFocus to the parent node (tree-aware)
      scope = effectScope()
      scope.run(() => {
        // biome-ignore lint/suspicious/noExplicitAny: testing setup
        useFocus(parentCtx as any, { requireFocusVisible: false, tree })
      })
      await nextTick()

      // Focus parent to open it
      parentRef.focus()
      await nextTick()
      expect(parentOpen.value).toBe(true)

      // Move focus to child's reference
      childRef.focus()
      vi.runAllTimers()
      await nextTick()

      expect(parentOpen.value).toBe(true)

      // Move focus outside hierarchy -> parent should close
      const outside = document.createElement("input")
      document.body.appendChild(outside)
      childRef.blur()
      outside.focus()
      vi.runAllTimers()
      await nextTick()

      expect(parentOpen.value).toBe(false)

      // Cleanup DOM
      document.body.removeChild(parentRef)
      document.body.removeChild(parentFloat)
      document.body.removeChild(childRef)
      document.body.removeChild(childFloat)
      document.body.removeChild(outside)

      scope.stop()
    })
  })
})
