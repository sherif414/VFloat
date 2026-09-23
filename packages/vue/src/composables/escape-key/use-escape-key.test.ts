import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef, watch } from "vue";
import { useFloatingNode } from "@/composables";
import { getTestEl } from "@/test-utils";
import { type UseEscapeKeyOptions, useEscapeKey } from "./use-escape-key";

//=======================================================================================
// Fixtures
//=======================================================================================

function createTestComponent(
  options: UseEscapeKeyOptions = {},
  config: { defaultOpen?: boolean } = {},
) {
  const openRef = ref(config.defaultOpen ?? true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    const node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useEscapeKey(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating Content"),
        h("button", { "data-testid": "outside-btn" }, "External Button"),
        h("input", { "data-testid": "outside-input" }),
      ]);
  });

  return { Component, openRef };
}

function create3LevelLinearTreeComponent() {
  const rootOpen = ref(true);
  const subOpen = ref(true);
  const subSubOpen = ref(true);

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const subFloatingEl = useTemplateRef<HTMLElement>("sub-floating");
    const subSubFloatingEl = useTemplateRef<HTMLElement>("subsub-floating");

    const rootNode = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: rootOpen,
    });
    const subNode = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: subFloatingEl,
      open: subOpen,
      parent: rootNode,
    });
    const subSubNode = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: subSubFloatingEl,
      open: subSubOpen,
      parent: subNode,
    });

    useEscapeKey(rootNode);
    useEscapeKey(subNode);
    useEscapeKey(subSubNode);

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Trigger"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, [
          h("button", { "data-testid": "root-item" }, "Root Item"),
          h("div", { ref: "sub-floating", "data-testid": "sub-floating" }, [
            h("button", { "data-testid": "sub-item" }, "Sub Item"),
            h("div", { ref: "subsub-floating", "data-testid": "subsub-floating" }, [
              h("button", { "data-testid": "subsub-item" }, "SubSub Item"),
            ]),
          ]),
        ]),
        h("button", { "data-testid": "outside-btn" }, "Outside Button"),
      ]);
  });

  return { Component, rootOpen, subOpen, subSubOpen };
}

function createSiblingBranchesComponent() {
  const rootOpen = ref(true);
  const branchAOpen = ref(true);
  const branchBOpen = ref(true);
  const branchB1Open = ref(true);

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const branchAFloatingEl = useTemplateRef<HTMLElement>("branch-a-floating");
    const branchBFloatingEl = useTemplateRef<HTMLElement>("branch-b-floating");
    const branchB1FloatingEl = useTemplateRef<HTMLElement>("branch-b1-floating");

    const root = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: rootOpen,
    });
    const branchA = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: branchAFloatingEl,
      open: branchAOpen,
      parent: root,
    });
    const branchB = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: branchBFloatingEl,
      open: branchBOpen,
      parent: root,
    });
    const branchB1 = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: branchB1FloatingEl,
      open: branchB1Open,
      parent: branchB,
    });

    useEscapeKey(root);
    useEscapeKey(branchA);
    useEscapeKey(branchB);
    useEscapeKey(branchB1);

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Anchor"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, [
          h("div", { ref: "branch-a-floating", "data-testid": "branch-a-floating" }, [
            h("button", { "data-testid": "branch-a-item" }, "Branch A Item"),
          ]),
          h("div", { ref: "branch-b-floating", "data-testid": "branch-b-floating" }, [
            h("button", { "data-testid": "branch-b-item" }, "Branch B Item"),
            h("div", { ref: "branch-b1-floating", "data-testid": "branch-b1-floating" }, [
              h("button", { "data-testid": "branch-b1-item" }, "Branch B1 Item"),
            ]),
          ]),
        ]),
      ]);
  });

  return { Component, rootOpen, branchAOpen, branchBOpen, branchB1Open };
}

