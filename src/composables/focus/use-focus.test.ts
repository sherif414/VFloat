import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import {
  type UseFocusContext,
  type UseFocusOptions,
  useFloatingNode,
  useFloatingTree,
  useFocus,
} from "@/composables";
import { getTestEl } from "@/test-utils";

vi.mock("@/shared/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/platform")>();
  return {
    ...actual,
    matchesFocusVisible: vi.fn(actual.matchesFocusVisible),
  };
});

import { matchesFocusVisible } from "@/shared/platform";

interface FixtureConfig {
  anchorKind?: "button" | "anchor-subtree";
  withOutside?: boolean;
  withIgnored?: boolean;
}

function createTestComponent(
  options: UseFocusOptions = {},
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const openRef = ref(initialOpen);
  const setOpenMock: ReturnType<typeof vi.fn> = vi.fn((value: boolean) => {
    openRef.value = value;
  });
  let node!: UseFocusContext;
  let result!: ReturnType<typeof useFocus>;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = {
      id: Symbol("mock-node"),
      refs: {
        anchorEl,
        floatingEl,
        arrowEl: ref<HTMLElement | null>(null),
      },
      open: openRef,
      setOpen: setOpenMock as () => void,
      tree: null,
    };
    result = useFocus(node, options);

    const anchorKind = config.anchorKind ?? "button";

    return () =>
      h("div", { class: "test-wrapper" }, [
        anchorKind === "anchor-subtree"
          ? h("div", { ref: "anchor", "data-testid": "anchor", tabindex: 0 }, [
              "Anchor",
              h("input", { "data-testid": "anchor-child", type: "text" }),
            ])
          : h("button", { ref: "anchor", "data-testid": "anchor", type: "button" }, "Anchor"),
        h("div", { ref: "floating", "data-testid": "floating", tabindex: -1 }, "Floating content"),
        ...(config.withOutside
          ? [h("button", { "data-testid": "outside", type: "button" }, "Outside")]
          : []),
        ...(config.withIgnored
          ? [h("button", { "data-testid": "ignored", type: "button" }, "Ignored")]
          : []),
      ]);
  });

  return { Component, getNode: () => node, getResult: () => result, openRef, setOpenMock };
}

function createTreeComponent(target: "parent" | "child") {
  const parentOpen = ref(true);
  const childOpen = ref(true);
  const parentChanges = vi.fn();

  const Component = defineComponent(() => {
    const parentAnchorEl = useTemplateRef<HTMLElement>("parent-anchor");
    const parentFloatingEl = useTemplateRef<HTMLElement>("parent-floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const tree = useFloatingTree();
    const parentNode = useFloatingNode({
      anchorEl: parentAnchorEl,
      floatingEl: parentFloatingEl,
      open: parentOpen,
      onOpenChange: parentChanges,
    });
    const childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
    });
    tree.addNode(parentNode);
    tree.addNode(childNode, parentNode.id);
    useFocus(target === "parent" ? parentNode : childNode, { requireFocusVisible: false });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "parent-anchor", "data-testid": "parent-anchor" }, "Parent"),
        h("div", { ref: "parent-floating", "data-testid": "parent-floating" }, "Parent floating"),
        h("button", { ref: "child-anchor", "data-testid": "child-anchor" }, "Child"),
        h("div", { ref: "child-floating", "data-testid": "child-floating" }, "Child floating"),
        h("button", { "data-testid": "outside", type: "button" }, "Outside"),
      ]);
  });

  return { Component, parentOpen, childOpen, parentChanges };
}

async function flushFocus() {
  await nextTick();
  vi.runAllTimers();
  await nextTick();
}

interface FocusFixture {
  anchorEl: HTMLElement;
  floatingEl: HTMLElement;
  node: UseFocusContext;
  openRef: ReturnType<typeof ref<boolean>>;
  result: ReturnType<typeof useFocus>;
  setOpenMock: ReturnType<typeof vi.fn>;
  childInputEl: HTMLElement | null;
  outsideEl: HTMLElement | null;
  ignoredEl: HTMLElement | null;
}

