import { userEvent } from "@vitest/browser/context";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type Ref } from "vue";
import type { AnchorElement, FloatingElement } from "@/composables";
import {
  type UseClickContext,
  type UseClickOptions,
  useClick,
  useFloatingContext,
  useHover,
} from "@/composables";

const trackedElements: HTMLElement[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }
  trackedElements.length = 0;
}

describe("useClick", () => {
  let context: UseClickContext;
  let anchorEl: HTMLElement;
  let floatingEl: HTMLElement;
  let openRef: Ref<boolean>;
  let scope: ReturnType<typeof effectScope>;
  let setOpenMock: ReturnType<typeof vi.fn>;

  const createElements = () => {
    anchorEl = trackElement(document.createElement("button"));
    anchorEl.id = "anchor";
    anchorEl.textContent = "Trigger";
    document.body.appendChild(anchorEl);

    floatingEl = trackElement(document.createElement("div"));
    floatingEl.id = "floating";
    floatingEl.textContent = "Floating";
    document.body.appendChild(floatingEl);

    openRef = ref(false);
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
    vi.useRealTimers();
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
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("opens but does not toggle when toggle is false", async () => {
      initClick({ toggle: false });
      await nextTick();
      expect(context.state.open.value).toBe(false);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(context.state.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
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
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);
      setOpenMock.mockClear();

      anchorEl.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      await nextTick();
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("tracks pointerType on pointerdown when handling mousedown event", async () => {
      initClick({ event: "mousedown", toggle: true });
      expect(context.state.open.value).toBe(false);

      await nextTick();
      anchorEl.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerType: "mouse",
        }),
      );
      anchorEl.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          button: 0,
        }),
      );
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);
    });
  });

  describe("keyboard behavior", () => {
    it("ignores synthetic keyboard click (detail === 0) when ignoreKeyboard is true", async () => {
      initClick({ ignoreKeyboard: true });

      const synthetic = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        detail: 0,
      });
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
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.keyboard("{Enter}");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("toggles on Space key press", async () => {
      initClick();
      expect(context.state.open.value).toBe(false);

      anchorEl.focus();
      expect(document.activeElement).toBe(anchorEl);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);

      await userEvent.keyboard(" ");
      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("does not trigger on Space key press if ignoreKeyboard is true", async () => {
      const nonFocusableEl = trackElement(document.createElement("div"));
      nonFocusableEl.id = "non-focusable";
      nonFocusableEl.textContent = "Trigger";
      document.body.appendChild(nonFocusableEl);

      context.refs.anchorEl.value = nonFocusableEl;

      initClick({ ignoreKeyboard: true });
      expect(context.state.open.value).toBe(false);

      nonFocusableEl.focus();
      await userEvent.keyboard(" ");

      expect(setOpenMock).not.toHaveBeenCalled();
      expect(context.state.open.value).toBe(false);
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
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
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

  describe("stickIfOpen behavior", () => {
    it("closes open element on click by default when stickIfOpen is false", async () => {
      initClick({ stickIfOpen: false, toggle: true });
      openRef.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenCalledWith(false, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("keeps open element open (pins it) on first click when stickIfOpen is true", async () => {
      initClick({ stickIfOpen: true, toggle: true });
      openRef.value = true;
      await nextTick();

      // First click: pins the already-open overlay without closing it
      await userEvent.click(anchorEl);
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(1);
      expect(setOpenMock).toHaveBeenNthCalledWith(1, true, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(true);

      // Second click: toggles it closed
      await userEvent.click(anchorEl);
      await nextTick();

      expect(setOpenMock).toHaveBeenCalledTimes(2);
      expect(setOpenMock).toHaveBeenNthCalledWith(2, false, "anchor-click", expect.any(Object));
      expect(context.state.open.value).toBe(false);
    });

    it("keeps open element open across multiple clicks when stickIfOpen is true and toggle is false", async () => {
      initClick({ stickIfOpen: true, toggle: false });
      openRef.value = true;
      await nextTick();

      await userEvent.click(anchorEl);
      await nextTick();
      expect(context.state.open.value).toBe(true);

      await userEvent.click(anchorEl);
      await nextTick();
      expect(context.state.open.value).toBe(true);
    });
  });

  describe("combined hover and click pinning integration", () => {
    it("pins hover overlay on click so pointer leave does not close it", async () => {
      const parentScope = effectScope();
      scope = parentScope;

      let floatingContext!: ReturnType<typeof useFloatingContext>;
      parentScope.run(() => {
        floatingContext = useFloatingContext({
          anchorEl: ref(anchorEl),
          floatingEl: ref(floatingEl),
        });
        useHover(floatingContext);
        useClick(floatingContext, { stickIfOpen: true });
      });

      await nextTick();
      expect(floatingContext.state.open.value).toBe(false);

      // 1. Pointer enters anchor -> opened via hover
      anchorEl.dispatchEvent(
        new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }),
      );
      await nextTick();
      expect(floatingContext.state.open.value).toBe(true);
      expect(floatingContext.state.lastOpenReason?.value).toBe("hover");

      // 2. User clicks anchor -> pins open via stickIfOpen
      await userEvent.click(anchorEl);
      await nextTick();
      expect(floatingContext.state.open.value).toBe(true);
      expect(floatingContext.state.lastOpenReason?.value).toBe("anchor-click");

      // 3. Pointer leaves anchor -> stays open because it is pinned
      anchorEl.dispatchEvent(
        new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" }),
      );
      await nextTick();
      expect(floatingContext.state.open.value).toBe(true);

      // 4. Second click on anchor -> closes overlay
      await userEvent.click(anchorEl);
      await nextTick();
      expect(floatingContext.state.open.value).toBe(false);
      expect(floatingContext.state.lastOpenReason?.value).toBeNull();
    });

    it("unpinned hover overlay closes normally on pointer leave without click", async () => {
      const parentScope = effectScope();
      scope = parentScope;

      let floatingContext!: ReturnType<typeof useFloatingContext>;
      parentScope.run(() => {
        floatingContext = useFloatingContext({
          anchorEl: ref(anchorEl),
          floatingEl: ref(floatingEl),
        });
        useHover(floatingContext);
        useClick(floatingContext, { stickIfOpen: true });
      });

      await nextTick();
      expect(floatingContext.state.open.value).toBe(false);

      // Pointer enters anchor -> opens via hover
      anchorEl.dispatchEvent(
        new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }),
      );
      await nextTick();
      expect(floatingContext.state.open.value).toBe(true);
      expect(floatingContext.state.lastOpenReason?.value).toBe("hover");

      // Pointer leaves without clicking -> closes via hover
      anchorEl.dispatchEvent(
        new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" }),
      );
      await nextTick();
      expect(floatingContext.state.open.value).toBe(false);
      expect(floatingContext.state.lastOpenReason?.value).toBeNull();
    });
  });
});