function createTwoIndependentTreesComponent() {
  const tree1RootOpen = ref(true);
  const tree1ChildOpen = ref(true);
  const tree2RootOpen = ref(true);
  const tree2ChildOpen = ref(true);

  const Component = defineComponent(() => {
    const t1RootAnchor = useTemplateRef<HTMLElement>("t1-anchor");
    const t1RootFloating = useTemplateRef<HTMLElement>("t1-floating");
    const t1ChildFloating = useTemplateRef<HTMLElement>("t1-child-floating");

    const t2RootAnchor = useTemplateRef<HTMLElement>("t2-anchor");
    const t2RootFloating = useTemplateRef<HTMLElement>("t2-floating");
    const t2ChildFloating = useTemplateRef<HTMLElement>("t2-child-floating");

    const tree1Root = useFloatingNode({
      anchorEl: t1RootAnchor,
      floatingEl: t1RootFloating,
      open: tree1RootOpen,
    });
    const tree1Child = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: t1ChildFloating,
      open: tree1ChildOpen,
      parent: tree1Root,
    });

    const tree2Root = useFloatingNode({
      anchorEl: t2RootAnchor,
      floatingEl: t2RootFloating,
      open: tree2RootOpen,
    });
    const tree2Child = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: t2ChildFloating,
      open: tree2ChildOpen,
      parent: tree2Root,
    });

    useEscapeKey(tree1Root);
    useEscapeKey(tree1Child);
    useEscapeKey(tree2Root);
    useEscapeKey(tree2Child);

    return () =>
      h("div", [
        // Tree 1
        h("div", [
          h("button", { ref: "t1-anchor", "data-testid": "t1-anchor" }, "Tree 1 Anchor"),
          h("div", { ref: "t1-floating", "data-testid": "t1-floating" }, [
            h("div", { ref: "t1-child-floating", "data-testid": "t1-child-floating" }, "T1 Child"),
          ]),
        ]),
        // Tree 2
        h("div", [
          h("button", { ref: "t2-anchor", "data-testid": "t2-anchor" }, "Tree 2 Anchor"),
          h("div", { ref: "t2-floating", "data-testid": "t2-floating" }, [
            h("div", { ref: "t2-child-floating", "data-testid": "t2-child-floating" }, [
              h("button", { "data-testid": "t2-target-button" }, "Tree 2 Target"),
            ]),
          ]),
        ]),
      ]);
  });

  return { Component, tree1RootOpen, tree1ChildOpen, tree2RootOpen, tree2ChildOpen };
}

function createPartiallyRegisteredTreeComponent() {
  const rootOpen = ref(true);
  const childOpen = ref(true);
  const subChildOpen = ref(true);

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");
    const subChildFloatingEl = useTemplateRef<HTMLElement>("subchild-floating");

    const rootNode = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: rootOpen,
    });
    const childNode = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: rootNode,
    });
    useFloatingNode({
      anchorEl: ref(null),
      floatingEl: subChildFloatingEl,
      open: subChildOpen,
      parent: childNode,
    });

    // Root and child register, but subChild deliberately does NOT register useEscapeKey
    useEscapeKey(rootNode);
    useEscapeKey(childNode);

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Trigger"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, [
          h("div", { ref: "child-floating", "data-testid": "child-floating" }, [
            h("div", { ref: "subchild-floating", "data-testid": "subchild-floating" }, [
              h("button", { "data-testid": "subchild-item" }, "SubChild Item"),
            ]),
          ]),
        ]),
        h("button", { "data-testid": "outside-btn" }, "Outside Button"),
      ]);
  });

  return { Component, rootOpen, childOpen, subChildOpen };
}

function createRootOnlyRegisteredTreeComponent() {
  const rootOpen = ref(true);
  const childOpen = ref(true);

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const rootNode = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: rootOpen,
    });
    useFloatingNode({
      anchorEl: ref(null),
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: rootNode,
    });

    // Only root registers useEscapeKey
    useEscapeKey(rootNode);

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Trigger"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, [
          h("div", { ref: "child-floating", "data-testid": "child-floating" }, [
            h("button", { "data-testid": "child-item" }, "Child Item"),
          ]),
        ]),
        h("button", { "data-testid": "outside-btn" }, "Outside Button"),
      ]);
  });

  return { Component, rootOpen, childOpen };
}

