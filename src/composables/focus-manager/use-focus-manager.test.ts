import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { AnchorElement, FloatingElement } from "@/composables";
import {
  type UseFocusManagerContext,
  type UseFocusManagerOptions,
  type UseFocusManagerReturn,
  useFloatingContext,
  useFocusManager,
} from "@/composables";

type FocusManagerTestContext = {
  anchorEl: HTMLButtonElement;
  floatingEl: HTMLDivElement;
  context: UseFocusManagerContext;
  openRef: ReturnType<typeof ref<boolean>>;
  result: UseFocusManagerReturn;
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

async function flushFocus() {
  await nextTick();
  await vi.runAllTimersAsync();
  await nextTick();
  await vi.runAllTimersAsync();
  await nextTick();
}

function setupFocusManager(
  options: UseFocusManagerOptions = {},
  initialOpen = false,
): FocusManagerTestContext {
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

  const context: UseFocusManagerContext = {
    refs: {
      anchorEl: anchorRef,
      floatingEl: floatingRef,
      arrowEl: arrowRef,
    },
    state: {
      open: openRef,
      setOpen: setOpenMock,
    },
  };

  const scope = effectScope();
  activeScopes.push(scope);

  let result!: UseFocusManagerReturn;
  scope.run(() => {
    result = useFocusManager(context, options);
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

async function openManager(ctx: FocusManagerTestContext) {
  ctx.context.state.setOpen(true);
  await flushFocus();
  ctx.setOpenMock.mockClear();
}

describe("useFocusManager", () => {
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

  describe("initial focus", () => {
    it("focuses the first visible tabbable element by default", async () => {
      const ctx = setupFocusManager();
      const hiddenButton = appendButton(ctx.floatingEl, "hidden");
      hiddenButton.style.display = "none";
      const visibleButton = appendButton(ctx.floatingEl, "visible");

      await openManager(ctx);

      expect(document.activeElement).toBe(visibleButton);
      expect(ctx.result.isActive.value).toBe(true);
    });

    it("supports element-based initial focus", async () => {
      const targetButton = trackElement(document.createElement("button"));
      targetButton.id = "target";
      targetButton.textContent = "Target";

      const ctx = setupFocusManager({ initialFocus: targetButton });
      appendButton(ctx.floatingEl, "first");
      ctx.floatingEl.appendChild(targetButton);

      await openManager(ctx);
      expect(document.activeElement).toBe(targetButton);
    });

    it("supports function-based initial focus", async () => {
      let target: HTMLElement | null = null;
      const ctx = setupFocusManager({ initialFocus: () => target });
      appendButton(ctx.floatingEl, "first");
      target = appendButton(ctx.floatingEl, "target-fn");

      await openManager(ctx);
      expect(document.activeElement).toBe(target);
    });

    it("falls back to the floating container when no tabbables exist", async () => {
      const ctx = setupFocusManager();
      ctx.floatingEl.textContent = "Non-tabbable content";

      await openManager(ctx);
      expect(document.activeElement).toBe(ctx.floatingEl);
    });

    it("does not move focus when initialFocus is false", async () => {
      const ctx = setupFocusManager({ modal: false, initialFocus: false });
      appendButton(ctx.floatingEl, "first");
      ctx.anchorEl.focus();

      await openManager(ctx);
      expect(document.activeElement).toBe(ctx.anchorEl);
    });
  });

  describe("modal focus trapping", () => {
    it("wraps focus from last to first element on Tab", async () => {
      const ctx = setupFocusManager({ modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const last = appendButton(ctx.floatingEl, "last");

      await openManager(ctx);
      expect(document.activeElement).toBe(first);

      last.focus();
      expect(document.activeElement).toBe(last);

      ctx.floatingEl.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
      await flushFocus();

      expect(document.activeElement).toBe(first);
    });

    it("wraps focus from first to last element on Shift+Tab", async () => {
      const ctx = setupFocusManager({ modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const last = appendButton(ctx.floatingEl, "last");

      await openManager(ctx);
      expect(document.activeElement).toBe(first);

      ctx.floatingEl.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await flushFocus();

      expect(document.activeElement).toBe(last);
    });
  });

  describe("focus guards", () => {
    it("creates start and end guard sentinels around floating element", async () => {
      const ctx = setupFocusManager({ guards: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);

      const startGuard = document.querySelector('[data-vfloat-focus-guard="start"]');
      const endGuard = document.querySelector('[data-vfloat-focus-guard="end"]');

      expect(startGuard).toBeTruthy();
      expect(endGuard).toBeTruthy();
    });

    it("redirects focus when focus guard sentinel receives focus", async () => {
      const ctx = setupFocusManager({ guards: true, modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const last = appendButton(ctx.floatingEl, "last");

      await openManager(ctx);

      const startGuard = document.querySelector('[data-vfloat-focus-guard="start"]') as HTMLElement;
      const endGuard = document.querySelector('[data-vfloat-focus-guard="end"]') as HTMLElement;

      startGuard.focus();
      await flushFocus();
      expect(document.activeElement).toBe(last);

      endGuard.focus();
      await flushFocus();
      expect(document.activeElement).toBe(first);
    });
  });

  describe("return focus", () => {
    it("returns focus to the previously focused element on close", async () => {
      const previousFocus = createOutsideElement("prev");
      previousFocus.focus();

      const ctx = setupFocusManager({ returnFocus: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);
      expect(document.activeElement).not.toBe(previousFocus);

      ctx.context.state.setOpen(false);
      await flushFocus();

      expect(document.activeElement).toBe(previousFocus);
    });

    it("supports returning focus to a custom element ref", async () => {
      const customEl = createOutsideElement("custom-return");
      const ctx = setupFocusManager({ returnFocus: customEl });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);
      ctx.context.state.setOpen(false);
      await flushFocus();

      expect(document.activeElement).toBe(customEl);
    });

    it("does not return focus when returnFocus is false", async () => {
      const previousFocus = createOutsideElement("prev");
      previousFocus.focus();

      const ctx = setupFocusManager({ returnFocus: false });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);
      ctx.context.state.setOpen(false);
      await flushFocus();

      expect(document.activeElement).not.toBe(previousFocus);
    });

    it("does not hijack focus when focus naturally moves to an outside element", async () => {
      const ctx = setupFocusManager({ returnFocus: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);

      // Simulate focus moving outside naturally (e.g., via Tab or manual focus)
      const outsideFocus = createOutsideElement("natural-outside");
      outsideFocus.focus();

      // Close the floating element
      ctx.context.state.setOpen(false);
      await flushFocus();

      // Focus should remain on the outside element, not restored to anchor
      expect(document.activeElement).toBe(outsideFocus);
    });

    it("does not hijack focus when an outside pointerdown interaction is detected", async () => {
      const previousFocus = createOutsideElement("prev");
      previousFocus.focus();

      const ctx = setupFocusManager({ returnFocus: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);

      const outsideButton = createOutsideElement("outside-button");

      // Simulate pointerdown on the outside button
      outsideButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Suppose the outside component or useOutsideClick closes the floating element synchronously
      ctx.context.state.setOpen(false, "outside-pointer", new Event("pointerdown"));
      await flushFocus();

      // Focus should NOT be pulled back to `prev` because of the outside pointerdown interaction
      expect(document.activeElement).not.toBe(previousFocus);
    });
  });

  describe("non-modal & dismissal behavior", () => {
    it("closes with blur reason on document focusin when closeOnFocusOut is true", async () => {
      const outsideEl = createOutsideElement();
      const ctx = setupFocusManager({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);
      expect(ctx.context.state.open.value).toBe(true);

      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "blur", expect.any(Event));
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("closes on pointerdown outside when closeOnFocusOut is true", async () => {
      const outsideEl = createOutsideElement();
      const ctx = setupFocusManager({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);
      expect(ctx.context.state.open.value).toBe(true);

      outsideEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await flushFocus();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "outside-pointer", expect.any(Event));
    });

    it("respects ignoreFocusOut predicate", async () => {
      const ignoredEl = createOutsideElement("ignored");
      const outsideEl = createOutsideElement("outside");

      const ctx = setupFocusManager({
        modal: false,
        closeOnFocusOut: true,
        ignoreFocusOut: (target) => target === ignoredEl,
      });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);

      ignoredEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(true);

      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("closes on Tab when closeOnTab is true", async () => {
      const ctx = setupFocusManager({ modal: false, closeOnTab: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);

      ctx.floatingEl.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
      await flushFocus();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "tab-key", expect.any(Event));
    });
  });

  describe("background isolation", () => {
    it("isolates outside content with aria-hidden or inert and restores on close", async () => {
      const outsideEl = createOutsideElement();
      const ctx = setupFocusManager({ modal: true });
      appendButton(ctx.floatingEl, "btn");

      await openManager(ctx);

      const hasIsolation =
        outsideEl.getAttribute("aria-hidden") === "true" ||
        outsideEl.hasAttribute("inert") ||
        (outsideEl as any).inert === true;
      expect(hasIsolation).toBe(true);

      ctx.context.state.setOpen(false);
      await flushFocus();

      expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });
  });

  describe("nested floating contexts", () => {
    it("coordinates parent and child contexts without premature closing", async () => {
      const parentAnchorEl = trackElement(document.createElement("button"));
      const parentFloatingEl = trackElement(document.createElement("div"));
      const childAnchorEl = trackElement(document.createElement("button"));
      const childFloatingEl = trackElement(document.createElement("div"));
      parentAnchorEl.id = "parent-anchor";
      childAnchorEl.id = "child-anchor";
      parentFloatingEl.id = "parent-floating";
      childFloatingEl.id = "child-floating";
      parentFloatingEl.tabIndex = -1;
      childFloatingEl.tabIndex = -1;
      document.body.append(parentAnchorEl, parentFloatingEl, childAnchorEl, childFloatingEl);

      appendButton(parentFloatingEl, "parent-btn");
      const childBtn = appendButton(childFloatingEl, "child-btn");

      const parentOpen = ref(true);
      const childOpen = ref(true);
      const scope = effectScope();
      activeScopes.push(scope);
      let result!: UseFocusManagerReturn;

      scope.run(() => {
        const parentContext = useFloatingContext({
          anchorEl: ref(parentAnchorEl),
          floatingEl: ref(parentFloatingEl),
          open: parentOpen,
        });
        useFloatingContext({
          anchorEl: ref(childAnchorEl),
          floatingEl: ref(childFloatingEl),
          parentContext,
          open: childOpen,
        });
        result = useFocusManager(parentContext, { modal: false, closeOnFocusOut: true });
      });

      await flushFocus();
      expect(result.isActive.value).toBe(true);

      // Focus inside child floating element must not close parent
      childBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(parentOpen.value).toBe(true);
    });
  });

  describe("lifecycle & manual controls", () => {
    it("supports manual activate and deactivate methods", async () => {
      const ctx = setupFocusManager({}, true);
      appendButton(ctx.floatingEl, "btn");

      await flushFocus();
      expect(ctx.result.isActive.value).toBe(true);

      ctx.result.deactivate();
      await flushFocus();

      expect(ctx.setOpenMock).toHaveBeenCalledWith(false, "programmatic");
      expect(ctx.context.state.open.value).toBe(false);
    });

    it("handles missing floating element gracefully", async () => {
      const ctx = setupFocusManager();
      ctx.context.refs.floatingEl.value = null;

      expect(() => {
        ctx.context.state.setOpen(true);
      }).not.toThrow();

      await flushFocus();
      expect(ctx.result.isActive.value).toBe(false);
    });
  });
});
