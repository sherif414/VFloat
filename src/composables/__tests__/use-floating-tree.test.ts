import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, ref } from "vue";
import {
  provideFloatingTree,
  useCurrentFloatingTree,
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

  it("warns in development when no tree can be resolved", () => {
    const scope = effectScope();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    scope.run(() => {
      const context = createFloatingContext(false).context;
      useFloatingTreeNode(context, {
        id: "orphan",
      });
    });

    expect(
      warnSpy.mock.calls.some(([message]) =>
        String(message).includes("[useFloatingTreeNode] Missing floating tree"),
      ),
    ).toBe(true);

    scope.stop();
  });

  it("returns the provided tree and exposes null outside injection context", () => {
    const tree = useFloatingTree({
      id: "provided-tree",
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(provideFloatingTree(tree)).toBe(tree);
    expect(
      warnSpy.mock.calls.some(([message]) =>
        String(message).includes(
          "[provideFloatingTree] Called without an active injection context",
        ),
      ),
    ).toBe(true);
    expect(useCurrentFloatingTree()).toBeNull();
  });
});