function createEqualDepthSiblingsComponent() {
  const rootOpen = ref(true);
  const branchAOpen = ref(false);
  const branchBOpen = ref(false);

  const Component = defineComponent(() => {
    const rootAnchorEl = useTemplateRef<HTMLElement>("root-anchor");
    const rootFloatingEl = useTemplateRef<HTMLElement>("root-floating");
    const branchAFloatingEl = useTemplateRef<HTMLElement>("branch-a-floating");
    const branchBFloatingEl = useTemplateRef<HTMLElement>("branch-b-floating");

    const root = useFloatingNode({
      anchorEl: rootAnchorEl,
      floatingEl: rootFloatingEl,
      open: rootOpen,
    });
    const branchA = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: branchAFloatingEl,
      open: branchAOpen,
      parent: root,
    });
    const branchB = useFloatingNode({
      anchorEl: ref(null),
      floatingEl: branchBFloatingEl,
      open: branchBOpen,
      parent: root,
    });

    useEscapeKey(root);
    useEscapeKey(branchA);
    useEscapeKey(branchB);

    return () =>
      h("div", [
        h("button", { ref: "root-anchor", "data-testid": "root-anchor" }, "Root Anchor"),
        h("div", { ref: "root-floating", "data-testid": "root-floating" }, [
          h("div", { ref: "branch-a-floating", "data-testid": "branch-a-floating" }, [
            h("button", { "data-testid": "branch-a-item" }, "Branch A Item"),
          ]),
          h("div", { ref: "branch-b-floating", "data-testid": "branch-b-floating" }, [
            h("button", { "data-testid": "branch-b-item" }, "Branch B Item"),
          ]),
        ]),
        h("button", { "data-testid": "outside-btn" }, "Outside Button"),
      ]);
  });

  return { Component, rootOpen, branchAOpen, branchBOpen };
}

//=======================================================================================
// Tests
//=======================================================================================

const SAFARI_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

