import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, effectScope, h, nextTick, ref, shallowRef } from "vue";
import { clearTrackedElements, trackElement } from "@/test-utils";
import { useDismiss } from "@/composables/dismiss/use-dismiss";
import { type FloatingNode, useFloatingNode } from "./use-floating-node";

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

  it("clears lastOpenReason synchronously after an externally-driven controlled close", () => {
    // Regression test: reason/event are derived from open state, so a
    // synchronous read after writing the controlled ref never sees stale metadata.
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

  describe("Criterion 1: Standalone composite node (N = 0)", () => {
    it("initializes with null parent and empty children set", () => {
      let node!: FloatingNode;
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
      });

      expect(node.parent.value).toBeNull();
      expect(node.children.value.size).toBe(0);
    });

    it("contains() delegates to DOM containment of anchorEl and floatingEl", () => {
      const anchorEl = trackElement(document.createElement("button"));
      const floatingEl = trackElement(document.createElement("div"));
      const insideAnchor = trackElement(document.createElement("span"));
      anchorEl.appendChild(insideAnchor);
      const insideFloating = trackElement(document.createElement("p"));
      floatingEl.appendChild(insideFloating);
      const outsideEl = trackElement(document.createElement("div"));

      let node!: FloatingNode;
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(anchorEl),
          floatingEl: ref(floatingEl),
          defaultOpen: true,
        });
      });

      expect(node.contains(anchorEl)).toBe(true);
      expect(node.contains(insideAnchor)).toBe(true);
      expect(node.contains(floatingEl)).toBe(true);
      expect(node.contains(insideFloating)).toBe(true);
      expect(node.contains(outsideEl)).toBe(false);
      expect(node.contains(null)).toBe(false);
    });

    it("traverse() visits standalone node with depth 0", () => {
      let node!: FloatingNode;
      const visited: { node: FloatingNode; depth: number }[] = [];

      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
      });

      node.traverse((current, depth) => {
        visited.push({ node: current, depth });
      });

      expect(visited).toEqual([{ node, depth: 0 }]);
    });

    it("closeDescendants() is a safe no-op on a standalone node", () => {
      let node!: FloatingNode;
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          defaultOpen: true,
        });
      });

      expect(() => node.closeDescendants()).not.toThrow();
      expect(node.open.value).toBe(true);
    });
  });

  describe("Criterion 2: Single-component nested hierarchy via parent option", () => {
    it("establishes parent-child relationship declaratively and updates refs", () => {
      let root!: FloatingNode;
      let child!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
      });

      expect(child.parent.value).toBe(root);
      expect(root.children.value.has(child)).toBe(true);
    });

    it("contains() includes open descendant elements but ignores closed descendant elements", () => {
      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const childAnchor = trackElement(document.createElement("button"));
      const childFloating = trackElement(document.createElement("div"));
      const childOpen = ref(false);

      let root!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          defaultOpen: true,
        });
        useFloatingNode({
          anchorEl: ref(childAnchor),
          floatingEl: ref(childFloating),
          open: childOpen,
          parent: root,
        });
      });

      // When child is closed, root does NOT consider childFloating inside root
      expect(root.contains(childFloating)).toBe(false);

      // When child opens, child elements are contained within root
      childOpen.value = true;
      expect(root.contains(childAnchor)).toBe(true);
      expect(root.contains(childFloating)).toBe(true);
    });

    it("traverse() executes top-down (default) and prunes branches when returning false", () => {
      let root!: FloatingNode;
      let childA!: FloatingNode;
      let childB!: FloatingNode;
      let grandchildA!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        childA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
        childB = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
        grandchildA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: childA,
        });
      });

      // Full top-down traversal
      const fullVisited: { node: FloatingNode; depth: number }[] = [];
      root.traverse((node, depth) => {
        fullVisited.push({ node, depth });
      });

      expect(fullVisited).toEqual([
        { node: root, depth: 0 },
        { node: childA, depth: 1 },
        { node: grandchildA, depth: 2 },
        { node: childB, depth: 1 },
      ]);

      // Pruning: skip childA's subtree
      const prunedVisited: FloatingNode[] = [];
      root.traverse((node) => {
        prunedVisited.push(node);
        if (node === childA) {
          return false;
        }
      });

      expect(prunedVisited).toEqual([root, childA, childB]);
    });

    it("traverse() executes bottom-up (post-order) visiting leaves before parents", () => {
      let root!: FloatingNode;
      let child!: FloatingNode;
      let grandchild!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
        grandchild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: child,
        });
      });

      const visited: { node: FloatingNode; depth: number }[] = [];
      root.traverse(
        (node, depth) => {
          visited.push({ node, depth });
        },
        { order: "bottom-up" },
      );

      expect(visited).toEqual([
        { node: grandchild, depth: 2 },
        { node: child, depth: 1 },
        { node: root, depth: 0 },
      ]);
    });

    it("traverse() allows consumers to collect active floating elements across open branches", () => {
      const rootFloating = trackElement(document.createElement("div"));
      const childFloating = trackElement(document.createElement("div"));
      const grandchildFloating = trackElement(document.createElement("div"));
      const childOpen = ref(true);
      const grandchildOpen = ref(false);

      let root!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(rootFloating),
          defaultOpen: true,
        });
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(childFloating),
          open: childOpen,
          parent: root,
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(grandchildFloating),
          open: grandchildOpen,
          parent: child,
        });
      });

      const collectFloatingElements = (startNode: FloatingNode): HTMLElement[] => {
        const elements: HTMLElement[] = [];
        startNode.traverse((current) => {
          if (!current.open.value) return false;
          const el = current.refs.floatingEl.value;
          if (el) {
            elements.push(el);
          }
        });
        return elements;
      };

      expect(collectFloatingElements(root)).toEqual([rootFloating, childFloating]);

      grandchildOpen.value = true;
      expect(collectFloatingElements(root)).toEqual([
        rootFloating,
        childFloating,
        grandchildFloating,
      ]);

      childOpen.value = false;
      expect(collectFloatingElements(root)).toEqual([rootFloating]);
    });

    it("closeDescendants() closes all active descendants bottom-up without closing the root", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const childOpen = ref(true);
      const grandchildOpen = ref(true);

      let root!: FloatingNode;

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
          open: childOpen,
          parent: root,
          onOpenChange: (val) => {
            childOpen.value = val;
            calls.push("child");
          },
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: grandchildOpen,
          parent: child,
          onOpenChange: (val) => {
            grandchildOpen.value = val;
            calls.push("grandchild");
          },
        });
      });

      root.closeDescendants("outside-pointer");

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["grandchild", "child"]);
    });

    it("supports dynamically switching parent node via reactive ref", async () => {
      const parentA = shallowRef<FloatingNode | null>(null);
      let child!: FloatingNode;
      let root1!: FloatingNode;
      let root2!: FloatingNode;

      scope?.run(() => {
        root1 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        root2 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        parentA.value = root1;
        child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: parentA,
        });
      });

      expect(child.parent.value).toBe(root1);
      expect(root1.children.value.has(child)).toBe(true);
      expect(root2.children.value.has(child)).toBe(false);

      parentA.value = root2;
      await nextTick();

      expect(child.parent.value).toBe(root2);
      expect(root1.children.value.has(child)).toBe(false);
      expect(root2.children.value.has(child)).toBe(true);

      parentA.value = null;
      await nextTick();

      expect(child.parent.value).toBeNull();
      expect(root2.children.value.has(child)).toBe(false);
    });
  });

  describe("Criterion 3: Multi-component prop-driven nested submenus", () => {
    it("registers child into parent.children when child component mounts with :parent prop and cleans up on unmount", async () => {
      let rootNode!: FloatingNode;
      let childNodeRef: FloatingNode | null = null;
      const showChild = ref(true);

      const ChildComponent = defineComponent({
        props: {
          parent: {
            type: Object as () => FloatingNode,
            required: true,
          },
        },
        setup(props) {
          const anchorEl = ref<HTMLElement | null>(null);
          const floatingEl = ref<HTMLElement | null>(null);
          const childNode = useFloatingNode({
            anchorEl,
            floatingEl,
            parent: () => props.parent,
          });
          childNodeRef = childNode;
          return () => h("div", { ref: floatingEl }, "Child Menu");
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          const anchorEl = ref<HTMLElement | null>(null);
          const floatingEl = ref<HTMLElement | null>(null);
          rootNode = useFloatingNode({
            anchorEl,
            floatingEl,
            defaultOpen: true,
          });

          return () =>
            h("div", [
              h("div", { ref: floatingEl }, "Root Menu"),
              showChild.value ? h(ChildComponent, { parent: rootNode }) : null,
            ]);
        },
      });

      await render(ParentComponent);

      expect(rootNode.children.value.has(childNodeRef!)).toBe(true);
      expect(childNodeRef!.parent.value).toBe(rootNode);

      // Unmount child component
      showChild.value = false;
      await nextTick();

      expect(rootNode.children.value.has(childNodeRef!)).toBe(false);
      expect(childNodeRef!.parent.value).toBeNull();
    });
  });

  describe("Criterion 4: Leaf-first Escape key dismissal", () => {
    it("unwinds nested stack layer-by-layer from deepest leaf to root on Escape key", async () => {
      const rootOpen = ref(true);
      const childOpen = ref(true);
      const grandchildOpen = ref(true);

      const HierarchyComponent = defineComponent({
        setup() {
          const root = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: rootOpen,
          });
          const child = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: childOpen,
            parent: root,
          });
          const grandchild = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: grandchildOpen,
            parent: child,
          });

          useDismiss(root);
          useDismiss(child);
          useDismiss(grandchild);

          return () => h("div", "Hierarchy");
        },
      });

      await render(HierarchyComponent);

      // 1st Escape: Closes grandchild only
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);

      // 2nd Escape: Closes child only
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);

      // 3rd Escape: Closes root
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(false);
    });
  });

  describe("Criterion 5: Teardown and unmount cleanup", () => {
    it("detaches from parent upon scope disposal of child node", () => {
      let root!: FloatingNode;
      let child!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });

        const childScope = effectScope();
        childScope.run(() => {
          child = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: root,
          });
        });

        expect(root.children.value.has(child)).toBe(true);
        expect(child.parent.value).toBe(root);

        childScope.stop();

        expect(root.children.value.has(child)).toBe(false);
        expect(child.parent.value).toBeNull();
      });
    });

    it("clears all children linkages upon scope disposal of parent node", () => {
      let child1!: FloatingNode;
      let child2!: FloatingNode;

      const parentScope = effectScope();
      parentScope.run(() => {
        const parent = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });

        scope?.run(() => {
          child1 = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent,
          });
          child2 = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent,
          });
        });

        expect(parent.children.value.size).toBe(2);
        expect(child1.parent.value).toBe(parent);
        expect(child2.parent.value).toBe(parent);
      });

      parentScope.stop();

      expect(child1.parent.value).toBeNull();
      expect(child2.parent.value).toBeNull();
    });
  });

  describe("Criterion 6: Edge cases & cycle/self-parenting prevention", () => {
    it("warns and ignores when attempting to append node to itself", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      let node!: FloatingNode;
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
      });

      node.appendChild(node);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("cannot be its own parent"));
      expect(node.parent.value).toBeNull();
      expect(node.children.value.has(node)).toBe(false);

      warnSpy.mockRestore();
    });

    it("warns and ignores circular references when appending an ancestor as child", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      let root!: FloatingNode;
      let child!: FloatingNode;
      let grandchild!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
        grandchild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: child,
        });
      });

      // Attempting to append root as child of grandchild creates a cycle
      grandchild.appendChild(root);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("cycle detected"));
      expect(grandchild.children.value.has(root)).toBe(false);
      expect(root.parent.value).toBeNull();

      warnSpy.mockRestore();
    });

    it("appendChild is idempotent when child is already linked", () => {
      let root!: FloatingNode;
      let child!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
      });

      expect(root.children.value.size).toBe(1);

      root.appendChild(child);
      expect(root.children.value.size).toBe(1);
    });

    it("removeChild safely ignores non-child nodes", () => {
      let root!: FloatingNode;
      let stranger!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        stranger = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
      });

      expect(() => root.removeChild(stranger)).not.toThrow();
      expect(root.children.value.size).toBe(0);
    });

    it("handles null and undefined parent option without error", () => {
      let nodeNull!: FloatingNode;
      let nodeUndefined!: FloatingNode;

      scope?.run(() => {
        nodeNull = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: null,
        });
        nodeUndefined = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: undefined,
        });
      });

      expect(nodeNull.parent.value).toBeNull();
      expect(nodeUndefined.parent.value).toBeNull();
    });

    it("visits sibling branches in insertion order during traverse()", () => {
      let root!: FloatingNode;
      let branchA!: FloatingNode;
      let branchB!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          defaultOpen: true,
        });
        branchA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
          defaultOpen: true,
        });
        branchB = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
          defaultOpen: true,
        });
      });

      const visited: FloatingNode[] = [];
      root.traverse((node) => {
        visited.push(node);
      });

      expect(visited).toEqual([root, branchA, branchB]);
    });

    it("closeDescendants() safely handles child unlinking during setOpen invocation", () => {
      let root!: FloatingNode;
      let child1!: FloatingNode;
      let child2!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          defaultOpen: true,
        });
        child1 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
          defaultOpen: true,
          onOpenChange: (open) => {
            if (!open) {
              // Simulate reactive component teardown unlinking child1 from root
              root.removeChild(child1);
            }
          },
        });
        child2 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
          defaultOpen: true,
        });
      });

      expect(() => root.closeDescendants()).not.toThrow();
      expect(child1.open.value).toBe(false);
      expect(child2.open.value).toBe(false);
      expect(root.children.value.has(child1)).toBe(false);
      expect(root.children.value.has(child2)).toBe(true);
    });
  });
});
