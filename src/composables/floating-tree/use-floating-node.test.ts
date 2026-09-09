import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref, watchEffect } from "vue";
import { floatingTree } from "./floating-tree";
import { FloatingInternalsRegistry, floatingInternals, useFloatingNode } from "./use-floating-node";

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

describe("useFloatingNode", () => {
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
    let node!: ReturnType<typeof useFloatingNode>;
    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        defaultOpen: true,
      });
    });

    expect(node.open.value).toBe(true);
  });

  it("prefers controlled open state over defaultOpen", () => {
    let node!: ReturnType<typeof useFloatingNode>;
    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: ref(false),
        defaultOpen: true,
      });
    });

    expect(node.open.value).toBe(false);
  });

  it("uses controlled open state and forwards reasons and events", () => {
    const open = ref(false);
    const onOpenChange = vi.fn();
    const event = new KeyboardEvent("keydown");
    let node!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open,
        onOpenChange,
      });
    });

    node.setOpen(true, "anchor-click", event);

    expect(open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true, "anchor-click", event);
  });

  it("falls back to programmatic reasons and ignores duplicate updates", () => {
    const onOpenChange = vi.fn();
    let node!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        onOpenChange,
      });
    });

    node.setOpen(true);
    node.setOpen(true, "anchor-click");

    expect(node.open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, "programmatic", undefined);
  });

  it("tracks lastOpenReason and lastOpenEvent when opened and resets on close", async () => {
    let node!: ReturnType<typeof useFloatingNode>;
    const dummyEvent = new MouseEvent("click");

    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
    });

    expect(node.lastOpenReason?.value).toBeNull();
    expect(node.lastOpenEvent?.value).toBeNull();

    node.setOpen(true, "hover", dummyEvent);
    expect(node.open.value).toBe(true);
    expect(node.lastOpenReason?.value).toBe("hover");
    expect(node.lastOpenEvent?.value).toBe(dummyEvent);

    // Reaffirming open state with another reason updates lastOpenReason / lastOpenEvent
    const clickEvent = new MouseEvent("click");
    node.setOpen(true, "anchor-click", clickEvent);
    expect(node.open.value).toBe(true);
    expect(node.lastOpenReason?.value).toBe("anchor-click");
    expect(node.lastOpenEvent?.value).toBe(clickEvent);

    // Closing resets lastOpenReason and lastOpenEvent to null
    node.setOpen(false, "escape-key");
    expect(node.open.value).toBe(false);
    expect(node.lastOpenReason?.value).toBeNull();
    expect(node.lastOpenEvent?.value).toBeNull();
  });

  it("resets lastOpenReason and lastOpenEvent when controlled open ref changes to false", async () => {
    const openRef = ref(true);
    let node!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: openRef,
      });
    });

    node.setOpen(true, "hover");
    expect(node.lastOpenReason?.value).toBe("hover");

    openRef.value = false;
    await nextTick();

    expect(node.lastOpenReason?.value).toBeNull();
    expect(node.lastOpenEvent?.value).toBeNull();
  });

  it("assigns each node a stable symbol id", () => {
    let node!: ReturnType<typeof useFloatingNode>;
    let otherNode!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      otherNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
    });

    expect(typeof node.id).toBe("symbol");
    expect(node.id).toBe(node.id);
    expect(node.id).not.toBe(otherNode.id);
  });

  it("closes descendant nodes from deepest to nearest child before closing the parent", () => {
    const calls: string[] = [];
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const grandchildOpen = ref(true);
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      root = useFloatingNode({
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
    });

    root.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(false);
    expect(grandchildOpen.value).toBe(false);
    expect(calls).toEqual(["grandchild", "child", "root"]);
  });

  it("does not open ancestors when opening a child node", () => {
    const rootOpen = ref(false);
    const childOpen = ref(false);
    let child!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      const root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentNode: root,
        open: childOpen,
      });
    });

    child.setOpen(true, "programmatic");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("does not cascade when a controlled parent ref is written directly", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);

    scope?.run(() => {
      const root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentNode: root,
        open: childOpen,
      });
    });

    rootOpen.value = false;

    expect(childOpen.value).toBe(true);
  });

  it("unregisters child node links on scope disposal", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
    });

    const localScope = effectScope();
    localScope.run(() => {
      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentNode: root,
        open: childOpen,
      });
    });

    localScope.stop();
    root.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("unregisters child node links from family helpers on scope disposal", () => {
    const rootFloatingEl = trackElement(document.createElement("div"));
    const childFloatingEl = trackElement(document.createElement("div"));
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(rootFloatingEl),
      });
    });

    const localScope = effectScope();
    localScope.run(() => {
      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
        parentNode: root,
      });
    });

    expect(floatingTree.getFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);

    localScope.stop();

    expect(floatingTree.getFloatingElements(root)).toEqual([rootFloatingEl]);
  });

  it("updates descendant floating element helpers when child nodes mount later", async () => {
    const rootFloatingEl = trackElement(document.createElement("div"));
    const childFloatingEl = trackElement(document.createElement("div"));
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      root = useFloatingNode({
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

      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
        parentNode: root,
      });
    });

    await nextTick();
    localScope.stop();

    expect(lengths).toEqual([1, 2]);
  });

  it("sets isRoot to true for root nodes and false for nested child nodes", () => {
    let root!: ReturnType<typeof useFloatingNode>;
    let child!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentNode: root,
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
