import { effectScope, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  useEscapeKey,
  useFloatingTree,
  useFloatingTreeNode,
  type UseEscapeKeyContext,
} from "@/composables/interactions";
import { useFloating } from "@/composables/positioning";

const createdElements: HTMLElement[] = [];

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K) {
  const element = document.createElement(tag);
  createdElements.push(element);
  document.body.appendChild(element);
  return element;
}

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

async function flushEscapeHandling() {
  await new Promise((resolve) => setTimeout(resolve, 0));
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
  });

  describe("floating tree integration", () => {
    it("restores focus to the closed child anchor when Escape closes the active child", async () => {
      scope = effectScope();
      let childAnchorEl!: HTMLButtonElement;
      let childContext!: ReturnType<typeof useFloating>;
      let rootContext!: ReturnType<typeof useFloating>;

      scope.run(() => {
        const rootAnchorEl = createElement("button");
        const rootFloatingEl = createElement("div");
        childAnchorEl = createElement("button");
        const childFloatingEl = createElement("div");
        childFloatingEl.tabIndex = -1;

        rootContext = useFloating(ref(rootAnchorEl), ref(rootFloatingEl), {
          open: ref(true),
        });

        childContext = useFloating(ref(childAnchorEl), ref(childFloatingEl), {
          open: ref(true),
        });

        const tree = useFloatingTree();
        const rootNode = useFloatingTreeNode(rootContext, {
          tree,
          id: "root",
        });

        useFloatingTreeNode(childContext, {
          parent: rootNode,
          id: "child",
        });

        useEscapeKey(rootContext);
      });

      childContext.refs.floatingEl.value?.focus();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await flushEscapeHandling();

      expect(childContext.state.open.value).toBe(false);
      expect(rootContext.state.open.value).toBe(true);
      expect(document.activeElement).toBe(childAnchorEl);
    });

    it("restores focus to the root anchor when Escape closes the root node", async () => {
      scope = effectScope();
      let rootAnchorEl!: HTMLButtonElement;
      let rootContext!: ReturnType<typeof useFloating>;

      scope.run(() => {
        rootAnchorEl = createElement("button");
        const rootFloatingEl = createElement("div");
        rootFloatingEl.tabIndex = -1;

        rootContext = useFloating(ref(rootAnchorEl), ref(rootFloatingEl), {
          open: ref(true),
        });

        const tree = useFloatingTree();
        useFloatingTreeNode(rootContext, {
          tree,
          id: "root",
        });

        useEscapeKey(rootContext);
      });

      rootContext.refs.floatingEl.value?.focus();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await flushEscapeHandling();

      expect(rootContext.state.open.value).toBe(false);
      expect(document.activeElement).toBe(rootAnchorEl);
    });

    it("closes only the active tree node on each Escape key press", () => {
      scope = effectScope();
      let rootContext!: ReturnType<typeof useFloating>;
      let childContext!: ReturnType<typeof useFloating>;

      scope.run(() => {
        const rootAnchorEl = createElement("button");
        const rootFloatingEl = createElement("div");
        const childAnchorEl = createElement("button");
        const childFloatingEl = createElement("div");

        rootContext = useFloating(ref(rootAnchorEl), ref(rootFloatingEl), {
          open: ref(true),
        });

        childContext = useFloating(ref(childAnchorEl), ref(childFloatingEl), {
          open: ref(true),
        });

        const tree = useFloatingTree();
        const rootNode = useFloatingTreeNode(rootContext, {
          tree,
          id: "root",
        });

        useFloatingTreeNode(childContext, {
          parent: rootNode,
          id: "child",
        });

        useEscapeKey(rootContext);
        useEscapeKey(childContext);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(childContext.state.open.value).toBe(false);
      expect(rootContext.state.open.value).toBe(true);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(rootContext.state.open.value).toBe(false);
    });

    it("lets a parent listener close the active child node first", () => {
      scope = effectScope();
      let rootContext!: ReturnType<typeof useFloating>;
      let childContext!: ReturnType<typeof useFloating>;

      scope.run(() => {
        const rootAnchorEl = createElement("button");
        const rootFloatingEl = createElement("div");
        const childAnchorEl = createElement("button");
        const childFloatingEl = createElement("div");

        rootContext = useFloating(ref(rootAnchorEl), ref(rootFloatingEl), {
          open: ref(true),
        });

        childContext = useFloating(ref(childAnchorEl), ref(childFloatingEl), {
          open: ref(true),
        });

        const tree = useFloatingTree();
        const rootNode = useFloatingTreeNode(rootContext, {
          tree,
          id: "root",
        });

        useFloatingTreeNode(childContext, {
          parent: rootNode,
          id: "child",
        });

        useEscapeKey(rootContext);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(childContext.state.open.value).toBe(false);
      expect(rootContext.state.open.value).toBe(true);
    });
  });
});
