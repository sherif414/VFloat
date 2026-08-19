import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref, watchEffect } from "vue";
import { floatingTree } from "./floating-context-tree";
import {
  FloatingInternalsRegistry,
  floatingInternals,
  useFloatingContext,
} from "./use-floating-context";

const trackedElements: HTMLElement[] = [];
let scope: ReturnType<typeof effectScope> | undefined;

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

describe("useFloatingContext", () => {
  beforeEach(() => {
    scope = effectScope();
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("uses defaultOpen for uncontrolled state", () => {
    let context!: ReturnType<typeof useFloatingContext>;
    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        defaultOpen: true,
      });
    });

    expect(context.state.open.value).toBe(true);
  });

  it("prefers controlled open state over defaultOpen", () => {
    let context!: ReturnType<typeof useFloatingContext>;
    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: ref(false),
        defaultOpen: true,
      });
    });

    expect(context.state.open.value).toBe(false);
  });

  it("uses controlled open state and forwards reasons and events", () => {
    const open = ref(false);
    const onOpenChange = vi.fn();
    const event = new KeyboardEvent("keydown");
    let context!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open,
        onOpenChange,
      });
    });

    context.state.setOpen(true, "anchor-click", event);

    expect(open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true, "anchor-click", event);
  });

  it("falls back to programmatic reasons and ignores duplicate updates", () => {
    const onOpenChange = vi.fn();
    let context!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        onOpenChange,
      });
    });

    context.state.setOpen(true);
    context.state.setOpen(true, "anchor-click");

    expect(context.state.open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, "programmatic", undefined);
  });

  it("assigns each context a stable symbol id", () => {
    let context!: ReturnType<typeof useFloatingContext>;
    let otherContext!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      context = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      otherContext = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
    });

    expect(typeof context.id).toBe("symbol");
    expect(context.id).toBe(context.id);
    expect(context.id).not.toBe(otherContext.id);
  });

  it("closes descendant contexts from deepest to nearest child before closing the parent", () => {
    const calls: string[] = [];
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const grandchildOpen = ref(true);
    let root!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
        onOpenChange: () => calls.push("root"),
      });
      const child = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: root,
        open: childOpen,
        onOpenChange: () => calls.push("child"),
      });
      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: child,
        open: grandchildOpen,
        onOpenChange: () => calls.push("grandchild"),
      });
    });

    root.state.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(false);
    expect(grandchildOpen.value).toBe(false);
    expect(calls).toEqual(["grandchild", "child", "root"]);
  });

  it("does not open ancestors when opening a child context", () => {
    const rootOpen = ref(false);
    const childOpen = ref(false);
    let child!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      const root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      child = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: root,
        open: childOpen,
      });
    });

    child.state.setOpen(true, "programmatic");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("does not cascade when a controlled parent ref is written directly", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);

    scope?.run(() => {
      const root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: root,
        open: childOpen,
      });
    });

    rootOpen.value = false;

    expect(childOpen.value).toBe(true);
  });

  it("unregisters child context links on scope disposal", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    let root!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
    });

    const localScope = effectScope();
    localScope.run(() => {
      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: root,
        open: childOpen,
      });
    });

    localScope.stop();
    root.state.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("unregisters child context links from family helpers on scope disposal", () => {
    const rootFloatingEl = trackElement(document.createElement("div"));
    const childFloatingEl = trackElement(document.createElement("div"));
    let root!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(rootFloatingEl),
      });
    });

    const localScope = effectScope();
    localScope.run(() => {
      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
        parentContext: root,
      });
    });

    expect(floatingTree.getFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);

    localScope.stop();

    expect(floatingTree.getFloatingElements(root)).toEqual([rootFloatingEl]);
  });

  it("updates descendant floating element helpers when child contexts mount later", async () => {
    const rootFloatingEl = trackElement(document.createElement("div"));
    const childFloatingEl = trackElement(document.createElement("div"));
    let root!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(rootFloatingEl),
      });
    });

    const lengths: number[] = [];
    const localScope = effectScope();

    localScope.run(() => {
      watchEffect(() => {
        lengths.push(floatingTree.getFloatingElements(root).length);
      });

      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
        parentContext: root,
      });
    });

    await nextTick();
    localScope.stop();

    expect(lengths).toEqual([1, 2]);
  });

  it("sets isRoot to true for root contexts and false for nested child contexts", () => {
    let root!: ReturnType<typeof useFloatingContext>;
    let child!: ReturnType<typeof useFloatingContext>;

    scope?.run(() => {
      root = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      child = useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: root,
      });
    });

    expect(root.isRoot).toBe(true);
    expect(child.isRoot).toBe(false);
  });
});

describe("FloatingInternalsRegistry", () => {
  it("attaches and retrieves internal state on an object or symbol target", () => {
    const registry = new FloatingInternalsRegistry();
    const target = Symbol("test-target");
    const dummyInternals = {
      middlewareRegistry: {
        middlewares: computed(() => []),
        register: vi.fn(),
      },
      placement: ref("bottom" as const),
      middlewareData: ref({}),
    };

    expect(registry.get(target)).toBeUndefined();

    registry.set(target, dummyInternals);
    expect(registry.get(target)).toBe(dummyInternals);
  });

  it("provides a global singleton instance", () => {
    expect(floatingInternals).toBeInstanceOf(FloatingInternalsRegistry);
  });
});
