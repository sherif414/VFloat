import { userEvent } from "@vitest/browser/context"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, type Ref, ref } from "vue"
import { type UseClickOptions, useClick } from "@/composables"

// a minimal FloatingContext type for the tests
interface FloatingContext {
  refs: {
    anchorEl: Ref<HTMLElement | null>
    floatingEl: Ref<HTMLElement | null>
  }
  setOpen: (open: boolean, event?: Event) => void
}

describe("useClick", () => {
  let context: FloatingContext
  let referenceEl: HTMLElement
  let floatingEl: HTMLElement
  let scope: ReturnType<typeof effectScope>

  const dispatchTouchPointerSequence = async (element: HTMLElement) => {
    // Ensure watchers in useClick have attached event listeners before dispatching
    await nextTick()
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    element.dispatchEvent(clickEvent)
  }

  
  // Helper to initialize useClick and wait for effects
  const initClick = (options?: UseClickOptions) => {
    scope = effectScope()
    scope.run(() => {
{{ ... }}
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      initClick({ ignoreMouse: true })
      expect(context.open.value).toBe(false)

      // userEvent.click simulates a mouse click.
      await userEvent.click(referenceEl)

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  // --- Event option and edge behaviors ---
  describe("advanced behaviors", () => {
    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      initClick({ event: "mousedown" })
      expect(context.open.value).toBe(false)

      // Dispatch mousedown (primary button)
      referenceEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
      )

      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      setOpenMock.mockClear()

      // A following click should be ignored for toggling when event is mousedown
      referenceEl.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
      )
      expect(setOpenMock).not.toHaveBeenCalled()
    })

    it("ignores outside click after drag that started inside when outsideEvent is 'click'", async () => {
      initClick({ outsideClick: true, outsideEvent: "click", handleDragEvents: true })

      // Open first
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Start drag inside floating (mousedown captured on floating element)
      floatingEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))

      // Click outside – should be ignored due to dragStartedInside
      const outside = document.createElement("div")
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)

      document.body.removeChild(outside)
    })

    it("is tree-aware: parent does not close on click within descendant", async () => {
      // Minimal tree node factory
      const createMockTreeNode = (ctx: any, isRoot = false, parent: any = null) => {
        const children = ref<any[]>([])
        const parentRef = ref(parent)
        const node: any = {
          id: `node-${Math.random().toString(36).slice(2)}`,
          data: ctx,
          children,
          parent: parentRef,
          isRoot,
          getPath: vi.fn(() => ["root", node.id]),
        }
        return node
      }

      // Build DOM
      const parentRefEl = document.createElement("button")
      const parentFloatEl = document.createElement("div")
      document.body.appendChild(parentRefEl)
      document.body.appendChild(parentFloatEl)

      const childRefEl = document.createElement("button")
      const childFloatEl = document.createElement("div")
      document.body.appendChild(childRefEl)
      document.body.appendChild(childFloatEl)

      const parentState = ref(true)
      const parentSetOpen = vi.fn((v: boolean) => (parentState.value = v))
      const childState = ref(true)

      const parentCtx = {
        refs: { anchorEl: ref(parentRefEl), floatingEl: ref(parentFloatEl) },
        open: parentState,
        setOpen: parentSetOpen,
      }
      const childCtx = {
        refs: { anchorEl: ref(childRefEl), floatingEl: ref(childFloatEl) },
        open: childState,
        setOpen: vi.fn(),
      }

      const parentNode = createMockTreeNode(parentCtx, true)
      const childNode = createMockTreeNode(childCtx, false, parentNode)
      parentNode.children.value = [childNode]

      // Attach useClick to parent in tree-aware mode
      scope = effectScope()
      scope.run(() => {
        // biome-ignore lint/suspicious/noExplicitAny: testing setup
        useClick(parentNode as any, { outsideClick: true })
      })

      // Click inside child – parent should not close
      childRefEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()
      expect(parentSetOpen).not.toHaveBeenCalledWith(false)

      // Click outside – parent should close
      const outside = document.createElement("div")
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()
      expect(parentSetOpen).toHaveBeenCalledWith(false)

      // Cleanup
      document.body.removeChild(parentRefEl)
      document.body.removeChild(parentFloatEl)
      document.body.removeChild(childRefEl)
      document.body.removeChild(childFloatEl)
      document.body.removeChild(outside)
      scope.stop()
    })

    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })

      const synthetic = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 })
      referenceEl.dispatchEvent(synthetic)
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  // --- Event option and edge behaviors ---
  describe("advanced behaviors", () => {
    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      initClick({ event: "mousedown" })
      expect(context.open.value).toBe(false)

      // Dispatch mousedown (primary button)
      referenceEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })
      )

      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      setOpenMock.mockClear()

      // A following click should be ignored for toggling when event is mousedown
      referenceEl.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
      )
      expect(setOpenMock).not.toHaveBeenCalled()
    })

    it("ignores outside click after drag that started inside when outsideEvent is 'click'", async () => {
      initClick({ outsideClick: true, outsideEvent: "click", handleDragEvents: true })

      // Open first
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Start drag inside floating (mousedown captured on floating element)
      floatingEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))

      // Click outside – should be ignored due to dragStartedInside
      const outside = document.createElement("div")
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true)

      document.body.removeChild(outside)
    })

    it("is tree-aware: parent does not close on click within descendant", async () => {
      // Minimal tree node factory
      const createMockTreeNode = (ctx: any, isRoot = false, parent: any = null) => {
        const children = ref<any[]>([])
        const parentRef = ref(parent)
        const node: any = {
          id: `node-${Math.random().toString(36).slice(2)}`,
          data: ctx,
          children,
          parent: parentRef,
          isRoot,
          getPath: vi.fn(() => ["root", node.id]),
        }
        return node
      }

      // Build DOM
      const parentRefEl = document.createElement("button")
      const parentFloatEl = document.createElement("div")
      document.body.appendChild(parentRefEl)
      document.body.appendChild(parentFloatEl)

      const childRefEl = document.createElement("button")
      const childFloatEl = document.createElement("div")
      document.body.appendChild(childRefEl)
      document.body.appendChild(childFloatEl)

      const parentState = ref(true)
      const parentSetOpen = vi.fn((v: boolean) => (parentState.value = v))
      const childState = ref(true)

      const parentCtx = {
        refs: { anchorEl: ref(parentRefEl), floatingEl: ref(parentFloatEl) },
        open: parentState,
        setOpen: parentSetOpen,
      }
      const childCtx = {
        refs: { anchorEl: ref(childRefEl), floatingEl: ref(childFloatEl) },
        open: childState,
        setOpen: vi.fn(),
      }

      const parentNode = createMockTreeNode(parentCtx, true)
      const childNode = createMockTreeNode(childCtx, false, parentNode)
      parentNode.children.value = [childNode]

      // Attach useClick to parent in tree-aware mode
      scope = effectScope()
      scope.run(() => {
        // biome-ignore lint/suspicious/noExplicitAny: testing setup
        useClick(parentNode as any, { outsideClick: true })
      })

      // Click inside child – parent should not close
      childRefEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()
      expect(parentSetOpen).not.toHaveBeenCalledWith(false)

      // Click outside – parent should close
      const outside = document.createElement("div")
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
      await nextTick()
      expect(parentSetOpen).toHaveBeenCalledWith(false)

      // Cleanup
      document.body.removeChild(parentRefEl)
      document.body.removeChild(parentFloatEl)
      document.body.removeChild(childRefEl)
      document.body.removeChild(childFloatEl)
      document.body.removeChild(outside)
      scope.stop()
    })

    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })

      const synthetic = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 })
      referenceEl.dispatchEvent(synthetic)
      await nextTick()

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })
  })

  // --- Disabled State ---
  describe("disabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false)
      initClick({ enabled }) // Start disabled

      expect(context.open.value).toBe(false)

      // Click trigger
      await userEvent.click(referenceEl)

      // Should remain closed
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)

      // Enable and test again
      enabled.value = true
      await nextTick() // Allow effect to re-run

      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)
    })

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true)
      initClick({ enabled }) // Start enabled

      // Click trigger - works
      await userEvent.click(referenceEl)
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear() // Clear for next check

      // Disable
      enabled.value = false
      await nextTick()

      // Click again - should not work
      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true) // State remains unchanged
    })
  })

  // --- Keyboard Accessibility ---
  describe("keyboard accessibility", () => {
    it("toggles on Enter key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // Ensure trigger has focus
      referenceEl.focus()
      expect(document.activeElement).toBe(referenceEl)

      // Press Enter key - opens
      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)

      // Press Enter key again - closes
      await userEvent.keyboard("{Enter}")
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("toggles on Space key press", async () => {
      initClick()
      expect(context.open.value).toBe(false)

      // Ensure trigger has focus
      referenceEl.focus()
      expect(document.activeElement).toBe(referenceEl)

      // Press Space key - opens
      await userEvent.keyboard(" ")
      expect(setOpenMock).toHaveBeenCalledTimes(1)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      expect(context.open.value).toBe(true)

      // Press Space key again - closes
      await userEvent.keyboard(" ")
      expect(setOpenMock).toHaveBeenCalledTimes(2)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      expect(context.open.value).toBe(false)
    })

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      document.body.removeChild(referenceEl)
      referenceEl = document.createElement("div")
      referenceEl.id = "reference"
      referenceEl.textContent = "Trigger"
      document.body.appendChild(referenceEl)
      context.refs.anchorEl.value = referenceEl

      initClick({ ignoreKeyboard: true })
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await userEvent.keyboard(" ")

      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(false)
    })

    it("does not trigger on Enter key press if ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true })
      expect(context.open.value).toBe(false)

      referenceEl.focus()
      await userEvent.keyboard("{Enter}")

      expect(setOpenMock).not.toHaveBeenCalled()
    })
  })

  // --- Integration Testing ---
  describe("integration: inside and outside clicks", () => {
    let outsideElement: HTMLElement

    beforeEach(() => {
      outsideElement = document.createElement("div")
      outsideElement.id = "outside"
      // Ensure the element is visible and clickable in Playwright (non-zero size within viewport)
      outsideElement.textContent = "Outside"
      Object.assign(outsideElement.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100px",
        height: "100px",
        zIndex: "1",
      })
      document.body.appendChild(outsideElement)
    })

    afterEach(() => {
      if (outsideElement.isConnected) {
        document.body.removeChild(outsideElement)
      }
    })

    it("supports complete interaction flow: open with inside click, close with outside click", async () => {
      initClick({ outsideClick: true, toggle: true })
      expect(context.open.value).toBe(false)

      // Open with inside click
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenCalledWith(true)
      setOpenMock.mockClear()

      // Close with outside click
      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      setOpenMock.mockClear()

      // Open again with inside click
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      expect(setOpenMock).toHaveBeenCalledWith(true)
    })

    it("supports toggle behavior with outside click enabled", async () => {
      initClick({ outsideClick: true, toggle: true })

      // Open with inside click
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Close with inside click (toggle)
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenCalledWith(false)
      setOpenMock.mockClear()

      // Open again
      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Close with outside click
      await userEvent.click(outsideElement)
      expect(context.open.value).toBe(false)
      expect(setOpenMock).toHaveBeenCalledWith(false)
    })

    it("respects disabled state for both inside and outside clicks", async () => {
      const enabled = ref(false)
      initClick({ enabled, outsideClick: true })

      // Try inside click when disabled
      await userEvent.click(referenceEl)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Try outside click when disabled
      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()

      // Enable and open
      enabled.value = true
      await nextTick()

      await userEvent.click(referenceEl)
      expect(context.open.value).toBe(true)
      setOpenMock.mockClear()

      // Disable again
      enabled.value = false
      await nextTick()

      // Outside click should not work when disabled
      await userEvent.click(outsideElement)
      expect(setOpenMock).not.toHaveBeenCalled()
      expect(context.open.value).toBe(true) // Remains open
    })
  })
})
