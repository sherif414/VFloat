import { userEvent } from "vite-plus/test/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import {
  type UseFocusTrapContext,
  type UseFocusTrapOptions,
  type UseFocusTrapReturn,
  useFocusTrap,
} from "@/composables/interactions/use-focus-trap";
import type { AnchorElement, FloatingElement } from "@/composables/positioning";

type FocusTrapTestContext = {
  anchorEl: HTMLButtonElement;
  floatingEl: HTMLDivElement;
  context: UseFocusTrapContext;
  openRef: ReturnType<typeof ref<boolean>>;
  result: UseFocusTrapReturn;
  scope: ReturnType<typeof effectScope>;
  setOpenMock: ReturnType<typeof vi.fn>;
};

const trackedElements: HTMLElement[] = [];
const activeScopes: ReturnType<typeof effectScope>[] = [];

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

function appendButton(container: HTMLElement, id: string, text = id): HTMLButtonElement {
  const button = trackElement(document.createElement("button"));
  button.id = id;
  button.textContent = text;
  container.appendChild(button);
  return button;
}

function createOutsideElement(id = "outside"): HTMLButtonElement {
  const outsideEl = trackElement(document.createElement("button"));
  outsideEl.id = id;
  outsideEl.textContent = id;
  document.body.appendChild(outsideEl);
  return outsideEl;
}

async function flushFocusTrap() {
  await nextTick();
  await vi.runAllTimersAsync();
  await nextTick();
  await vi.runAllTimersAsync();
  await nextTick();
}

function setupFocusTrap(
  options: UseFocusTrapOptions = {},
  initialOpen = false,
): FocusTrapTestContext {
  const anchorEl = trackElement(document.createElement("button"));
  anchorEl.id = "anchor";
  anchorEl.textContent = "Anchor";
  document.body.appendChild(anchorEl);

  const floatingEl = trackElement(document.createElement("div"));
  floatingEl.id = "floating";
  floatingEl.tabIndex = -1;
  document.body.appendChild(floatingEl);

  const openRef = ref(initialOpen);
  const setOpenMock = vi.fn((value: boolean) => {
    openRef.value = value;
  });
  const anchorRef = ref<AnchorElement>(anchorEl);
  const floatingRef = ref<FloatingElement>(floatingEl);
  const arrowRef = ref<HTMLElement | null>(null);

  const context: UseFocusTrapContext = {
    refs: {
      anchorEl: anchorRef,
      floatingEl: floatingRef,
      arrowEl: arrowRef,
      setAnchor: (value) => {
        anchorRef.value = value;
      },
      setFloating: (value) => {
        floatingRef.value = value;
      },
      setArrow: (value) => {
        arrowRef.value = value;
      },
    },
    state: {
      open: openRef,
      setOpen: setOpenMock,
    },
  };

  const scope = effectScope();
  activeScopes.push(scope);

  let result!: UseFocusTrapReturn;
  scope.run(() => {
    result = useFocusTrap(context, options);
  });

  return {
    anchorEl,
    floatingEl,
    context,
    openRef,
    result,
    scope,
    setOpenMock,
  };
}

async function openTrap(ctx: FocusTrapTestContext) {
  ctx.context.state.setOpen(true);
  await flushFocusTrap();
  ctx.setOpenMock.mockClear();
}

