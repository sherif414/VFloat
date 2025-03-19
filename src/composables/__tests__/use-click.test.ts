import { cleanup, fireEvent, render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { useFloating } from "../use-floating";
import { useClick } from "../interactions/use-click";

function setup(options = {}) {
  const reference = ref<HTMLElement | null>(null);
  const floating = ref<HTMLElement | null>(null);
  const isOpen = ref(false);

  const floating = useFloating(reference, floating, isOpen);
  const click = useClick(floating.context, options);

  return {
    ...floating,
    click,
    reference,
    floating,
    isOpen,
  };
}

describe("useClick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe("basic functionality", () => {
    test("toggles on click by default", async () => {
      const App = defineComponent({
        setup() {
          return setup();
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      });

      const { getByText, queryByText } = render(App);
      const trigger = getByText("Trigger");

      // First click - opens
      await fireEvent.click(trigger);
      await nextTick();
      expect(getByText("Content")).toBeTruthy();

      // Second click - closes
      await fireEvent.click(trigger);
      await nextTick();
      expect(queryByText("Content")).toBeNull();
    });

    test("only opens when toggle is false", async () => {
      const App = defineComponent({
        setup() {
          return setup({ toggle: false });
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      });

      const { getByText } = render(App);
      const trigger = getByText("Trigger");

      // First click - opens
      await fireEvent.click(trigger);
      await nextTick();
      expect(getByText("Content")).toBeTruthy();

      // Second click - stays open
      await fireEvent.click(trigger);
      await nextTick();
      expect(getByText("Content")).toBeTruthy();
    });
  });

  describe("event options", () => {
    test("responds to mousedown event", async () => {
      const App = defineComponent({
        setup() {
          return setup({ event: "mousedown" });
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      });

      const { getByText } = render(App);
      const trigger = getByText("Trigger");

      await fireEvent.mouseDown(trigger);
      await nextTick();
      expect(getByText("Content")).toBeTruthy();
    });

    test("responds to mouseup event", async () => {
      const App = defineComponent({
        setup() {
          return setup({ event: "mouseup" });
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      });

      const { getByText } = render(App);
      const trigger = getByText("Trigger");

      await fireEvent.mouseUp(trigger);
      await nextTick();
      expect(getByText("Content")).toBeTruthy();
    });
  });

  describe("disabled state", () => {
    test("does not respond to click when disabled", async () => {
      const App = defineComponent({
        setup() {
          return setup({ enabled: false });
        },
        template: `
          <div>
            <button ref="reference">Trigger</button>
            <div v-if="isOpen" ref="floating">Content</div>
          </div>
        `,
      });

      const { getByText, queryByText } = render(App);
      const trigger = getByText("Trigger");

      await fireEvent.click(trigger);
      await nextTick();

      expect(queryByText("Content")).toBeNull();
    });
  });
});