import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, effectScope, h, nextTick, ref, useTemplateRef } from "vue";
import { useEscapeKey } from "@/composables/escape-key";
import { getTestEl } from "@/test-utils";
import {
  type FloatingNode,
  type UseFloatingNodeOptions,
  useFloatingNode,
} from "./use-floating-node";

//=======================================================================================
// Fixtures
//=======================================================================================

interface SingleNodeFixtureConfig {
  defaultOpen?: boolean;
}

function createSingleNodeComponent(
  options: Partial<UseFloatingNodeOptions> = {},
  config: SingleNodeFixtureConfig = {},
) {
  const openRef = options.open ?? ref(config.defaultOpen ?? false);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      ...options,
      open: openRef,
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating Content"),
      ]);
  });

  return { Component, getNode: () => node, openRef };
}

async function renderSingleNodeFixture(
  options: Partial<UseFloatingNodeOptions> = {},
  config: SingleNodeFixtureConfig = {},
) {
  const fixture = createSingleNodeComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

function createContainmentComponent() {
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: ref(true),
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, [
          h("span", { "data-testid": "inside-anchor" }, "Inside Anchor"),
        ]),
        h("div", { ref: "floating", "data-testid": "floating" }, [
          h("p", { "data-testid": "inside-floating" }, "Inside Floating"),
        ]),
        h("div", { "data-testid": "outside" }, "Outside Element"),
      ]);
  });

  return { Component, getNode: () => node };
}

async function renderContainmentFixture() {
  const fixture = createContainmentComponent();
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    insideAnchorEl: getTestEl("inside-anchor"),
    insideFloatingEl: getTestEl("inside-floating"),
    outsideEl: getTestEl("outside"),
    node: fixture.getNode(),
  };
}

function createNestedContainmentComponent() {
  const childOpenRef = ref(false);
  let rootNode!: FloatingNode;
  let childNode!: FloatingNode;

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    rootNode = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: ref(true),
    });

    childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpenRef,
      parent: rootNode,
    });

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Anchor"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, "Root Floating"),
        h("button", { ref: "child-anchor", "data-testid": "child-anchor" }, "Child Anchor"),
        h("div", { ref: "child-floating", "data-testid": "child-floating" }, "Child Floating"),
      ]);
  });

  return { Component, getRootNode: () => rootNode, getChildNode: () => childNode, childOpenRef };
}

async function renderNestedContainmentFixture() {
  const fixture = createNestedContainmentComponent();
  await render(fixture.Component);
  await nextTick();
  return {
    rootAnchorEl: getTestEl("root-anchor"),
    rootFloatingEl: getTestEl("root-floating"),
    childAnchorEl: getTestEl("child-anchor"),
    childFloatingEl: getTestEl("child-floating"),
    rootNode: fixture.getRootNode(),
    childNode: fixture.getChildNode(),
    childOpenRef: fixture.childOpenRef,
  };
}

function createMultiBranchContainmentComponent() {
  let rootNode!: FloatingNode;
  let child1Node!: FloatingNode;
  let child2Node!: FloatingNode;

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const child1FloatingEl = useTemplateRef<HTMLElement>("child1-floating");
    const child2FloatingEl = useTemplateRef<HTMLElement>("child2-floating");

    rootNode = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: ref(true),
    });

    child1Node = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: child1FloatingEl,
      open: ref(true),
      parent: rootNode,
    });

    child2Node = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: child2FloatingEl,
      open: ref(true),
      parent: rootNode,
    });

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Anchor"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, "Root Floating"),
        h("div", { ref: "child1-floating", "data-testid": "child1-floating" }, "Child 1 Floating"),
        h("div", { ref: "child2-floating", "data-testid": "child2-floating" }, "Child 2 Floating"),
      ]);
  });

  return {
    Component,
    getRootNode: () => rootNode,
    getChild1Node: () => child1Node,
    getChild2Node: () => child2Node,
  };
}

async function renderMultiBranchContainmentFixture() {
  const fixture = createMultiBranchContainmentComponent();
  await render(fixture.Component);
  await nextTick();
  return {
    rootAnchorEl: getTestEl("root-anchor"),
    rootFloatingEl: getTestEl("root-floating"),
    child1FloatingEl: getTestEl("child1-floating"),
    child2FloatingEl: getTestEl("child2-floating"),
    rootNode: fixture.getRootNode(),
    child1Node: fixture.getChild1Node(),
    child2Node: fixture.getChild2Node(),
  };
}

