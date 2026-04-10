import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, ref } from "vue";
import {
  type FloatingTree,
  type FloatingTreeNode,
  useFloatingTree,
  useFloatingTreeNode,
} from "@/composables/interactions";
import { resolveTreeInteraction } from "@/composables/interactions/internal/tree-interaction";
import { type AnchorElement, type FloatingElement, useFloating } from "@/composables/positioning";
import {
  type FloatingContext,
  type FloatingTreeNodeBridge,
  getFloatingInternals,
} from "@/composables/positioning/floating-context";

type FloatingHarness = {
  anchorEl: HTMLButtonElement;
  context: FloatingContext;
  floatingEl: HTMLDivElement;
};

type NavigateHandler = (index: number | null) => void;

const activeScopes: ReturnType<typeof effectScope>[] = [];
const createdElements: HTMLElement[] = [];

function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, id: string) {
  const element = document.createElement(tag);
  element.id = id;
  createdElements.push(element);
  document.body.appendChild(element);
  return element;
}

function createFloatingHarness(idPrefix: string, open = false): FloatingHarness {
  const anchorEl = createElement("button", `${idPrefix}-anchor`);
  const floatingEl = createElement("div", `${idPrefix}-floating`);

  const context = useFloating(ref<AnchorElement>(anchorEl), ref<FloatingElement>(floatingEl), {
    open: ref(open),
  });

  return {
    anchorEl,
    context,
    floatingEl,
  };
}

function requireTreeNodeBridge(context: FloatingContext): FloatingTreeNodeBridge {
  const treeNode = getFloatingInternals(context as object)?.treeNode;
  if (!treeNode) {
    throw new Error("Expected a floating tree node bridge to be attached");
  }

  return treeNode;
}

function attachListNavigationBridge(
  context: FloatingContext,
  options: {
    onNavigate?: NavigateHandler;
    openedByTree?: boolean;
    returnIndex?: number | null;
  } = {},
) {
  const treeNode = requireTreeNodeBridge(context);
  const onNavigate: NavigateHandler = options.onNavigate ?? (() => void 0);

  treeNode.listNavigation = {
    onNavigate,
    openedByTree: ref(options.openedByTree ?? false),
    returnIndex: ref(options.returnIndex ?? null),
  };

  return {
    onNavigate,
    treeNode,
  };
}

function setupStandaloneInteractionHarness(open = true) {
  const scope = effectScope();
  activeScopes.push(scope);

  let harness!: FloatingHarness;
  scope.run(() => {
    harness = createFloatingHarness("tree-interaction-standalone", open);
  });

  return {
    harness,
    scope,
  };
}

function setupTreeInteractionHarness(options: { childOpen?: boolean; rootOpen?: boolean } = {}) {
  const { rootOpen = true, childOpen = false } = options;
  const scope = effectScope();
  activeScopes.push(scope);

  let childHarness!: FloatingHarness;
  let childNode!: FloatingTreeNode;
  let rootHarness!: FloatingHarness;
  let rootNode!: FloatingTreeNode;
  let tree!: FloatingTree;

  scope.run(() => {
    tree = useFloatingTree({ id: "tree-interaction-suite" });
    rootHarness = createFloatingHarness("tree-interaction-root", rootOpen);
    childHarness = createFloatingHarness("tree-interaction-child", childOpen);

    rootNode = useFloatingTreeNode(rootHarness.context, {
      id: "tree-root-node",
      tree,
    });

    childNode = useFloatingTreeNode(childHarness.context, {
      id: "tree-child-node",
      parent: rootNode,
    });
  });

  return {
    childHarness,
    childNode,
    rootHarness,
    rootNode,
    scope,
    tree,
  };
}

describe("tree interaction helpers", () => {
  afterEach(() => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }

    activeScopes.length = 0;

    for (const element of [...createdElements].reverse()) {
      if (element.isConnected) {
        element.remove();
      }
    }

    createdElements.length = 0;
    vi.restoreAllMocks();
  });

  it("restores the parent list navigation when the child bridge provides a return index", () => {
    const { childHarness, rootHarness } = setupTreeInteractionHarness({
      childOpen: true,
      rootOpen: true,
    });

    const parentNavigate = vi.fn();
    attachListNavigationBridge(rootHarness.context, {
      onNavigate: parentNavigate,
    });
    attachListNavigationBridge(childHarness.context, {
      openedByTree: true,
      returnIndex: 2,
    });

    const interaction = resolveTreeInteraction(childHarness.context);
    interaction.restoreParentNavigation();

    expect(parentNavigate).toHaveBeenCalledWith(2);
  });

  it("skips parent restoration when the child has no return index", () => {
    const { childHarness, rootHarness } = setupTreeInteractionHarness({
      childOpen: true,
      rootOpen: true,
    });

    const parentNavigate = vi.fn();
    attachListNavigationBridge(rootHarness.context, {
      onNavigate: parentNavigate,
    });
    attachListNavigationBridge(childHarness.context, {
      openedByTree: true,
      returnIndex: null,
    });

    resolveTreeInteraction(childHarness.context).restoreParentNavigation();

    expect(parentNavigate).not.toHaveBeenCalled();
  });

  it("skips parent restoration when the parent branch is already closed", () => {
    const { childHarness, rootHarness } = setupTreeInteractionHarness({
      childOpen: true,
      rootOpen: false,
    });

    const parentNavigate = vi.fn();
    attachListNavigationBridge(rootHarness.context, {
      onNavigate: parentNavigate,
    });
    attachListNavigationBridge(childHarness.context, {
      openedByTree: true,
      returnIndex: 1,
    });

    resolveTreeInteraction(childHarness.context).restoreParentNavigation();

    expect(parentNavigate).not.toHaveBeenCalled();
  });

  it("closes the local context when closeCurrent is used without a tree node", () => {
    const { harness } = setupStandaloneInteractionHarness(true);

    resolveTreeInteraction(harness.context).closeCurrent("programmatic");

    expect(harness.context.state.open.value).toBe(false);
  });

  it("closes the local context when closeActive is used without a tree node", () => {
    const { harness } = setupStandaloneInteractionHarness(true);

    resolveTreeInteraction(harness.context).closeActive("programmatic");

    expect(harness.context.state.open.value).toBe(false);
  });

  it("closes only the current tree node when closeCurrent runs inside a tree branch", () => {
    const { childHarness, rootHarness } = setupTreeInteractionHarness({
      childOpen: true,
      rootOpen: true,
    });

    resolveTreeInteraction(childHarness.context).closeCurrent("programmatic");

    expect(childHarness.context.state.open.value).toBe(false);
    expect(rootHarness.context.state.open.value).toBe(true);
  });

  it("closes the active child branch when closeActive is invoked from the root interaction", () => {
    const { childHarness, rootHarness } = setupTreeInteractionHarness({
      childOpen: true,
      rootOpen: true,
    });

    resolveTreeInteraction(rootHarness.context).closeActive("programmatic");

    expect(childHarness.context.state.open.value).toBe(false);
    expect(rootHarness.context.state.open.value).toBe(true);
  });

  it("falls back to the current tree node when closeActive has no open active descendant", () => {
    const { childHarness, rootHarness } = setupTreeInteractionHarness({
      childOpen: false,
      rootOpen: true,
    });

    resolveTreeInteraction(rootHarness.context).closeActive("programmatic");

    expect(rootHarness.context.state.open.value).toBe(false);
    expect(childHarness.context.state.open.value).toBe(false);
  });
});
