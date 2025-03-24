import type { Middleware, Placement, Strategy } from "@floating-ui/dom"
import { offset } from "@floating-ui/dom"
import { describe, expect, test } from "vitest"
import { render } from "vitest-browser-vue"
import type { Locator } from "@vitest/browser/context"
import { userEvent } from "@vitest/browser/context"
import { type Ref, defineComponent, nextTick, ref, toRef } from "vue"
import { type UseFloatingOptions, useFloating } from "../use-floating"

// Helper function to get text content from a locator
const getTextContent = (locator: Locator) => {
  return locator.element()?.textContent
}

// Test utilities
function setup(options?: UseFloatingOptions & { visible?: Ref<boolean> }) {
  const reference = ref<HTMLElement | null>(null)
  const floating = ref<HTMLElement | null>(null)
  const visible = options?.visible ?? ref(true)

  const { middlewareData, placement, x, y, strategy, update } = useFloating(reference, floating, {
    open: visible,
    ...options,
  })

  return {
    middlewareData,
    placement,
    x,
    y,
    strategy,
    update,
    reference,
    floating,
    visible,
  }
}

describe("useFloating", () => {
  // =========================================================
  // Basic Placement Tests
  // =========================================================
  describe("basic placement functionality", () => {
    test("updates floating coords on placement change", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["placement"],
        setup(props: { placement?: Placement }) {
          return setup({ placement: props.placement })
        },
        template: /* HTML */ `
          <div ref="reference" style="width: 30px;height: 30px;" />
          <div ref="floating" style="width: 30px;height: 30px;" />
          <div data-testid="placement-x">{{x}}</div>
          <div data-testid="placement-y">{{y}}</div>
        `,
      })

      const { rerender, getByTestId } = render(App, {
        props: { placement: "bottom" },
      })
      await nextTick()

      // Assert initial state
      expect(Number(getTextContent(getByTestId("placement-x")))).toBe(0)
      expect(Number(getTextContent(getByTestId("placement-y")))).toBeGreaterThan(0)

      // Act
      rerender({ placement: "right" })
      await nextTick()

      // Assert after placement change
      expect(Number(getTextContent(getByTestId("placement-x")))).toBeGreaterThan(0)
    })
  })

  // =========================================================
  // Middleware Tests
  // =========================================================
  describe("middleware functionality", () => {
    test("updates floating coords on middleware change", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["middleware"],
        setup(props: { middleware?: Middleware[] }) {
          const middleware = ref(props.middleware || [])
          return setup({ middleware })
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="middleware-x">{{x}}</div>
          <div data-testid="middleware-y">{{y}}</div>
        `,
      })

      const { rerender, getByTestId } = render(App)
      await nextTick()

      // Assert initial state
      expect(Number(getTextContent(getByTestId("middleware-y")))).toBeGreaterThanOrEqual(0)

      // Act
      await rerender({ middleware: [offset(10)] })
      await nextTick()

      // Assert after middleware change
      const yWithoutOffset = Number(getTextContent(getByTestId("middleware-y")))
      expect(yWithoutOffset).toBeGreaterThan(0)
    })

    test("middleware can be an empty array", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        setup() {
          return setup({ middleware: ref([]) })
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="empty-middleware-x">{{x}}</div>
          <div data-testid="empty-middleware-y">{{y}}</div>
        `,
      })

      const { getByTestId } = render(App)
      await nextTick()

      // Assert
      expect(Number(getTextContent(getByTestId("empty-middleware-y")))).toBeGreaterThanOrEqual(0)
    })
  })

  // =========================================================
  // Strategy Tests
  // =========================================================
  describe("strategy functionality", () => {
    test("updates floating coords on strategy change", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["strategy"],
        setup(props: { strategy?: Strategy }) {
          return setup({ strategy: props.strategy })
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="strategy-value">{{strategy}}</div>
        `,
      })

      const { rerender, getByTestId } = render(App, {
        props: { strategy: "absolute" },
      })
      await nextTick()

      // Assert initial state
      expect(getTextContent(getByTestId("strategy-value"))).toBe("absolute")

      // Act
      rerender({ strategy: "fixed" })
      await nextTick()

      // Assert after strategy change
      expect(getTextContent(getByTestId("strategy-value"))).toBe("fixed")
    })

    test("uses absolute as default strategy", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        setup() {
          return setup()
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="default-strategy">{{strategy}}</div>
        `,
      })

      const { getByTestId } = render(App)
      await nextTick()

      // Assert
      expect(getTextContent(getByTestId("default-strategy"))).toBe("absolute")
    })
  })

  // =========================================================
  // Visibility Tests
  // =========================================================
  describe("visibility functionality", () => {
    test("updates floating coords when visible changes to true", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["visible"],
        setup(props: { visible?: boolean }) {
          const visible = ref(props.visible ?? false)
          return { ...setup({ visible: visible }), visible }
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="visibility-x">{{x}}</div>
          <div data-testid="visibility-y">{{y}}</div>
          <button data-testid="toggle" @click="visible = !visible">Toggle</button>
        `,
      })

      const { getByTestId } = render(App)
      await nextTick()

      // Assert initial state
      expect(Number(getTextContent(getByTestId("visibility-x")))).toBe(0)
      expect(Number(getTextContent(getByTestId("visibility-y")))).toBe(0)

      // Act
      await userEvent.click(getByTestId("toggle"))
      await nextTick()

      // Assert after visibility change
      expect(Number(getTextContent(getByTestId("visibility-y")))).toBeGreaterThan(0)
    })

    test("does not update floating coords when visible changes to false", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["visible"],
        setup(props: { visible?: boolean }) {
          const visible = () => props.visible ?? true
          return setup({ visible: toRef(visible) })
        },
        template: /* HTML */ `
          <div ref="reference" style="width: 30px; height: 30px;" />
          <div ref="floating" style="width: 30px; height: 30px;" />
          <div data-testid="hide-x">{{x}}</div>
          <div data-testid="hide-y">{{y}}</div>
        `,
      })

      const { rerender, getByTestId } = render(App, {
        props: { visible: true },
      })
      await nextTick()

      // Assert initial state
      expect(Number(getTextContent(getByTestId("hide-y")))).toBeGreaterThan(0)

      // Act
      await rerender({ visible: false })
      await nextTick()

      // Assert after visibility change
      expect(Number(getTextContent(getByTestId("hide-x")))).toBe(0)
      expect(Number(getTextContent(getByTestId("hide-y")))).toBe(0)
    })

    test("updates strategy when visible changes", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["visible", "strategy"],
        setup(props: { visible?: boolean; strategy?: Strategy }) {
          const visible = ref(props.visible ?? false)
          return {
            ...setup({ strategy: props.strategy, visible }),
            visible,
          }
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="strategy-visibility">{{strategy}}</div>
          <button data-testid="toggle-visibility" @click="visible = !visible">Toggle</button>
        `,
      })

      const { getByTestId } = render(App, {
        props: { strategy: "fixed" },
      })
      await nextTick()

      // Assert initial state
      expect(getTextContent(getByTestId("strategy-visibility"))).toBe("fixed")

      // Act
      await userEvent.click(getByTestId("toggle-visibility"))
      await nextTick()

      // Assert after visibility change
      expect(getTextContent(getByTestId("strategy-visibility"))).toBe("fixed")
    })
  })

  // =========================================================
  // Manual Update Tests
  // =========================================================
  describe("manual update functionality", () => {
    test("can manually update floating coords with update()", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["placement"],
        setup(props: { placement?: Placement }) {
          const { update, ...rest } = setup({ placement: props.placement })
          return { update, ...rest }
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="update-placement">{{placement}}</div>
          <button data-testid="update" @click="update">Update</button>
        `,
      })

      const { getByTestId } = render(App, {
        props: { placement: "top" },
      })
      await nextTick()

      // Assert initial state
      expect(getTextContent(getByTestId("update-placement"))).toBe("top")

      // Act
      await userEvent.click(getByTestId("update"))
      await nextTick()

      // Assert after update
      expect(getTextContent(getByTestId("update-placement"))).toBe("top")
    })

    test("can manually update when strategy changes", async () => {
      // Arrange
      const App = defineComponent({
        name: "App",
        props: ["strategy"],
        setup(props: { strategy?: Strategy }) {
          const { update, ...rest } = setup({ strategy: props.strategy })
          return { update, ...rest }
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="update-strategy">{{strategy}}</div>
          <button data-testid="update-strat" @click="update">Update</button>
        `,
      })

      const { getByTestId } = render(App, {
        props: { strategy: "fixed" },
      })
      await nextTick()

      // Assert initial state
      expect(getTextContent(getByTestId("update-strategy"))).toBe("fixed")

      // Act
      await userEvent.click(getByTestId("update-strat"))
      await nextTick()

      // Assert after update
      expect(getTextContent(getByTestId("update-strategy"))).toBe("fixed")
    })

    test("can manually update with middleware", async () => {
      // Arrange
      const offsetData = { mainAxis: 10, crossAxis: 0, alignmentAxis: null }

      const App = defineComponent({
        name: "App",
        props: ["middleware"],
        setup(_props: { middleware?: Middleware[] }) {
          const middleware = ref([offset(offsetData)])
          const { update, middlewareData, ...rest } = setup({ middleware })
          return { update, middlewareData, ...rest }
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="middleware-data">{{middlewareData.offset?.y}}</div>
          <button data-testid="update" @click="update">Update</button>
        `,
      })

      const { getByTestId } = render(App)
      await nextTick()

      // Assert initial state
      expect(getTextContent(getByTestId("middleware-data"))).toBe("10")

      // Act
      offsetData.mainAxis = 20
      await userEvent.click(getByTestId("update"))
      await nextTick()

      // Assert after update
      expect(getTextContent(getByTestId("middleware-data"))).toBe("20")
    })
  })

  // =========================================================
  // Component Integration Tests
  // =========================================================
  describe("component integration", () => {
    test("works with components", async () => {
      const Reference = defineComponent({
        name: "Reference",
        setup() {
          return {}
        },
        template: ` <div data-testid="reference" />`,
      })

      const Floating = defineComponent({
        name: "Floating",
        setup() {
          return {}
        },
        template: `
        <div data-testid="floating" />`,
      })

      const App = defineComponent({
        name: "App",
        components: { Reference, Floating },
        setup() {
          const reference = ref<HTMLElement | null>(null)
          const floating = ref<HTMLElement | null>(null)
          const open = ref(true)

          const { x, y } = useFloating(reference, floating, {
            open,
          })

          return { reference, floating, x, y }
        },
        template: /* HTML */ `
          <Reference :ref="(vm)=> reference = vm?.$el" />
          <Floating :ref="(vm)=> floating = vm?.$el" />
          <div data-testid="component-x">{{x}}</div>
          <div data-testid="component-y">{{y}}</div>
        `,
      })

      const { getByTestId } = render(App)

      await nextTick()
      // In browser mode, the positioning should work properly for components
      expect(Number(getTextContent(getByTestId("component-y")))).toBeGreaterThanOrEqual(0)
    })

    test("works with exposed refs", async () => {
      const Reference = defineComponent({
        name: "Reference",
        setup(_, { expose }) {
          const el = ref<HTMLElement | null>(null)
          expose({ el })
          return { el }
        },
        template: `
           <div ref="el" data-testid="reference-el" />
        `,
      })

      const Floating = defineComponent({
        name: "Floating",
        setup(_, { expose }) {
          const el = ref<HTMLElement | null>(null)
          expose({ el })
          return { el }
        },
        template: /* HTML */ `<div ref="el" data-testid="floating-el" />`,
      })

      const App = defineComponent({
        name: "App",
        components: { Reference, Floating },
        setup() {
          const reference = ref<HTMLElement | null>(null)
          const floating = ref<HTMLElement | null>(null)
          const open = ref(true)

          const { x, y } = useFloating(reference, floating, {
            open,
          })

          return { reference, floating, x, y }
        },
        template: /* HTML */ `
          <Reference :ref="(vm)=> reference = vm?.$el" />
          <Floating :ref="(vm)=> floating = vm?.$el" />
          <div data-testid="exposed-x">{{x}}</div>
          <div data-testid="exposed-y">{{y}}</div>
        `,
      })

      const { getByTestId } = render(App)

      await nextTick()
      // In browser mode, the positioning should work properly for components with exposed refs
      expect(Number(getTextContent(getByTestId("exposed-y")))).toBeGreaterThanOrEqual(0)
    })
  })
})