function createActiveTreeComponent() {
  const childOpenRef = ref(true);
  const grandchildOpenRef = ref(false);
  let rootNode!: FloatingNode;

  const Component = defineComponent(() => {
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");
    const grandchildFloatingEl = useTemplateRef<HTMLElement>("grandchild-floating");

    rootNode = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: rootFloatingEl,
      open: ref(true),
    });

    const childNode = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: childFloatingEl,
      open: childOpenRef,
      parent: rootNode,
    });

    useFloatingNode({
      anchorEl: ref(null),
      floatingEl: grandchildFloatingEl,
      open: grandchildOpenRef,
      parent: childNode,
    });

    return () =>
      h("div", [
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, "Root"),
        h("div", { ref: "child-floating", "data-testid": "child-floating" }, "Child"),
        h(
          "div",
          { ref: "grandchild-floating", "data-testid": "grandchild-floating" },
          "Grandchild",
        ),
      ]);
  });

  return { Component, getRootNode: () => rootNode, childOpenRef, grandchildOpenRef };
}

async function renderActiveTreeFixture() {
  const fixture = createActiveTreeComponent();
  await render(fixture.Component);
  await nextTick();
  return {
    rootFloatingEl: getTestEl("root-floating"),
    childFloatingEl: getTestEl("child-floating"),
    grandchildFloatingEl: getTestEl("grandchild-floating"),
    rootNode: fixture.getRootNode(),
    childOpenRef: fixture.childOpenRef,
    grandchildOpenRef: fixture.grandchildOpenRef,
  };
}

//=======================================================================================
// Test Suite
//=======================================================================================

