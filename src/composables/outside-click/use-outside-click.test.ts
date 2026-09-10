import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import {
  type UseOutsideClickContext,
  type UseOutsideClickOptions,
  useFloatingNode,
  useFloatingTree,
  useOutsideClick,
} from "@/composables";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";

const OUTSIDE_STYLE = {
  position: "fixed",
  bottom: "0",
  width: "100px",
  height: "100px",
  zIndex: "1",
} as const;

function createTestComponent(options: UseOutsideClickOptions = {}) {
  const openRef = ref(true);
  const setOpenMock: ReturnType<typeof vi.fn> = vi.fn((open: boolean) => {
    openRef.value = open;
  });
  let node!: UseOutsideClickContext;

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
    useOutsideClick(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("div", { "data-testid": "outside", style: { ...OUTSIDE_STYLE, left: "0" } }, "Outside"),
        h(
          "div",
          { "data-testid": "ignored", style: { ...OUTSIDE_STYLE, left: "120px" } },
          "Ignored",
        ),
      ]);
  });

  return { Component, getNode: () => node, openRef, setOpenMock };
}

function createTreeComponent(target: "parent" | "child") {
  const parentOpen = ref(true);
  const childOpen = ref(true);
  const onParentOpenChange = vi.fn();
  let parentNode!: ReturnType<typeof useFloatingNode>;
  let childNode!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childAnchorEl = useTemplateRef<HTMLElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    const tree = useFloatingTree();
    parentNode = useFloatingNode({
      anchorEl,
      floatingEl,
      open: parentOpen,
      onOpenChange: onParentOpenChange,
    });
    childNode = useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
    });
    tree.addNode(parentNode);
    tree.addNode(childNode, parentNode.id);

    useOutsideClick(target === "parent" ? parentNode : childNode, { event: "click" });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Trigger"),
        h("div", { ref: "floating", "data-testid": "floating" }, "Floating"),
        h("button", { ref: "child-anchor", "data-testid": "child-anchor" }, "Child Trigger"),
        h(
          "div",
          {
            ref: "child-floating",
            "data-testid": "child-floating",
            style: { width: "100px", height: "100px" },
          },
          "Child Floating",
        ),
      ]);
  });

  return {
    Component,
    getParent: () => parentNode,
    getChild: () => childNode,
    parentOpen,
    childOpen,
    onParentOpenChange,
  };
}

async function renderOutsideClick(options: UseOutsideClickOptions = {}) {
  const fixture = createTestComponent(options);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    outsideEl: getTestEl("outside"),
    ignoredEl: getTestEl("ignored"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
    setOpenMock: fixture.setOpenMock,
  };
}

async function renderTreeOutsideClick(target: "parent" | "child") {
  const fixture = createTreeComponent(target);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    childAnchorEl: getTestEl("child-anchor"),
    childFloatingEl: getTestEl("child-floating"),
    parentNode: fixture.getParent(),
    childNode: fixture.getChild(),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
    onParentOpenChange: fixture.onParentOpenChange,
  };
}

describe("useOutsideClick", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("closes on outside click by default", async () => {
    const { outsideEl, node, setOpenMock } = await renderOutsideClick({ event: "click" });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(setOpenMock).toHaveBeenCalledTimes(1);
    expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "outside-pointer", expect.any(Event));
    expect(node.open.value).toBe(false);
  });

  it("closes on outside pointerdown when configured", async () => {
    const { outsideEl, node, setOpenMock } = await renderOutsideClick({ event: "pointerdown" });

    outsideEl.dispatchEvent(makePointerEvent("pointerdown"));
    await nextTick();

    expect(setOpenMock).toHaveBeenCalledTimes(1);
    expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "outside-pointer", expect.any(Event));
    expect(node.open.value).toBe(false);
  });

  it("does not close when outside dismissal is disabled", async () => {
    const { outsideEl, node, setOpenMock } = await renderOutsideClick({
      enabled: false,
      event: "click",
    });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(setOpenMock).not.toHaveBeenCalled();
    expect(node.open.value).toBe(true);
  });

  it("does not close when clicking the anchor or floating element", async () => {
    const { anchorEl, floatingEl, node, setOpenMock } = await renderOutsideClick({
      event: "click",
    });

    await userEvent.click(anchorEl);
    await userEvent.click(floatingEl);
    await nextTick();

    expect(setOpenMock).not.toHaveBeenCalled();
    expect(node.open.value).toBe(true);
  });

  it("uses the ignoreClick predicate for per-target dismissal", async () => {
    const { outsideEl, ignoredEl, setOpenMock } = await renderOutsideClick({
      event: "click",
      ignoreClick: (_event, target) => target === ignoredEl,
    });

    await userEvent.click(ignoredEl);
    await nextTick();
    expect(setOpenMock).not.toHaveBeenCalled();

    await userEvent.click(outsideEl);
    await nextTick();
    expect(setOpenMock).toHaveBeenCalledTimes(1);
    expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "outside-pointer", expect.any(Event));
  });

  it("calls onClick instead of closing when a custom handler is provided", async () => {
    const onClick = vi.fn();
    const { outsideEl, node, setOpenMock } = await renderOutsideClick({
      event: "click",
      onClick,
    });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(setOpenMock).not.toHaveBeenCalled();
    expect(node.open.value).toBe(true);
  });

  it("ignores outside click after a drag that started inside the floating element", async () => {
    const { floatingEl, outsideEl, node, setOpenMock } = await renderOutsideClick({
      event: "click",
      ignoreDrag: true,
    });

    floatingEl.dispatchEvent(makeMouseEvent("mousedown"));
    outsideEl.dispatchEvent(makeMouseEvent("click"));
    await nextTick();

    expect(setOpenMock).not.toHaveBeenCalled();
    expect(node.open.value).toBe(true);
  });

  it("keeps a parent open when clicking inside a child floating element", async () => {
    const { childFloatingEl, parentOpen, onParentOpenChange } =
      await renderTreeOutsideClick("parent");

    await userEvent.click(childFloatingEl);
    await nextTick();

    expect(parentOpen.value).toBe(true);
    expect(onParentOpenChange).not.toHaveBeenCalled();
  });

  it("treats parent blank areas as outside for child nodes", async () => {
    const { floatingEl, parentOpen, childOpen } = await renderTreeOutsideClick("child");

    await userEvent.click(floatingEl);
    await nextTick();

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(false);
  });
});