describe("useFocusTrap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }

    activeScopes.length = 0;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("focus management", () => {
    it("focuses the first visible tabbable element", async () => {
      const ctx = setupFocusTrap();
      const hiddenButton = appendButton(ctx.floatingEl, "hidden");
      hiddenButton.style.display = "none";
      const visibleButton = appendButton(ctx.floatingEl, "visible");

      await openTrap(ctx);

      expect(document.activeElement).toBe(visibleButton);
      expect(ctx.result.isActive.value).toBe(true);
    });

    it("supports selector-based initial focus", async () => {
      const ctx = setupFocusTrap({ initialFocus: "#close-btn" });
      appendButton(ctx.floatingEl, "first");
      const closeButton = appendButton(ctx.floatingEl, "close-btn");

      await openTrap(ctx);

      expect(document.activeElement).toBe(closeButton);
    });

    it("falls back to the floating container when no tabbables exist", async () => {
      const ctx = setupFocusTrap();
      ctx.floatingEl.textContent = "No tabbable content";

      await openTrap(ctx);

      expect(document.activeElement).toBe(ctx.floatingEl);
    });

    it("does not move focus on open when initialFocus is false", async () => {
      const ctx = setupFocusTrap({ initialFocus: false });
      appendButton(ctx.floatingEl, "first");
      ctx.anchorEl.focus();

      await openTrap(ctx);

      expect(document.activeElement).toBe(ctx.anchorEl);
    });

    it("returns focus to the previously focused element on close", async () => {
      const previousFocus = createOutsideElement("previous-focus");
      previousFocus.focus();

      const ctx = setupFocusTrap({ returnFocus: true });
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);
      ctx.context.state.setOpen(false);
      await flushFocusTrap();

      expect(document.activeElement).toBe(previousFocus);
    });

    it("reacts to returnFocus changes while open", async () => {
      const previousFocus = createOutsideElement("previous-focus");
      previousFocus.focus();

      const returnFocus = ref(true);
      const ctx = setupFocusTrap({ returnFocus });
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);

      returnFocus.value = false;
      await flushFocusTrap();

      ctx.context.state.setOpen(false);
      await flushFocusTrap();

      expect(document.activeElement).not.toBe(previousFocus);
    });
  });

  describe("dismissal behavior", () => {
    it("reports outside-pointer when outside click deactivates the trap", async () => {
      const outsideEl = createOutsideElement();
      const ctx = setupFocusTrap({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);
      await userEvent.click(outsideEl);
      await flushFocusTrap();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "outside-pointer", expect.any(Event));
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("reports programmatic when deactivate() closes the floating surface", async () => {
      const ctx = setupFocusTrap();
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);
      ctx.result.deactivate();
      await flushFocusTrap();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "programmatic", undefined);
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("can close programmatically even when no trap is active", async () => {
      const enabled = ref(false);
      const ctx = setupFocusTrap({ enabled }, true);

      await flushFocusTrap();
      ctx.setOpenMock.mockClear();

      ctx.result.deactivate();
      await flushFocusTrap();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "programmatic", undefined);
      expect(ctx.context.state.open.value).toBe(false);
    });
  });

  describe("modal behavior", () => {
    it("isolates outside content with aria-hidden and restores it on close", async () => {
      const outsideEl = createOutsideElement();
      const ctx = setupFocusTrap({ modal: true });
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);

      expect(outsideEl.getAttribute("aria-hidden")).toBe("true");

      ctx.context.state.setOpen(false);
      await flushFocusTrap();

      expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
    });

    it("updates outside isolation when modal options change while open", async () => {
      const outsideEl = createOutsideElement();
      const modal = ref(false);
      const outsideElementsInert = ref(false);
      const ctx = setupFocusTrap({ modal, outsideElementsInert });
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);
      expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
      expect(outsideEl.hasAttribute("inert")).toBe(false);

      modal.value = true;
      await flushFocusTrap();
      expect(outsideEl.getAttribute("aria-hidden")).toBe("true");

      outsideElementsInert.value = true;
      await flushFocusTrap();

      if ("inert" in HTMLElement.prototype) {
        expect(outsideEl.hasAttribute("inert")).toBe(true);
        expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
      } else {
        expect(outsideEl.getAttribute("aria-hidden")).toBe("true");
      }

      modal.value = false;
      await flushFocusTrap();

      expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });
  });

  describe("lifecycle and coordination", () => {
    it("reacts to enabled changes while the floating surface stays open", async () => {
      const enabled = ref(true);
      const ctx = setupFocusTrap({ enabled });
      appendButton(ctx.floatingEl, "first");

      await openTrap(ctx);
      expect(ctx.result.isActive.value).toBe(true);

      enabled.value = false;
      await flushFocusTrap();
      expect(ctx.result.isActive.value).toBe(false);

      enabled.value = true;
      await flushFocusTrap();
      expect(ctx.result.isActive.value).toBe(true);
    });

    it("coordinates multiple traps so only the top trap stays active", async () => {
      const parent = setupFocusTrap();
      const child = setupFocusTrap();
      appendButton(parent.floatingEl, "parent-button");
      appendButton(child.floatingEl, "child-button");

      await openTrap(parent);
      expect(parent.result.isActive.value).toBe(true);

      await openTrap(child);
      expect(parent.result.isActive.value).toBe(false);
      expect(child.result.isActive.value).toBe(true);

      child.context.state.setOpen(false);
      await flushFocusTrap();

      expect(parent.result.isActive.value).toBe(true);
      expect(child.result.isActive.value).toBe(false);
    });

    it("does nothing when activate() is called while closed", () => {
      const ctx = setupFocusTrap();

      ctx.result.activate();

      expect(ctx.result.isActive.value).toBe(false);
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("handles a missing floating element without throwing", async () => {
      const ctx = setupFocusTrap();
      ctx.context.refs.floatingEl.value = null;

      expect(() => {
        ctx.context.state.setOpen(true);
      }).not.toThrow();

      await flushFocusTrap();
      expect(ctx.result.isActive.value).toBe(false);
    });
  });
});
