import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import type { OpenChangeReason } from "@/types";
import { FloatingTree, FloatingTreeNode } from "./floating-tree";
import type {
  AnchorElement,
  FloatingElement,
  FloatingNode,
} from "./use-floating-node";

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
    ...restOverrides,
  };
}

describe("FloatingTree & FloatingTreeNode", () => {
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

  describe("FloatingTreeNode", () => {
    it("adds and removes child IDs reactively", () => {
      const node = createMockNode();
      const treeNode = new FloatingTreeNode(node);
      const childId = Symbol("child");

      expect(treeNode.childIds.value.has(childId)).toBe(false);

      treeNode.addChild(childId);
      expect(treeNode.childIds.value.has(childId)).toBe(true);

      treeNode.addChild(childId);
      expect(treeNode.childIds.value.size).toBe(1);

      treeNode.removeChild(childId);
      expect(treeNode.childIds.value.has(childId)).toBe(false);
    });
  });

  describe("FloatingTree instance", () => {
    it("adds nodes and links parent-child relationships", () => {
      const tree = new FloatingTree();
      const parent = createMockNode();
      const child = createMockNode({ isRoot: false });

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
      const parent = createMockNode();
      const child = createMockNode({ isRoot: false });

      tree.addNode(parent);
      tree.addNode(child, parent);

      expect(tree.getChildren(parent)).toHaveLength(1);

      tree.removeNode(child.id);

      expect(tree.getNode(child.id)).toBeUndefined();
      expect(tree.getChildren(parent)).toHaveLength(0);
    });

    it("unregisters on scope disposal", () => {
      const tree = new FloatingTree();
      const parent = createMockNode();
      tree.addNode(parent);

      const localScope = effectScope();
      localScope.run(() => {
        const child = createMockNode({ isRoot: false });
        tree.addNode(child, parent);
      });

      expect(tree.getChildren(parent)).toHaveLength(1);

      localScope.stop();

      expect(tree.getChildren(parent)).toHaveLength(0);
    });

    it("traverses depth-first descendants across multi-level hierarchy", () => {
      const tree = new FloatingTree();
      const root = createMockNode();
      const child = createMockNode({ isRoot: false });
      const grandchild = createMockNode({ isRoot: false });

      tree.addNode(root);
      tree.addNode(child, root);
      tree.addNode(grandchild, child);

      expect(tree.getDescendants(root)).toEqual([child, grandchild]);
      expect(tree.getDescendants(root.id)).toEqual([child, grandchild]);
    });

    describe("deepest open traversal", () => {
      it("returns root node when no descendants are open", () => {
        const tree = new FloatingTree();
        const root = createMockNode();
        const child = createMockNode({ isRoot: false });

        tree.addNode(root, null);
        tree.addNode(child, root);

        expect(tree.getDeepestOpenContext(root)).toBe(root);
      });

      it("returns deepest open descendant in a chain", () => {
        const tree = new FloatingTree();
        const root = createMockNode({ open: true });
        const child = createMockNode({ isRoot: false, open: true });
        const grandchild = createMockNode({ isRoot: false, open: true });

        tree.addNode(root, null);
        tree.addNode(child, root);
        tree.addNode(grandchild, child);

        expect(tree.getDeepestOpenContext(root)).toBe(grandchild);
      });

      it("finds deepest open node across multiple branches", () => {
        const tree = new FloatingTree();
        const root = createMockNode();
        const branchA1 = createMockNode({ isRoot: false, open: true });
        const branchB1 = createMockNode({ isRoot: false, open: true });
        const branchB2 = createMockNode({ isRoot: false, open: true });

        tree.addNode(root, null);
        tree.addNode(branchA1, root);
        tree.addNode(branchB1, root);
        tree.addNode(branchB2, branchB1);

        expect(tree.getDeepestOpenContext(root)).toBe(branchB2);
      });
    });

    describe("dom containment and element queries", () => {
      it("identifies targets within anchor and floating elements", () => {
        const tree = new FloatingTree();
        const anchorEl = trackElement(document.createElement("button"));
        const floatingEl = trackElement(document.createElement("div"));
        const childEl = trackElement(document.createElement("span"));
        anchorEl.appendChild(childEl);

        const node = createMockNode();
        node.refs.anchorEl.value = anchorEl;
        node.refs.floatingEl.value = floatingEl;

        tree.addNode(node, null);

        expect(tree.isTargetWithin(node, childEl)).toBe(true);
        expect(tree.isTargetWithin(node, anchorEl)).toBe(true);
        expect(tree.isTargetWithin(node, floatingEl)).toBe(true);
        expect(tree.isTargetWithin(node, trackElement(document.createElement("div")))).toBe(false);
        expect(tree.isTargetWithin(node, null)).toBe(false);
      });

      it("identifies targets within descendant node elements", () => {
        const tree = new FloatingTree();
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

        tree.addNode(root, null);
        tree.addNode(child, root);

        expect(tree.isTargetWithin(root, childAnchor)).toBe(true);
        expect(tree.isTargetWithin(root, childFloating)).toBe(true);
      });

      it("handles virtual element anchors with and without contextElement", () => {
        const tree = new FloatingTree();
        const hostEl = trackElement(document.createElement("div"));
        const targetEl = trackElement(document.createElement("span"));
        hostEl.appendChild(targetEl);

        const node = createMockNode();
        node.refs.anchorEl.value = {
          getBoundingClientRect: () => hostEl.getBoundingClientRect(),
          contextElement: hostEl,
        } as unknown as AnchorElement;

        tree.addNode(node, null);

        expect(tree.isTargetWithin(node, targetEl)).toBe(true);

        node.refs.anchorEl.value = {
          getBoundingClientRect: () => hostEl.getBoundingClientRect(),
        };

        expect(tree.isTargetWithin(node, targetEl)).toBe(false);
      });

      it("collects mounted floating elements across hierarchy", () => {
        const tree = new FloatingTree();
        const rootFloatingEl = trackElement(document.createElement("div"));
        const childFloatingEl = trackElement(document.createElement("div"));

        const root = createMockNode();
        root.refs.floatingEl.value = rootFloatingEl;

        const child = createMockNode({ isRoot: false });
        child.refs.floatingEl.value = childFloatingEl;

        tree.addNode(root, null);
        tree.addNode(child, root);

        expect(tree.getFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);
      });

      it("recognizes focus guard elements adjacent to floating elements as within node", () => {
        const tree = new FloatingTree();
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
        tree.addNode(node, null);

        expect(tree.isTargetWithin(node, startGuard)).toBe(true);
        expect(tree.isTargetWithin(node, endGuard)).toBe(true);
        expect(tree.isTargetWithin(node, unrelatedGuard)).toBe(false);
      });
    });

    describe("registration edge cases & warnings", () => {
      it("warns and rejects parent link when parent is not registered (out-of-order registration)", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tree = new FloatingTree();
        const parent = createMockNode();
        const child = createMockNode({ isRoot: false });

        const childNode = tree.addNode(child, parent);

        expect(childNode.parentId).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("parent node is not registered in the floating tree"),
        );

        warnSpy.mockRestore();
      });

      it("warns and prevents self-parenting", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tree = new FloatingTree();
        const node = createMockNode();

        const treeNode = tree.addNode(node, node);

        expect(treeNode.parentId).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith("[FloatingTree] A node cannot be its own parent.");

        warnSpy.mockRestore();
      });

      it("warns and returns existing node on duplicate registration preserving children", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const tree = new FloatingTree();
        const parent = createMockNode();
        const child = createMockNode({ isRoot: false });

        const node1 = tree.addNode(parent);
        tree.addNode(child, parent);
        expect(tree.getChildren(parent)).toHaveLength(1);

        const node2 = tree.addNode(parent);

        expect(node2).toBe(node1);
        expect(tree.getChildren(parent)).toHaveLength(1);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("is already registered in the floating tree"),
        );

        warnSpy.mockRestore();
      });

      it("avoids infinite loop when circular references exist", () => {
        const tree = new FloatingTree();
        const nodeA = createMockNode();
        const nodeB = createMockNode({ isRoot: false });

        tree.addNode(nodeA);
        tree.addNode(nodeB, nodeA);

        const bTreeNode = tree.getNode(nodeB.id);
        bTreeNode?.addChild(nodeA.id);

        expect(() => tree.getDescendants(nodeA)).not.toThrow();
        expect(() => tree.getDeepestOpenContext(nodeA)).not.toThrow();
      });
    });

    describe("descendant actions", () => {
      it("closes descendant nodes from innermost child to nearest parent with reason and event", () => {
        const tree = new FloatingTree();
        const calls: string[] = [];
        const root = createMockNode();
        const child = createMockNode({ isRoot: false });
        const grandchild = createMockNode({ isRoot: false });

        child.setOpen = vi.fn((_open: boolean, reason?: OpenChangeReason) => {
          calls.push(`child:${reason}`);
        });
        grandchild.setOpen = vi.fn((_open: boolean, reason?: OpenChangeReason) => {
          calls.push(`grandchild:${reason}`);
        });

        tree.addNode(root, null);
        tree.addNode(child, root);
        tree.addNode(grandchild, child);

        const event = new MouseEvent("pointerdown");
        tree.closeDescendants(root, "outside-pointer", event);

        expect(calls).toEqual(["grandchild:outside-pointer", "child:outside-pointer"]);
        expect(grandchild.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
        expect(child.setOpen).toHaveBeenCalledWith(false, "outside-pointer", event);
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

        const tree = new FloatingTree();
        tree.addNode(node, null);

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

        const tree = new FloatingTree();
        tree.addNode(root, null);
        tree.addNode(child, root);

        expect(tree.isTargetWithin(root, nestedTarget)).toBe(true);
      });
    });
  });
});
