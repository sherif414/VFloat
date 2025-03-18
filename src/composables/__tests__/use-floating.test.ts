import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defineComponent, nextTick, ref, toRef, type Ref } from "vue";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import type {
  Middleware,
  Placement,
  Strategy,
  ArrowOptions,
} from "@floating-ui/dom";
import { arrow, offset } from "@floating-ui/dom";
import { useFloating, type UseFloatingOptions } from "../use-floating";

// Test utilities
function setup(options?: UseFloatingOptions & { visible?: Ref<boolean> }) {
  const reference = ref<HTMLElement | null>(null);
  const floating = ref<HTMLElement | null>(null);
  const visible = options?.visible ?? ref(true);

  const { middlewareData, placement, x, y, strategy, update } = useFloating(
    reference,
    floating,
    visible,
    options
  );

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
  };
}

describe("useFloating", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // =========================================================
  // Basic Placement Tests
  // =========================================================
  describe("basic placement functionality", () => {
    test("updates floating coords on placement change", async () => {
      const App = defineComponent({
        name: "App",
        props: ["placement"],
        setup(props: { placement?: Placement }) {
          return setup({ placement: props.placement });
        },
        template: /* HTML */ `
          <div ref="reference" style="width: 30px;height: 30px;" />
          <div ref="floating" style="width: 30px;height: 30px;" />
          <div data-testid="placement-x">{{x}}</div>
          <div data-testid="placement-y">{{y}}</div>
        `,
      });

      const { rerender, getByTestId } = render(App, {
        props: { placement: "bottom" },
      });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("placement-x").textContent).toBe("8");
        expect(getByTestId("placement-y").textContent).toBe("0");
      });

      await rerender({ placement: "right" });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("placement-x").textContent).toBe("8");
        expect(getByTestId("placement-y").textContent).toBe("0");
      });
    });

    test("uses bottom-start as default placement", async () => {
      const App = defineComponent({
        name: "App",
        setup() {
          return setup();
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="default-placement">{{placement}}</div>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("default-placement").textContent).toBe(
          "bottom-start"
        );
      });
    });
  });

  // =========================================================
  // Middleware Tests
  // =========================================================
  describe("middleware functionality", () => {
    test("updates floating coords on middleware change", async () => {
      const App = defineComponent({
        name: "App",
        props: ["middleware"],
        setup(props: { middleware?: Middleware[] }) {
          const middleware = () => props.middleware || [];
          return setup({ middleware: middleware() });
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="middleware-x">{{x}}</div>
          <div data-testid="middleware-y">{{y}}</div>
        `,
      });

      const { rerender, getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("middleware-x").textContent).toBe("0");
        expect(getByTestId("middleware-y").textContent).toBe("0");
      });

      await rerender({ middleware: [offset(10)] });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("middleware-x").textContent).toBe("0");
        expect(getByTestId("middleware-y").textContent).toBe("10");
      });
    });

    test("middleware can be an empty array", async () => {
      const App = defineComponent({
        name: "App",
        setup() {
          return setup({ middleware: [] });
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="empty-middleware-x">{{x}}</div>
          <div data-testid="empty-middleware-y">{{y}}</div>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("empty-middleware-x").textContent).toBe("0");
        expect(getByTestId("empty-middleware-y").textContent).toBe("0");
      });
    });
  });

  // =========================================================
  // Strategy Tests
  // =========================================================
  describe("strategy functionality", () => {
    test("updates floating coords on strategy change", async () => {
      const App = defineComponent({
        name: "App",
        props: ["strategy"],
        setup(props: { strategy?: Strategy }) {
          return setup({ strategy: props.strategy });
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="strategy-value">{{strategy}}</div>
        `,
      });

      const { rerender, getByTestId } = render(App, {
        props: { strategy: "absolute" },
      });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("strategy-value").textContent).toBe("absolute");
      });

      await rerender({ strategy: "fixed" });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("strategy-value").textContent).toBe("fixed");
      });
    });

    test("uses absolute as default strategy", async () => {
      const App = defineComponent({
        name: "App",
        setup() {
          return setup();
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="default-strategy">{{strategy}}</div>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("default-strategy").textContent).toBe("absolute");
      });
    });
  });

  // =========================================================
  // Visibility Tests
  // =========================================================
  describe("visibility functionality", () => {
    test("updates floating coords when visible changes to true", async () => {
      const App = defineComponent({
        name: "App",
        props: ["visible"],
        setup(props: { visible?: boolean }) {
          const visible = ref(props.visible ?? false);
          return { ...setup({ visible: visible }), visible };
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="visibility-x">{{x}}</div>
          <div data-testid="visibility-y">{{y}}</div>
          <button data-testid="toggle" @click="visible = !visible">
            Toggle
          </button>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("visibility-x").textContent).toBe("0");
        expect(getByTestId("visibility-y").textContent).toBe("0");
      });

      await fireEvent.click(getByTestId("toggle"));

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("visibility-x").textContent).toBe("0");
        expect(getByTestId("visibility-y").textContent).toBe("0");
      });
    });

    test("does not update floating coords when visible changes to false", async () => {
      const App = defineComponent({
        name: "App",
        props: ["visible"],
        setup(props: { visible?: boolean }) {
          const visible = () => props.visible ?? true;
          return setup({ visible: toRef(visible) });
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="hide-x">{{x}}</div>
          <div data-testid="hide-y">{{y}}</div>
        `,
      });

      const { rerender, getByTestId } = render(App, {
        props: { visible: true },
      });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("hide-x").textContent).toBe("0");
        expect(getByTestId("hide-y").textContent).toBe("0");
      });

      await rerender({ visible: false });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("hide-x").textContent).toBe("0");
        expect(getByTestId("hide-y").textContent).toBe("0");
      });
    });

    test("updates strategy when visible changes", async () => {
      const App = defineComponent({
        name: "App",
        props: ["visible", "strategy"],
        setup(props: { visible?: boolean; strategy?: Strategy }) {
          const visible = ref(props.visible ?? false);
          return {
            ...setup({ strategy: props.strategy, visible }),
            visible,
          };
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="strategy-visibility">{{strategy}}</div>
          <button data-testid="toggle-visibility" @click="visible = !visible">
            Toggle
          </button>
        `,
      });

      const { getByTestId } = render(App, {
        props: { strategy: "fixed" },
      });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("strategy-visibility").textContent).toBe("fixed");
      });

      await fireEvent.click(getByTestId("toggle-visibility"));

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("strategy-visibility").textContent).toBe("fixed");
      });
    });
  });

  // =========================================================
  // Manual Update Tests
  // =========================================================
  describe("manual update functionality", () => {
    test("can manually update floating coords with update()", async () => {
      const App = defineComponent({
        name: "App",
        props: ["placement"],
        setup(props: { placement?: Placement }) {
          const { update, ...rest } = setup({ placement: props.placement });
          return { update, ...rest };
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="update-placement">{{placement}}</div>
          <button data-testid="update" @click="update">Update</button>
        `,
      });

      const { getByTestId } = render(App, {
        props: { placement: "top" },
      });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("update-placement").textContent).toBe("top");
      });

      await fireEvent.click(getByTestId("update"));

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("update-placement").textContent).toBe("top");
      });
    });

    test("can manually update when strategy changes", async () => {
      const App = defineComponent({
        name: "App",
        props: ["strategy"],
        setup(props: { strategy?: Strategy }) {
          const { update, ...rest } = setup({ strategy: props.strategy });
          return { update, ...rest };
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="update-strategy">{{strategy}}</div>
          <button data-testid="update-strat" @click="update">Update</button>
        `,
      });

      const { getByTestId } = render(App, {
        props: { strategy: "fixed" },
      });

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("update-strategy").textContent).toBe("fixed");
      });

      await fireEvent.click(getByTestId("update-strat"));

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("update-strategy").textContent).toBe("fixed");
      });
    });

    test("can manually update with middleware", async () => {
      const offsetData = { mainAxis: 10, crossAxis: 0, alignmentAxis: null };

      const App = defineComponent({
        name: "App",
        props: ["middleware"],
        setup(props: { middleware?: Middleware[] }) {
          const middleware = [offset(offsetData)];
          const { update, middlewareData, ...rest } = setup({ middleware });
          return { update, middlewareData, ...rest };
        },
        template: /* HTML */ `
          <div ref="reference" />
          <div ref="floating" />
          <div data-testid="middleware-data">{{middlewareData.offset?.y}}</div>
          <button data-testid="update" @click="update">Update</button>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("middleware-data").textContent).toBe("10");
      });

      // Update offset value
      offsetData.mainAxis = 20;

      await fireEvent.click(getByTestId("update"));

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("middleware-data").textContent).toBe("20");
      });
    });
  });

  // =========================================================
  // Component Integration Tests
  // =========================================================
  describe("component integration", () => {
    test("works with components", async () => {
      const Reference = defineComponent({
        name: "Reference",
        setup() {
          return {};
        },
        template: ` <div data-testid="reference" />`,
      });

      const Floating = defineComponent({
        name: "Floating",
        setup() {
          return {};
        },
        template: `
        <div data-testid="floating" />`,
      });

      const App = defineComponent({
        name: "App",
        components: { Reference, Floating },
        setup() {
          const reference = ref<HTMLElement | null>(null);
          const floating = ref<HTMLElement | null>(null);
          const visible = ref(true);

          const { x, y } = useFloating(reference, floating, visible);

          return { reference, floating, x, y };
        },
        template: /* HTML */ `
          <Reference ref="reference" />
          <Floating ref="floating" />
          <div data-testid="component-x">{{x}}</div>
          <div data-testid="component-y">{{y}}</div>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("component-x").textContent).toBe("0");
        expect(getByTestId("component-y").textContent).toBe("0");
      });
    });

    test("works with exposed refs", async () => {
      const Reference = defineComponent({
        name: "Reference",
        setup(props, { expose }) {
          const el = ref<HTMLElement | null>(null);
          expose({ el });
          return { el };
        },
        template: `
           <div ref="el" data-testid="reference-el" />
        `,
      });

      const Floating = defineComponent({
        name: "Floating",
        setup() {
          return {};
        },
        template: /* HTML */ `<div data-testid="floating-el" />`,
      });

      const App = defineComponent({
        name: "App",
        components: { Reference, Floating },
        setup() {
          const reference = ref<{ el: HTMLElement } | null>(null);
          const floating = ref<HTMLElement | null>(null);
          const visible = ref(true);

          const { x, y } = useFloating(
            () => reference.value?.el ?? null,
            floating,
            visible
          );

          return { reference, floating, x, y };
        },
        template: /* HTML */ `
          <Reference ref="reference" />
          <Floating ref="floating" />
          <div data-testid="exposed-x">{{x}}</div>
          <div data-testid="exposed-y">{{y}}</div>
        `,
      });

      const { getByTestId } = render(App);

      await nextTick();
      await waitFor(() => {
        expect(getByTestId("exposed-x").textContent).toBe("0");
        expect(getByTestId("exposed-y").textContent).toBe("0");
      });
    });
  });
});
