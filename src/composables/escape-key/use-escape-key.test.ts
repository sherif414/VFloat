import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { type UseEscapeKeyContext, useEscapeKey, useFloatingNode } from "@/composables";

function createMockFloatingNode(): UseEscapeKeyContext {
  const open = ref(false);
  const setOpen = vi.fn((value: boolean) => {
    open.value = value;
  });

  return {
    id: Symbol("mock-node"),
    open,
    setOpen,
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
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
    });

    it("does not trigger when floating element is already closed", async () => {
      const node = createMockFloatingNode();
      node.setOpen(false);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.setOpen).not.toHaveBeenCalled();
    });

    it("respects enabled option", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node, { enabled: false });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.setOpen).not.toHaveBeenCalled();
    });

    it("respects defaultPrevented from another handler", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
        }
      };

      document.addEventListener("keydown", onKeyDown, { capture: true });

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));

      document.removeEventListener("keydown", onKeyDown, { capture: true });

      expect(node.setOpen).not.toHaveBeenCalled();
    });

    it("uses custom onEscape handler when provided", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();
      const customHandler = vi.fn();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node, {
          onEscape: customHandler,
        });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(customHandler).toHaveBeenCalled();
      expect(node.setOpen).not.toHaveBeenCalled();
    });

    it("ignores non-escape keys", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          keyCode: 32,
        } as any),
      );

      expect(node.setOpen).not.toHaveBeenCalled();
    });
  });

  describe("Composition event handling", () => {
    it("ignores escape during composition", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node);
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.setOpen).not.toHaveBeenCalled();

      document.dispatchEvent(new CompositionEvent("compositionend"));

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
    });
  });

  describe("Options handling", () => {
    it("respects reactive enabled option", async () => {
      const node = createMockFloatingNode();
      const enabled = ref(true);
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node, { enabled });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(node.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));

      vi.clearAllMocks();
      enabled.value = false;

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(node.setOpen).not.toHaveBeenCalled();
    });

    it("handles capture option", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node, { capture: true });
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
    });

    it("prevents default when preventDefault is enabled", async () => {
      const node = createMockFloatingNode();
      node.setOpen(true);
      (node.setOpen as any).mockClear();

      scope = effectScope();
      scope.run(() => {
        useEscapeKey(node, { preventDefault: true });
      });

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(node.setOpen).toHaveBeenCalledWith(false, "escape-key", expect.any(KeyboardEvent));
    });

    it("shares a single composition listener across multiple consumers", async () => {
      const nodeA = createMockFloatingNode();
      const nodeB = createMockFloatingNode();
      nodeA.setOpen(true);
      nodeB.setOpen(true);
      (nodeA.setOpen as any).mockClear();
      (nodeB.setOpen as any).mockClear();

      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const scopeA = effectScope();
      const scopeB = effectScope();

      scopeA.run(() => {
        useEscapeKey(nodeA);
      });

      scopeB.run(() => {
        useEscapeKey(nodeB);
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
          parentNode: root,
          open: childOpen,
          onOpenChange: () => calls.push("child"),
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentNode: child,
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
          parentNode: root,
          open: firstChildOpen,
          onOpenChange: () => calls.push("first-child"),
        });
        const secondChild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentNode: root,
          open: secondChildOpen,
          onOpenChange: () => calls.push("second-child"),
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parentNode: secondChild,
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
