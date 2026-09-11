import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import type { OpenChangeReason } from "@/types";
import { useFloatingTree } from "./use-floating-tree";
import { clearTrackedElements, trackElement } from "@/test-utils";
import type { AnchorElement, FloatingElement, FloatingNode } from "./use-floating-node";

let scope: ReturnType<typeof effectScope> | undefined;

function createMockNode(
  overrides: Omit<Partial<FloatingNode>, "open"> & { open?: boolean } = {},
): FloatingNode {
  const { open: initialOpen = false, ...restOverrides } = overrides;
  const id = Symbol("mock-node");
  const open = ref(initialOpen);
  return {
    id,
    refs: {
      anchorEl: ref<AnchorElement>(null),
      floatingEl: ref<FloatingElement>(null),
      arrowEl: ref<HTMLElement | null>(null),
    },
    open,
    setOpen: vi.fn((value: boolean, _reason?: OpenChangeReason, _event?: Event) => {
      open.value = value;
    }),
    ...restOverrides,
  };
}

describe("useFloatingTree", () => {
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

  describe("registration", () => {
    it("adds nodes and links parent-child relationships by parent id", () => {
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child = createMockNode();

      tree.addNode(parent);
      tree.addNode(child, parent.id);

      expect(tree.getNode(parent.id)).toBe(parent);
      expect(tree.getNode(child.id)).toBe(child);
      expect(tree.getChildren(parent.id)).toEqual([child]);
      expect(tree.getDescendants(parent.id)).toEqual([child]);
      expect(tree.getParent(parent.id)).toBeUndefined();
      expect(tree.getParent(child.id)).toBe(parent);
    });

    it("removes a node and unlinks it from its parent", () => {
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child = createMockNode();

      tree.addNode(parent);
      tree.addNode(child, parent.id);

      expect(tree.getChildren(parent.id)).toHaveLength(1);

      tree.removeNode(child.id);

      expect(tree.getNode(child.id)).toBeUndefined();
      expect(tree.getChildren(parent.id)).toHaveLength(0);
      expect(tree.getParent(child.id)).toBeUndefined();
    });

    it("unregisters on scope disposal", () => {
      const tree = useFloatingTree();
      const parent = createMockNode();
      tree.addNode(parent);

      const localScope = effectScope();
      localScope.run(() => {
        const child = createMockNode();
        tree.addNode(child, parent.id);
      });

      expect(tree.getChildren(parent.id)).toHaveLength(1);

      localScope.stop();

      expect(tree.getChildren(parent.id)).toHaveLength(0);
    });

    it("traverses depth-first descendants across multi-level hierarchy", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();
      const grandchild = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      expect(tree.getDescendants(root.id)).toEqual([child, grandchild]);
    });

    it("keeps trees isolated from each other", () => {
      const firstTree = useFloatingTree();
      const secondTree = useFloatingTree();
      const firstRoot = createMockNode();
      const secondRoot = createMockNode();

      firstTree.addNode(firstRoot);
      secondTree.addNode(secondRoot);

      expect(firstTree.getNode(secondRoot.id)).toBeUndefined();
      expect(secondTree.getNode(firstRoot.id)).toBeUndefined();
      expect(firstTree.getDescendants(firstRoot.id)).toEqual([]);
      expect(secondTree.getDescendants(secondRoot.id)).toEqual([]);
    });
  });

  describe("deepest open traversal", () => {
    it("returns root node when no descendants are open", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.getDeepestOpenContext(root)).toBe(root);
    });

    it("returns deepest open descendant in a chain", () => {
      const tree = useFloatingTree();
      const root = createMockNode({ open: true });
      const child = createMockNode({ open: true });
      const grandchild = createMockNode({ open: true });

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      expect(tree.getDeepestOpenContext(root)).toBe(grandchild);
    });

    it("finds deepest open node across multiple branches", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const branchA1 = createMockNode({ open: true });
      const branchB1 = createMockNode({ open: true });
      const branchB2 = createMockNode({ open: true });

      tree.addNode(root);
      tree.addNode(branchA1, root.id);
      tree.addNode(branchB1, root.id);
      tree.addNode(branchB2, branchB1.id);

      expect(tree.getDeepestOpenContext(root)).toBe(branchB2);
    });
  });

  describe("dom containment and element queries", () => {
    it("identifies targets within anchor and floating elements", () => {
      const tree = useFloatingTree();
      const anchorEl = trackElement(document.createElement("button"));
      const floatingEl = trackElement(document.createElement("div"));
      const childEl = trackElement(document.createElement("span"));
      anchorEl.appendChild(childEl);

      const node = createMockNode();
      node.refs.anchorEl.value = anchorEl;
      node.refs.floatingEl.value = floatingEl;

      tree.addNode(node);

      expect(tree.isTargetWithin(node, childEl)).toBe(true);
      expect(tree.isTargetWithin(node, anchorEl)).toBe(true);
      expect(tree.isTargetWithin(node, floatingEl)).toBe(true);
      expect(tree.isTargetWithin(node, trackElement(document.createElement("div")))).toBe(false);
      expect(tree.isTargetWithin(node, null)).toBe(false);
    });

    it("identifies targets within descendant node elements", () => {
      const tree = useFloatingTree();
      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const childAnchor = trackElement(document.createElement("button"));
      const childFloating = trackElement(document.createElement("div"));

      const root = createMockNode();
      root.refs.anchorEl.value = rootAnchor;
      root.refs.floatingEl.value = rootFloating;

      const child = createMockNode();
      child.refs.anchorEl.value = childAnchor;
      child.refs.floatingEl.value = childFloating;

      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.isTargetWithin(root, childAnchor)).toBe(true);
      expect(tree.isTargetWithin(root, childFloating)).toBe(true);
    });

    it("handles virtual element anchors with and without contextElement", () => {
      const tree = useFloatingTree();
      const hostEl = trackElement(document.createElement("div"));
      const targetEl = trackElement(document.createElement("span"));
      hostEl.appendChild(targetEl);

      const node = createMockNode();
      node.refs.anchorEl.value = {
        getBoundingClientRect: () => hostEl.getBoundingClientRect(),
        contextElement: hostEl,
      } as unknown as AnchorElement;

      tree.addNode(node);

      expect(tree.isTargetWithin(node, targetEl)).toBe(true);

      node.refs.anchorEl.value = {
        getBoundingClientRect: () => hostEl.getBoundingClientRect(),
      };

      expect(tree.isTargetWithin(node, targetEl)).toBe(false);
    });

    it("collects mounted floating elements across hierarchy", () => {
      const tree = useFloatingTree();
      const rootFloatingEl = trackElement(document.createElement("div"));
      const childFloatingEl = trackElement(document.createElement("div"));

      const root = createMockNode();
      root.refs.floatingEl.value = rootFloatingEl;

      const child = createMockNode();
      child.refs.floatingEl.value = childFloatingEl;

      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.getFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);
    });

    it("recognizes focus guard elements adjacent to floating elements as within node", () => {
      const tree = useFloatingTree();
      const container = trackElement(document.createElement("div"));
      const startGuard = document.createElement("span");
      startGuard.setAttribute("data-vfloat-focus-guard", "start");
      const floatingEl = document.createElement("div");
      const endGuard = document.createElement("span");
      endGuard.setAttribute("data-vfloat-focus-guard", "end");
      const unrelatedGuard = document.createElement("span");
      unrelatedGuard.setAttribute("data-vfloat-focus-guard", "start");

      container.appendChild(startGuard);
      container.appendChild(floatingEl);
      container.appendChild(endGuard);
      container.appendChild(unrelatedGuard);
      document.body.appendChild(container);

      const node = createMockNode();
      node.refs.floatingEl.value = floatingEl;
      tree.addNode(node);

      expect(tree.isTargetWithin(node, startGuard)).toBe(true);
      expect(tree.isTargetWithin(node, endGuard)).toBe(true);
      expect(tree.isTargetWithin(node, unrelatedGuard)).toBe(false);
    });
  });

  describe("registration edge cases & warnings", () => {
    it("warns and rejects parent link when parent id is not registered (out-of-order registration)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child = createMockNode();

      tree.addNode(child, parent.id);

      // Falls back to root linkage without throwing
      expect(tree.getParent(child.id)).toBeUndefined();
      expect(tree.getDescendants(child.id)).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("parent node is not registered in the floating tree"),
      );

      warnSpy.mockRestore();
    });

    it("warns and prevents self-parenting", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const tree = useFloatingTree();
      const node = createMockNode();

      tree.addNode(node, node.id);

      expect(tree.getParent(node.id)).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith("[FloatingTree] A node cannot be its own parent.");

      warnSpy.mockRestore();
    });

    it("warns and preserves children on duplicate registration", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child = createMockNode();

      tree.addNode(parent);
      tree.addNode(child, parent.id);
      expect(tree.getChildren(parent.id)).toHaveLength(1);

      tree.addNode(parent);

      expect(tree.getChildren(parent.id)).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("is already registered in the floating tree"),
      );

      warnSpy.mockRestore();
    });
  });

  describe("forEach relationship traversal", () => {
    it("executes action on immediate parent or no-ops for roots", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);

      const parentVisited: FloatingNode[] = [];
      tree.forEach(child.id, "parent", (node) => {
        parentVisited.push(node);
      });
      expect(parentVisited).toEqual([root]);

      const rootParentVisited: FloatingNode[] = [];
      tree.forEach(root.id, "parent", (node) => {
        rootParentVisited.push(node);
      });
      expect(rootParentVisited).toEqual([]);
    });

    it("executes action on children in natural order and bottom-up order", () => {
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child1 = createMockNode();
      const child2 = createMockNode();

      tree.addNode(parent);
      tree.addNode(child1, parent.id);
      tree.addNode(child2, parent.id);

      const natural: FloatingNode[] = [];
      tree.forEach(parent, "children", (node) => {
        natural.push(node);
      });
      expect(natural).toEqual([child1, child2]);

      const reversed: FloatingNode[] = [];
      tree.forEach(
        parent.id,
        "children",
        (node) => {
          reversed.push(node);
        },
        { order: "bottom-up" },
      );
      expect(reversed).toEqual([child2, child1]);
    });

    it("executes action on siblings excluding target for both nested nodes and roots", () => {
      const tree = useFloatingTree();
      const root1 = createMockNode();
      const root2 = createMockNode();
      const root3 = createMockNode();
      const child1 = createMockNode();
      const child2 = createMockNode();

      tree.addNode(root1);
      tree.addNode(root2);
      tree.addNode(root3);
      tree.addNode(child1, root1.id);
      tree.addNode(child2, root1.id);

      const rootSiblings: FloatingNode[] = [];
      tree.forEach(root2.id, "siblings", (node) => {
        rootSiblings.push(node);
      });
      expect(rootSiblings).toEqual([root1, root3]);

      const childSiblings: FloatingNode[] = [];
      tree.forEach(child1.id, "siblings", (node) => {
        childSiblings.push(node);
      });
      expect(childSiblings).toEqual([child2]);
    });

    it("traverses ancestors defaulting to bottom-up (closest parent first) and top-down", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();
      const grandchild = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      const bottomUp: FloatingNode[] = [];
      tree.forEach(grandchild.id, "ancestors", (node) => {
        bottomUp.push(node);
      });
      expect(bottomUp).toEqual([child, root]);

      const topDown: FloatingNode[] = [];
      tree.forEach(
        grandchild.id,
        "ancestors",
        (node) => {
          topDown.push(node);
        },
        { order: "top-down" },
      );
      expect(topDown).toEqual([root, child]);
    });

    it("traverses descendants defaulting to top-down and bottom-up for cascading teardown", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode({ open: true });
      const grandchild = createMockNode({ open: true });

      const calls: string[] = [];
      child.setOpen = vi.fn((_open: boolean, reason?: OpenChangeReason) => {
        calls.push(`child:${reason}`);
      });
      grandchild.setOpen = vi.fn((_open: boolean, reason?: OpenChangeReason) => {
        calls.push(`grandchild:${reason}`);
      });

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      const topDown: FloatingNode[] = [];
      tree.forEach(root.id, "descendants", (node) => {
        topDown.push(node);
      });
      expect(topDown).toEqual([child, grandchild]);

      const event = new MouseEvent("pointerdown");
      tree.forEach(
        root.id,
        "descendants",
        (descendant) => {
          if (descendant.open.value) {
            descendant.setOpen(false, "outside-pointer", event);
          }
        },
        { order: "bottom-up" },
      );

      expect(calls).toEqual(["grandchild:outside-pointer", "child:outside-pointer"]);
      expect(grandchild.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
      expect(child.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
    });

    it("resolves the branch root node", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();
      const grandchild = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      const fromGrandchild: FloatingNode[] = [];
      tree.forEach(grandchild.id, "root", (node) => {
        fromGrandchild.push(node);
      });
      expect(fromGrandchild).toEqual([root]);

      const fromRoot: FloatingNode[] = [];
      tree.forEach(root.id, "root", (node) => {
        fromRoot.push(node);
      });
      expect(fromRoot).toEqual([root]);
    });

    it("supports a custom relationship resolver function", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child1 = createMockNode();
      const child2 = createMockNode();

      tree.addNode(root);
      tree.addNode(child1, root.id);
      tree.addNode(child2, root.id);

      const customVisited: FloatingNode[] = [];
      tree.forEach(
        root.id,
        (node, currentTree) => {
          return currentTree.getChildren(node.id).filter((_, idx) => idx === 1);
        },
        (matched) => {
          customVisited.push(matched);
        },
      );

      expect(customVisited).toEqual([child2]);
    });

    it("short-circuits traversal when action returns false", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child1 = createMockNode();
      const child2 = createMockNode();
      const child3 = createMockNode();

      tree.addNode(root);
      tree.addNode(child1, root.id);
      tree.addNode(child2, root.id);
      tree.addNode(child3, root.id);

      const visited: FloatingNode[] = [];
      tree.forEach(root.id, "children", (node) => {
        visited.push(node);
        if (node === child2) return false;
      });

      expect(visited).toEqual([child1, child2]);
    });

    it("safely handles unregistered target ids without throwing", () => {
      const tree = useFloatingTree();
      const unregId = Symbol("unregistered");
      let count = 0;

      expect(() => {
        tree.forEach(unregId, "descendants", () => {
          count++;
        });
      }).not.toThrow();

      expect(count).toBe(0);
    });
  });

  describe("node removal", () => {
    it("re-parents children to the grandparent when a middle node is removed", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();
      const grandchild = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      tree.removeNode(child.id);

      expect(tree.getNode(child.id)).toBeUndefined();
      expect(tree.getNode(grandchild.id)).toBe(grandchild);
      expect(tree.getChildren(root.id)).toEqual([grandchild]);
      expect(tree.getParent(grandchild.id)).toBe(root);
      expect(tree.getParent(child.id)).toBeUndefined();
    });

    it("promotes children to roots when the root node is removed", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();
      const grandchild = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      tree.removeNode(root.id);

      expect(tree.getNode(root.id)).toBeUndefined();
      expect(tree.getNode(child.id)).toBe(child);
      expect(tree.getNode(grandchild.id)).toBe(grandchild);
      expect(tree.getParent(child.id)).toBeUndefined();
      expect(tree.getDescendants(child.id)).toEqual([grandchild]);
      expect(tree.getChildren(child.id)).toEqual([grandchild]);
    });

    it("returns parent nodes and undefined for roots", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode();

      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.getParent(root.id)).toBeUndefined();
      expect(tree.getParent(child.id)).toBe(root);
      expect(tree.getParent(Symbol("missing"))).toBeUndefined();
    });
  });

  describe("shadow DOM containment", () => {
    it("detects targets within shadow DOM attached to floating elements and descendants", () => {
      const shadowHost = trackElement(document.createElement("div"));
      const shadowRoot = shadowHost.attachShadow({ mode: "open" });
      const shadowBtn = document.createElement("button");
      shadowRoot.appendChild(shadowBtn);

      const node = createMockNode();
      node.refs.floatingEl.value = shadowHost;

      const tree = useFloatingTree();
      tree.addNode(node);

      expect(tree.isTargetWithin(node, shadowBtn)).toBe(true);
    });

    it("detects targets within shadow DOM attached to descendant node elements", () => {
      const rootHost = trackElement(document.createElement("div"));
      const childHost = trackElement(document.createElement("div"));
      const childShadowRoot = childHost.attachShadow({ mode: "open" });
      const nestedTarget = document.createElement("span");
      childShadowRoot.appendChild(nestedTarget);

      const root = createMockNode();
      root.refs.floatingEl.value = rootHost;

      const child = createMockNode();
      child.refs.floatingEl.value = childHost;

      const tree = useFloatingTree();
      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.isTargetWithin(root, nestedTarget)).toBe(true);
    });
  });
});
