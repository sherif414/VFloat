import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef, watch } from "vue";
import { type FloatingNode, useFloatingNode } from "@/composables";
import { getTestEl } from "@/test-utils";
import { type UseEscapeKeyOptions, useEscapeKey } from "./use-escape-key";

//=======================================================================================
// Fixtures
//=======================================================================================

interface FixtureConfig {
  defaultOpen?: boolean;
}

function createTestComponent(options: UseEscapeKeyOptions = {}, config: FixtureConfig = {}) {
  const openRef = ref(config.defaultOpen ?? true);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useEscapeKey(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h(
          "button",
          {
            ref: "anchor",
            "data-testid": "anchor",
            "aria-expanded": String(openRef.value),
          },
          "Anchor",
        ),
        openRef.value
          ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating Content")
          : null,
        h("button", { "data-testid": "outside-btn" }, "External Button"),
        h("input", { "data-testid": "outside-input" }),
      ]);
  });

  return { Component, getNode: () => node, openRef };
}

async function renderEscapeKey(options: UseEscapeKeyOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    outsideBtnEl: page.getByTestId("outside-btn"),
    outsideInputEl: page.getByTestId("outside-input"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

async function render3LevelLinearTree(config: { defaultSubSubOpen?: boolean } = {}) {
  const rootOpen = ref(true);
  const subOpen = ref(true);
  const subSubOpen = ref(config.defaultSubSubOpen ?? true);

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

  await render(Component);
  await nextTick();

  return {
    rootAnchorEl: page.getByTestId("root-anchor"),
    rootFloatingEl: page.getByTestId("root-floating"),
    rootItemEl: page.getByTestId("root-item"),
    subFloatingEl: page.getByTestId("sub-floating"),
    subItemEl: page.getByTestId("sub-item"),
    subSubFloatingEl: page.getByTestId("subsub-floating"),
    subSubItemEl: page.getByTestId("subsub-item"),
    outsideBtnEl: page.getByTestId("outside-btn"),
    rootOpen,
    subOpen,
    subSubOpen,
  };
}

async function renderSiblingBranches() {
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

  await render(Component);
  await nextTick();

  return {
    rootAnchorEl: page.getByTestId("root-anchor"),
    rootFloatingEl: page.getByTestId("root-floating"),
    branchAFloatingEl: page.getByTestId("branch-a-floating"),
    branchAItemEl: page.getByTestId("branch-a-item"),
    branchBFloatingEl: page.getByTestId("branch-b-floating"),
    branchBItemEl: page.getByTestId("branch-b-item"),
    branchB1FloatingEl: page.getByTestId("branch-b1-floating"),
    branchB1ItemEl: page.getByTestId("branch-b1-item"),
    rootOpen,
    branchAOpen,
    branchBOpen,
    branchB1Open,
  };
}

async function renderTwoIndependentTrees() {
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

  await render(Component);
  await nextTick();

  return {
    t1AnchorEl: page.getByTestId("t1-anchor"),
    t1FloatingEl: page.getByTestId("t1-floating"),
    t1ChildFloatingEl: page.getByTestId("t1-child-floating"),
    t2AnchorEl: page.getByTestId("t2-anchor"),
    t2FloatingEl: page.getByTestId("t2-floating"),
    t2ChildFloatingEl: page.getByTestId("t2-child-floating"),
    t2TargetBtnEl: page.getByTestId("t2-target-button"),
    tree1RootOpen,
    tree1ChildOpen,
    tree2RootOpen,
    tree2ChildOpen,
  };
}

async function renderPartiallyRegisteredTree() {
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

  await render(Component);
  await nextTick();

  return {
    rootAnchorEl: page.getByTestId("root-anchor"),
    subchildItemEl: page.getByTestId("subchild-item"),
    outsideBtnEl: page.getByTestId("outside-btn"),
    rootOpen,
    childOpen,
    subChildOpen,
  };
}

async function renderRootOnlyRegisteredTree() {
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

  await render(Component);
  await nextTick();

  return {
    rootAnchorEl: page.getByTestId("root-anchor"),
    childItemEl: page.getByTestId("child-item"),
    outsideBtnEl: page.getByTestId("outside-btn"),
    rootOpen,
    childOpen,
  };
}

async function renderEqualDepthSiblings() {
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

  await render(Component);
  await nextTick();

  return {
    rootAnchorEl: page.getByTestId("root-anchor"),
    outsideBtnEl: page.getByTestId("outside-btn"),
    branchAItemEl: page.getByTestId("branch-a-item"),
    branchBItemEl: page.getByTestId("branch-b-item"),
    rootOpen,
    branchAOpen,
    branchBOpen,
  };
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
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
    });

    it("Given a floating element that is already closed, When Escape is pressed, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey({}, { defaultOpen: false });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
    });

    it("Given enabled is false, When Escape is pressed, Then ignores the keypress and stays open", async () => {
      // Given
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey({ enabled: false });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);
    });

    it("Given enabled is a reactive ref, When enabled toggles between true and false, Then synchronizes Escape handling", async () => {
      // Given
      const enabled = ref(true);
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey({ enabled });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When enabled is true, Escape closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);

      // When re-opened and disabled
      openRef.value = true;
      enabled.value = false;
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Escape is pressed while disabled
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);
    });

    it("Given defaultPrevented was called by an earlier listener, When Escape is pressed, Then ignores dismissal", async () => {
      // Given
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
        }
      };
      document.addEventListener("keydown", onKeyDown, { capture: true });

      const { anchorEl, floatingEl, openRef } = await renderEscapeKey();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      document.removeEventListener("keydown", onKeyDown, { capture: true });

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);
    });

    it("Given a custom onEscape callback, When Escape is pressed, Then invokes onEscape without mutating open state", async () => {
      // Given
      const customHandler = vi.fn();
      const { openRef } = await renderEscapeKey({ onEscape: customHandler });

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(customHandler).toHaveBeenCalled();
      expect(openRef.value).toBe(true);
    });

    it("Given a custom onEscape callback, When Escape is claimed, Then stops propagation to outer window listeners", async () => {
      // Given
      const customHandler = vi.fn();
      const outerTargetListener = vi.fn();
      const outerWindowListener = vi.fn();

      const onDocKeydown = (event: Event) => {
        event.target?.addEventListener("keydown", outerTargetListener as EventListener);
      };
      document.addEventListener("keydown", onDocKeydown);
      window.addEventListener("keydown", outerWindowListener);

      const { anchorEl, openRef } = await renderEscapeKey({ onEscape: customHandler });

      // When
      await userEvent.click(anchorEl);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      document.removeEventListener("keydown", onDocKeydown);
      window.removeEventListener("keydown", outerWindowListener);

      // Then
      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(outerTargetListener).not.toHaveBeenCalled();
      expect(outerWindowListener).not.toHaveBeenCalled();
      expect(openRef.value).toBe(true);
    });

    it("Given non-Escape keys are pressed, When Enter or Space is pressed, Then ignores them and stays open", async () => {
      // Given
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey();

      // When
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);
    });

    it("Given capture option is true, When Escape is pressed, Then intercepts in the capture phase and closes", async () => {
      // Given
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey({ capture: true });

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
    });

    it("Given preventDefault is true, When Escape is pressed, Then marks the event as defaultPrevented and closes", async () => {
      // Given
      const { floatingEl, openRef } = await renderEscapeKey({ preventDefault: true });

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
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
    });
  });

  describe("Scenario: IME composition event handling", () => {
    it("Given an active composition session, When Escape is pressed, Then ignores dismissal until composition ends", async () => {
      // Given
      const { anchorEl, floatingEl, openRef } = await renderEscapeKey();

      // Start composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // When: Escape during composition
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
      expect(openRef.value).toBe(true);

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // When: Escape after composition
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
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
      const { rootOpen, subOpen, subSubOpen } = await render3LevelLinearTree();

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );
      watch(
        subSubOpen,
        (open) => {
          if (!open) calls.push("subsub");
        },
        { flush: "sync" },
      );

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
      expect(rootOpen.value).toBe(false);
      expect(subOpen.value).toBe(false);
      expect(subSubOpen.value).toBe(false);
      expect(calls).toEqual(["subsub", "sub", "root"]);
    });

    it("Given sibling floating branches, When Escape is pressed, Then closes the deepest open descendant across branches", async () => {
      // Given
      const calls: string[] = [];
      const { branchAOpen, branchBOpen, branchB1Open } = await renderSiblingBranches();

      watch(
        branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );
      watch(
        branchB1Open,
        (open) => {
          if (!open) calls.push("branch-b1");
        },
        { flush: "sync" },
      );

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(branchAOpen.value).toBe(true);
      expect(branchBOpen.value).toBe(true);
      expect(branchB1Open.value).toBe(false);
      expect(calls).toEqual(["branch-b1"]);
    });

    it("Given focus inside a specific sibling branch, When Escape is pressed, Then closes the focused branch and preserves inactive branch", async () => {
      // Given
      const { branchBItemEl, branchAOpen, branchB1Open, rootOpen } = await renderSiblingBranches();

      await userEvent.click(branchBItemEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(branchAOpen.value).toBe(true);
      expect(branchB1Open.value).toBe(false);
      expect(rootOpen.value).toBe(true);
    });

    it("Given two independent trees with focus inside Tree 2, When Escape is pressed, Then closes Tree 2 without affecting Tree 1", async () => {
      // Given
      const calls: string[] = [];
      const { t2TargetBtnEl, tree1ChildOpen, tree1RootOpen, tree2ChildOpen, tree2RootOpen } =
        await renderTwoIndependentTrees();

      watch(
        tree1ChildOpen,
        (open) => {
          if (!open) calls.push("tree1-child");
        },
        { flush: "sync" },
      );
      watch(
        tree2ChildOpen,
        (open) => {
          if (!open) calls.push("tree2-child");
        },
        { flush: "sync" },
      );

      await userEvent.click(t2TargetBtnEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(tree1ChildOpen.value).toBe(true);
      expect(tree1RootOpen.value).toBe(true);
      expect(tree2ChildOpen.value).toBe(false);
      expect(tree2RootOpen.value).toBe(true);
      expect(calls).toEqual(["tree2-child"]);
    });

    it("Given focus is neutral on document body, When Escape is pressed, Then unwinds the most recently opened tree leaf-first", async () => {
      // Given
      const { tree1ChildOpen, tree1RootOpen, tree2ChildOpen, tree2RootOpen } =
        await renderTwoIndependentTrees();

      // When: Neutral target on document body
      document.body.focus();
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Most recently opened tree (tree 2) unwinds its leaf
      expect(tree2ChildOpen.value).toBe(false);
      expect(tree2RootOpen.value).toBe(true);
      expect(tree1ChildOpen.value).toBe(true);
      expect(tree1RootOpen.value).toBe(true);
    });

    it("Given target is the root anchor element, When Escape is pressed, Then closes open child and preserves root", async () => {
      // Given
      const calls: string[] = [];
      const { rootAnchorEl, rootOpen, subOpen } = await render3LevelLinearTree({
        defaultSubSubOpen: false,
      });

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );

      await userEvent.click(rootAnchorEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(subOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);
    });

    it("Given target is inside root floating element, When Escape is pressed, Then closes child and preserves root", async () => {
      // Given
      const calls: string[] = [];
      const { rootItemEl, rootOpen, subOpen } = await render3LevelLinearTree({
        defaultSubSubOpen: false,
      });

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );

      await userEvent.click(rootItemEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(subOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);
    });

    it("Given target is inside middle level of 3-level tree, When Escape is pressed, Then closes leaf-first", async () => {
      // Given
      const calls: string[] = [];
      const { subItemEl, rootOpen, subOpen, subSubOpen } = await render3LevelLinearTree();

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );
      watch(
        subSubOpen,
        (open) => {
          if (!open) calls.push("subsub");
        },
        { flush: "sync" },
      );

      await userEvent.click(subItemEl);

      // When: 1st Escape -> subsub closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(subSubOpen.value).toBe(false);
      expect(subOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub"]);

      // When: 2nd Escape -> sub closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(subOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub", "sub"]);
    });

    it("Given target is inside a sibling branch, When Escape is pressed, Then unwinds the branch cleanly", async () => {
      // Given
      const calls: string[] = [];
      const { branchBItemEl, rootOpen, branchAOpen, branchBOpen, branchB1Open } =
        await renderSiblingBranches();

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );
      watch(
        branchB1Open,
        (open) => {
          if (!open) calls.push("branch-b1");
        },
        { flush: "sync" },
      );

      await userEvent.click(branchBItemEl);

      // When: 1st Escape -> branchB1 closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(branchB1Open.value).toBe(false);
      expect(branchBOpen.value).toBe(true);
      expect(branchAOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1"]);

      // When: 2nd Escape -> branchB closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(branchBOpen.value).toBe(false);
      expect(branchAOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1", "branch-b"]);
    });

    it("Given focus on an external page button, When Escape is pressed, Then closes open floating element", async () => {
      // Given
      const { outsideBtnEl, floatingEl, openRef } = await renderEscapeKey();

      await userEvent.click(outsideBtnEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
    });

    it("Given focus on an external text input, When Escape is pressed, Then closes open floating element", async () => {
      // Given
      const { outsideInputEl, floatingEl, openRef } = await renderEscapeKey();

      await userEvent.click(outsideInputEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      await expect.element(floatingEl).not.toBeInTheDocument();
      expect(openRef.value).toBe(false);
    });

    it("Given focus on an external button with a multi-level tree, When Escape is pressed repeatedly, Then unwinds leaf-first", async () => {
      // Given
      const calls: string[] = [];
      const { outsideBtnEl, rootOpen, subOpen } = await render3LevelLinearTree({
        defaultSubSubOpen: false,
      });

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        subOpen,
        (open) => {
          if (!open) calls.push("sub");
        },
        { flush: "sync" },
      );

      await userEvent.click(outsideBtnEl);

      // When: 1st Escape -> child leaf closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(subOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);

      // When: 2nd Escape -> root closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(subOpen.value).toBe(false);
      expect(rootOpen.value).toBe(false);
      expect(calls).toEqual(["sub", "root"]);
    });

    it("Given an unregistered child node, When Escape is pressed, Then gracefully unwinds to nearest registered ancestor", async () => {
      // Given
      const { childItemEl, rootOpen } = await renderRootOnlyRegisteredTree();

      await userEvent.click(childItemEl);

      // When
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Root closes gracefully
      expect(rootOpen.value).toBe(false);
    });

    it("Given deepest leaf did not register useEscapeKey, When Escape is pressed, Then unwinds 3-level tree leaf-first via parent", async () => {
      // Given
      const calls: string[] = [];
      const { subchildItemEl, rootOpen, childOpen } = await renderPartiallyRegisteredTree();

      watch(
        rootOpen,
        (open) => {
          if (!open) calls.push("root");
        },
        { flush: "sync" },
      );
      watch(
        childOpen,
        (open) => {
          if (!open) calls.push("child");
        },
        { flush: "sync" },
      );

      await userEvent.click(subchildItemEl);

      // When: 1st Escape -> childNode closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["child"]);

      // When: 2nd Escape -> root closes
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(rootOpen.value).toBe(false);
      expect(calls).toEqual(["child", "root"]);
    });

    it("Given equal-depth sibling branches (branch B opened after branch A), When Escape is pressed, Then closes branch B first via LIFO stack order", async () => {
      // Given
      const calls: string[] = [];
      const { outsideBtnEl, branchAOpen, branchBOpen, rootOpen } = await renderEqualDepthSiblings();

      watch(
        branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );

      // Open branch A first, then branch B second (branch B is topmost on the stack)
      branchAOpen.value = true;
      await nextTick();
      branchBOpen.value = true;
      await nextTick();

      await userEvent.click(outsideBtnEl);

      // When: 1st Escape -> Branch B closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(branchBOpen.value).toBe(false);
      expect(branchAOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b"]);

      // When: 2nd Escape -> Branch A closes next
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(branchAOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b", "branch-a"]);
    });

    it("Given equal-depth sibling branches (branch A opened after branch B), When Escape is pressed, Then closes branch A first via LIFO stack order", async () => {
      // Given
      const calls: string[] = [];
      const { outsideBtnEl, branchAOpen, branchBOpen, rootOpen } = await renderEqualDepthSiblings();

      watch(
        branchAOpen,
        (open) => {
          if (!open) calls.push("branch-a");
        },
        { flush: "sync" },
      );
      watch(
        branchBOpen,
        (open) => {
          if (!open) calls.push("branch-b");
        },
        { flush: "sync" },
      );

      // Open branch B first, then branch A second (branch A is topmost on the stack)
      branchBOpen.value = true;
      await nextTick();
      branchAOpen.value = true;
      await nextTick();

      await userEvent.click(outsideBtnEl);

      // When: 1st Escape -> Branch A closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(branchAOpen.value).toBe(false);
      expect(branchBOpen.value).toBe(true);
      expect(calls).toEqual(["branch-a"]);

      // When: 2nd Escape -> Branch B closes next
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(branchBOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-a", "branch-b"]);
    });
  });

  describe("Scenario: WebKit composition resilience (WebKit Bug 165004)", () => {
    it("Given event.isComposing or keyCode 229, When Escape is pressed, Then ignores dismissal", async () => {
      // Given
      const { anchorEl, openRef } = await renderEscapeKey();

      await userEvent.click(anchorEl);

      const rawAnchorEl = getTestEl("anchor");

      // When: Standard browser IME keydown with isComposing: true
      const composingEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(composingEvent, "isComposing", { value: true });
      rawAnchorEl.dispatchEvent(composingEvent);
      await nextTick();

      // Then
      expect(openRef.value).toBe(true);

      // When: Standard legacy IME keyCode 229
      const keyCode229Event = new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 229,
        bubbles: true,
        cancelable: true,
      });
      rawAnchorEl.dispatchEvent(keyCode229Event);
      await nextTick();

      // Then
      expect(openRef.value).toBe(true);
    });

    it("Given WebKit Bug 165004 firing compositionend before keydown, When Escape is pressed to dismiss IME candidate list, Then prevents premature dismissal", async () => {
      // Given
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: SAFARI_USER_AGENT,
      });

      const { anchorEl, openRef } = await renderEscapeKey();

      await userEvent.click(anchorEl);

      const rawAnchorEl = getTestEl("anchor");

      // Start IME composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // WebKit fires compositionend immediately followed by trailing keydown
      document.dispatchEvent(new CompositionEvent("compositionend"));

      const trailingKeydown = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      rawAnchorEl.dispatchEvent(trailingKeydown);
      await nextTick();

      // Then: Floating element remains open
      expect(openRef.value).toBe(true);

      // Wait for debounce window (5ms) to pass
      await new Promise((resolve) => setTimeout(resolve, 20));

      // When: Subsequent Escape keypress arrives
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Closes normally
      expect(openRef.value).toBe(false);
    });
  });

  describe("Scenario: Shared per-document listener architecture", () => {
    it("Given an overlay is initially closed, When opened and then closed, Then attaches listener only while open", async () => {
      // Given
      const addSpy = vi.spyOn(document, "addEventListener");
      const removeSpy = vi.spyOn(document, "removeEventListener");

      const { openRef } = await renderEscapeKey({}, { defaultOpen: false });

      const escapeKeydownAdds = () => addSpy.mock.calls.filter(([event]) => event === "keydown");
      const escapeKeydownRemoves = () =>
        removeSpy.mock.calls.filter(([event]) => event === "keydown");

      // Closed initially: no keydown listener attached
      expect(escapeKeydownAdds().length).toBe(0);

      // When: Opened
      openRef.value = true;
      await nextTick();

      // Then: Exactly 1 keydown listener attached
      expect(escapeKeydownAdds().length).toBe(1);

      // When: Closed
      openRef.value = false;
      await nextTick();

      // Then: Listener removed
      expect(escapeKeydownRemoves().length).toBe(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("Given multiple open overlays, When active simultaneously, Then shares a single document keydown listener", async () => {
      // Given
      const addSpy = vi.spyOn(document, "addEventListener");

      await render3LevelLinearTree();

      // Then: Exactly 1 bubble keydown listener on document despite 3 active overlays
      const keydownAdds = addSpy.mock.calls.filter(([event]) => event === "keydown");
      expect(keydownAdds.length).toBe(1);

      addSpy.mockRestore();
    });

    it("Given an inner element that stops propagation in bubble phase, When Escape is pressed, Then respects stopPropagation and keeps floating open", async () => {
      // Given
      const { outsideInputEl, openRef } = await renderEscapeKey();

      const rawOutsideInputEl = getTestEl("outside-input");
      rawOutsideInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
        }
      });

      // When
      await userEvent.click(outsideInputEl);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(openRef.value).toBe(true);
    });

    it("Given an inner element that stops propagation with capture enabled, When Escape is pressed, Then intercepts in capture phase before inner element and closes", async () => {
      // Given
      const { outsideInputEl, openRef } = await renderEscapeKey({ capture: true });

      const rawOutsideInputEl = getTestEl("outside-input");
      rawOutsideInputEl.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
        }
      });

      // When
      await userEvent.click(outsideInputEl);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then
      expect(openRef.value).toBe(false);
    });

    it("Given retargeted Shadow DOM events, When Escape is pressed, Then resolves the originating target via composedPath", async () => {
      // Given
      const { tree1ChildOpen, tree1RootOpen, tree2ChildOpen, tree2RootOpen } =
        await renderTwoIndependentTrees();

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
      expect(tree2ChildOpen.value).toBe(false);
      expect(tree2RootOpen.value).toBe(true);
      expect(tree1ChildOpen.value).toBe(true);
      expect(tree1RootOpen.value).toBe(true);
    });

    it("Given synthetic events with empty composedPath, When Escape is pressed, Then falls back to event.target", async () => {
      // Given
      const { tree1ChildOpen, tree1RootOpen, tree2ChildOpen, tree2RootOpen } =
        await renderTwoIndependentTrees();

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
      expect(tree2ChildOpen.value).toBe(false);
      expect(tree2RootOpen.value).toBe(true);
      expect(tree1ChildOpen.value).toBe(true);
      expect(tree1RootOpen.value).toBe(true);
    });

    it("Given onEscape callback is updated dynamically while overlay is open, When Escape is pressed, Then executes the updated callback", async () => {
      // Given
      const calls: string[] = [];
      const options: UseEscapeKeyOptions = {
        onEscape: () => {
          calls.push("initial");
        },
      };

      const { anchorEl } = await renderEscapeKey(options);

      // When: Mutate callback dynamically
      options.onEscape = () => {
        calls.push("updated");
      };

      await userEvent.click(anchorEl);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Then: Updated callback was executed
      expect(calls).toEqual(["updated"]);
    });
  });
});
