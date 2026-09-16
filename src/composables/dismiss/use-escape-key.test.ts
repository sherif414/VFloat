import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, watch } from "vue";
import { clearTrackedElements, trackElement } from "@/test-utils";
import { type FloatingNode, useFloatingNode } from "@/composables";
import { clearActiveFloatingNodes } from "@/composables/floating-node/active-nodes";
import { type UseEscapeKeyOptions, useEscapeKey } from "./use-escape-key";

function createMockFloatingNode(initialOpen = false): FloatingNode {
  return useFloatingNode({
    anchorEl: ref(null),
    floatingEl: ref(null),
    defaultOpen: initialOpen,
  });
}

describe("useEscapeKey", () => {
  let scope: ReturnType<typeof effectScope> | undefined;

  beforeEach(() => {
    scope = effectScope();
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    clearActiveFloatingNodes();
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function setupEscape(node: FloatingNode, options?: UseEscapeKeyOptions) {
    scope?.run(() => {
      useEscapeKey(node, options);
    });
  }

  describe("FloatingNode behavior", () => {
    it("closes floating element on escape key press", async () => {
      const node = createMockFloatingNode(true);

      setupEscape(node);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.open.value).toBe(false);
    });

    it("does not trigger when floating element is already closed", async () => {
      const node = createMockFloatingNode(false);

      setupEscape(node);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.open.value).toBe(false);
    });

    it("respects enabled option", async () => {
      const node = createMockFloatingNode(true);

      setupEscape(node, { enabled: false });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.open.value).toBe(true);
    });

    it("respects defaultPrevented from another handler", async () => {
      const node = createMockFloatingNode(true);

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
        }
      };

      document.addEventListener("keydown", onKeyDown, { capture: true });

      setupEscape(node);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));

      document.removeEventListener("keydown", onKeyDown, { capture: true });

      expect(node.open.value).toBe(true);
    });

    it("uses custom onEscape handler when provided", async () => {
      const node = createMockFloatingNode(true);
      const customHandler = vi.fn();

      setupEscape(node, { onEscape: customHandler });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(customHandler).toHaveBeenCalled();
      expect(node.open.value).toBe(true);
    });

    it("ignores non-escape keys", async () => {
      const node = createMockFloatingNode(true);

      setupEscape(node);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          code: "Space",
          keyCode: 32,
        } as any),
      );

      expect(node.open.value).toBe(true);
    });
  });

  describe("Composition event handling", () => {
    it("ignores escape during composition", async () => {
      const node = createMockFloatingNode(true);

      setupEscape(node);

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.open.value).toBe(true);

      document.dispatchEvent(new CompositionEvent("compositionend"));

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.open.value).toBe(false);
    });
  });

  describe("Options handling", () => {
    it("respects reactive enabled option", async () => {
      const node = createMockFloatingNode(true);
      const enabled = ref(true);

      setupEscape(node, { enabled });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(node.open.value).toBe(false);

      node.open.value = true;
      enabled.value = false;

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(node.open.value).toBe(true);
    });

    it("handles capture option", async () => {
      const node = createMockFloatingNode(true);

      setupEscape(node, { capture: true });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(node.open.value).toBe(false);
    });

    it("prevents default when preventDefault is enabled", async () => {
      const node = createMockFloatingNode(true);

      setupEscape(node, { preventDefault: true });

      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(node.open.value).toBe(false);
    });

    it("shares a single composition listener across multiple consumers", async () => {
      const nodeA = createMockFloatingNode(true);
      const nodeB = createMockFloatingNode(true);

      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const scopeA = effectScope();
      const scopeB = effectScope();

      scopeA.run(() => {
        useEscapeKey(nodeA);
      });

      scopeB.run(() => {
        useEscapeKey(nodeB);
      });

      const compositionListeners = addEventListenerSpy.mock.calls.filter(
        ([type]) => type === "compositionstart" || type === "compositionend",
      );

      expect(compositionListeners).toHaveLength(2);

      scopeA.stop();
      scopeB.stop();
      addEventListenerSpy.mockRestore();
    });

    it("closes linked descendants from deepest to root across repeated Escape presses", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const childOpen = ref(true);
      const grandchildOpen = ref(true);

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
      watch(
        grandchildOpen,
        (open) => {
          if (!open) calls.push("grandchild");
        },
        { flush: "sync" },
      );

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: rootOpen,
        });
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: childOpen,
          parent: root,
        });
        const grandchild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: grandchildOpen,
          parent: child,
        });

        useEscapeKey(root);
        useEscapeKey(child);
        useEscapeKey(grandchild);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(rootOpen.value).toBe(false);
      expect(childOpen.value).toBe(false);
      expect(grandchildOpen.value).toBe(false);
      expect(calls).toEqual(["grandchild", "child", "root"]);
    });

    it("closes the deepest open descendant across sibling branches", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const firstChildOpen = ref(true);
      const secondChildOpen = ref(true);
      const secondGrandchildOpen = ref(true);

      watch(
        firstChildOpen,
        (open) => {
          if (!open) calls.push("first-child");
        },
        { flush: "sync" },
      );
      watch(
        secondChildOpen,
        (open) => {
          if (!open) calls.push("second-child");
        },
        { flush: "sync" },
      );
      watch(
        secondGrandchildOpen,
        (open) => {
          if (!open) calls.push("second-grandchild");
        },
        { flush: "sync" },
      );

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: rootOpen,
        });
        const firstChild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: firstChildOpen,
          parent: root,
        });
        const secondChild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: secondChildOpen,
          parent: root,
        });
        const secondGrandchild = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(null),
          open: secondGrandchildOpen,
          parent: secondChild,
        });

        useEscapeKey(root);
        useEscapeKey(firstChild);
        useEscapeKey(secondChild);
        useEscapeKey(secondGrandchild);
      });

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(firstChildOpen.value).toBe(true);
      expect(secondChildOpen.value).toBe(true);
      expect(secondGrandchildOpen.value).toBe(false);
      expect(calls).toEqual(["second-grandchild"]);
    });

    it("closes the focused sibling branch and preserves inactive sibling branch when target is within sibling", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const branchAOpen = ref(true);
      const branchBOpen = ref(true);

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

      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const branchAFloating = trackElement(document.createElement("div"));
      const branchBFloating = trackElement(document.createElement("div"));
      const branchBTarget = trackElement(document.createElement("button"));
      branchBFloating.appendChild(branchBTarget);

      document.body.appendChild(rootAnchor);
      document.body.appendChild(rootFloating);
      document.body.appendChild(branchAFloating);
      document.body.appendChild(branchBFloating);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        const branchA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(branchAFloating),
          open: branchAOpen,
          parent: root,
        });
        const branchB = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(branchBFloating),
          open: branchBOpen,
          parent: root,
        });

        useEscapeKey(root);
        useEscapeKey(branchA);
        useEscapeKey(branchB);
      });

      branchBTarget.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(branchAOpen.value).toBe(true);
      expect(branchBOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b"]);
    });

    it("does not close Tree 1 when Escape is dispatched with target inside independent Tree 2", () => {
      const calls: string[] = [];
      const tree1RootOpen = ref(true);
      const tree1ChildOpen = ref(true);
      const tree2RootOpen = ref(true);
      const tree2ChildOpen = ref(true);

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

      const tree1Anchor = trackElement(document.createElement("button"));
      const tree1Floating = trackElement(document.createElement("div"));
      const tree1ChildFloating = trackElement(document.createElement("div"));

      const tree2Anchor = trackElement(document.createElement("button"));
      const tree2Floating = trackElement(document.createElement("div"));
      const tree2ChildFloating = trackElement(document.createElement("div"));
      const tree2Target = trackElement(document.createElement("button"));
      tree2ChildFloating.appendChild(tree2Target);

      document.body.appendChild(tree1Anchor);
      document.body.appendChild(tree1Floating);
      document.body.appendChild(tree1ChildFloating);
      document.body.appendChild(tree2Anchor);
      document.body.appendChild(tree2Floating);
      document.body.appendChild(tree2ChildFloating);

      scope?.run(() => {
        const tree1Root = useFloatingNode({
          anchorEl: ref(tree1Anchor),
          floatingEl: ref(tree1Floating),
          open: tree1RootOpen,
        });
        const tree1Child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(tree1ChildFloating),
          open: tree1ChildOpen,
          parent: tree1Root,
        });

        const tree2Root = useFloatingNode({
          anchorEl: ref(tree2Anchor),
          floatingEl: ref(tree2Floating),
          open: tree2RootOpen,
        });
        const tree2Child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(tree2ChildFloating),
          open: tree2ChildOpen,
          parent: tree2Root,
        });

        useEscapeKey(tree1Root);
        useEscapeKey(tree1Child);
        useEscapeKey(tree2Root);
        useEscapeKey(tree2Child);
      });

      tree2Target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(tree1ChildOpen.value).toBe(true);
      expect(tree1RootOpen.value).toBe(true);
      expect(tree2ChildOpen.value).toBe(false);
      expect(tree2RootOpen.value).toBe(true);
      expect(calls).toEqual(["tree2-child"]);
    });

    it("closes the open child and preserves root when target is root anchor element", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const childOpen = ref(true);

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

      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const childFloating = trackElement(document.createElement("div"));

      document.body.appendChild(rootAnchor);
      document.body.appendChild(rootFloating);
      document.body.appendChild(childFloating);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(childFloating),
          open: childOpen,
          parent: root,
        });

        useEscapeKey(root);
        useEscapeKey(child);
      });

      rootAnchor.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["child"]);
    });

    it("closes open child and preserves root when target is inside root floating element", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const childOpen = ref(true);

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

      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const rootItem = trackElement(document.createElement("button"));
      rootFloating.appendChild(rootItem);
      const childFloating = trackElement(document.createElement("div"));

      document.body.appendChild(rootAnchor);
      document.body.appendChild(rootFloating);
      document.body.appendChild(childFloating);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(childFloating),
          open: childOpen,
          parent: root,
        });

        useEscapeKey(root);
        useEscapeKey(child);
      });

      rootItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["child"]);
    });

    it("closes 3-level hierarchy leaf-first when target is inside middle level", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const subOpen = ref(true);
      const subSubOpen = ref(true);

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

      const rootFloating = trackElement(document.createElement("div"));
      const subFloating = trackElement(document.createElement("div"));
      const subItem = trackElement(document.createElement("button"));
      subFloating.appendChild(subItem);
      const subSubFloating = trackElement(document.createElement("div"));

      document.body.appendChild(rootFloating);
      document.body.appendChild(subFloating);
      document.body.appendChild(subSubFloating);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        const sub = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(subFloating),
          open: subOpen,
          parent: root,
        });
        const subSub = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(subSubFloating),
          open: subSubOpen,
          parent: sub,
        });

        useEscapeKey(root);
        useEscapeKey(sub);
        useEscapeKey(subSub);
      });

      // Target is on subItem inside sub (middle node)
      subItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      // 1st Escape: subSub closes; sub and root remain open
      expect(subSubOpen.value).toBe(false);
      expect(subOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub"]);

      // 2nd Escape: sub closes; root remains open
      subItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(subSubOpen.value).toBe(false);
      expect(subOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["subsub", "sub"]);
    });

    it("unwinds nested sibling branches cleanly when target is inside sibling branch", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const branchAOpen = ref(true);
      const branchBOpen = ref(true);
      const branchB1Open = ref(true);

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

      const rootFloating = trackElement(document.createElement("div"));
      const branchAFloating = trackElement(document.createElement("div"));
      const branchBFloating = trackElement(document.createElement("div"));
      const branchBItem = trackElement(document.createElement("button"));
      branchBFloating.appendChild(branchBItem);
      const branchB1Floating = trackElement(document.createElement("div"));

      document.body.appendChild(rootFloating);
      document.body.appendChild(branchAFloating);
      document.body.appendChild(branchBFloating);
      document.body.appendChild(branchB1Floating);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        const branchA = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(branchAFloating),
          open: branchAOpen,
          parent: root,
        });
        const branchB = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(branchBFloating),
          open: branchBOpen,
          parent: root,
        });
        const branchB1 = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(branchB1Floating),
          open: branchB1Open,
          parent: branchB,
        });

        useEscapeKey(root);
        useEscapeKey(branchA);
        useEscapeKey(branchB);
        useEscapeKey(branchB1);
      });

      // Target is inside branchB
      branchBItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      // 1st Escape: branchB1 (leaf of branchB) closes; branchA and branchB remain open
      expect(branchB1Open.value).toBe(false);
      expect(branchBOpen.value).toBe(true);
      expect(branchAOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1"]);

      // 2nd Escape: branchB closes; branchA remains open
      branchBItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(branchBOpen.value).toBe(false);
      expect(branchAOpen.value).toBe(true);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["branch-b1", "branch-b"]);
    });

    it("closes open floating element when Escape is pressed while focus is on an external page element", () => {
      const rootOpen = ref(true);
      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const outsideBtn = trackElement(document.createElement("button"));
      outsideBtn.id = "outside-button";

      document.body.appendChild(rootAnchor);
      document.body.appendChild(rootFloating);
      document.body.appendChild(outsideBtn);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        useEscapeKey(root);
      });

      outsideBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(rootOpen.value).toBe(false);
    });

    it("closes open floating element when Escape is pressed while focus is on an external text input", () => {
      const rootOpen = ref(true);
      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const outsideInput = trackElement(document.createElement("input"));
      outsideInput.id = "outside-input";

      document.body.appendChild(rootAnchor);
      document.body.appendChild(rootFloating);
      document.body.appendChild(outsideInput);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        useEscapeKey(root);
      });

      outsideInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(rootOpen.value).toBe(false);
    });

    it("unwinds multi-level hierarchy leaf-first when Escape is pressed while focus is on an external page element", () => {
      const calls: string[] = [];
      const rootOpen = ref(true);
      const childOpen = ref(true);

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

      const rootAnchor = trackElement(document.createElement("button"));
      const rootFloating = trackElement(document.createElement("div"));
      const childFloating = trackElement(document.createElement("div"));
      const outsideBtn = trackElement(document.createElement("button"));

      document.body.appendChild(rootAnchor);
      document.body.appendChild(rootFloating);
      document.body.appendChild(childFloating);
      document.body.appendChild(outsideBtn);

      scope?.run(() => {
        const root = useFloatingNode({
          anchorEl: ref(rootAnchor),
          floatingEl: ref(rootFloating),
          open: rootOpen,
        });
        const child = useFloatingNode({
          anchorEl: ref(null),
          floatingEl: ref(childFloating),
          open: childOpen,
          parent: root,
        });

        useEscapeKey(root);
        useEscapeKey(child);
      });

      // 1st Escape on external button: child leaf closes first, root stays open
      outsideBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(true);
      expect(calls).toEqual(["child"]);

      // 2nd Escape on external button: root closes
      outsideBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(childOpen.value).toBe(false);
      expect(rootOpen.value).toBe(false);
      expect(calls).toEqual(["child", "root"]);
    });
  });
});
