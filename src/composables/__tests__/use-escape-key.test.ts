import { effectScope, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { type UseEscapeKeyContext, useEscapeKey } from "@/composables/interactions/use-escape-key";

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
  });
});
