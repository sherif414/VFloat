import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, type Ref, ref } from "vue";
import {
  type FloatingTreeNode,
  type UseFloatingTreeNodeOptions,
  useFloatingTree,
  useFloatingTreeNode,
} from "@/composables/interactions";
import {
  type UseListNavigationOptions,
  type UseListNavigationReturn,
  useListNavigation,
} from "@/composables/interactions/use-list-navigation";
import type { AnchorElement, FloatingElement } from "@/composables/positioning";
import { useFloating } from "@/composables/positioning";

type ListNavigationTestContext = {
  activeIndex: Ref<number | null>;
  anchorEl: HTMLButtonElement;
  context: ReturnType<typeof useFloating>;
  floatingEl: HTMLDivElement;
  items: HTMLButtonElement[];
  listRef: Ref<Array<HTMLElement | null>>;
  onNavigate: ReturnType<typeof vi.fn>;
  openRef: Ref<boolean>;
  result: UseListNavigationReturn;
  scope: ReturnType<typeof effectScope>;
  treeNode?: FloatingTreeNode;
};

type SetupOptions = Partial<
  Omit<UseListNavigationOptions, "activeIndex" | "listRef" | "onNavigate">
>;

type SetupListHarnessOptions = {
  idPrefix?: string;
  itemCount?: number;
};

type TreeListConfig = {
  initialOpen?: boolean;
  nodeOptions?: UseFloatingTreeNodeOptions;
  options?: SetupOptions;
};

type SetupTreeFamilyOptions = {
  root?: TreeListConfig;
  child?: TreeListConfig;
  sibling?: TreeListConfig;
  grandchild?: TreeListConfig;
  childIndex?: number;
  siblingIndex?: number;
  grandchildIndex?: number;
  includeSibling?: boolean;
  includeGrandchild?: boolean;
};

type TreeFamilyNavigationTestContext = {
  child: ListNavigationTestContext;
  childIndex: number;
  grandchild?: ListNavigationTestContext;
  grandchildIndex: number;
  root: ListNavigationTestContext;
  sibling?: ListNavigationTestContext;
  siblingIndex: number;
  tree: ReturnType<typeof useFloatingTree>;
};

const trackedElements: HTMLElement[] = [];
const activeScopes: ReturnType<typeof effectScope>[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }

  trackedElements.length = 0;
}

function createButton(id: string): HTMLButtonElement {
  const button = trackElement(document.createElement("button"));
  button.id = id;
  button.type = "button";
  button.textContent = id;
  return button;
}

function createItems(container: HTMLElement, count = 8, prefix = "item"): HTMLButtonElement[] {
  return Array.from({ length: count }, (_, index) => {
    const button = createButton(`${prefix}-${index}`);
    container.appendChild(button);
    return button;
  });
}

async function flushListNavigation(ticks = 2) {
  for (let i = 0; i < ticks; i++) {
    await nextTick();
  }

  await new Promise((resolve) => setTimeout(resolve, 0));
}

function dispatchKey(target: EventTarget, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

function setupListNavigation(
  options: SetupOptions = {},
  initialOpen = false,
  treeNodeOptions?: UseFloatingTreeNodeOptions,
  harnessOptions: SetupListHarnessOptions = {},
): ListNavigationTestContext {
  const { idPrefix = "list", itemCount = 8 } = harnessOptions;
  const anchorEl = createButton(`${idPrefix}-anchor`);
  document.body.appendChild(anchorEl);

  const floatingEl = trackElement(document.createElement("div"));
  floatingEl.id = `${idPrefix}-floating`;
  document.body.appendChild(floatingEl);

  const items = createItems(floatingEl, itemCount, `${idPrefix}-item`);
  const listRef = ref<Array<HTMLElement | null>>(items);
  const openRef = ref(initialOpen);
  const activeIndex = ref<number | null>(null);
  const anchorRef = ref<AnchorElement>(anchorEl);
  const floatingRef = ref<FloatingElement>(floatingEl);
  const context = useFloating(anchorRef, floatingRef, { open: openRef });
  const onNavigate = vi.fn((index: number | null) => {
    activeIndex.value = index;
  });

  const scope = effectScope();
  activeScopes.push(scope);

  let treeNode: FloatingTreeNode | undefined;
  let result!: UseListNavigationReturn;
  scope.run(() => {
    if (treeNodeOptions) {
      treeNode = useFloatingTreeNode(context, treeNodeOptions);
    }

    result = useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate,
      ...options,
    });
  });

  return {
    activeIndex,
    anchorEl,
    context,
    floatingEl,
    items,
    listRef,
    onNavigate,
    openRef,
    result,
    scope,
    treeNode,
  };
}

