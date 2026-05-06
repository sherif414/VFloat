import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, ref } from "vue";
import {
  useFloatingTree,
  useFloatingTreeNode,
  type FloatingTree,
  type FloatingTreeNode,
} from "@/composables/interactions";
import { type AnchorElement, type FloatingElement, useFloating } from "@/composables/positioning";

const createdElements: HTMLElement[] = [];

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  createdElements.push(element);
  document.body.appendChild(element);
  return element;
}

function createFloatingContext(open = false) {
  const anchorEl = createElement("button");
  const floatingEl = createElement("div");
  const openRef = ref(open);

  const context = useFloating(ref<AnchorElement>(anchorEl), ref<FloatingElement>(floatingEl), {
    open: openRef,
  });

  return {
    anchorEl,
    floatingEl,
    context,
  };
}

function createTreeNodes(scope: ReturnType<typeof effectScope>, openRoot = true) {
  let tree!: FloatingTree;
  let rootNode!: FloatingTreeNode;
  let childNodeA!: FloatingTreeNode;
  let childNodeB!: FloatingTreeNode;

  scope.run(() => {
    tree = useFloatingTree({ id: "test-tree" });

    const rootContext = createFloatingContext(openRoot).context;
    const childContextA = createFloatingContext(false).context;
    const childContextB = createFloatingContext(false).context;

    rootNode = useFloatingTreeNode(rootContext, {
      tree,
      id: "root",
    });

    childNodeA = useFloatingTreeNode(childContextA, {
      parent: rootNode,
      id: "child-a",
    });

    childNodeB = useFloatingTreeNode(childContextB, {
      parent: rootNode,
      id: "child-b",
    });
  });

  return {
    tree,
    rootNode,
    childNodeA,
    childNodeB,
  };
}

