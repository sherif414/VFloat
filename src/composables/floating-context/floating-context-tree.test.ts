import { describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { FloatingTree, FloatingTreeNode, floatingTree } from "./floating-context-tree";
import type { FloatingContext } from "./use-floating-context";

function createMockContext(
  overrides: Partial<FloatingContext> & { open?: boolean } = {},
): FloatingContext {
  const { open: initialOpen = false, ...restOverrides } = overrides;
  const id = Symbol("mock-context");
  const open = ref(initialOpen);
  return {
    id,
    refs: {
      anchorEl: ref(null),
      floatingEl: ref(null),
      arrowEl: ref(null),
    },
    state: {
      open,
      setOpen: vi.fn((value: boolean) => {
        open.value = value;
      }),
    },
    isRoot: true,
    ...restOverrides,
  };
}

describe("FloatingTree & FloatingTreeNode", () => {
  describe("FloatingTreeNode", () => {
    it("adds and removes child IDs reactively", () => {
      const context = createMockContext();
      const node = new FloatingTreeNode(context);
      const childId = Symbol("child");

      expect(node.childIds.value.has(childId)).toBe(false);

      node.addChild(childId);
      expect(node.childIds.value.has(childId)).toBe(true);

      // Duplicate addition should be no-op
      node.addChild(childId);
      expect(node.childIds.value.size).toBe(1);

      node.removeChild(childId);
      expect(node.childIds.value.has(childId)).toBe(false);
    });
  });

  describe("FloatingTree instance", () => {
    it("adds nodes and links parent-child relationships", () => {
      const tree = new FloatingTree();
      const parent = createMockContext();
      const child = createMockContext({ isRoot: false });

      const parentNode = tree.addNode(parent);
      const childNode = tree.addNode(child, parent);

      expect(tree.getNode(parent.id)).toBe(parentNode);
      expect(tree.getNode(child.id)).toBe(childNode);
      expect(tree.getChildren(parent)).toEqual([child]);
      expect(tree.getChildren(parent.id)).toEqual([child]);
      expect(tree.getDescendants(parent)).toEqual([child]);
    });

    it("removes a node and unlinks it from its parent", () => {
      const tree = new FloatingTree();
      const parent = createMockContext();
      const child = createMockContext({ isRoot: false });

      tree.addNode(parent);
      tree.addNode(child, parent);

      expect(tree.getChildren(parent)).toHaveLength(1);

      tree.removeNode(child.id);

      expect(tree.getNode(child.id)).toBeUndefined();
      expect(tree.getChildren(parent)).toHaveLength(0);
    });

    it("unregisters on scope disposal", () => {
      const tree = new FloatingTree();
      const parent = createMockContext();
      tree.addNode(parent);

      const scope = effectScope();
      scope.run(() => {
        const child = createMockContext({ isRoot: false });
        tree.addNode(child, parent);
      });

      expect(tree.getChildren(parent)).toHaveLength(1);

      scope.stop();

      expect(tree.getChildren(parent)).toHaveLength(0);
    });

    it("traverses depth-first descendants across multi-level hierarchy", () => {
      const tree = new FloatingTree();
      const root = createMockContext();
      const child = createMockContext({ isRoot: false });
      const grandchild = createMockContext({ isRoot: false });

      tree.addNode(root);
      tree.addNode(child, root);
      tree.addNode(grandchild, child);

      expect(tree.getDescendants(root)).toEqual([child, grandchild]);
      expect(tree.getDescendants(root.id)).toEqual([child, grandchild]);
    });

    describe("deepest open traversal", () => {
      it("returns root context when no descendants are open", () => {
        const root = createMockContext();
        const child = createMockContext({ isRoot: false });

        floatingTree.addNode(root, null);
        floatingTree.addNode(child, root);

        expect(floatingTree.getDeepestOpenContext(root)).toBe(root);
      });

      it("returns deepest open descendant in a chain", () => {
        const root = createMockContext({ open: true });
        const child = createMockContext({ isRoot: false, open: true });
        const grandchild = createMockContext({ isRoot: false, open: true });

        floatingTree.addNode(root, null);
        floatingTree.addNode(child, root);
        floatingTree.addNode(grandchild, child);

        expect(floatingTree.getDeepestOpenContext(root)).toBe(grandchild);
      });

      it("finds deepest open context across multiple branches", () => {
        const root = createMockContext();
        const branchA1 = createMockContext({ isRoot: false, open: true });
        const branchB1 = createMockContext({ isRoot: false, open: true });
        const branchB2 = createMockContext({ isRoot: false, open: true });

        floatingTree.addNode(root, null);
        floatingTree.addNode(branchA1, root);
        floatingTree.addNode(branchB1, root);
        floatingTree.addNode(branchB2, branchB1);

        expect(floatingTree.getDeepestOpenContext(root)).toBe(branchB2);
      });
    });

    describe("dom containment and element queries", () => {
      it("identifies targets within anchor and floating elements", () => {
        const anchorEl = document.createElement("button");
        const floatingEl = document.createElement("div");
        const childEl = document.createElement("span");
        anchorEl.appendChild(childEl);

        const context = createMockContext();
        context.refs.anchorEl.value = anchorEl;
        context.refs.floatingEl.value = floatingEl;

        floatingTree.addNode(context, null);

        expect(floatingTree.isTargetWithin(context, childEl)).toBe(true);
        expect(floatingTree.isTargetWithin(context, anchorEl)).toBe(true);
        expect(floatingTree.isTargetWithin(context, floatingEl)).toBe(true);
        expect(floatingTree.isTargetWithin(context, document.createElement("div"))).toBe(false);
        expect(floatingTree.isTargetWithin(context, null)).toBe(false);
      });

      it("identifies targets within descendant context elements", () => {
        const rootAnchor = document.createElement("button");
        const rootFloating = document.createElement("div");
        const childAnchor = document.createElement("button");
        const childFloating = document.createElement("div");

        const root = createMockContext();
        root.refs.anchorEl.value = rootAnchor;
        root.refs.floatingEl.value = rootFloating;

        const child = createMockContext({ isRoot: false });
        child.refs.anchorEl.value = childAnchor;
        child.refs.floatingEl.value = childFloating;

        floatingTree.addNode(root, null);
        floatingTree.addNode(child, root);

        expect(floatingTree.isTargetWithin(root, childAnchor)).toBe(true);
        expect(floatingTree.isTargetWithin(root, childFloating)).toBe(true);
      });

      it("handles virtual element anchors with and without contextElement", () => {
        const hostEl = document.createElement("div");
        const targetEl = document.createElement("span");
        hostEl.appendChild(targetEl);

        const context = createMockContext();
        context.refs.anchorEl.value = {
          getBoundingClientRect: () => hostEl.getBoundingClientRect(),
          contextElement: hostEl,
        };

        floatingTree.addNode(context, null);

        expect(floatingTree.isTargetWithin(context, targetEl)).toBe(true);

        context.refs.anchorEl.value = {
          getBoundingClientRect: () => hostEl.getBoundingClientRect(),
        };

        expect(floatingTree.isTargetWithin(context, targetEl)).toBe(false);
      });

      it("collects mounted floating elements across hierarchy", () => {
        const rootFloatingEl = document.createElement("div");
        const childFloatingEl = document.createElement("div");

        const root = createMockContext();
        root.refs.floatingEl.value = rootFloatingEl;

        const child = createMockContext({ isRoot: false });
        child.refs.floatingEl.value = childFloatingEl;

        floatingTree.addNode(root, null);
        floatingTree.addNode(child, root);

        expect(floatingTree.getFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);
      });
    });

    describe("descendant actions", () => {
      it("closes descendant contexts from innermost child to nearest parent with reason and event", () => {
        const calls: string[] = [];
        const root = createMockContext();
        const child = createMockContext({ isRoot: false });
        const grandchild = createMockContext({ isRoot: false });

        child.state.setOpen = vi.fn((_open, reason) => {
          calls.push(`child:${reason}`);
        });
        grandchild.state.setOpen = vi.fn((_open, reason) => {
          calls.push(`grandchild:${reason}`);
        });

        floatingTree.addNode(root, null);
        floatingTree.addNode(child, root);
        floatingTree.addNode(grandchild, child);

        const event = new MouseEvent("pointerdown");
        floatingTree.closeDescendants(root, "outside-pointer", event);

        expect(calls).toEqual(["grandchild:outside-pointer", "child:outside-pointer"]);
        expect(grandchild.state.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
        expect(child.state.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
      });
    });
  });
});
