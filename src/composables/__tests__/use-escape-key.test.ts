import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { useEscapeKey } from "@/composables/interactions/use-escape-key"
import type { FloatingContext } from "../positioning/use-floating"
import type { TreeNode } from "../positioning/use-floating-tree"

// Mock dependencies
vi.mock("@vueuse/core", () => ({
  useEventListener: vi.fn((target, event, handler) => {
    document.addEventListener(event, handler)
    return () => document.removeEventListener(event, handler)
  }),
}))

// Test utilities
function createMockFloatingContext(): FloatingContext {
  const open = ref(false)
  const setOpen = vi.fn((value: boolean, reason?: string, event?: KeyboardEvent) => {
    open.value = value
  })

  return {
    id: `mock-${Math.random().toString(36).substr(2, 9)}`,
    x: ref(0),
    y: ref(0),
    strategy: ref("absolute"),
    placement: ref("bottom"),
    middlewareData: ref({}),
    isPositioned: ref(false),
    floatingStyles: ref({ position: "absolute", top: "0px", left: "0px" }),
    update: vi.fn(),
    open,
    setOpen,
    refs: {
      anchorEl: ref(null),
      floatingEl: ref(null),
      arrowEl: ref(null),
    },
  } as any
}

function createMockTreeNode(
  context: FloatingContext,
  isRoot = false,
  parent: TreeNode<FloatingContext> | null = null
): TreeNode<FloatingContext> {
  const children = ref<TreeNode<FloatingContext>[]>([])
  const parentRef = ref(parent)

  const mockNode: TreeNode<FloatingContext> = {
    id: `node-${Math.random().toString(36).substr(2, 9)}`,
    data: context,
    children,
    parent: parentRef,
    isRoot,
    getPath: vi.fn(() => {
      const path: TreeNode<FloatingContext>[] = []
      let current: TreeNode<FloatingContext> | null = mockNode
      while (current) {
        path.unshift(current)
        current = current.parent.value
      }
      return path
    }),
  } as any

  return mockNode
}

describe("useEscapeKey", () => {
  describe("FloatingContext behavior", () => {
    it("should close floating element on escape key press", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)

      useEscapeKey(context)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })

    it("should not trigger when floating element is already closed", async () => {
      const context = createMockFloatingContext()
      context.setOpen(false)

      useEscapeKey(context)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })

    it("should respect enabled option", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      useEscapeKey(context, { enabled: false })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should use custom onEscape handler when provided", async () => {
      const context = createMockFloatingContext()
      const customHandler = vi.fn()

      useEscapeKey(context, {
        onEscape: customHandler,
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(customHandler).toHaveBeenCalled()
      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should ignore non-escape keys", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      useEscapeKey(context)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", keyCode: 32 } as any))

      expect(context.setOpen).not.toHaveBeenCalled()
    })
  })

  describe("TreeNode behavior", () => {
    it("should close topmost open node in tree", async () => {
      // Create a simple tree structure
      const rootContext = createMockFloatingContext()
      const childContext = createMockFloatingContext()
      const grandchildContext = createMockFloatingContext()

      rootContext.setOpen(true)
      childContext.setOpen(true)
      grandchildContext.setOpen(true)
      ;(rootContext.setOpen as any).mockClear()
      ;(childContext.setOpen as any).mockClear()
      ;(grandchildContext.setOpen as any).mockClear()

      const rootNode = createMockTreeNode(rootContext, true)
      const childNode = createMockTreeNode(childContext, false, rootNode)
      const grandchildNode = createMockTreeNode(grandchildContext, false, childNode)

      // Mock the children relationships
      rootNode.children.value = [childNode]
      childNode.children.value = [grandchildNode]

      useEscapeKey(grandchildNode)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      // Should close the deepest (topmost) open node
      expect(grandchildContext.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent)
      )
      expect(childContext.setOpen).not.toHaveBeenCalled()
      expect(rootContext.setOpen).not.toHaveBeenCalled()
    })

    it("should handle tree with only root node open", async () => {
      const rootContext = createMockFloatingContext()
      rootContext.setOpen(true)

      const rootNode = createMockTreeNode(rootContext, true)

      useEscapeKey(rootNode)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(rootContext.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })

    it("should do nothing when no nodes are open in tree", async () => {
      const rootContext = createMockFloatingContext()
      const childContext = createMockFloatingContext()

      rootContext.setOpen(false)
      childContext.setOpen(false)
      ;(rootContext.setOpen as any).mockClear()
      ;(childContext.setOpen as any).mockClear()

      const rootNode = createMockTreeNode(rootContext, true)
      const childNode = createMockTreeNode(childContext, false, rootNode)

      rootNode.children.value = [childNode]

      useEscapeKey(childNode)

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(rootContext.setOpen).not.toHaveBeenCalled()
      expect(childContext.setOpen).not.toHaveBeenCalled()
    })

    it("should work with custom onEscape handler for tree nodes", async () => {
      const rootContext = createMockFloatingContext()
      const rootNode = createMockTreeNode(rootContext, true)
      const customHandler = vi.fn()

      useEscapeKey(rootNode, {
        onEscape: customHandler,
      })

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(customHandler).toHaveBeenCalled()
      expect(rootContext.setOpen).not.toHaveBeenCalled()
    })
  })

  describe("Composition event handling", () => {
    it("should ignore escape during composition", async () => {
      const context = createMockFloatingContext()
      context.setOpen(true)
      ;(context.setOpen as any).mockClear()

      useEscapeKey(context)

      // Start composition
      document.dispatchEvent(new CompositionEvent("compositionstart"))
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).not.toHaveBeenCalled()

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"))

      // Now escape should work
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))
    })
  })

  describe("Options handling", () => {
    it("should respect reactive enabled option", async () => {
      const context = createMockFloatingContext()
      const enabled = ref(true)

      useEscapeKey(context, { enabled })

      // Initially enabled
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
      expect(context.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent))

      vi.clearAllMocks()
      enabled.value = false

      // Now disabled
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should handle capture option", () => {
      const context = createMockFloatingContext()
      const { useEventListener } = require("@vueuse/core")

      useEscapeKey(context, { capture: true })

      expect(useEventListener).toHaveBeenCalledWith(
        document,
        "keydown",
        expect.any(Function),
        true
      )
    })
  })
})