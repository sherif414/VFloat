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

describe("useEscapeKey", () => {
  const originalUserAgent = window.navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("single node behavior", () => {
    it("closes floating element on escape key press", async () => {
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.openRef.value).toBe(false);
    });

    it("does not trigger when floating element is already closed", async () => {
      const fixture = createTestComponent({}, { defaultOpen: false });
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.openRef.value).toBe(false);
    });

    it("respects enabled option", async () => {
      const fixture = createTestComponent({ enabled: false });
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.openRef.value).toBe(true);
    });

    it("respects reactive enabled option", async () => {
      const enabled = ref(true);
      const fixture = createTestComponent({ enabled });
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.openRef.value).toBe(false);

      fixture.openRef.value = true;
      enabled.value = false;
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.openRef.value).toBe(true);
    });

    it("respects defaultPrevented from an earlier listener", async () => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
        }
      };

      document.addEventListener("keydown", onKeyDown, { capture: true });

      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();

      document.removeEventListener("keydown", onKeyDown, { capture: true });

      expect(fixture.openRef.value).toBe(true);
    });

    it("uses custom onEscape handler when provided", async () => {
      const customHandler = vi.fn();
      const fixture = createTestComponent({ onEscape: customHandler });
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(customHandler).toHaveBeenCalled();
      expect(fixture.openRef.value).toBe(true);
    });

    it("ignores non-escape keys", async () => {
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      await nextTick();

      expect(fixture.openRef.value).toBe(true);
    });

    it("handles capture option", async () => {
      const fixture = createTestComponent({ capture: true });
      await render(fixture.Component);
      await nextTick();

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.openRef.value).toBe(false);
    });

    it("prevents default when preventDefault is enabled", async () => {
      const fixture = createTestComponent({ preventDefault: true });
      await render(fixture.Component);
      await nextTick();

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
      await nextTick();

      expect(event.defaultPrevented).toBe(true);
      expect(fixture.openRef.value).toBe(false);
    });
  });

  describe("composition event handling", () => {
    it("ignores escape during composition", async () => {
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      // Start composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.openRef.value).toBe(true);

      // End composition
      document.dispatchEvent(new CompositionEvent("compositionend"));

      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.openRef.value).toBe(false);
    });

    it("shares a single composition listener across multiple consumers", async () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const f1 = createTestComponent();
      const f2 = createTestComponent();

      await render(f1.Component);
      await render(f2.Component);
      await nextTick();

      const compositionListeners = addEventListenerSpy.mock.calls.filter(
        ([type]) => type === "compositionstart" || type === "compositionend",
      );

      // Only one pair of listeners on document regardless of component count
      expect(compositionListeners).toHaveLength(2);

      addEventListenerSpy.mockRestore();
    });
  });

  describe("hierarchy resolution", () => {
    it("closes linked descendants from deepest to root across repeated Escape presses", async () => {
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

      // 1st Escape -> deepest (subsub)
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // 2nd Escape -> middle (sub)
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // 3rd Escape -> root
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.rootOpen.value).toBe(false);
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.subSubOpen.value).toBe(false);
      expect(calls).toEqual(["subsub", "sub", "root"]);
    });

    it("closes the deepest open descendant across sibling branches", async () => {
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

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.branchBOpen.value).toBe(true);
      expect(fixture.branchB1Open.value).toBe(false);
      expect(calls).toEqual(["branch-b1"]);
    });

    it("closes the focused sibling branch and preserves inactive sibling branch when target is within sibling", async () => {
      const fixture = createSiblingBranchesComponent();

      await render(fixture.Component);
      await nextTick();

      const branchBItem = getTestEl("branch-b-item");
      await userEvent.click(branchBItem);

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.branchB1Open.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
    });

    it("does not close Tree 1 when Escape is pressed with focus inside independent Tree 2", async () => {
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

      const t2Target = getTestEl("t2-target-button");
      await userEvent.click(t2Target);

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.tree1ChildOpen.value).toBe(true);
      expect(fixture.tree1RootOpen.value).toBe(true);
      expect(fixture.tree2ChildOpen.value).toBe(false);
      expect(fixture.tree2RootOpen.value).toBe(true);
      expect(calls).toEqual(["tree2-child"]);
    });

    it("closes open child and preserves root when target is root anchor element", async () => {
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

      const rootAnchor = getTestEl("root-anchor");
      await userEvent.click(rootAnchor);

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);
    });

    it("closes open child and preserves root when target is inside root floating element", async () => {
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

      const rootItem = getTestEl("root-item");
      await userEvent.click(rootItem);

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);
    });

    it("closes 3-level hierarchy leaf-first when target is inside middle level", async () => {
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

      const subItem = getTestEl("sub-item");
      await userEvent.click(subItem);

      // 1st Escape: subSub closes; sub and root remain open
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.subSubOpen.value).toBe(false);
      expect(fixture.subOpen.value).toBe(true);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub"]);

      // 2nd Escape: sub closes; root remains open
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub", "sub"]);
    });

    it("unwinds nested sibling branches cleanly when target is inside sibling branch", async () => {
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

      const branchBItem = getTestEl("branch-b-item");
      await userEvent.click(branchBItem);

      // 1st Escape: branchB1 (leaf of branchB) closes; branchA and branchB remain open
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchB1Open.value).toBe(false);
      expect(fixture.branchBOpen.value).toBe(true);
      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1"]);

      // 2nd Escape: branchB closes; branchA remains open
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.branchBOpen.value).toBe(false);
      expect(fixture.branchAOpen.value).toBe(true);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1", "branch-b"]);
    });

    it("closes open floating element when Escape is pressed while focus is on an external page element", async () => {
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const outsideBtn = getTestEl("outside-btn");
      await userEvent.click(outsideBtn);

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.openRef.value).toBe(false);
    });

    it("closes open floating element when Escape is pressed while focus is on an external text input", async () => {
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const outsideInput = getTestEl("outside-input");
      await userEvent.click(outsideInput);

      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.openRef.value).toBe(false);
    });

    it("unwinds multi-level hierarchy leaf-first when Escape is pressed while focus is on an external page element", async () => {
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

      const outsideBtn = getTestEl("outside-btn");
      await userEvent.click(outsideBtn);

      // 1st Escape on external button: child leaf closes first, root stays open
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["sub"]);

      // 2nd Escape on external button: root closes
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.subOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(false);
      expect(calls).toEqual(["sub", "root"]);
    });

    it("gracefully unwinds to nearest registered ancestor when child did not call useEscapeKey", async () => {
      const fixture = createRootOnlyRegisteredTreeComponent();
      await render(fixture.Component);
      await nextTick();

      const childItem = getTestEl("child-item");
      await userEvent.click(childItem);

      // Child did not register useEscapeKey, but is open and contained within root.
      // Escape should resolve to child, fail to match an entry, and walk up parent
      // chain to root so root closes gracefully rather than silently dropping the key.
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.rootOpen.value).toBe(false);
    });

    it("gracefully unwinds 3-level tree leaf-first when deepest leaf did not call useEscapeKey", async () => {
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

      const subchildItem = getTestEl("subchild-item");
      await userEvent.click(subchildItem);

      // 1st Escape: subchild is deepest open descendant but not registered.
      // Resolution walks up to childNode (which is registered), closing childNode.
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.childOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["child"]);

      // 2nd Escape: root closes
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.rootOpen.value).toBe(false);
      expect(calls).toEqual(["child", "root"]);
    });

    it("breaks ties between equal-depth sibling branches using LIFO stack order (branch B opened after branch A)", async () => {
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

      const outsideBtn = getTestEl("outside-btn");
      await userEvent.click(outsideBtn);

      // 1st Escape: Branch B was opened more recently -> closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.branchBOpen.value).toBe(false);
      expect(fixture.branchAOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b"]);

      // 2nd Escape: Branch A closes next
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.branchAOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b", "branch-a"]);
    });

    it("breaks ties between equal-depth sibling branches using LIFO stack order (branch A opened after branch B)", async () => {
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

      const outsideBtn = getTestEl("outside-btn");
      await userEvent.click(outsideBtn);

      // 1st Escape: Branch A was opened more recently -> closes first
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.branchAOpen.value).toBe(false);
      expect(fixture.branchBOpen.value).toBe(true);
      expect(calls).toEqual(["branch-a"]);

      // 2nd Escape: Branch B closes next
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(fixture.branchBOpen.value).toBe(false);
      expect(fixture.rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-a", "branch-b"]);
    });
  });

  describe("IME and WebKit composition resilience (WebKit Bug 165004)", () => {
    it("does not close on Escape when event.isComposing or keyCode 229 is set", async () => {
      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const anchor = getTestEl("anchor");
      await userEvent.click(anchor);

      // Standard browser IME keydown with isComposing: true
      const composingEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(composingEvent, "isComposing", { value: true });
      anchor.dispatchEvent(composingEvent);
      await nextTick();
      expect(fixture.openRef.value).toBe(true);

      // Standard legacy IME keyCode 229
      const keyCode229Event = new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 229,
        bubbles: true,
        cancelable: true,
      });
      anchor.dispatchEvent(keyCode229Event);
      await nextTick();
      expect(fixture.openRef.value).toBe(true);
    });

    it("prevents premature dismissal when WebKit fires compositionend before keydown (WebKit Bug 165004)", async () => {
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: SAFARI_USER_AGENT,
      });

      const fixture = createTestComponent();
      await render(fixture.Component);
      await nextTick();

      const anchor = getTestEl("anchor");
      await userEvent.click(anchor);

      // Start IME composition
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // In Safari (Bug 165004), pressing Escape to close IME candidate list dispatches
      // compositionend first, immediately followed by keydown without isComposing
      document.dispatchEvent(new CompositionEvent("compositionend"));

      const trailingKeydown = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      anchor.dispatchEvent(trailingKeydown);
      await nextTick();

      // Floating element must remain OPEN because composition-state debounced the reset
      expect(fixture.openRef.value).toBe(true);

      // Wait for debounce window (5ms) to pass
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Subsequent Escape closes the overlay normally
      await userEvent.keyboard("{Escape}");
      await nextTick();
      expect(fixture.openRef.value).toBe(false);
    });
  });

  describe("shared per-document listener architecture", () => {
    it("attaches 0 document listeners when overlay is closed and removes on close", async () => {
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

      // Open: exactly 1 keydown listener attached
      fixture.openRef.value = true;
      await nextTick();
      expect(escapeKeydownAdds().length).toBe(1);

      // Close: listener removed
      fixture.openRef.value = false;
      await nextTick();
      expect(escapeKeydownRemoves().length).toBe(1);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("shares a single document keydown listener across multiple open overlays", async () => {
      const addSpy = vi.spyOn(document, "addEventListener");

      const fixture = create3LevelLinearTreeComponent();
      await render(fixture.Component);
      await nextTick();

      const keydownAdds = addSpy.mock.calls.filter(([event]) => event === "keydown");
      // Exactly 1 bubble keydown listener on document despite 3 active overlays
      expect(keydownAdds.length).toBe(1);

      addSpy.mockRestore();
    });

    it("allows inner elements to stop propagation in bubble phase, but intercepts in capture phase", async () => {
      // Test bubble phase (default): inner element stopPropagation protects overlay
      const bubbleFixture = createTestComponent();
      await render(bubbleFixture.Component);
      await nextTick();

      const outsideInput = getTestEl("outside-input");
      outsideInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
        }
      });

      await userEvent.click(outsideInput);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Bubble phase respects inner element's stopPropagation
      expect(bubbleFixture.openRef.value).toBe(true);

      // Test capture phase: overlay intercepts before inner element can stop propagation
      const captureFixture = createTestComponent({ capture: true });
      await render(captureFixture.Component);
      await nextTick();

      const captureOutsideInput = document.querySelectorAll<HTMLInputElement>(
        "[data-testid='outside-input']",
      )[1];
      expect(captureOutsideInput).toBeDefined();

      captureOutsideInput!.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
        }
      });

      await userEvent.click(captureOutsideInput!);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      // Capture phase intercepts before inner element
      expect(captureFixture.openRef.value).toBe(false);
    });

    it("executes dynamically updated onEscape on an open overlay", async () => {
      const calls: string[] = [];
      const options: UseEscapeKeyOptions = {
        onEscape: () => {
          calls.push("initial");
        },
      };

      const fixture = createTestComponent(options);
      await render(fixture.Component);
      await nextTick();

      // Mutate callback dynamically while overlay remains open
      options.onEscape = () => {
        calls.push("updated");
      };

      const anchor = getTestEl("anchor");
      await userEvent.click(anchor);
      await userEvent.keyboard("{Escape}");
      await nextTick();

      expect(calls).toEqual(["updated"]);
    });
  });
});