function linkTreeAnchor(
  parent: ListNavigationTestContext,
  child: ListNavigationTestContext,
  index: number,
) {
  child.context.refs.setAnchor(parent.items[index]);
}

function setupTreeListNavigation(
  options: {
    rootOptions?: SetupOptions;
    rootInitialOpen?: boolean;
    rootNodeOptions?: UseFloatingTreeNodeOptions;
    childOptions?: SetupOptions;
    childInitialOpen?: boolean;
    childNodeOptions?: UseFloatingTreeNodeOptions;
    childIndex?: number;
  } = {},
) {
  const {
    rootOptions = {},
    rootInitialOpen = true,
    rootNodeOptions = {},
    childOptions = {},
    childInitialOpen = false,
    childNodeOptions = {},
    childIndex = 1,
  } = options;

  const tree = useFloatingTree({ id: "list-tree" });
  let child: ListNavigationTestContext | undefined;

  const root = setupListNavigation(
    {
      ...rootOptions,
      getChildNode: (index) => (index === childIndex ? (child?.treeNode ?? null) : null),
    },
    rootInitialOpen,
    {
      ...rootNodeOptions,
      tree,
    },
  );

  child = setupListNavigation(childOptions, childInitialOpen, {
    ...childNodeOptions,
    parent: root.treeNode ?? null,
  });

  return {
    child,
    root,
    tree,
  };
}

function setupTreeFamilyListNavigation(
  options: SetupTreeFamilyOptions = {},
): TreeFamilyNavigationTestContext {
  const {
    root: rootConfig = {},
    child: childConfig = {},
    sibling: siblingConfig = {},
    grandchild: grandchildConfig = {},
    childIndex = 1,
    siblingIndex = 2,
    grandchildIndex = 1,
    includeSibling = false,
    includeGrandchild = false,
  } = options;

  const tree = useFloatingTree({ id: "list-tree-family" });
  let child!: ListNavigationTestContext;
  let sibling: ListNavigationTestContext | undefined;
  let grandchild: ListNavigationTestContext | undefined;

  const rootOptions = rootConfig.options ?? {};
  const rootGetChildNode = rootOptions.getChildNode;
  const root = setupListNavigation(
    {
      ...rootOptions,
      getChildNode: (index) => {
        if (rootGetChildNode) {
          const explicitNode = rootGetChildNode(index);
          if (explicitNode) return explicitNode;
        }

        if (index === childIndex) {
          return child?.treeNode ?? null;
        }

        if (includeSibling && index === siblingIndex) {
          return sibling?.treeNode ?? null;
        }

        return null;
      },
    },
    rootConfig.initialOpen ?? true,
    {
      ...rootConfig.nodeOptions,
      tree,
    },
    { idPrefix: "root-family" },
  );

  const childOptions = childConfig.options ?? {};
  const childGetChildNode = childOptions.getChildNode;
  child = setupListNavigation(
    {
      ...childOptions,
      getChildNode: (index) => {
        if (childGetChildNode) {
          const explicitNode = childGetChildNode(index);
          if (explicitNode) return explicitNode;
        }

        if (includeGrandchild && index === grandchildIndex) {
          return grandchild?.treeNode ?? null;
        }

        return null;
      },
    },
    childConfig.initialOpen ?? false,
    {
      ...childConfig.nodeOptions,
      parent: root.treeNode ?? null,
    },
    { idPrefix: "child-family" },
  );

  if (includeSibling) {
    sibling = setupListNavigation(
      siblingConfig.options ?? {},
      siblingConfig.initialOpen ?? false,
      {
        ...siblingConfig.nodeOptions,
        parent: root.treeNode ?? null,
      },
      { idPrefix: "sibling-family" },
    );
  }

  if (includeGrandchild) {
    grandchild = setupListNavigation(
      grandchildConfig.options ?? {},
      grandchildConfig.initialOpen ?? false,
      {
        ...grandchildConfig.nodeOptions,
        parent: child.treeNode ?? null,
      },
      { idPrefix: "grandchild-family" },
    );
  }

  linkTreeAnchor(root, child, childIndex);

  if (sibling) {
    linkTreeAnchor(root, sibling, siblingIndex);
  }

  if (grandchild) {
    linkTreeAnchor(child, grandchild, grandchildIndex);
  }

  return {
    child,
    childIndex,
    grandchild,
    grandchildIndex,
    root,
    sibling,
    siblingIndex,
    tree,
  };
}