describe("Feature: useFloatingNode composite tree orchestration", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Node creation and controlled open state", () => {
    it("Given omitted open option, When node is initialized, Then open state defaults to false", async () => {
      const { node } = await renderSingleNodeFixture();
      expect(node.open.value).toBe(false);
    });

    it("Given open: ref(true) option, When node is initialized, Then open state initializes to true", async () => {
      const { node } = await renderSingleNodeFixture({ open: ref(true) });
      expect(node.open.value).toBe(true);
    });

    it("Given a controlled open ref, When node open or source ref changes, Then state synchronizes bi-directionally", async () => {
      const openRef = ref(false);
      const { node } = await renderSingleNodeFixture({ open: openRef });

      node.open.value = true;
      expect(openRef.value).toBe(true);

      openRef.value = false;
      expect(node.open.value).toBe(false);
    });

    it("Given multiple floating nodes, When initialized, Then each node is assigned a unique stable symbol id", () => {
      const nodeA = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const nodeB = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });

      expect(typeof nodeA.id).toBe("symbol");
      expect(nodeA.id).toBe(nodeA.id);
      expect(nodeA.id).not.toBe(nodeB.id);
    });
  });

  describe("Scenario: Standalone composite node (N = 0)", () => {
    it("Given a standalone node, When initialized, Then parent is null and children set is empty", async () => {
      const { node } = await renderSingleNodeFixture();

      expect(node.parent.value).toBeNull();
      expect(node.children.value.size).toBe(0);
    });

    it("Given a standalone node with elements, When contains is checked, Then it delegates to DOM containment of anchor and floating elements", async () => {
      const { anchorEl, floatingEl, insideAnchorEl, insideFloatingEl, outsideEl, node } =
        await renderContainmentFixture();

      expect(node.contains(anchorEl)).toBe(true);
      expect(node.contains(insideAnchorEl)).toBe(true);
      expect(node.contains(floatingEl)).toBe(true);
      expect(node.contains(insideFloatingEl)).toBe(true);
      expect(node.contains(outsideEl)).toBe(false);
      expect(node.contains(null)).toBe(false);
    });

    it("Given a standalone node, When traverse is called, Then it visits the node with depth 0", async () => {
      const { node } = await renderSingleNodeFixture();
      const visited: { node: FloatingNode; depth: number }[] = [];

      node.traverse((current, depth) => {
        visited.push({ node: current, depth });
      });

      expect(visited).toEqual([{ node, depth: 0 }]);
    });
  });

  describe("Scenario: Single-component nested hierarchy via parent option and traversal algorithms", () => {
    it("Given root and child nodes with parent option, When initialized, Then parent-child relationship is established declaratively", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });

      expect(childNode.parent.value).toBe(rootNode);
      expect(rootNode.children.value.has(childNode)).toBe(true);
    });

    it("Given a parent and child node, When contains is checked, Then it includes open descendant elements but ignores closed descendant elements", async () => {
      const { childAnchorEl, childFloatingEl, rootNode, childOpenRef } =
        await renderNestedContainmentFixture();

      // When child is closed, root does NOT consider childFloating inside root
      expect(rootNode.contains(childFloatingEl)).toBe(false);

      // When child opens, child elements are contained within root
      childOpenRef.value = true;
      expect(rootNode.contains(childAnchorEl)).toBe(true);
      expect(rootNode.contains(childFloatingEl)).toBe(true);
    });

    it("Given a tree with multiple branches, When target element matches in an early branch, Then contains terminates early without scanning subsequent branches", async () => {
      const { rootFloatingEl, child1FloatingEl, rootNode, child1Node, child2Node } =
        await renderMultiBranchContainmentFixture();

      const child1TraverseSpy = vi.spyOn(child1Node, "traverse");
      const child2TraverseSpy = vi.spyOn(child2Node, "traverse");

      // Target in root: neither child is scanned
      expect(rootNode.contains(rootFloatingEl)).toBe(true);
      expect(child1TraverseSpy).not.toHaveBeenCalled();
      expect(child2TraverseSpy).not.toHaveBeenCalled();

      // Target in child1: child1 is scanned, child2 is NOT scanned
      expect(rootNode.contains(child1FloatingEl)).toBe(true);
      expect(child1TraverseSpy).toHaveBeenCalledTimes(1);
      expect(child2TraverseSpy).not.toHaveBeenCalled();
    });

    it("Given a nested tree, When traverse executes top-down and returns 'skip', Then it prunes that branch and visits remaining branches", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNodeA = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      const childNodeB = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      const grandchildNodeA = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: childNodeA,
      });

      // Full top-down traversal
      const fullVisited: { node: FloatingNode; depth: number }[] = [];
      const completed = rootNode.traverse((node, depth) => {
        fullVisited.push({ node, depth });
      });

      expect(completed).toBe(true);
      expect(fullVisited).toEqual([
        { node: rootNode, depth: 0 },
        { node: childNodeA, depth: 1 },
        { node: grandchildNodeA, depth: 2 },
        { node: childNodeB, depth: 1 },
      ]);

      // Pruning: skip childNodeA's subtree but visit childNodeB
      const prunedVisited: FloatingNode[] = [];
      const prunedResult = rootNode.traverse((node) => {
        prunedVisited.push(node);
        if (node === childNodeA) {
          return "skip";
        }
      });

      expect(prunedResult).toBe(true);
      expect(prunedVisited).toEqual([rootNode, childNodeA, childNodeB]);
    });

    it("Given a nested tree, When traverse executes top-down and returns 'stop', Then it aborts traversal globally", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNodeA = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: childNodeA,
      });

      const visited: FloatingNode[] = [];
      const result = rootNode.traverse((node) => {
        visited.push(node);
        if (node === childNodeA) {
          return "stop";
        }
      });

      expect(result).toBe(false);
      // Aborted at childNodeA: neither grandchildNodeA nor childNodeB is visited
      expect(visited).toEqual([rootNode, childNodeA]);
    });

    it("Given a nested tree, When traverse executes bottom-up, Then it visits leaves before parents", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      const grandchildNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: childNode,
      });

      const visited: { node: FloatingNode; depth: number }[] = [];
      const result = rootNode.traverse(
        (node, depth) => {
          visited.push({ node, depth });
        },
        { order: "bottom-up" },
      );

      expect(result).toBe(true);
      expect(visited).toEqual([
        { node: grandchildNode, depth: 2 },
        { node: childNode, depth: 1 },
        { node: rootNode, depth: 0 },
      ]);
    });

    it("Given a nested tree, When traverse executes bottom-up and returns 'stop', Then it aborts traversal globally", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNodeA = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      const grandchildNodeA = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: childNodeA,
      });

      const visited: FloatingNode[] = [];
      const result = rootNode.traverse(
        (node) => {
          visited.push(node);
          if (node === grandchildNodeA) {
            return "stop";
          }
        },
        { order: "bottom-up" },
      );

      expect(result).toBe(false);
      // Aborted at grandchildNodeA: childNodeA, childNodeB, and root are not visited
      expect(visited).toEqual([grandchildNodeA]);
    });

    it("Given a nested tree, When traverse executes bottom-up and returns 'skip', Then it treats 'skip' as a safe no-op", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      const grandchildNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: childNode,
      });

      const visited: FloatingNode[] = [];
      const result = rootNode.traverse(
        (node) => {
          visited.push(node);
          if (node === grandchildNode) {
            return "skip";
          }
        },
        { order: "bottom-up" },
      );

      expect(result).toBe(true);
      expect(visited).toEqual([grandchildNode, childNode, rootNode]);
    });

    it("Given an open nested tree, When traverse collects active elements, Then it accumulates floating elements across open branches", async () => {
      const {
        rootFloatingEl,
        childFloatingEl,
        grandchildFloatingEl,
        rootNode,
        childOpenRef,
        grandchildOpenRef,
      } = await renderActiveTreeFixture();

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

      expect(collectFloatingElements(rootNode)).toEqual([rootFloatingEl, childFloatingEl]);

      grandchildOpenRef.value = true;
      expect(collectFloatingElements(rootNode)).toEqual([
        rootFloatingEl,
        childFloatingEl,
        grandchildFloatingEl,
      ]);

      childOpenRef.value = false;
      expect(collectFloatingElements(rootNode)).toEqual([rootFloatingEl]);
    });

    it("Given detached nodes, When appendChild and removeChild are called, Then it supports switching parent node imperatively", () => {
      const rootNode1 = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const rootNode2 = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode1,
      });

      expect(childNode.parent.value).toBe(rootNode1);
      expect(rootNode1.children.value.has(childNode)).toBe(true);
      expect(rootNode2.children.value.has(childNode)).toBe(false);

      // Re-parent to rootNode2 imperatively
      rootNode2.appendChild(childNode);

      expect(childNode.parent.value).toBe(rootNode2);
      expect(rootNode1.children.value.has(childNode)).toBe(false);
      expect(rootNode2.children.value.has(childNode)).toBe(true);

      // Detach imperatively
      rootNode2.removeChild(childNode);

      expect(childNode.parent.value).toBeNull();
      expect(rootNode2.children.value.has(childNode)).toBe(false);
    });
  });

  describe("Scenario: Multi-component prop-driven nested submenus", () => {
    it("Given a parent component, When child component mounts with :parent prop, Then it registers in parent.children and unregisters on unmount", async () => {
      let rootNode!: FloatingNode;
      let childNodeInstance: FloatingNode | null = null;
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
          childNodeInstance = childNode;
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

      expect(rootNode.children.value.has(childNodeInstance!)).toBe(true);
      expect(childNodeInstance!.parent.value).toBe(rootNode);

      // Unmount child component
      showChild.value = false;
      await nextTick();

      expect(rootNode.children.value.has(childNodeInstance!)).toBe(false);
      expect(childNodeInstance!.parent.value).toBeNull();
    });
  });

  describe("Scenario: Leaf-first Escape key dismissal", () => {
    it("Given a nested open stack with escape listeners, When Escape key is pressed sequentially, Then it unwinds layer-by-layer from deepest leaf to root", async () => {
      const rootOpen = ref(true);
      const childOpen = ref(true);
      const grandchildOpen = ref(true);

      const HierarchyComponent = defineComponent({
        setup() {
          const rootNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: rootOpen,
          });
          const childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: childOpen,
            parent: rootNode,
          });
          const grandchildNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            open: grandchildOpen,
            parent: childNode,
          });

          useEscapeKey(rootNode);
          useEscapeKey(childNode);
          useEscapeKey(grandchildNode);

          return () => h("div", "Hierarchy");
        },
      });

      await render(HierarchyComponent);

      // 1st Escape: Closes grandchild only
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);

      // 2nd Escape: Closes child only
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);

      // 3rd Escape: Closes root
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(grandchildOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(false);
    });
  });

  describe("Scenario: Teardown and unmount cleanup", () => {
    it("Given a child node, When its effect scope is disposed, Then it detaches from its parent", () => {
      const parentScope = effectScope();
      let rootNode!: FloatingNode;
      let childNode!: FloatingNode;

      parentScope.run(() => {
        rootNode = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });

        const childScope = effectScope();
        childScope.run(() => {
          childNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
            parent: rootNode,
          });
        });

        expect(rootNode.children.value.has(childNode)).toBe(true);
        expect(childNode.parent.value).toBe(rootNode);

        childScope.stop();

        expect(rootNode.children.value.has(childNode)).toBe(false);
        expect(childNode.parent.value).toBeNull();
      });

      parentScope.stop();
    });

    it("Given a parent node with children, When its effect scope is disposed, Then it clears all children linkages", () => {
      let childNode1!: FloatingNode;
      let childNode2!: FloatingNode;

      const parentScope = effectScope();
      parentScope.run(() => {
        const parentNode = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });

        childNode1 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: parentNode,
        });
        childNode2 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          parent: parentNode,
        });

        expect(parentNode.children.value.size).toBe(2);
        expect(childNode1.parent.value).toBe(parentNode);
        expect(childNode2.parent.value).toBe(parentNode);
      });

      parentScope.stop();

      expect(childNode1.parent.value).toBeNull();
      expect(childNode2.parent.value).toBeNull();
    });
  });

  describe("Scenario: Cycle detection and self-parenting prevention", () => {
    it("Given a node, When attempting to append node to itself, Then it warns and ignores the operation", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const node = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });

      node.appendChild(node);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("cannot be its own parent"));
      expect(node.parent.value).toBeNull();
      expect(node.children.value.has(node)).toBe(false);

      warnSpy.mockRestore();
    });

    it("Given an ancestor and child node, When attempting to append ancestor as child, Then it warns and ignores circular references", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });
      const grandchildNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: childNode,
      });

      // Attempting to append root as child of grandchild creates a cycle
      grandchildNode.appendChild(rootNode);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("cycle detected"));
      expect(grandchildNode.children.value.has(rootNode)).toBe(false);
      expect(rootNode.parent.value).toBeNull();

      warnSpy.mockRestore();
    });

    it("Given an already linked child node, When appendChild is called again, Then the operation is idempotent", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const childNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
      });

      expect(rootNode.children.value.size).toBe(1);

      rootNode.appendChild(childNode);
      expect(rootNode.children.value.size).toBe(1);
    });

    it("Given a non-child node, When removeChild is called, Then it safely ignores the call without throwing", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });
      const strangerNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
      });

      expect(() => rootNode.removeChild(strangerNode)).not.toThrow();
      expect(rootNode.children.value.size).toBe(0);
    });

    it("Given null or undefined parent option, When node is initialized, Then it initializes with null parent", () => {
      const nodeNull = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: null,
      });
      const nodeUndefined = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: undefined,
      });

      expect(nodeNull.parent.value).toBeNull();
      expect(nodeUndefined.parent.value).toBeNull();
    });

    it("Given sibling branches, When traverse is executed, Then it visits sibling branches in insertion order", () => {
      const rootNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        open: ref(true),
      });
      const branchANode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
        open: ref(true),
      });
      const branchBNode = useFloatingNode({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parent: rootNode,
        open: ref(true),
      });

      const visited: FloatingNode[] = [];
      rootNode.traverse((node) => {
        visited.push(node);
      });

      expect(visited).toEqual([rootNode, branchANode, branchBNode]);
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
      let grandparentNode!: FloatingNode;
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
            parent: "auto",
          });
          return () => h("div", { "data-testid": "parent" }, [h(ChildComponent)]);
        },
      });

      const GrandparentComponent = defineComponent({
        setup() {
          grandparentNode = useFloatingNode({
            anchorEl: ref(null),
            floatingEl: ref(null),
          });
          return () => h("div", { "data-testid": "grandparent" }, [h(ParentComponent)]);
        },
      });

      await render(GrandparentComponent);

      expect(parentNode.parent.value).toBe(grandparentNode);
      expect(childNode.parent.value).toBe(parentNode);
      expect(grandparentNode.children.value.has(parentNode)).toBe(true);
      expect(parentNode.children.value.has(childNode)).toBe(true);
      expect(grandparentNode.children.value.has(childNode)).toBe(false);
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
      const localScope = effectScope();
      let node!: FloatingNode;
      localScope.run(() => {
        node = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
        });
      });

      expect(node.parent.value).toBeNull();
      expect(node.children.value.size).toBe(0);
      localScope.stop();
    });
  });
});
