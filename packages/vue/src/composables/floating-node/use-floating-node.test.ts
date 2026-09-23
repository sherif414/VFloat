import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, effectScope, h, nextTick, ref } from "vue";
import { clearTrackedElements, trackElement } from "@/test-utils";
import { useEscapeKey } from "@/composables/escape-key";
import { type FloatingNode, useFloatingNode } from "./use-floating-node";

let scope: ReturnType<typeof effectScope> | undefined;

describe("Feature: useFloatingNode composite tree orchestration", () => {
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

  describe("Scenario: Node creation and controlled open state", () => {
    it("Given omitted open option, When node is initialized, Then open state defaults to false", () => {
      let node!: ReturnType<typeof useFloatingNode>;
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
      });

      expect(node.open.value).toBe(false);
    });

    it("Given open: ref(true) option, When node is initialized, Then open state initializes to true", () => {
      let node!: ReturnType<typeof useFloatingNode>;
      scope?.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: ref(true),
        });
      });

      expect(node.open.value).toBe(true);
    });

    it("Given a controlled open ref, When node open or source ref changes, Then state synchronizes bi-directionally", () => {
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

    it("Given multiple floating nodes, When initialized, Then each node is assigned a unique stable symbol id", () => {
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
  });

  describe("Scenario: Standalone composite node (N = 0)", () => {
    it("Given a standalone node, When initialized, Then parent is null and children set is empty", () => {
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

    it("Given a standalone node with elements, When contains is checked, Then it delegates to DOM containment of anchor and floating elements", () => {
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
          open: ref(true),
        });
      });

      expect(node.contains(anchorEl)).toBe(true);
      expect(node.contains(insideAnchor)).toBe(true);
      expect(node.contains(floatingEl)).toBe(true);
      expect(node.contains(insideFloating)).toBe(true);
      expect(node.contains(outsideEl)).toBe(false);
      expect(node.contains(null)).toBe(false);
    });

    it("Given a standalone node, When traverse is called, Then it visits the node with depth 0", () => {
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

  describe("Scenario: Single-component nested hierarchy via parent option and traversal algorithms", () => {
    it("Given root and child nodes with parent option, When initialized, Then parent-child relationship is established declaratively", () => {
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

    it("Given a parent and child node, When contains is checked, Then it includes open descendant elements but ignores closed descendant elements", () => {
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
          open: ref(true),
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

    it("Given a tree with multiple branches, When target element matches in an early branch, Then contains terminates early without scanning subsequent branches", () => {
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
          open: ref(true),
        });
        child1 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(child1Floating),
          open: ref(true),
          parent: root,
        });
        child2 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(child2Floating),
          open: ref(true),
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

    it("Given a nested tree, When traverse executes top-down and returns 'skip', Then it prunes that branch and visits remaining branches", () => {
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

    it("Given a nested tree, When traverse executes top-down and returns 'stop', Then it aborts traversal globally", () => {
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

    it("Given a nested tree, When traverse executes bottom-up, Then it visits leaves before parents", () => {
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

    it("Given a nested tree, When traverse executes bottom-up and returns 'stop', Then it aborts traversal globally", () => {
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

    it("Given a nested tree, When traverse executes bottom-up and returns 'skip', Then it treats 'skip' as a safe no-op", () => {
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

    it("Given an open nested tree, When traverse collects active elements, Then it accumulates floating elements across open branches", () => {
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
          open: ref(true),
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

    it("Given detached nodes, When appendChild and removeChild are called, Then it supports switching parent node imperatively", () => {
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
        child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root1,
        });
      });

      expect(child.parent.value).toBe(root1);
      expect(root1.children.value.has(child)).toBe(true);
      expect(root2.children.value.has(child)).toBe(false);

      // Re-parent to root2 imperatively
      root2.appendChild(child);

      expect(child.parent.value).toBe(root2);
      expect(root1.children.value.has(child)).toBe(false);
      expect(root2.children.value.has(child)).toBe(true);

      // Detach imperatively
      root2.removeChild(child);

      expect(child.parent.value).toBeNull();
      expect(root2.children.value.has(child)).toBe(false);
    });
  });

  describe("Scenario: Multi-component prop-driven nested submenus", () => {
    it("Given a parent component, When child component mounts with :parent prop, Then it registers in parent.children and unregisters on unmount", async () => {
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
            parent: props.parent,
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
            open: ref(true),
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

  describe("Scenario: Leaf-first Escape key dismissal", () => {
    it("Given a nested open stack with escape listeners, When Escape key is pressed sequentially, Then it unwinds layer-by-layer from deepest leaf to root", async () => {
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

  describe("Scenario: Teardown and unmount cleanup", () => {
    it("Given a child node, When its effect scope is disposed, Then it detaches from its parent", () => {
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

    it("Given a parent node with children, When its effect scope is disposed, Then it clears all children linkages", () => {
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

  describe("Scenario: Edge cases and cycle/self-parenting prevention", () => {
    it("Given a node, When attempting to append node to itself, Then it warns and ignores the operation", () => {
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

    it("Given an ancestor and child node, When attempting to append ancestor as child, Then it warns and ignores circular references", () => {
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

    it("Given an already linked child node, When appendChild is called again, Then the operation is idempotent", () => {
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

    it("Given a non-child node, When removeChild is called, Then it safely ignores the call without throwing", () => {
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

    it("Given null or undefined parent option, When node is initialized, Then it handles the options gracefully without error", () => {
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

    it("Given sibling branches, When traverse is executed, Then it visits sibling branches in insertion order", () => {
      let root!: FloatingNode;
      let branchA!: FloatingNode;
      let branchB!: FloatingNode;

      scope?.run(() => {
        root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: ref(true),
        });
        branchA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
          open: ref(true),
        });
        branchB = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: root,
          open: ref(true),
        });
      });

      const visited: FloatingNode[] = [];
      root.traverse((node) => {
        visited.push(node);
      });

      expect(visited).toEqual([root, branchA, branchB]);
    });
  });

  describe("Scenario: Standalone-by-default and opt-in Dependency Injection (DI)", () => {
    it("Given an ancestor providing a node, When child omits parent option, Then child remains standalone and does not auto-adopt", async () => {
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

      expect(childNode.parent.value).toBeNull();
      expect(parentNode.children.value.has(childNode)).toBe(false);
      expect(parentNode.children.value.size).toBe(0);
    });

    it("Given an ancestor providing a node, When child specifies parent: 'auto', Then child implicitly registers under ancestor", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
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

    it("Given a 3-level component tree with parent: 'auto', When mounted, Then it forms a multi-level hierarchical chain", async () => {
      let gpNode!: FloatingNode;
      let pNode!: FloatingNode;
      let cNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          cNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          pNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
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

    it("Given an application root tooltip, When descendant floating elements mount, Then root tooltip does not adopt them", async () => {
      let appTooltipNode!: FloatingNode;
      let childDropdownNode!: FloatingNode;
      let childModalNode!: FloatingNode;

      const ChildDropdown = defineComponent({
        setup() {
          childDropdownNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: ref(true),
          });
          return () => h("div", { "data-testid": "dropdown" });
        },
      });

      const ChildModal = defineComponent({
        setup() {
          childModalNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: ref(true),
          });
          return () => h("div", { "data-testid": "modal" });
        },
      });

      const AppComponent = defineComponent({
        setup() {
          appTooltipNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: ref(true),
          });
          return () => h("div", { "data-testid": "app" }, [h(ChildDropdown), h(ChildModal)]);
        },
      });

      await render(AppComponent);

      expect(appTooltipNode.children.value.size).toBe(0);
      expect(childDropdownNode.parent.value).toBeNull();
      expect(childModalNode.parent.value).toBeNull();

      // Verify that closing the app-level tooltip has zero cascade impact on child surfaces
      appTooltipNode.open.value = false;
      await nextTick();

      expect(childDropdownNode.open.value).toBe(true);
      expect(childModalNode.open.value).toBe(true);
    });

    it("Given an ancestor providing a node, When child passes parent: null, Then child bypasses DI and stays standalone", async () => {
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

    it("Given an ancestor providing a node, When child passes an explicit parent node, Then it overrides the DI parent", async () => {
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

    it("Given a child registered via DI, When child unmounts, Then it detaches from injected parent", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;
      const showChild = ref(true);

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
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

    it("Given a parent registered via DI, When parent unmounts, Then child's parent reference is cleared", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;
      const showParent = ref(true);

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
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

    it("Given parent: 'auto' without an ancestor FloatingNode, When mounted, Then it warns in DEV and stays standalone", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      let node!: FloatingNode;

      const IsolatedComponent = defineComponent({
        setup() {
          node = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
          });
          return () => h("div", { "data-testid": "isolated" });
        },
      });

      await render(IsolatedComponent);

      expect(node.parent.value).toBeNull();
      expect(node.children.value.size).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        "[FloatingNode] parent: 'auto' was specified, but no ancestor FloatingNode was found in the Vue component hierarchy. The node will remain standalone.",
      );

      warnSpy.mockRestore();
    });

    it("Given provide: false on parent node, When child specifies parent: 'auto', Then child does not adopt the parent", async () => {
      let parentNode!: FloatingNode;
      let childNode!: FloatingNode;

      const ChildComponent = defineComponent({
        setup() {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: "auto",
          });
          return () => h("div", { "data-testid": "child" });
        },
      });

      const ParentComponent = defineComponent({
        setup() {
          parentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            provide: false,
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      await render(ParentComponent);

      expect(parentNode.parent.value).toBeNull();
      expect(childNode.parent.value).toBeNull();
      expect(parentNode.children.value.has(childNode)).toBe(false);
    });

    it("Given an effectScope outside component context, When node is initialized, Then it operates cleanly as standalone root", () => {
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
});
