import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, effectScope, h, nextTick, ref, shallowRef } from "vue";
import { clearTrackedElements, trackElement } from "@/test-utils";
import { useEscapeKey } from "@/composables/escape-key";
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

  it("uses controlled open state when passed as ref", () => {
    const open = ref(false);
    let node!: ReturnType<typeof useFloatingNode>;

    scope?.run(() => {
      node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open,
      });
    });

    node.open.value = true;
    expect(open.value).toBe(true);

    open.value = false;
    expect(node.open.value).toBe(false);
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

    it("contains() terminates early when target is found without scanning subsequent branches", () => {
      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const child1Floating = trackElement(document.createElement("div"));
      const child2Floating = trackElement(document.createElement("div"));

      let root!: FloatingNode;
      let child1!: FloatingNode;
      let child2!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          defaultOpen: true,
        });
        child1 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(child1Floating),
          defaultOpen: true,
          parent: root,
        });
        child2 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(child2Floating),
          defaultOpen: true,
          parent: root,
        });
      });

      const child1TraverseSpy = vi.spyOn(child1, "traverse");
      const child2TraverseSpy = vi.spyOn(child2, "traverse");

      // Target in root: neither child is scanned
      expect(root.contains(rootFloating)).toBe(true);
      expect(child1TraverseSpy).not.toHaveBeenCalled();
      expect(child2TraverseSpy).not.toHaveBeenCalled();

      // Target in child1: child1 is scanned, child2 is NOT scanned
      expect(root.contains(child1Floating)).toBe(true);
      expect(child1TraverseSpy).toHaveBeenCalledTimes(1);
      expect(child2TraverseSpy).not.toHaveBeenCalled();
    });

    it("traverse() executes top-down (default) and prunes branches when returning 'skip'", () => {
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
      const completed = root.traverse((node, depth) => {
        fullVisited.push({ node, depth });
      });

      expect(completed).toBe(true);
      expect(fullVisited).toEqual([
        { node: root, depth: 0 },
        { node: childA, depth: 1 },
        { node: grandchildA, depth: 2 },
        { node: childB, depth: 1 },
      ]);

      // Pruning: skip childA's subtree but visit childB
      const prunedVisited: FloatingNode[] = [];
      const prunedResult = root.traverse((node) => {
        prunedVisited.push(node);
        if (node === childA) {
          return "skip";
        }
      });

      expect(prunedResult).toBe(true);
      expect(prunedVisited).toEqual([root, childA, childB]);
    });

    it("traverse() executes top-down and aborts globally when returning 'stop'", () => {
      let root!: FloatingNode;
      let childA!: FloatingNode;

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
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: childA,
        });
      });

      const visited: FloatingNode[] = [];
      const result = root.traverse((node) => {
        visited.push(node);
        if (node === childA) {
          return "stop";
        }
      });

      expect(result).toBe(false);
      // Aborted at childA: neither grandchildA nor childB is visited
      expect(visited).toEqual([root, childA]);
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
      const result = root.traverse(
        (node, depth) => {
          visited.push({ node, depth });
        },
        { order: "bottom-up" },
      );

      expect(result).toBe(true);
      expect(visited).toEqual([
        { node: grandchild, depth: 2 },
        { node: child, depth: 1 },
        { node: root, depth: 0 },
      ]);
    });

    it("traverse() executes bottom-up and aborts globally when returning 'stop'", () => {
      let root!: FloatingNode;
      let grandchildA!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
        const childA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
        });
        useFloatingNode({
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

      const visited: FloatingNode[] = [];
      const result = root.traverse(
        (node) => {
          visited.push(node);
          if (node === grandchildA) {
            return "stop";
          }
        },
        { order: "bottom-up" },
      );

      expect(result).toBe(false);
      // Aborted at grandchildA: childA, childB, and root are not visited
      expect(visited).toEqual([grandchildA]);
    });

    it("traverse() treats 'skip' as safe no-op in bottom-up order", () => {
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

      const visited: FloatingNode[] = [];
      const result = root.traverse(
        (node) => {
          visited.push(node);
          if (node === grandchild) {
            return "skip";
          }
        },
        { order: "bottom-up" },
      );

      expect(result).toBe(true);
      expect(visited).toEqual([grandchild, child, root]);
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
          if (!current.open.value) return "skip";
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

          useEscapeKey(root);
          useEscapeKey(child);
          useEscapeKey(grandchild);

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
  });

  describe("Criterion 7: Implicit registration via Dependency Injection (DI)", () => {
    it("implicitly registers child component node under parent component node when parent is omitted", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          parentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      await render(ParentComponent);

      expect(childNode.parent.value).toBe(parentNode);
      expect(parentNode.children.value.has(childNode)).toBe(true);
    });

    it("supports multi-level hierarchical chaining (Grandparent -> Parent -> Child) via DI", async () => {
      let gpNode!: FloatingNode;
      let pNode!: FloatingNode;
      let cNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          cNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          pNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      const GrandparentComponent = defineComponent({
        setup() {
          gpNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "grandparent" }, [h(ParentComponent)]);
        },
      });

      await render(GrandparentComponent);

      expect(pNode.parent.value).toBe(gpNode);
      expect(cNode.parent.value).toBe(pNode);
      expect(gpNode.children.value.has(pNode)).toBe(true);
      expect(pNode.children.value.has(cNode)).toBe(true);
      expect(gpNode.children.value.has(cNode)).toBe(false);
    });

    it("bypasses DI and creates standalone node when parent: null is explicitly passed", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: null,
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          parentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      await render(ParentComponent);

      expect(childNode.parent.value).toBeNull();
      expect(parentNode.children.value.has(childNode)).toBe(false);
    });

    it("overrides DI parent when an explicit parent node is passed", async () => {
      let parentNode!: FloatingNode;
      let externalNode!: FloatingNode;
      let childNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: externalNode,
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          parentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          externalNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: null,
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      await render(ParentComponent);

      expect(childNode.parent.value).toBe(externalNode);
      expect(externalNode.children.value.has(childNode)).toBe(true);
      expect(parentNode.children.value.has(childNode)).toBe(false);
    });

    it("detaches child from injected parent when child component is unmounted", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;
      const showChild = ref(true);

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          parentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () =>
            h("div", { "data-testid": "parent" }, [showChild.value ? h(ChildComponent) : null]);
        },
      });

      await render(ParentComponent);

      expect(parentNode.children.value.size).toBe(1);
      expect(childNode.parent.value).toBe(parentNode);

      showChild.value = false;
      await nextTick();

      expect(parentNode.children.value.size).toBe(0);
      expect(childNode.parent.value).toBeNull();
    });

    it("clears child parent reference when parent component is unmounted", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;
      const showParent = ref(true);

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          parentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      const RootComponent = defineComponent({
        setup() {
          return () =>
            h("div", { "data-testid": "root" }, [showParent.value ? h(ParentComponent) : null]);
        },
      });

      await render(RootComponent);

      expect(childNode.parent.value).toBe(parentNode);

      showParent.value = false;
      await nextTick();

      expect(childNode.parent.value).toBeNull();
    });

    it("operates cleanly as standalone root when called outside component context (e.g. effectScope)", () => {
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
  });

  describe("Criterion 7: Cascade close behavior", () => {
    it("cascades open: false to all open descendants by default", async () => {
      const rootOpen = ref(true);
      const childOpen = ref(true);
      const grandchildOpen = ref(true);

      let root!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
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
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: grandchildOpen,
          parent: child,
        });
      });

      expect(root.open.value).toBe(true);
      expect(childOpen.value).toBe(true);
      expect(grandchildOpen.value).toBe(true);

      rootOpen.value = false;
      await nextTick();

      expect(childOpen.value).toBe(false);
      expect(grandchildOpen.value).toBe(false);
    });

    it("does not cascade open: false when cascadeClose is false", async () => {
      const rootOpen = ref(true);
      const childOpen = ref(true);

      let root!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: rootOpen,
          cascadeClose: false,
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: childOpen,
          parent: root,
        });
      });

      rootOpen.value = false;
      await nextTick();

      expect(root.open.value).toBe(false);
      expect(childOpen.value).toBe(true);
    });

    it("safely handles non-writable or readonly descendant open refs without throwing", async () => {
      const rootOpen = ref(true);
      const readonlyChildOpen = {
        get value() {
          return true;
        },
        set value(_val: boolean) {
          throw new Error("Readonly ref cannot be mutated");
        },
      } as any;

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: rootOpen,
        });
        useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: readonlyChildOpen,
          parent: root,
        });
      });

      expect(() => {
        rootOpen.value = false;
      }).not.toThrow();

      await nextTick();
      expect(rootOpen.value).toBe(false);
    });
  });
});
