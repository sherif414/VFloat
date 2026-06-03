import { userEvent } from "vite-plus/test/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import { type UseClickOptions, type UseClickContext, useClick } from "@/composables";
import type { AnchorElement, FloatingElement } from "@/composables";

// Track elements created during tests for cleanup
const elementsToCleanUp: HTMLElement[] = [];

function trackElement(el: HTMLElement): HTMLElement {
  elementsToCleanUp.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of elementsToCleanUp) {
    if (el.isConnected) {
      document.body.removeChild(el);
    }
  }
  elementsToCleanUp.length = 0;
}

describe("useClick", () => {
  let context: UseClickContext;
  let anchorEl: HTMLElement;
  let floatingEl: HTMLElement;
  let scope: ReturnType<typeof effectScope>;
  let setOpenMock: ReturnType<typeof vi.fn>;

  const createElements = () => {
    anchorEl = trackElement(document.createElement("button"));
    anchorEl.id = "reference";
    anchorEl.textContent = "Trigger";
    document.body.appendChild(anchorEl);

    floatingEl = trackElement(document.createElement("div"));
    floatingEl.id = "floating";
    floatingEl.textContent = "Floating";
    document.body.appendChild(floatingEl);

    const openRef = ref(false);
    setOpenMock = vi.fn((open: boolean) => {
      openRef.value = open;
    });
    const anchorRef = ref<AnchorElement>(anchorEl);
    const floatingRef = ref<FloatingElement>(floatingEl);
    const arrowRef = ref<HTMLElement | null>(null);
    context = {
      refs: {
        anchorEl: anchorRef,
        floatingEl: floatingRef,
        arrowEl: arrowRef,
      },
      state: {
        open: openRef,
        setOpen: setOpenMock as () => void,
      },
    };
  };

  beforeEach(() => {
    createElements();
  });

  afterEach(() => {
    scope?.stop();
    clearTrackedElements();
    vi.clearAllMocks();
  });

  const initClick = (options?: UseClickOptions) => {
    scope = effectScope();
    scope.run(() => {
      useClick(context, options);
    });
  };

  describe("click behavior", () => {
    it("toggles open state on click", async () => {
      initClick({ toggle: true });
      await nextTick();
      expect(context.state.open.value).toBe(false);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("opens but does not toggle when toggle is false", async () => {
      initClick({ toggle: false });
      await nextTick();
      expect(context.state.open.value).toBe(false);

      // First click should open
      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(true);

      // Second click should NOT close (toggle behavior disabled)
      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1); // Still only called once
      expect(context.state.open.value).toBe(true);

      // Third click should also NOT close
      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1); // Still only called once
      expect(context.state.open.value).toBe(true);
    });
  });

  describe("pointer behavior", () => {
    it("does not toggle on mouse click if ignoreMouse is true", async () => {
      initClick({ ignoreMouse: true });
      expect(context.state.open.value).toBe(false);

      await userEvent.click(anchorEl);

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(context.state.open.value).toBe(false);
    });

    it("respects event option 'mousedown' (toggles on mousedown, not on click)", async () => {
      initClick({ event: "mousedown", toggle: true });
      expect(context.state.open.value).toBe(false);

      await nextTick();
      anchorEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }),
      );
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(true);
      setOpenMock.mockClear();

      anchorEl.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }),
      );
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });
  });

  describe("keyboard behavior", () => {
    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true });

      const synthetic = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 });
      anchorEl.dispatchEvent(synthetic);
      await nextTick();

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(context.state.open.value).toBe(false);
    });

    it("toggles on Enter key press", async () => {
      initClick();
      expect(context.state.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("toggles on Space key press", async () => {
      initClick();
      expect(context.state.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      // Create a non-focusable div to test ignoreKeyboard on space
      const nonFocusableEl = trackElement(document.createElement("div"));
      nonFocusableEl.id = "reference";
      nonFocusableEl.textContent = "Trigger";
      document.body.appendChild(nonFocusableEl);

      // Update context to use the new element
      context.refs.anchorEl.value = nonFocusableEl;

      initClick({ ignoreKeyboard: true });
      expect(context.state.open.value).toBe(false);

      nonFocusableEl.focus();
      await userEvent.keyboard(" ");

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(context.state.open.value).toBe(false);
      // nonFocusableEl is tracked and will be cleaned up in afterEach
    });

    it("does not trigger on Enter key press if ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true });
      expect(context.state.open.value).toBe(false);

      anchorEl.focus();
      await userEvent.keyboard("{Enter}");

      expect(setOpenMock).not.toHaveBeenCalled();
    });
  });

  describe("enabled state", () => {
    it("does not respond to interaction when disabled", async () => {
      const enabled = ref(false);
      initClick({ enabled });

      expect(context.state.open.value).toBe(false);

      await userEvent.click(anchorEl);

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(context.state.open.value).toBe(false);

      enabled.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, expect.any(String), expect.any(Object));
      expect(context.state.open.value).toBe(true);
    });

    it("stops responding if disabled after initialization", async () => {
      const enabled = ref(true);
      initClick({ enabled });

      await userEvent.click(anchorEl);
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(context.state.open.value).toBe(true);
      setOpenMock.mockClear();

      enabled.value = false;
      await nextTick();

      await userEvent.click(anchorEl);
      expect(setOpenMock).not.toHaveBeenCalled();
      expect(context.state.open.value).toBe(true);
    });
  });
});
