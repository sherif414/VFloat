import { cleanup, fireEvent, render } from "@testing-library/vue"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, nextTick, ref } from "vue"
import { useFocus } from "../interactions/use-focus"
import { useFloating } from "../use-floating"

function setup(options = {}) {
  const reference = ref<HTMLElement | null>(null)
  const floating = ref<HTMLElement | null>(null)
  const isOpen = ref(false)

  const context = useFloating(reference, floating, {
    open: isOpen,
    ...options,
  })
  const focus = useFocus(context, options)

  return {
    ...context,
    focus,
    reference,
    floating,
    isOpen,
  }
}

describe("useFocus", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  describe("basic functionality", () => {
    test("opens on focus", async () => {
      const App = defineComponent({
        setup() {
          return setup()
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      })

      const { getByText } = render(App)
      const trigger = getByText("Trigger")

      await fireEvent.focus(trigger)
      await nextTick()

      expect(getByText("Content")).toBeTruthy()
    })

    test("closes on blur", async () => {
      const App = defineComponent({
        setup() {
          return setup()
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      })

      const { getByText, queryByText } = render(App)
      const trigger = getByText("Trigger")

      await fireEvent.focus(trigger)
      await nextTick()
      await fireEvent.blur(trigger)
      await nextTick()

      expect(queryByText("Content")).toBeNull()
    })
  })

  describe("requireFocusVisible option", () => {
    test("only opens on keyboard focus when requireFocusVisible is true", async () => {
      const App = defineComponent({
        setup() {
          return setup({ requireFocusVisible: true })
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      })

      const { getByText, queryByText } = render(App)
      const trigger = getByText("Trigger")

      // Simulate mouse focus (should not open)
      await fireEvent.focus(trigger, { relatedTarget: null })
      await nextTick()
      expect(queryByText("Content")).toBeNull()

      // Simulate keyboard focus (should open)
      await fireEvent.focus(trigger, { relatedTarget: document.body })
      await nextTick()
      expect(getByText("Content")).toBeTruthy()
    })
  })

  describe("disabled state", () => {
    test("does not respond to focus when disabled", async () => {
      const App = defineComponent({
        setup() {
          return setup({ enabled: false })
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      })

      const { getByText, queryByText } = render(App)
      const trigger = getByText("Trigger")

      await fireEvent.focus(trigger)
      await nextTick()

      expect(queryByText("Content")).toBeNull()
    })
  })
})
