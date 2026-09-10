import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref, watchEffect } from "vue";
import { clearTrackedElements, trackElement } from "@/test-utils";
import { useFloatingTree } from "./use-floating-tree";
import { floatingInternals, useFloatingNode } from "./use-floating-node";

let scope: ReturnType<typeof effectScope> | undefined;

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

  it("creates standalone nodes with a null tree and root status", () => {
    let node!: ReturnType<typeof useFloatingNode>;
    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
    });

    expect(node.tree).toBeNull();
    expect(node.isRoot).toBe(true);
  });

  it("closes without cascading when standalone without a tree", () => {
    let node!: ReturnType<typeof useFloatingNode>;
    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        defaultOpen: true,
      });
    });

    expect(() => node.setOpen(false, "outside-pointer")).not.toThrow();
    expect(node.open.value).toBe(false);
  });

  it("closes descendant nodes from deepest to nearest child before closing the parent", () => {
    const calls: string[] = [];
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const grandchildOpen = ref(true);
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      const tree = useFloatingTree();
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
        onOpenChange: () => calls.push("root"),
      });
      const child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: childOpen,
        onOpenChange: () => calls.push("child"),
      });
      const grandchild = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: grandchildOpen,
        onOpenChange: () => calls.push("grandchild"),
      });
      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);
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
      const tree = useFloatingTree();
      const root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: childOpen,
      });
      tree.addNode(root);
      tree.addNode(child, root.id);
    });

    child.setOpen(true, "programmatic");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("does not cascade when a controlled parent ref is written directly", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);

    scope?.run(() => {
      const tree = useFloatingTree();
      const root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      const child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: childOpen,
      });
      tree.addNode(root);
      tree.addNode(child, root.id);
    });

    rootOpen.value = false;

    expect(childOpen.value).toBe(true);
  });

  it("unregisters child node links on scope disposal", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      const tree = useFloatingTree();
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: rootOpen,
      });
      tree.addNode(root);

      const localScope = effectScope();
      localScope.run(() => {
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: childOpen,
        });
        tree.addNode(child, root.id);
      });

      localScope.stop();
    });

    root.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("unregisters child node links from family helpers on scope disposal", () => {
    const rootFloatingEl = trackElement(document.createElement("div"));
    const childFloatingEl = trackElement(document.createElement("div"));
    let root!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      const tree = useFloatingTree();
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(rootFloatingEl),
      });
      tree.addNode(root);

      const localScope = effectScope();
      localScope.run(() => {
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(childFloatingEl),
        });
        tree.addNode(child, root.id);
      });

      expect(tree.getFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);

      localScope.stop();

      expect(tree.getFloatingElements(root)).toEqual([rootFloatingEl]);
    });
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
      const tree = useFloatingTree();
      tree.addNode(root);
      watchEffect(() => {
        lengths.push(tree.getFloatingElements(root).length);
      });

      const child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
      });
      tree.addNode(child, root.id);
    });

    await nextTick();
    localScope.stop();

    expect(lengths).toEqual([1, 2]);
  });

  it("sets isRoot to true for standalone nodes and false once added under a parent id", () => {
    let root!: ReturnType<typeof useFloatingNode>;
    let child!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      const tree = useFloatingTree();
      root = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      child = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      tree.addNode(root);
      tree.addNode(child, root.id);
    });

    expect(root.isRoot).toBe(true);
    expect(child.isRoot).toBe(false);
  });
});

describe("floatingInternals", () => {
  it("attaches and retrieves internal state on a symbol target", () => {
    const target = Symbol("test-target");
    const dummyInternals = {
      middlewareRegistry: {
        middlewares: computed(() => []),
        register: vi.fn(),
      },
      placement: ref("bottom" as const),
      middlewareData: ref({}),
    };

    expect(floatingInternals.get(target)).toBeUndefined();

    floatingInternals.set(target, dummyInternals);
    expect(floatingInternals.get(target)).toBe(dummyInternals);

    floatingInternals.delete(target);
  });

  it("exposes a shared WeakMap singleton", () => {
    expect(floatingInternals).toBeInstanceOf(WeakMap);
  });
});
