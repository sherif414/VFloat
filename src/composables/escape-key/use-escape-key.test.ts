import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { type UseEscapeKeyContext, useEscapeKey, useFloatingNode } from "@/composables";

function createMockFloatingNode(): UseEscapeKeyContext {
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
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("FloatingNode behavior", () => {
    it("closes floating element on escape key press", async () => {
      const context = createMockFloatingNode();
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

    it("does not trigger when floating element is already closed", async () => {
      const context = createMockFloatingNode();
      context.state.setOpen(false);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("respects enabled option", async () => {
      const context = createMockFloatingNode();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, { enabled: false });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("respects defaultPrevented from another handler", async () => {
      const context = createMockFloatingNode();
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

    it("uses custom onEscape handler when provided", async () => {
      const context = createMockFloatingNode();
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

    it("ignores non-escape keys", async () => {
      const context = createMockFloatingNode();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          keyCode: 32,
        } as any),
      );

      expect(context.state.setOpen).not.toHaveBeenCalled();
    });
  });

  describe("Composition event handling", () => {
    it("ignores escape during composition", async () => {
      const context = createMockFloatingNode();
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context);
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).not.toHaveBeenCalled();

      document.dispatchEvent(new CompositionEvent("compositionend"));

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );
    });
  });

  describe("Options handling", () => {
    it("respects reactive enabled option", async () => {
      const context = createMockFloatingNode();
      const enabled = ref(true);
      context.state.setOpen(true);
      (context.state.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(context, { enabled });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(context.state.setOpen).toHaveBeenCalledWith(
        false,
        "escape-key",
        expect.any(KeyboardEvent),
      );

      vi.clearAllMocks();
      enabled.value = false;

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(context.state.setOpen).not.toHaveBeenCalled();
    });

    it("handles capture option", async () => {
      const context = createMockFloatingNode();
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

    it("prevents default when preventDefault is enabled", async () => {
      const context = createMockFloatingNode();
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

    it("shares a single composition listener across multiple consumers", async () => {
      const contextA = createMockFloatingNode();
      const contextB = createMockFloatingNode();
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
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: rootOpen,
          onOpenChange: () => calls.push("root"),
        });
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentContext: root,
          open: childOpen,
          onOpenChange: () => calls.push("child"),
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentContext: child,
          open: grandchildOpen,
          onOpenChange: () => calls.push("grandchild"),
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
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: rootOpen,
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentContext: root,
          open: firstChildOpen,
          onOpenChange: () => calls.push("first-child"),
        });
        const secondChild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentContext: root,
          open: secondChildOpen,
          onOpenChange: () => calls.push("second-child"),
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentContext: secondChild,
          open: secondGrandchildOpen,
          onOpenChange: () => calls.push("second-grandchild"),
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
