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
    isRoot: true,
    tree: null,
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
      const child = createMockNode({ isRoot: false });

      tree.addNode(parent);
      tree.addNode(child, parent.id);

      expect(tree.getNode(parent.id)).toBe(parent);
      expect(tree.getNode(child.id)).toBe(child);
      expect(tree.getChildren(parent.id)).toEqual([child]);
      expect(tree.getDescendants(parent.id)).toEqual([child]);
      expect(parent.tree).toBe(tree);
      expect(child.tree).toBe(tree);
      expect(parent.isRoot).toBe(true);
      expect(child.isRoot).toBe(false);
    });

    it("removes a node, unlinks it from its parent, and returns it to standalone state", () => {
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child = createMockNode({ isRoot: false });

      tree.addNode(parent);
      tree.addNode(child, parent.id);

      expect(tree.getChildren(parent.id)).toHaveLength(1);

      tree.removeNode(child.id);

      expect(tree.getNode(child.id)).toBeUndefined();
      expect(tree.getChildren(parent.id)).toHaveLength(0);
      expect(child.tree).toBeNull();
      expect(child.isRoot).toBe(true);
    });

    it("unregisters on scope disposal", () => {
      const tree = useFloatingTree();
      const parent = createMockNode();
      tree.addNode(parent);

      const localScope = effectScope();
      localScope.run(() => {
        const child = createMockNode({ isRoot: false });
        tree.addNode(child, parent.id);
      });

      expect(tree.getChildren(parent.id)).toHaveLength(1);

      localScope.stop();

      expect(tree.getChildren(parent.id)).toHaveLength(0);
    });

    it("traverses depth-first descendants across multi-level hierarchy", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode({ isRoot: false });
      const grandchild = createMockNode({ isRoot: false });

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
      const child = createMockNode({ isRoot: false });

      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.getDeepestOpenContext(root)).toBe(root);
    });

    it("returns deepest open descendant in a chain", () => {
      const tree = useFloatingTree();
      const root = createMockNode({ open: true });
      const child = createMockNode({ isRoot: false, open: true });
      const grandchild = createMockNode({ isRoot: false, open: true });

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      expect(tree.getDeepestOpenContext(root)).toBe(grandchild);
    });

    it("finds deepest open node across multiple branches", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const branchA1 = createMockNode({ isRoot: false, open: true });
      const branchB1 = createMockNode({ isRoot: false, open: true });
      const branchB2 = createMockNode({ isRoot: false, open: true });

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

      const child = createMockNode({ isRoot: false });
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

      const child = createMockNode({ isRoot: false });
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
      const child = createMockNode({ isRoot: false });

      tree.addNode(child, parent.id);

      // Falls back to root linkage without throwing
      expect(child.isRoot).toBe(true);
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

      expect(node.isRoot).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith("[FloatingTree] A node cannot be its own parent.");

      warnSpy.mockRestore();
    });

    it("warns and preserves children on duplicate registration", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const tree = useFloatingTree();
      const parent = createMockNode();
      const child = createMockNode({ isRoot: false });

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

  describe("descendant actions", () => {
    it("closes descendant nodes from innermost child to nearest parent with reason and event", () => {
      const tree = useFloatingTree();
      const calls: string[] = [];
      const root = createMockNode();
      const child = createMockNode({ isRoot: false, open: true });
      const grandchild = createMockNode({ isRoot: false, open: true });

      child.setOpen = vi.fn((_open: boolean, reason?: OpenChangeReason) => {
        calls.push(`child:${reason}`);
      });
      grandchild.setOpen = vi.fn((_open: boolean, reason?: OpenChangeReason) => {
        calls.push(`grandchild:${reason}`);
      });

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      const event = new MouseEvent("pointerdown");
      tree.closeDescendants(root, "outside-pointer", event);

      expect(calls).toEqual(["grandchild:outside-pointer", "child:outside-pointer"]);
      expect(grandchild.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
      expect(child.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
    });

    it("skips already-closed descendants when closing", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      // Closed descendants carry no reason metadata, so reaffirming the close is a no-op.
      const child = createMockNode({ isRoot: false, open: false });
      const grandchild = createMockNode({ isRoot: false, open: true });

      child.setOpen = vi.fn();
      grandchild.setOpen = vi.fn();

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      tree.closeDescendants(root, "outside-pointer");

      expect(child.setOpen).not.toHaveBeenCalled();
      expect(grandchild.setOpen).toHaveBeenCalledWith(false, "outside-pointer", undefined);
    });
  });

  describe("node removal", () => {
    it("re-parents children to the grandparent when a middle node is removed", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode({ isRoot: false });
      const grandchild = createMockNode({ isRoot: false });

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      tree.removeNode(child.id);

      // No dangling parent links: the surviving grandchild stays reachable from the root.
      expect(tree.getNode(child.id)).toBeUndefined();
      expect(tree.getNode(grandchild.id)).toBe(grandchild);
      expect(tree.getChildren(root.id)).toEqual([grandchild]);
      expect(grandchild.isRoot).toBe(false);
      expect(child.tree).toBeNull();
      expect(child.isRoot).toBe(true);
    });

    it("promotes children to roots when the root node is removed", () => {
      const tree = useFloatingTree();
      const root = createMockNode();
      const child = createMockNode({ isRoot: false });
      const grandchild = createMockNode({ isRoot: false });

      tree.addNode(root);
      tree.addNode(child, root.id);
      tree.addNode(grandchild, child.id);

      tree.removeNode(root.id);

      expect(tree.getNode(root.id)).toBeUndefined();
      expect(tree.getNode(child.id)).toBe(child);
      expect(tree.getNode(grandchild.id)).toBe(grandchild);
      expect(child.isRoot).toBe(true);
      // The surviving subtree stays linked: grandchild is still reachable via the child.
      expect(tree.getDescendants(child.id)).toEqual([grandchild]);
      expect(tree.getChildren(child.id)).toEqual([grandchild]);
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

      const child = createMockNode({ isRoot: false });
      child.refs.floatingEl.value = childHost;

      const tree = useFloatingTree();
      tree.addNode(root);
      tree.addNode(child, root.id);

      expect(tree.isTargetWithin(root, nestedTarget)).toBe(true);
    });
  });
});