async function renderFocus(
  options: UseFocusOptions = {},
  initialOpen = false,
  config: FixtureConfig = {},
): Promise<FocusFixture> {
  const fixture = createTestComponent(options, initialOpen, config);
  await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
    result: fixture.getResult(),
    setOpenMock: fixture.setOpenMock,
    childInputEl: config.anchorKind === "anchor-subtree" ? getTestEl("anchor-child") : null,
    outsideEl: config.withOutside || config.withIgnored ? getTestEl("outside") : null,
    ignoredEl: config.withIgnored ? getTestEl("ignored") : null,
  };
}

async function renderTreeFocus(target: "parent" | "child") {
  const fixture = createTreeComponent(target);
  await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    parentFloatingEl: getTestEl("parent-floating"),
    childFloatingEl: getTestEl("child-floating"),
    outsideEl: getTestEl("outside"),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
    parentChanges: fixture.parentChanges,
  };
}

describe("useFocus", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(matchesFocusVisible).mockReset();
    vi.useRealTimers();
  });

  describe("opening behavior", () => {
    it("opens on focus when focus-visible is not required", async () => {
      const ctx = await renderFocus({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
      expect(ctx.setOpenMock).toHaveBeenCalledWith(true, "focus", expect.any(FocusEvent));
    });

    it("only opens when the focused element matches focus-visible", async () => {
      vi.mocked(matchesFocusVisible).mockReturnValue(false);
      const ctx = await renderFocus({ requireFocusVisible: true });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.node.open.value).toBe(false);

      vi.mocked(matchesFocusVisible).mockReturnValue(true);

      ctx.anchorEl.blur();
      await flushFocus();
      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });

    it("blocks one refocus after the window blurs while the closed anchor stays focused", async () => {
      const ctx = await renderFocus({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      ctx.node.setOpen(false);
      await flushFocus();
      expect(ctx.node.open.value).toBe(false);

      window.dispatchEvent(new Event("blur"));

      ctx.anchorEl.blur();
      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);

      window.dispatchEvent(new Event("focus"));

      ctx.anchorEl.blur();
      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });
  });

  describe("closing behavior", () => {
    it("closes when focus leaves both the anchor and floating element", async () => {
      const ctx = await renderFocus({ requireFocusVisible: false }, false, { withOutside: true });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      ctx.outsideEl!.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
      expect(ctx.setOpenMock).toHaveBeenLastCalledWith(false, "blur", expect.any(FocusEvent));
    });

    it("stays open when focus moves into the floating element", async () => {
      const ctx = await renderFocus({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();

      ctx.floatingEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });

    it("stays open when focus moves within the anchor subtree", async () => {
      const ctx = await renderFocus({ requireFocusVisible: false }, false, {
        anchorKind: "anchor-subtree",
      });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      ctx.childInputEl!.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });
  });

  describe("ignoreFocusOut predicate", () => {
    it("keeps the floating element open when focus moves to an ignored element", async () => {
      let ignoredEl: HTMLElement | null = null;
      const ctx = await renderFocus(
        {
          requireFocusVisible: false,
          ignoreFocusOut: (target) => target === ignoredEl,
        },
        false,
        { withOutside: true, withIgnored: true },
      );
      ignoredEl = ctx.ignoredEl;

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      ctx.ignoredEl!.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);

      ctx.outsideEl!.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("parent-linked nodes", () => {
    it("keeps a parent open when focus moves into a child floating element", async () => {
      const { childFloatingEl, outsideEl, parentOpen, parentChanges } =
        await renderTreeFocus("parent");

      childFloatingEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(parentOpen.value).toBe(true);
      expect(parentChanges).not.toHaveBeenCalled();

      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(parentOpen.value).toBe(false);
    });

    it("closes a child when focus moves into the parent floating element", async () => {
      const { parentFloatingEl, parentOpen, childOpen } = await renderTreeFocus("child");

      parentFloatingEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(parentOpen.value).toBe(true);
      expect(childOpen.value).toBe(false);
    });
  });

  describe("lifecycle and cleanup", () => {
    it("does not respond when disabled", async () => {
      const enabled = ref(false);
      const ctx = await renderFocus({
        enabled,
        requireFocusVisible: false,
      });

      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
      expect(ctx.setOpenMock).not.toHaveBeenCalled();
    });

    it("cleanup clears pending blur work and removes every listener", async () => {
      const ctx = await renderFocus({ requireFocusVisible: false }, false, { withOutside: true });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      ctx.anchorEl.blur();
      ctx.result.cleanup();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);

      ctx.outsideEl!.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);

      ctx.node.setOpen(false);
      await flushFocus();

      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });
  });
});