describe("Feature: useEscapeKey", () => {
  const originalUserAgent = window.navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Dismissing single floating element on Escape", () => {
    it("Given an open floating element, When Escape is pressed, Then closes the floating element", async () => {
      // Given
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();
      expect(fixture.openRef.value).toBe(true);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(false);
    });

    it("Given a floating element that is already closed, When Escape is pressed, Then preserves closed state", async () => {
      // Given
      const fixture = createTestComponent({}, { defaultOpen: false });
      await render(fixture.Component);
      await nextTick();
      expect(fixture.openRef.value).toBe(false);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(false);
    });

    it("Given enabled is false, When Escape is pressed, Then ignores the keypress and stays open", async () => {
      // Given
      const fixture = createTestComponent({ enabled: false });
      await render(fixture.Component);
      await nextTick();
      expect(fixture.openRef.value).toBe(true);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given enabled is a reactive ref, When enabled toggles between true and false, Then synchronizes Escape handling", async () => {
      // Given
      const enabled = ref(true);
      const fixture = createTestComponent({ enabled });
      await render(fixture.Component);
      await nextTick();

      // When enabled is true, Escape closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.openRef.value).toBe(false);

      // When re-opened and disabled
      fixture.openRef.value = true;
      enabled.value = false;
      await nextTick();

      // When Escape is pressed while disabled
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then remains open
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given defaultPrevented was called by an earlier listener, When Escape is pressed, Then ignores dismissal", async () => {
      // Given
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
        }
      };
      document.addEventListener("keydown", onKeyDown, { capture: true });

      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      document.removeEventListener("keydown", onKeyDown, { capture: true });

      // Then
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given a custom onEscape callback, When Escape is pressed, Then invokes onEscape without mutating open state", async () => {
      // Given
      const customHandler = vi.fn();
      const fixture = createTestComponent({ onEscape: customHandler });
      await render(fixture.Component);
      await nextTick();

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(customHandler).toHaveBeenCalled();
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given a custom onEscape callback, When Escape is claimed, Then stops propagation to outer window listeners", async () => {
      // Given
      const customHandler = vi.fn();
      const outerTargetListener = vi.fn();
      const outerWindowListener = vi.fn();

      document.addEventListener("keydown", (event) => {
        event.target?.addEventListener("keydown", outerTargetListener);
      });
      window.addEventListener("keydown", outerWindowListener);

      const fixture = createTestComponent({ onEscape: customHandler });
      await render(fixture.Component);
      await nextTick();

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      window.removeEventListener("keydown", outerWindowListener);

      // Then
      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(outerTargetListener).not.toHaveBeenCalled();
      expect(outerWindowListener).not.toHaveBeenCalled();
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given non-Escape keys are pressed, When Enter or Space is pressed, Then ignores them and stays open", async () => {
      // Given
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      // When
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given capture option is true, When Escape is pressed, Then intercepts in the capture phase and closes", async () => {
      // Given
      const fixture = createTestComponent({ capture: true });
      await render(fixture.Component);
      await nextTick();

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(false);
    });

    it("Given preventDefault is true, When Escape is pressed, Then marks the event as defaultPrevented and closes", async () => {
      // Given
      const fixture = createTestComponent({ preventDefault: true });
      await render(fixture.Component);
      await nextTick();

      // When
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
      await nextTick();

      // Then
      expect(event.defaultPrevented).toBe(true);
      expect(fixture.openRef.value).toBe(false);
    });
  });

  describe("Scenario: IME composition event handling", () => {
    it("Given an active composition session, When Escape is pressed, Then ignores dismissal until composition ends", async () => {
      // Given
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      // Start composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // When: Escape during composition
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Remains open
      expect(fixture.openRef.value).toBe(true);

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // When: Escape after composition
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Closes
      expect(fixture.openRef.value).toBe(false);
    });

    it("Given multiple consumers, When rendered together, Then shares a single composition listener on document", async () => {
      // Given
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const f1 = createTestComponent();
      const f2 = createTestComponent();

      // When
      await render(f1.Component);
      await render(f2.Component);
      await nextTick();

      // Then
      const compositionListeners = addEventListenerSpy.mock.calls.filter(
        ([type]) => type === "compositionstart" || type === "compositionend",
      );
      expect(compositionListeners).toHaveLength(2);

      addEventListenerSpy.mockRestore();
    });
  });

  describe("Scenario: Hierarchical multi-level tree unwinding", () => {
    it("Given a 3-level linear floating hierarchy, When Escape is pressed repeatedly, Then closes from deepest leaf to root", async () => {
      // Given
      const calls: string[] = [];
      const fixture = create3LevelLinearTreeComponent();

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subSubOpen,
        (open) => {
          if (!open) calls.push("subsub");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      // When: 1st Escape -> deepest (subsub)
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // When: 2nd Escape -> middle (sub)
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // When: 3rd Escape -> root
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.rootOpen.value).toBe(false);
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.subSubOpen.value).toBe(false);
      expect(calls).toEqual(["subsub", "sub", "root"]);
    });

    it("Given sibling floating branches, When Escape is pressed, Then closes the deepest open descendant across branches", async () => {
      // Given
      const calls: string[] = [];
      const fixture = createSiblingBranchesComponent();

      watch(
        fixture.branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchB1Open,
        (open) => {
          if (!open) calls.push("branch-b1");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.branchBOpen.value).toBe(true);
      expect(fixture.branchB1Open.value).toBe(false);
      expect(calls).toEqual(["branch-b1"]);
    });

    it("Given focus inside a specific sibling branch, When Escape is pressed, Then closes the focused branch and preserves inactive branch", async () => {
      // Given
      const fixture = createSiblingBranchesComponent();
      await render(fixture.Component);
      await nextTick();

      const branchBItemEl = getTestEl("branch-b-item");
      await userEvent.click(branchBItemEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.branchB1Open.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
    });

    it("Given two independent trees with focus inside Tree 2, When Escape is pressed, Then closes Tree 2 without affecting Tree 1", async () => {
      // Given
      const calls: string[] = [];
      const fixture = createTwoIndependentTreesComponent();

      watch(
        fixture.tree1ChildOpen,
        (open) => {
          if (!open) calls.push("tree1-child");
        },
        { flush: "sync" },
      );
      watch(
        fixture.tree2ChildOpen,
        (open) => {
          if (!open) calls.push("tree2-child");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const t2TargetEl = getTestEl("t2-target-button");
      await userEvent.click(t2TargetEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.tree1ChildOpen.value).toBe(true);
      expect(fixture.tree1RootOpen.value).toBe(true);
      expect(fixture.tree2ChildOpen.value).toBe(false);
      expect(fixture.tree2RootOpen.value).toBe(true);
      expect(calls).toEqual(["tree2-child"]);
    });

    it("Given focus is neutral on document body, When Escape is pressed, Then unwinds the most recently opened tree leaf-first", async () => {
      // Given
      const fixture = createTwoIndependentTreesComponent();
      await render(fixture.Component);
      await nextTick();

      // When: Neutral target on document body
      document.body.focus();
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Most recently opened tree (tree 2) unwinds its leaf
      expect(fixture.tree2ChildOpen.value).toBe(false);
      expect(fixture.tree2RootOpen.value).toBe(true);
      expect(fixture.tree1ChildOpen.value).toBe(true);
      expect(fixture.tree1RootOpen.value).toBe(true);
    });

    it("Given target is the root anchor element, When Escape is pressed, Then closes open child and preserves root", async () => {
      // Given
      const calls: string[] = [];
      const fixture = create3LevelLinearTreeComponent();
      fixture.subSubOpen.value = false;

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const rootAnchorEl = getTestEl("root-anchor");
      await userEvent.click(rootAnchorEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);
    });

    it("Given target is inside root floating element, When Escape is pressed, Then closes child and preserves root", async () => {
      // Given
      const calls: string[] = [];
      const fixture = create3LevelLinearTreeComponent();
      fixture.subSubOpen.value = false;

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const rootItemEl = getTestEl("root-item");
      await userEvent.click(rootItemEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);
    });

    it("Given target is inside middle level of 3-level tree, When Escape is pressed, Then closes leaf-first", async () => {
      // Given
      const calls: string[] = [];
      const fixture = create3LevelLinearTreeComponent();

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subSubOpen,
        (open) => {
          if (!open) calls.push("subsub");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const subItemEl = getTestEl("sub-item");
      await userEvent.click(subItemEl);

      // When: 1st Escape -> subsub closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.subSubOpen.value).toBe(false);
      expect(fixture.subOpen.value).toBe(true);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub"]);

      // When: 2nd Escape -> sub closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub", "sub"]);
    });

    it("Given target is inside a sibling branch, When Escape is pressed, Then unwinds the branch cleanly", async () => {
      // Given
      const calls: string[] = [];
      const fixture = createSiblingBranchesComponent();

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchB1Open,
        (open) => {
          if (!open) calls.push("branch-b1");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const branchBItemEl = getTestEl("branch-b-item");
      await userEvent.click(branchBItemEl);

      // When: 1st Escape -> branchB1 closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchB1Open.value).toBe(false);
      expect(fixture.branchBOpen.value).toBe(true);
      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1"]);

      // When: 2nd Escape -> branchB closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchBOpen.value).toBe(false);
      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1", "branch-b"]);
    });

    it("Given focus on an external page button, When Escape is pressed, Then closes open floating element", async () => {
      // Given
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const outsideBtnEl = getTestEl("outside-btn");
      await userEvent.click(outsideBtnEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(false);
    });

    it("Given focus on an external text input, When Escape is pressed, Then closes open floating element", async () => {
      // Given
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const outsideInputEl = getTestEl("outside-input");
      await userEvent.click(outsideInputEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(false);
    });

    it("Given focus on an external button with a multi-level tree, When Escape is pressed repeatedly, Then unwinds leaf-first", async () => {
      // Given
      const calls: string[] = [];
      const fixture = create3LevelLinearTreeComponent();
      fixture.subSubOpen.value = false;

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const outsideBtnEl = getTestEl("outside-btn");
      await userEvent.click(outsideBtnEl);

      // When: 1st Escape -> child leaf closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);

      // When: 2nd Escape -> root closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(false);
      expect(calls).toEqual(["sub", "root"]);
    });

    it("Given an unregistered child node, When Escape is pressed, Then gracefully unwinds to nearest registered ancestor", async () => {
      // Given
      const fixture = createRootOnlyRegisteredTreeComponent();
      await render(fixture.Component);
      await nextTick();

      const childItemEl = getTestEl("child-item");
      await userEvent.click(childItemEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Root closes gracefully
      expect(fixture.rootOpen.value).toBe(false);
    });

    it("Given deepest leaf did not register useEscapeKey, When Escape is pressed, Then unwinds 3-level tree leaf-first via parent", async () => {
      // Given
      const calls: string[] = [];
      const fixture = createPartiallyRegisteredTreeComponent();

      watch(
        fixture.rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        fixture.childOpen,
        (open) => {
          if (!open) calls.push("child");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      const subchildItemEl = getTestEl("subchild-item");
      await userEvent.click(subchildItemEl);

      // When: 1st Escape -> childNode closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.childOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["child"]);

      // When: 2nd Escape -> root closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.rootOpen.value).toBe(false);
      expect(calls).toEqual(["child", "root"]);
    });

    it("Given equal-depth sibling branches (branch B opened after branch A), When Escape is pressed, Then closes branch B first via LIFO stack order", async () => {
      // Given
      const calls: string[] = [];
      const fixture = createEqualDepthSiblingsComponent();

      watch(
        fixture.branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      // Open branch A first, then branch B second (branch B is topmost on the stack)
      fixture.branchAOpen.value = true;
      await nextTick();
      fixture.branchBOpen.value = true;
      await nextTick();

      const outsideBtnEl = getTestEl("outside-btn");
      await userEvent.click(outsideBtnEl);

      // When: 1st Escape -> Branch B closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchBOpen.value).toBe(false);
      expect(fixture.branchAOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b"]);

      // When: 2nd Escape -> Branch A closes next
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchAOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b", "branch-a"]);
    });

    it("Given equal-depth sibling branches (branch A opened after branch B), When Escape is pressed, Then closes branch A first via LIFO stack order", async () => {
      // Given
      const calls: string[] = [];
      const fixture = createEqualDepthSiblingsComponent();

      watch(
        fixture.branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        fixture.branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );

      await render(fixture.Component);
      await nextTick();

      // Open branch B first, then branch A second (branch A is topmost on the stack)
      fixture.branchBOpen.value = true;
      await nextTick();
      fixture.branchAOpen.value = true;
      await nextTick();

      const outsideBtnEl = getTestEl("outside-btn");
      await userEvent.click(outsideBtnEl);

      // When: 1st Escape -> Branch A closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchAOpen.value).toBe(false);
      expect(fixture.branchBOpen.value).toBe(true);
      expect(calls).toEqual(["branch-a"]);

      // When: 2nd Escape -> Branch B closes next
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchBOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-a", "branch-b"]);
    });
  });

  describe("Scenario: WebKit composition resilience (WebKit Bug 165004)", () => {
    it("Given event.isComposing or keyCode 229, When Escape is pressed, Then ignores dismissal", async () => {
      // Given
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const anchorEl = getTestEl("anchor");
      await userEvent.click(anchorEl);

      // When: Standard browser IME keydown with isComposing: true
      const composingEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(composingEvent, "isComposing", { value: true });
      anchorEl.dispatchEvent(composingEvent);
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(true);

      // When: Standard legacy IME keyCode 229
      const keyCode229Event = new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 229,
        bubbles: true,
        cancelable: true,
      });
      anchorEl.dispatchEvent(keyCode229Event);
      await nextTick();

      // Then
      expect(fixture.openRef.value).toBe(true);
    });

    it("Given WebKit Bug 165004 firing compositionend before keydown, When Escape is pressed to dismiss IME candidate list, Then prevents premature dismissal", async () => {
      // Given
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: SAFARI_USER_AGENT,
      });

      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const anchorEl = getTestEl("anchor");
      await userEvent.click(anchorEl);

      // Start IME composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // WebKit fires compositionend immediately followed by trailing keydown
      document.dispatchEvent(new CompositionEvent("compositionend"));

      const trailingKeydown = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      anchorEl.dispatchEvent(trailingKeydown);
      await nextTick();

      // Then: Floating element remains open
      expect(fixture.openRef.value).toBe(true);

      // Wait for debounce window (5ms) to pass
      await new Promise((resolve) => setTimeout(resolve, 20));

      // When: Subsequent Escape keypress arrives
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Closes normally
      expect(fixture.openRef.value).toBe(false);
    });
  });

  describe("Scenario: Shared per-document listener architecture", () => {
    it("Given an overlay is initially closed, When opened and then closed, Then attaches listener only while open", async () => {
      // Given
      const addSpy = vi.spyOn(document, "addEventListener");
      const removeSpy = vi.spyOn(document, "removeEventListener");

      const fixture = createTestComponent({}, { defaultOpen: false });
      await render(fixture.Component);
      await nextTick();

      const escapeKeydownAdds = () => addSpy.mock.calls.filter(([event]) => event === "keydown");
      const escapeKeydownRemoves = () =>
        removeSpy.mock.calls.filter(([event]) => event === "keydown");

      // Closed initially: no keydown listener attached
      expect(escapeKeydownAdds().length).toBe(0);

      // When: Opened
      fixture.openRef.value = true;
      await nextTick();

      // Then: Exactly 1 keydown listener attached
      expect(escapeKeydownAdds().length).toBe(1);

      // When: Closed
      fixture.openRef.value = false;
      await nextTick();

      // Then: Listener removed
      expect(escapeKeydownRemoves().length).toBe(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("Given multiple open overlays, When active simultaneously, Then shares a single document keydown listener", async () => {
      // Given
      const addSpy = vi.spyOn(document, "addEventListener");

      const fixture = create3LevelLinearTreeComponent();
      await render(fixture.Component);
      await nextTick();

      // Then: Exactly 1 bubble keydown listener on document despite 3 active overlays
      const keydownAdds = addSpy.mock.calls.filter(([event]) => event === "keydown");
      expect(keydownAdds.length).toBe(1);

      addSpy.mockRestore();
    });

    it("Given an inner element that stops propagation, When in bubble phase vs capture phase, Then respects stopPropagation in bubble but intercepts in capture", async () => {
      // Bubble phase (default)
      const bubbleFixture = createTestComponent();
      await render(bubbleFixture.Component);
      await nextTick();

      const outsideInputEl = getTestEl("outside-input");
      outsideInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
        }
      });

      await userEvent.click(outsideInputEl);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Bubble phase respects inner element's stopPropagation
      expect(bubbleFixture.openRef.value).toBe(true);

      // Capture phase
      const captureFixture = createTestComponent({ capture: true });
      await render(captureFixture.Component);
      await nextTick();

      const captureOutsideInputEl = document.querySelectorAll<HTMLInputElement>(
        "[data-testid='outside-input']",
      )[1];
      expect(captureOutsideInputEl).toBeDefined();

      captureOutsideInputEl!.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
        }
      });

      await userEvent.click(captureOutsideInputEl!);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Capture phase intercepts before inner element
      expect(captureFixture.openRef.value).toBe(false);
    });

    it("Given retargeted Shadow DOM events, When Escape is pressed, Then resolves the originating target via composedPath", async () => {
      // Given
      const fixture = createTwoIndependentTreesComponent();
      await render(fixture.Component);
      await nextTick();

      const shadowTargetEl = getTestEl("t2-target-button");
      const retargetedHostEl = getTestEl("t2-floating");
      const retargetedEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(retargetedEvent, "target", {
        configurable: true,
        value: retargetedHostEl,
      });
      Object.defineProperty(retargetedEvent, "composedPath", {
        configurable: true,
        value: () => [shadowTargetEl, retargetedHostEl, document.body, document],
      });

      // When
      document.dispatchEvent(retargetedEvent);
      await nextTick();

      // Then: Tree 2 owns composed target, so it unwinds while Tree 1 stays open
      expect(fixture.tree2ChildOpen.value).toBe(false);
      expect(fixture.tree2RootOpen.value).toBe(true);
      expect(fixture.tree1ChildOpen.value).toBe(true);
      expect(fixture.tree1RootOpen.value).toBe(true);
    });

    it("Given synthetic events with empty composedPath, When Escape is pressed, Then falls back to event.target", async () => {
      // Given
      const fixture = createTwoIndependentTreesComponent();
      await render(fixture.Component);
      await nextTick();

      const treeBButtonEl = getTestEl("t2-target-button");
      const emptyPathEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(emptyPathEvent, "composedPath", {
        configurable: true,
        value: () => [] as EventTarget[],
      });

      // When
      treeBButtonEl.dispatchEvent(emptyPathEvent);
      await nextTick();

      // Then
      expect(fixture.tree2ChildOpen.value).toBe(false);
      expect(fixture.tree2RootOpen.value).toBe(true);
      expect(fixture.tree1ChildOpen.value).toBe(true);
      expect(fixture.tree1RootOpen.value).toBe(true);
    });

    it("Given onEscape callback is updated dynamically while overlay is open, When Escape is pressed, Then executes the updated callback", async () => {
      // Given
      const calls: string[] = [];
      const options: UseEscapeKeyOptions = {
        onEscape: () => {
          calls.push("initial");
        },
      };

      const fixture = createTestComponent(options);
      await render(fixture.Component);
      await nextTick();

      // When: Mutate callback dynamically
      options.onEscape = () => {
        calls.push("updated");
      };

      const anchorEl = getTestEl("anchor");
      await userEvent.click(anchorEl);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Updated callback was executed
      expect(calls).toEqual(["updated"]);
    });
  });
});
