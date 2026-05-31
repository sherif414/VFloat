import { effectScope, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { useEscapeKey, useFloatingContext, type UseEscapeKeyContext } from "@/composables";

const createdElements: HTMLElement[] = [];

// Test utilities
function createMockFloatingContext(): UseEscapeKeyContext {
  const open = ref(false);
  const setOpen = vi.fn((value: boolean) => {
    open.value = value;
  });

  return {
    state: {
      open,
      setOpen,
    },
  };
}

describe("useEscapeKey", () => {
  let scope: ReturnType<typeof effectScope> | undefined;

  afterEach(() => {
    scope?.stop();
    scope = undefined;

    for (const element of createdElements) {
      element.remove();
    }
    createdElements.length = 0;

    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("FloatingContext behavior", () => {
    it("should close floating element on escape key press", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );
    });

    it("should not trigger when floating element is already closed", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(false);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("should respect enabled option", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, { enabled: false });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("should respect defaultPrevented from another handler", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
        }
      };

      document.addEventListener("keydown", onKeyDown, { capture: true });

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));

      document.removeEventListener("keydown", onKeyDown, { capture: true });

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("should use custom onEscape handler when provided", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();
      const customHandler = vi.fn();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, {
          onEscape: customHandler,
        });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(customHandler).toHaveBeenCalled();
      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("should ignore non-escape keys", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", code: "Space", keyCode: 32 } as any),
      );

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });
  });

  describe("Composition event handling", () => {
    it("should ignore escape during composition", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      // Start composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).not.toHaveBeenCalled();

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // Now escape should work
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );
    });
  });

  describe("Options handling", () => {
    it("should respect reactive enabled option", async () => {
      const context = createMockFloatingContext();
      const enabled = ref(true);
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, { enabled });
      });

      // Initially enabled
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );

      vi.clearAllMocks();
      enabled.value = false;

      // Now disabled
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("should handle capture option", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, { capture: true });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );
    });

    it("should prevent default when preventDefault is enabled", async () => {
      const context = createMockFloatingContext();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, { preventDefault: true });
      });

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );
    });

    it("should share a single composition listener across multiple consumers", async () => {
      const contextA = createMockFloatingContext();
      const contextB = createMockFloatingContext();
      contextA.state.setOpen(true);
      contextB.state.setOpen(true);
      (contextA.state.setOpen as any).mockClear();
      (contextB.state.setOpen as any).mockClear();

      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const scopeA = effectScope();
      const scopeB = effectScope();

      scopeA.run(() => {
        useEscapeKey(contextA);
      });

      scopeB.run(() => {
        useEscapeKey(contextB);
      });

      const compositionListeners = addEventListenerSpy.mock.calls.filter(
        ([type]) => type === "compositionstart" || type === "compositionend",
      );

      expect(compositionListeners).toHaveLength(2);

      scopeA.stop();
      scopeB.stop();
      addEventListenerSpy.mockRestore();
    });

    it("closes linked descendants from deepest to root across repeated Escape presses", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const childOpen = ref(true);
      const grandchildOpen = ref(true);

      scope = effectScope();
      scope.run(() => {
        const root = useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          state: {
            open: rootOpen,
            onOpenChange: () => calls.push("root"),
          },
        });
        const child = useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          parentContext: root,
          state: {
            open: childOpen,
            onOpenChange: () => calls.push("child"),
          },
        });
        useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          parentContext: child,
          state: {
            open: grandchildOpen,
            onOpenChange: () => calls.push("grandchild"),
          },
        });

        useEscapeKey(root);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(rootOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(grandchildOpen.value).toBe(false);
      expect(calls).toEqual(["grandchild", "child", "root"]);
    });

    it("closes the deepest open descendant across sibling branches", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const firstChildOpen = ref(true);
      const secondChildOpen = ref(true);
      const secondGrandchildOpen = ref(true);

      scope = effectScope();
      scope.run(() => {
        const root = useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          state: { open: rootOpen },
        });
        useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          parentContext: root,
          state: {
            open: firstChildOpen,
            onOpenChange: () => calls.push("first-child"),
          },
        });
        const secondChild = useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          parentContext: root,
          state: {
            open: secondChildOpen,
            onOpenChange: () => calls.push("second-child"),
          },
        });
        useFloatingContext({
          refs: {
            anchorEl: ref(null),
            floatingEl: ref(null),
          },
          parentContext: secondChild,
          state: {
            open: secondGrandchildOpen,
            onOpenChange: () => calls.push("second-grandchild"),
          },
        });

        useEscapeKey(root);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(firstChildOpen.value).toBe(true);
      expect(secondChildOpen.value).toBe(true);
      expect(secondGrandchildOpen.value).toBe(false);
      expect(calls).toEqual(["second-grandchild"]);
    });
  });
});