describe("useListNavigation", () => {
  afterEach(() => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }

    activeScopes.length = 0;
    clearTrackedElements();
    vi.clearAllMocks();
  });

  describe("opening behavior", () => {
    it("opens once on ArrowDown and targets the first enabled item", async () => {
      const ctx = setupListNavigation({
        disabledIndices: [0, 1],
        focusItemOnOpen: "auto",
        orientation: "vertical",
      });
      const scrollSpy = vi.fn();
      ctx.items[2].scrollIntoView = scrollSpy;

      dispatchKey(ctx.anchorEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.onNavigate).toHaveBeenCalledTimes(1);
      expect(ctx.onNavigate).toHaveBeenCalledWith(2);
      expect(ctx.activeIndex.value).toBe(2);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(ctx.items[2]);
    });

    it("opens once on ArrowUp and targets the last enabled item", async () => {
      const ctx = setupListNavigation({
        disabledIndices: [7],
        focusItemOnOpen: false,
        orientation: "vertical",
      });
      ctx.anchorEl.focus();

      dispatchKey(ctx.anchorEl, "ArrowUp");
      await flushListNavigation();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.onNavigate).toHaveBeenCalledTimes(1);
      expect(ctx.onNavigate).toHaveBeenCalledWith(6);
      expect(ctx.activeIndex.value).toBe(6);
      expect(document.activeElement).toBe(ctx.anchorEl);
    });

    it("ignores a disabled selectedIndex when resolving the initial item", async () => {
      const selectedIndex = ref(1);
      const ctx = setupListNavigation({
        disabledIndices: [1],
        focusItemOnOpen: true,
        orientation: "vertical",
        selectedIndex,
      });

      ctx.openRef.value = true;
      await flushListNavigation();

      expect(ctx.onNavigate).toHaveBeenCalledTimes(1);
      expect(ctx.activeIndex.value).toBe(0);
      expect(document.activeElement).toBe(ctx.items[0]);
    });

    it("only applies focusItemOnOpen auto to the current keyboard-open cycle", async () => {
      const ctx = setupListNavigation({
        focusItemOnOpen: "auto",
        orientation: "vertical",
      });
      ctx.anchorEl.focus();

      dispatchKey(ctx.anchorEl, "ArrowDown");
      await flushListNavigation();
      expect(document.activeElement).toBe(ctx.items[0]);

      ctx.openRef.value = false;
      await flushListNavigation();

      ctx.anchorEl.focus();
      ctx.onNavigate.mockClear();

      ctx.openRef.value = true;
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(ctx.anchorEl);
    });
  });

  describe("linear navigation", () => {
    it("skips disabled items without wrapping when loop is disabled", async () => {
      const ctx = setupListNavigation(
        {
          disabledIndices: [1],
          focusItemOnOpen: false,
          loop: false,
          orientation: "vertical",
        },
        true,
      );
      ctx.activeIndex.value = 0;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(2);

      ctx.onNavigate.mockClear();
      ctx.activeIndex.value = ctx.items.length - 1;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
      expect(ctx.activeIndex.value).toBe(ctx.items.length - 1);
    });

    it("wraps when loop is enabled", async () => {
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          loop: true,
          orientation: "vertical",
        },
        true,
      );
      ctx.activeIndex.value = ctx.items.length - 1;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.activeIndex.value).toBe(0);
    });

    it("moves to the first and last enabled items with Home and End", async () => {
      const ctx = setupListNavigation(
        {
          disabledIndices: [0, 7],
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        true,
      );
      ctx.activeIndex.value = 3;

      dispatchKey(ctx.floatingEl, "Home");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(1);

      dispatchKey(ctx.floatingEl, "End");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(6);
    });
  });

  describe("grid navigation", () => {
    it("respects RTL row looping inside a grid", async () => {
      const ctx = setupListNavigation(
        {
          cols: 4,
          focusItemOnOpen: false,
          loop: true,
          orientation: "both",
          rtl: true,
        },
        true,
      );
      ctx.activeIndex.value = 0;

      dispatchKey(ctx.floatingEl, "ArrowRight");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(3);

      dispatchKey(ctx.floatingEl, "ArrowLeft");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(0);
    });

    it("respects RTL next-row looping inside a grid", async () => {
      const ctx = setupListNavigation(
        {
          cols: 4,
          focusItemOnOpen: false,
          gridLoopDirection: "next",
          loop: true,
          orientation: "both",
          rtl: true,
        },
        true,
      );
      ctx.activeIndex.value = 3;

      dispatchKey(ctx.floatingEl, "ArrowLeft");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(4);

      dispatchKey(ctx.floatingEl, "ArrowRight");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(3);
    });
  });

  describe("virtual focus", () => {
    it("syncs aria-activedescendant and virtualItemRef", async () => {
      const virtualItemRef = ref<HTMLElement | null>(null);
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          orientation: "vertical",
          virtual: true,
          virtualItemRef,
        },
        true,
      );

      ctx.items.forEach((item, index) => {
        item.id = `option-${index}`;
      });
      ctx.activeIndex.value = 2;

      await flushListNavigation();

      expect(ctx.anchorEl.getAttribute("aria-activedescendant")).toBe("option-2");
      expect(virtualItemRef.value).toBe(ctx.items[2]);
      expect(document.activeElement).not.toBe(ctx.items[2]);
    });
  });

  describe("hover behavior", () => {
    it("does not activate disabled hovered items", async () => {
      const ctx = setupListNavigation(
        {
          disabledIndices: [4],
          focusItemOnHover: true,
          orientation: "vertical",
        },
        true,
      );

      ctx.items[4].dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: 16,
          clientY: 16,
        }),
      );
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
      expect(ctx.activeIndex.value).toBeNull();
    });
  });

  describe("floating tree integration", () => {
    it("does not open a child submenu from non-forward arrow keys on the shared trigger", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-anchor",
        },
        childOptions: {
          focusItemOnOpen: true,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-anchor",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
      });

      child.context.refs.setAnchor(root.items[1]);
      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.items[1], "ArrowDown");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(root.onNavigate).toHaveBeenLastCalledWith(2);
      expect(root.activeIndex.value).toBe(2);

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.items[1], "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(document.activeElement).toBe(child.items[0]);
    });

    it("restores DOM focus to the submenu trigger on backward close in non-virtual mode", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-focus",
        },
        childOptions: {
          focusItemOnOpen: true,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-focus",
        },
        rootOptions: {
          focusItemOnOpen: true,
          orientation: "vertical",
        },
      });

      child.context.refs.setAnchor(root.items[1]);
      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(document.activeElement).toBe(child.items[0]);

      dispatchKey(child.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(document.activeElement).toBe(root.items[1]);
    });

    it("opens a child node from the forward key and restores the parent in virtual focus mode", async () => {
      const virtualItemRef = ref<HTMLElement | null>(null);
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child",
        },
        childOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
          virtual: true,
          virtualItemRef,
        },
      });

      root.items.forEach((item, index) => {
        item.id = `root-option-${index}`;
      });

      root.activeIndex.value = 1;
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);

      dispatchKey(child.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(root.onNavigate).toHaveBeenLastCalledWith(1);
      expect(root.activeIndex.value).toBe(1);
      expect(root.anchorEl.getAttribute("aria-activedescendant")).toBe("root-option-1");
      expect(virtualItemRef.value).toBe(root.items[1]);
    });

    it("keeps ordinary navigation unchanged when no child node exists", async () => {
      const tree = useFloatingTree({ id: "list-tree-no-child" });
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        true,
        {
          id: "root",
          tree,
        },
      );

      ctx.activeIndex.value = 0;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.onNavigate).toHaveBeenCalledWith(1);
      expect(ctx.activeIndex.value).toBe(1);
      expect(ctx.context.state.open.value).toBe(true);
    });

    it("keeps child surfaces closed by default and opens them when openChildOnFocus is enabled", async () => {
      const defaultHarness = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-default",
        },
        childOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-default",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
      });

      defaultHarness.root.activeIndex.value = 0;
      await flushListNavigation();

      dispatchKey(defaultHarness.root.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(defaultHarness.root.onNavigate).toHaveBeenCalledWith(1);
      expect(defaultHarness.root.activeIndex.value).toBe(1);
      expect(defaultHarness.child.context.state.open.value).toBe(false);

      const enabledHarness = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-enabled",
        },
        childOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-enabled",
        },
        rootOptions: {
          focusItemOnOpen: false,
          openChildOnFocus: true,
          orientation: "vertical",
        },
      });

      enabledHarness.root.activeIndex.value = 0;
      await flushListNavigation();

      dispatchKey(enabledHarness.root.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(enabledHarness.root.onNavigate).toHaveBeenCalledWith(1);
      expect(enabledHarness.root.activeIndex.value).toBe(1);
      expect(enabledHarness.child.context.state.open.value).toBe(true);
    });

    it("focuses a tree-opened child when auto mode is triggered by the current tree-open cycle", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-auto-focus",
        },
        childOptions: {
          focusItemOnOpen: "auto",
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-auto-focus",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(child.onNavigate).toHaveBeenCalledWith(0);
      expect(child.activeIndex.value).toBe(0);
      expect(document.activeElement).toBe(child.items[0]);
    });

    it("clears tree-open bookkeeping after close so a later programmatic reopen stays local", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-reset",
        },
        childOptions: {
          focusItemOnOpen: "auto",
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-reset",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();
      expect(child.context.state.open.value).toBe(true);

      dispatchKey(child.floatingEl, "ArrowLeft");
      await flushListNavigation();
      expect(child.context.state.open.value).toBe(false);
      expect(root.activeIndex.value).toBe(1);

      child.activeIndex.value = null;
      child.onNavigate.mockClear();
      root.onNavigate.mockClear();

      child.context.state.setOpen(true, "programmatic");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(child.onNavigate).not.toHaveBeenCalled();
      expect(child.activeIndex.value).toBeNull();
      expect(document.activeElement).not.toBe(child.items[0]);

      child.context.state.setOpen(false, "programmatic");
      await flushListNavigation();

      expect(root.onNavigate).not.toHaveBeenCalled();
    });

    it("does not restore parent navigation when a child was opened manually instead of through tree navigation", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-manual-open",
        },
        childOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-manual-open",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
      });

      root.activeIndex.value = 0;
      await flushListNavigation();

      child.context.state.setOpen(true, "programmatic");
      await flushListNavigation();

      root.onNavigate.mockClear();

      dispatchKey(child.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(root.onNavigate).not.toHaveBeenCalled();
      expect(root.activeIndex.value).toBe(0);
    });

    it("does not restore parent navigation when the parent branch closes before the child can hand off", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-parent-close",
        },
        childOptions: {
          focusItemOnOpen: true,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-parent-close",
        },
        rootOptions: {
          focusItemOnOpen: true,
          orientation: "vertical",
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);

      root.onNavigate.mockClear();
      root.treeNode?.actions.close();
      await flushListNavigation();

      expect(root.context.state.open.value).toBe(false);
      expect(child.context.state.open.value).toBe(false);
      expect(root.onNavigate).not.toHaveBeenCalled();
    });

    it("opens child branches immediately when openChildOnFocus lands on the same trigger index", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-same-index",
        },
        childOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-same-index",
        },
        rootOptions: {
          cols: 3,
          disabledIndices: [0, 2],
          focusItemOnOpen: false,
          loop: true,
          openChildOnFocus: true,
          orientation: "both",
        },
      });

      root.activeIndex.value = 1;
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(root.onNavigate).toHaveBeenLastCalledWith(1);
      expect(root.activeIndex.value).toBe(1);
      expect(child.context.state.open.value).toBe(true);
    });

    it("cancels a pending child open when navigation moves away before the watcher flushes", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-pending-cancel",
        },
        childOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-pending-cancel",
        },
        rootOptions: {
          focusItemOnOpen: false,
          openChildOnFocus: true,
          orientation: "vertical",
        },
      });

      root.activeIndex.value = 0;

      dispatchKey(root.floatingEl, "ArrowDown");
      dispatchKey(root.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(root.activeIndex.value).toBe(2);
      expect(child.context.state.open.value).toBe(false);
    });

    it("uses RTL-aware forward and backward keys for vertical nested branches", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-rtl-vertical",
        },
        childOptions: {
          focusItemOnOpen: true,
          orientation: "vertical",
          rtl: true,
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-rtl-vertical",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
          rtl: true,
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(document.activeElement).toBe(child.items[0]);

      dispatchKey(child.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(root.activeIndex.value).toBe(1);
    });

    it("uses ArrowDown and ArrowUp for horizontal parent and child branches", async () => {
      const { root, child } = setupTreeListNavigation({
        childInitialOpen: false,
        childNodeOptions: {
          id: "child-horizontal",
        },
        childOptions: {
          focusItemOnOpen: true,
          orientation: "horizontal",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-horizontal",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "horizontal",
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(document.activeElement).toBe(child.items[0]);

      dispatchKey(child.floatingEl, "ArrowUp");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(root.activeIndex.value).toBe(1);
    });

    it("lets a tree child opt out of nested close-key handling with nested false", async () => {
      const { child } = setupTreeListNavigation({
        childInitialOpen: true,
        childNodeOptions: {
          id: "child-not-nested",
        },
        childOptions: {
          focusItemOnOpen: false,
          nested: false,
          orientation: "vertical",
        },
        rootInitialOpen: true,
        rootNodeOptions: {
          id: "root-not-nested",
        },
        rootOptions: {
          focusItemOnOpen: false,
          orientation: "vertical",
        },
      });

      dispatchKey(child.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
    });

    it("supports nested key behavior without tree inference when nested is set explicitly", async () => {
      const ctx = setupListNavigation({
        focusItemOnOpen: false,
        nested: true,
        openOnArrowKeyDown: true,
        orientation: "vertical",
        selectedIndex: 0,
      });

      dispatchKey(ctx.anchorEl, "ArrowDown");
      await flushListNavigation();
      expect(ctx.context.state.open.value).toBe(false);

      dispatchKey(ctx.anchorEl, "ArrowRight");
      await flushListNavigation();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.activeIndex.value).toBe(0);

      dispatchKey(ctx.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(ctx.context.state.open.value).toBe(false);
    });

    it("restores navigation one level at a time through a root, child, and grandchild branch", async () => {
      const { root, child, grandchild } = setupTreeFamilyListNavigation({
        child: {
          nodeOptions: {
            id: "child-level-1",
          },
          options: {
            focusItemOnOpen: true,
            orientation: "vertical",
          },
        },
        grandchild: {
          nodeOptions: {
            id: "child-level-2",
          },
          options: {
            focusItemOnOpen: true,
            orientation: "vertical",
          },
        },
        includeGrandchild: true,
        root: {
          nodeOptions: {
            id: "root-level-0",
          },
          options: {
            focusItemOnOpen: true,
            orientation: "vertical",
          },
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      if (!grandchild) {
        throw new Error("Expected a grandchild harness for the nested tree test");
      }

      child.activeIndex.value = 1;
      child.items[1].focus();
      await flushListNavigation();

      dispatchKey(child.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(grandchild.context.state.open.value).toBe(true);
      expect(document.activeElement).toBe(grandchild.items[0]);

      dispatchKey(grandchild.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(grandchild.context.state.open.value).toBe(false);
      expect(child.context.state.open.value).toBe(true);
      expect(child.activeIndex.value).toBe(1);
      expect(document.activeElement).toBe(child.items[1]);

      dispatchKey(child.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(root.context.state.open.value).toBe(true);
      expect(root.activeIndex.value).toBe(1);
      expect(document.activeElement).toBe(root.items[1]);
    });

    it("hands off sibling submenu state and restores the most recently opened trigger", async () => {
      const { root, child, sibling } = setupTreeFamilyListNavigation({
        child: {
          nodeOptions: {
            id: "child-a",
          },
          options: {
            focusItemOnOpen: true,
            orientation: "vertical",
          },
        },
        includeSibling: true,
        root: {
          nodeOptions: {
            id: "root-siblings",
          },
          options: {
            focusItemOnOpen: false,
            orientation: "vertical",
          },
        },
        sibling: {
          nodeOptions: {
            id: "child-b",
          },
          options: {
            focusItemOnOpen: true,
            orientation: "vertical",
          },
        },
      });

      root.activeIndex.value = 1;
      root.items[1].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(true);
      expect(sibling?.context.state.open.value).toBe(false);

      root.activeIndex.value = 2;
      root.items[2].focus();
      await flushListNavigation();

      dispatchKey(root.floatingEl, "ArrowRight");
      await flushListNavigation();

      expect(child.context.state.open.value).toBe(false);
      expect(sibling?.context.state.open.value).toBe(true);

      if (!sibling) {
        throw new Error("Expected a sibling harness for the sibling handoff test");
      }

      root.onNavigate.mockClear();
      dispatchKey(sibling.floatingEl, "ArrowLeft");
      await flushListNavigation();

      expect(sibling.context.state.open.value).toBe(false);
      expect(root.onNavigate).toHaveBeenLastCalledWith(2);
      expect(root.activeIndex.value).toBe(2);
      expect(document.activeElement).toBe(root.items[2]);
    });
  });

  describe("cleanup and lifecycle", () => {
    it("cleanup removes listeners and clears virtual focus state", async () => {
      const virtualItemRef = ref<HTMLElement | null>(null);
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          orientation: "vertical",
          virtual: true,
          virtualItemRef,
        },
        true,
      );

      ctx.items.forEach((item, index) => {
        item.id = `cleanup-option-${index}`;
      });
      ctx.activeIndex.value = 1;
      await flushListNavigation();

      expect(ctx.anchorEl.getAttribute("aria-activedescendant")).toBe("cleanup-option-1");
      expect(virtualItemRef.value).toBe(ctx.items[1]);

      ctx.result.cleanup();
      await flushListNavigation();

      expect(ctx.anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
      expect(virtualItemRef.value).toBeNull();

      ctx.onNavigate.mockClear();
      dispatchKey(ctx.anchorEl, "ArrowDown");
      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
    });
  });
});
