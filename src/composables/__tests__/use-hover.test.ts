import { cleanup, fireEvent, render } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { useFloating } from "../use-floating";
import { useHover } from "../interactions/use-hover";

function setup(options = {}) {
  const reference = ref<HTMLElement | null>(null);
  const floating = ref<HTMLElement | null>(null);
  const isOpen = ref(false);

  const context = useFloating({
    elements: {
      reference,
      floating
    },
    open: isOpen,
    ...options
  });
  const hover = useHover(context, options);

  return {
    ...context,
    hover,
    reference,
    floating,
    isOpen,
  };
}

describe("useHover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe("basic functionality", () => {
    test("opens on mouseenter", async () => {
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

      const { getByText } = render(App);
      const trigger = getByText("Trigger");

      await fireEvent.mouseEnter(trigger);
      await nextTick();

      expect(getByText("Content")).toBeTruthy();
    });

    test("closes on mouseleave", async () => {
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

      await fireEvent.mouseEnter(trigger);
      await nextTick();
      await fireEvent.mouseLeave(trigger);
      await nextTick();

      expect(queryByText("Content")).toBeNull();
    });
  });

  describe("delay options", () => {
    test("respects open delay", async () => {
      const App = defineComponent({
        setup() {
          return setup({ delay: { open: 100 } });
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

      await fireEvent.mouseEnter(trigger);
      expect(queryByText("Content")).toBeNull();

      vi.advanceTimersByTime(99);
      expect(queryByText("Content")).toBeNull();

      vi.advanceTimersByTime(1);
      await nextTick();
      expect(getByText("Content")).toBeTruthy();
    });

    test("respects close delay", async () => {
      const App = defineComponent({
        setup() {
          return setup({ delay: { close: 100 } });
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

      await fireEvent.mouseEnter(trigger);
      await nextTick();
      await fireEvent.mouseLeave(trigger);

      expect(getByText("Content")).toBeTruthy();

      vi.advanceTimersByTime(99);
      expect(getByText("Content")).toBeTruthy();

      vi.advanceTimersByTime(1);
      await nextTick();
      expect(queryByText("Content")).toBeNull();
    });
  });

  describe("disabled state", () => {
    test("does not respond to hover when disabled", async () => {
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

      await fireEvent.mouseEnter(trigger);
      await nextTick();

      expect(queryByText("Content")).toBeNull();
    });
  });
});