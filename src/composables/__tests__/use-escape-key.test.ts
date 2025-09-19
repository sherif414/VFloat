import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import { fireEvent } from "@testing-library/vue"
import { useEscapeKey } from "../interactions/use-escape-key"
import type { FloatingContext } from "../use-floating"
import type { TreeNode } from "../use-floating-tree"

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
  const setOpen = vi.fn((value: boolean) => {
    open.value = value
  })

  return {
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
      const path = []
      let current: TreeNode<FloatingContext> | null = mockNode
      while (current && !current.isRoot) {
        path.unshift(current.id)
        current = current.parent.value
      }
      if (current?.isRoot) {
        path.unshift(current.id)
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
      context.open.value = true

      useEscapeKey(context)

      await fireEvent.keyDown(document, { key: "Escape" })

      expect(context.setOpen).toHaveBeenCalledWith(false)
    })

    it("should not trigger when floating element is already closed", async () => {
      const context = createMockFloatingContext()
      context.open.value = false

      useEscapeKey(context)

      await fireEvent.keyDown(document, { key: "Escape" })

      expect(context.setOpen).toHaveBeenCalledWith(false)
    })

    it("should respect enabled option", async () => {
      const context = createMockFloatingContext()
      context.open.value = true

      useEscapeKey(context, { enabled: false })

      await fireEvent.keyDown(document, { key: "Escape" })

      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should use custom onEscape handler when provided", async () => {
      const context = createMockFloatingContext()
      const customHandler = vi.fn()

      useEscapeKey(context, {
        onEscape: customHandler,
      })

      await fireEvent.keyDown(document, { key: "Escape" })

      expect(customHandler).toHaveBeenCalled()
      expect(context.setOpen).not.toHaveBeenCalled()
    })

    it("should ignore non-escape keys", async () => {
      const context = createMockFloatingContext()
      context.open.value = true

      useEscapeKey(context)

      await fireEvent.keyDown(document, { key: "Enter" })
      await fireEvent.keyDown(document, { key: "Space" })

      expect(context.setOpen).not.toHaveBeenCalled()
    })
  })

  describe("TreeNode behavior", () => {
    it("should close topmost open node in tree", async () => {
      // Create a simple tree structure
      const rootContext = createMockFloatingContext()
      const childContext = createMockFloatingContext()
      const grandchildContext = createMockFloatingContext()

      rootContext.open.value = true
      childContext.open.value = true
      grandchildContext.open.value = true

      const rootNode = createMockTreeNode(rootContext, true)
      const childNode = createMockTreeNode(childContext, false, rootNode)
      const grandchildNode = createMockTreeNode(grandchildContext, false, childNode)

      // Mock the children relationships
      rootNode.children.value = [childNode]
      childNode.children.value = [grandchildNode]

      useEscapeKey(grandchildNode)

      await fireEvent.keyDown(document, { key: "Escape" })

      // Should close the deepest (topmost) open node
      expect(grandchildContext.setOpen).toHaveBeenCalledWith(false)
      expect(childContext.setOpen).not.toHaveBeenCalled()
      expect(rootContext.setOpen).not.toHaveBeenCalled()
    })

    it("should handle tree with only root node open", async () => {
      const rootContext = createMockFloatingContext()
      rootContext.open.value = true

      const rootNode = createMockTreeNode(rootContext, true)

      useEscapeKey(rootNode)

      await fireEvent.keyDown(document, { key: "Escape" })

      expect(rootContext.setOpen).toHaveBeenCalledWith(false)
    })

    it("should do nothing when no nodes are open in tree", async () => {
      const rootContext = createMockFloatingContext()
      const childContext = createMockFloatingContext()

      rootContext.open.value = false
      childContext.open.value = false

      const rootNode = createMockTreeNode(rootContext, true)
      const childNode = createMockTreeNode(childContext, false, rootNode)

      rootNode.children.value = [childNode]

      useEscapeKey(childNode)

      await fireEvent.keyDown(document, { key: "Escape" })

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

      await fireEvent.keyDown(document, { key: "Escape" })

      expect(customHandler).toHaveBeenCalled()
      expect(rootContext.setOpen).not.toHaveBeenCalled()
    })
  })

  describe("Composition event handling", () => {
    it("should ignore escape during composition", async () => {
      const context = createMockFloatingContext()
      context.open.value = true

      useEscapeKey(context)

      // Start composition
      await fireEvent(document, new Event("compositionstart"))

      // Try to press escape during composition
      await fireEvent.keyDown(document, { key: "Escape" })

      expect(context.setOpen).not.toHaveBeenCalled()

      // End composition
      await fireEvent(document, new Event("compositionend"))

      // Now escape should work
      await fireEvent.keyDown(document, { key: "Escape" })

      expect(context.setOpen).toHaveBeenCalledWith(false)
    })
  })

  describe("Options handling", () => {
    it("should respect reactive enabled option", async () => {
      const context = createMockFloatingContext()
      const enabled = ref(true)

      useEscapeKey(context, { enabled })

      // Initially enabled
      await fireEvent.keyDown(document, { key: "Escape" })
      expect(context.setOpen).toHaveBeenCalledWith(false)

      context.setOpen.mockClear()
      enabled.value = false

      // Now disabled
      await fireEvent.keyDown(document, { key: "Escape" })
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