describe("useFloatingTree", () => {
  afterEach(() => {
    for (const element of createdElements) {
      element.remove();
    }

    createdElements.length = 0;
    vi.restoreAllMocks();
  });

  it("tracks active id and active path from parent to active child", () => {
    const scope = effectScope();
    const { tree, rootNode, childNodeA } = createTreeNodes(scope, false);

    rootNode.actions.open();
    expect(tree.activeId.value).toBe("root");
    expect(tree.activePath.value).toEqual(["root"]);

    childNodeA.actions.open();

    expect(tree.activeId.value).toBe("child-a");
    expect(tree.activePath.value).toEqual(["root", "child-a"]);
    expect(rootNode.childIds.value).toEqual(["child-a", "child-b"]);
    expect(childNodeA.parentId.value).toBe("root");

    scope.stop();
  });

  it("closes sibling branches when a child node opens by default", () => {
    const scope = effectScope();
    const { childNodeA, childNodeB } = createTreeNodes(scope);

    childNodeA.actions.open();
    expect(childNodeA.context.state.open.value).toBe(true);
    expect(childNodeB.context.state.open.value).toBe(false);

    childNodeB.actions.open();

    expect(childNodeA.context.state.open.value).toBe(false);
    expect(childNodeB.context.state.open.value).toBe(true);

    scope.stop();
  });

  it("does not restore focus for siblings that were already closed", async () => {
    const scope = effectScope();
    let childNodeA!: FloatingTreeNode;
    let childNodeB!: FloatingTreeNode;
    let childAnchorElB!: HTMLButtonElement;

    scope.run(() => {
      const tree = useFloatingTree();
      const rootNode = useFloatingTreeNode(createFloatingContext(true).context, {
        tree,
        id: "root",
      });
      const childContextA = createFloatingContext(false).context;
      const childContextB = createFloatingContext(false);
      childAnchorElB = childContextB.anchorEl;

      childNodeA = useFloatingTreeNode(childContextA, {
        parent: rootNode,
        id: "child-a",
      });
      childNodeB = useFloatingTreeNode(childContextB.context, {
        parent: rootNode,
        id: "child-b",
      });
    });

    childNodeA.actions.open();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(childNodeA.context.state.open.value).toBe(true);
    expect(childNodeB.context.state.open.value).toBe(false);
    expect(document.activeElement).not.toBe(childAnchorElB);

    scope.stop();
  });

  it("keeps sibling branches open when the tree disables sibling closing", () => {
    const scope = effectScope();
    let childNodeA!: FloatingTreeNode;
    let childNodeB!: FloatingTreeNode;

    scope.run(() => {
      const tree = useFloatingTree({
        closeSiblingsOnOpen: false,
      });
      const rootNode = useFloatingTreeNode(createFloatingContext(true).context, {
        tree,
        id: "root",
      });

      childNodeA = useFloatingTreeNode(createFloatingContext(false).context, {
        parent: rootNode,
        id: "child-a",
      });
      childNodeB = useFloatingTreeNode(createFloatingContext(false).context, {
        parent: rootNode,
        id: "child-b",
      });
    });

    childNodeA.actions.open();
    childNodeB.actions.open();

    expect(childNodeA.context.state.open.value).toBe(true);
    expect(childNodeB.context.state.open.value).toBe(true);

    scope.stop();
  });

  it("closes descendants when a parent closes by default", () => {
    const scope = effectScope();
    let tree!: FloatingTree;
    let rootNode!: FloatingTreeNode;
    let childNode!: FloatingTreeNode;
    let grandChildNode!: FloatingTreeNode;

    scope.run(() => {
      tree = useFloatingTree();

      const rootContext = createFloatingContext(true).context;
      const childContext = createFloatingContext(true).context;
      const grandChildContext = createFloatingContext(true).context;

      rootNode = useFloatingTreeNode(rootContext, { tree, id: "root" });
      childNode = useFloatingTreeNode(childContext, { parent: rootNode, id: "child" });
      grandChildNode = useFloatingTreeNode(grandChildContext, {
        parent: childNode,
        id: "grand-child",
      });
    });

    rootNode.actions.close();

    expect(rootNode.context.state.open.value).toBe(false);
    expect(childNode.context.state.open.value).toBe(false);
    expect(grandChildNode.context.state.open.value).toBe(false);

    scope.stop();
  });

  it("keeps descendants open when the tree disables descendant closing", () => {
    const scope = effectScope();
    let rootNode!: FloatingTreeNode;
    let childNode!: FloatingTreeNode;

    scope.run(() => {
      const tree = useFloatingTree({
        closeChildrenOnClose: false,
      });

      rootNode = useFloatingTreeNode(createFloatingContext(true).context, { tree, id: "root" });
      childNode = useFloatingTreeNode(createFloatingContext(true).context, {
        parent: rootNode,
        id: "child",
      });
    });

    rootNode.actions.close();

    expect(rootNode.context.state.open.value).toBe(false);
    expect(childNode.context.state.open.value).toBe(true);

    scope.stop();
  });

  it("closes descendant branches leaf-first with the initiating reason", () => {
    const scope = effectScope();
    let tree!: FloatingTree;
    let rootNode!: FloatingTreeNode;
    let childNode!: FloatingTreeNode;
    let grandChildNode!: FloatingTreeNode;

    scope.run(() => {
      tree = useFloatingTree();

      rootNode = useFloatingTreeNode(createFloatingContext(true).context, {
        tree,
        id: "root",
      });
      childNode = useFloatingTreeNode(createFloatingContext(true).context, {
        parent: rootNode,
        id: "child",
      });
      grandChildNode = useFloatingTreeNode(createFloatingContext(true).context, {
        parent: childNode,
        id: "grand-child",
      });
    });

    const closeOrder: string[] = [];
    const rootSetOpen = rootNode.context.state.setOpen;
    const childSetOpen = childNode.context.state.setOpen;
    const grandChildSetOpen = grandChildNode.context.state.setOpen;

    const rootSpy = vi.spyOn(rootNode.context.state, "setOpen").mockImplementation((...args) => {
      if (!args[0]) {
        closeOrder.push("root");
      }

      rootSetOpen(...args);
    });
    const childSpy = vi.spyOn(childNode.context.state, "setOpen").mockImplementation((...args) => {
      if (!args[0]) {
        closeOrder.push("child");
      }

      childSetOpen(...args);
    });
    const grandChildSpy = vi
      .spyOn(grandChildNode.context.state, "setOpen")
      .mockImplementation((...args) => {
        if (!args[0]) {
          closeOrder.push("grand-child");
        }

        grandChildSetOpen(...args);
      });

    tree.actions.closeBranch(rootNode.id.value, "escape-key");

    expect(closeOrder).toEqual(["grand-child", "child", "root"]);
    expect(rootSpy).toHaveBeenCalledWith(false, "escape-key", undefined);
    expect(childSpy).toHaveBeenCalledWith(false, "escape-key", undefined);
    expect(grandChildSpy).toHaveBeenCalledWith(false, "escape-key", undefined);

    scope.stop();
  });

  it("restores focus to the closed node anchor when a tree close is triggered programmatically", async () => {
    const scope = effectScope();
    let rootNode!: FloatingTreeNode;
    let childNode!: FloatingTreeNode;
    let rootAnchorEl!: HTMLButtonElement;
    let childAnchorEl!: HTMLButtonElement;

    scope.run(() => {
      const tree = useFloatingTree();
      rootAnchorEl = createElement("button");
      const rootFloatingEl = createElement("div");
      childAnchorEl = createElement("button");
      const childFloatingEl = createElement("div");

      rootNode = useFloatingTreeNode(
        useFloating(ref(rootAnchorEl), ref(rootFloatingEl), {
          open: ref(true),
        }),
        { tree, id: "root" },
      );

      childNode = useFloatingTreeNode(
        useFloating(ref(childAnchorEl), ref(childFloatingEl), {
          open: ref(true),
        }),
        {
          parent: rootNode,
          id: "child",
        },
      );
    });

    rootNode.actions.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(rootNode.context.state.open.value).toBe(false);
    expect(childNode.context.state.open.value).toBe(false);
    expect(document.activeElement).toBe(rootAnchorEl);

    rootNode.actions.open();
    childNode.actions.open();
    await new Promise((resolve) => setTimeout(resolve, 0));

    childNode.actions.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(childNode.context.state.open.value).toBe(false);
    expect(document.activeElement).toBe(childAnchorEl);

    scope.stop();
  });

  it("treats all branch surfaces as inside for containment checks", () => {
    const scope = effectScope();
    const { tree, rootNode, childNodeA } = createTreeNodes(scope, true);

    const outsideEl = createElement("div");
    const rootAnchorTarget =
      rootNode.context.refs.anchorEl.value instanceof Element
        ? rootNode.context.refs.anchorEl.value
        : null;
    const childAnchorTarget =
      childNodeA.context.refs.anchorEl.value instanceof Element
        ? childNodeA.context.refs.anchorEl.value
        : null;

    expect(rootNode.actions.isTargetWithinNode(rootAnchorTarget)).toBe(true);
    expect(rootNode.actions.isTargetWithinBranch(childNodeA.context.refs.floatingEl.value)).toBe(
      true,
    );
    expect(tree.actions.isTargetWithinTree(childAnchorTarget)).toBe(true);
    expect(
      tree.actions.isTargetWithinBranch(
        rootNode.id.value,
        childNodeA.context.refs.floatingEl.value,
      ),
    ).toBe(true);
    expect(tree.actions.isTargetWithinTree(outsideEl)).toBe(false);

    scope.stop();
  });

  it("resolves tree from parent when options.tree is omitted", () => {
    const scope = effectScope();
    let tree!: FloatingTree;
    let rootNode!: FloatingTreeNode;
    let childNode!: FloatingTreeNode;

    scope.run(() => {
      tree = useFloatingTree();
      const rootContext = createFloatingContext(false).context;
      const childContext = createFloatingContext(false).context;

      rootNode = useFloatingTreeNode(rootContext, { tree, id: "root" });
      childNode = useFloatingTreeNode(childContext, { parent: rootNode, id: "child" });
    });

    expect(childNode.tree).toBe(tree);
    expect(childNode.parentId.value).toBe("root");

    scope.stop();
  });

  it("throws when no tree can be resolved", () => {
    const scope = effectScope();

    expect(() => {
      scope.run(() => {
        const context = createFloatingContext(false).context;
        useFloatingTreeNode(context, {
          id: "orphan",
        });
      });
    }).toThrow("[useFloatingTreeNode] Missing floating tree");

    scope.stop();
  });

  it("throws when parent and tree belong to different trees", () => {
    const scope = effectScope();

    expect(() => {
      scope.run(() => {
        const parentTree = useFloatingTree({ id: "parent-tree" });
        const childTree = useFloatingTree({ id: "child-tree" });
        const parentNode = useFloatingTreeNode(createFloatingContext(false).context, {
          tree: parentTree,
          id: "parent",
        });

        useFloatingTreeNode(createFloatingContext(false).context, {
          tree: childTree,
          parent: parentNode,
          id: "child",
        });
      });
    }).toThrow(
      "[useFloatingTreeNode] Parent and child nodes must belong to the same floating tree",
    );

    scope.stop();
  });
});
