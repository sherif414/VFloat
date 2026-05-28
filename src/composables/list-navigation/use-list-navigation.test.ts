import { afterEach, describe, expect, it } from "vite-plus/test";
import { effectScope, ref, nextTick } from "vue";
import { useListNavigation } from "@/composables/list-navigation/use-list-navigation";
import { useTree } from "@/composables/tree/use-tree";
import { useFloating } from "@/composables";

function dispatchKey(target: EventTarget, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useListNavigation", () => {
  let scope: ReturnType<typeof effectScope>;
  const elementsToCleanUp: any[] = [];

  afterEach(() => {
    if (scope) {
      scope.stop();
    }
    for (const el of elementsToCleanUp) {
      if (el && typeof el.remove === "function") {
        el.remove();
      }
    }
    elementsToCleanUp.length = 0;
  });

  function setup(
    options: {
      enabled?: any;
      loop?: any;
      orientation?: any;
      openOnArrowKeyDown?: any;
      rtl?: any;
      closeOnTab?: any;
      anchorEl?: any;
    } = {},
  ) {
    scope = effectScope();

    const anchorEl = options.anchorEl || document.createElement("button");
    const floatingEl = document.createElement("div");

    if (anchorEl instanceof HTMLElement) {
      document.body.appendChild(anchorEl);
      elementsToCleanUp.push(anchorEl);
    }
    document.body.appendChild(floatingEl);
    elementsToCleanUp.push(floatingEl);

    const openRef = ref(false);
    const anchorRef = ref(anchorEl);
    const floatingRef = ref(floatingEl);

    let resultContext: any;
    let tree: ReturnType<typeof useTree>;

    scope.run(() => {
      const context = useFloating(anchorRef, floatingRef, { open: openRef });

      tree = useTree({
        items: [{ id: "1" }, { id: "2" }, { id: "3" }],
        getItemId: (item) => item.id,
      });

      const navigation = useListNavigation(context, {
        collection: tree.rootBranch,
        orientation: options.orientation ?? "vertical",
        loop: "loop" in options ? options.loop : true,
        enabled: options.enabled,
        openOnArrowKeyDown: options.openOnArrowKeyDown,
        rtl: options.rtl,
        closeOnTab: options.closeOnTab,
      });

      resultContext = { context, navigation, tree, anchorEl, floatingEl, openRef };
    });

    return resultContext as {
      context: ReturnType<typeof useFloating>;
      navigation: ReturnType<typeof useListNavigation>;
      tree: ReturnType<typeof useTree>;
      anchorEl: any;
      floatingEl: HTMLDivElement;
      openRef: ReturnType<typeof ref<boolean>>;
    };
  }

  it("opens on ArrowDown and sets activeValue to first item", () => {
    const { anchorEl, openRef, tree } = setup();

    dispatchKey(anchorEl, "ArrowDown");

    expect(openRef.value).toBe(true);
    expect(tree.activeValue.value).toBe("1");
  });

  it("opens on ArrowUp and sets activeValue to last item", () => {
    const { anchorEl, openRef, tree } = setup();

    dispatchKey(anchorEl, "ArrowUp");

    expect(openRef.value).toBe(true);
    expect(tree.activeValue.value).toBe("3");
  });

  it("navigates next on ArrowDown when floating is open", () => {
    const { floatingEl, openRef, tree } = setup();
    openRef.value = true;
    tree.setActiveValue("1");

    dispatchKey(floatingEl, "ArrowDown");
    expect(tree.activeValue.value).toBe("2");

    dispatchKey(floatingEl, "ArrowDown");
    expect(tree.activeValue.value).toBe("3");
  });

  it("navigates previous on ArrowUp when floating is open", () => {
    const { floatingEl, openRef, tree } = setup();
    openRef.value = true;
    tree.setActiveValue("3");

    dispatchKey(floatingEl, "ArrowUp");
    expect(tree.activeValue.value).toBe("2");

    dispatchKey(floatingEl, "ArrowUp");
    expect(tree.activeValue.value).toBe("1");
  });

  it("navigates to first on Home", () => {
    const { floatingEl, openRef, tree } = setup();
    openRef.value = true;
    tree.setActiveValue("3");

    dispatchKey(floatingEl, "Home");
    expect(tree.activeValue.value).toBe("1");
  });

  it("navigates to last on End", () => {
    const { floatingEl, openRef, tree } = setup();
    openRef.value = true;
    tree.setActiveValue("1");

    dispatchKey(floatingEl, "End");
    expect(tree.activeValue.value).toBe("3");
  });

  it("wraps around when loop is enabled", () => {
    const { floatingEl, openRef, tree } = setup();
    openRef.value = true;
    tree.setActiveValue("3");

    dispatchKey(floatingEl, "ArrowDown");
    expect(tree.activeValue.value).toBe("1");
  });

  it("closes on Tab without preventing default", () => {
    const { floatingEl, openRef } = setup();
    openRef.value = true;

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    floatingEl.dispatchEvent(event);
    expect(openRef.value).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores keydowns on floating element when closed", () => {
    const { floatingEl, openRef, tree } = setup();
    openRef.value = false;
    tree.setActiveValue("1");

    dispatchKey(floatingEl, "ArrowDown");
    expect(tree.activeValue.value).toBe("1");
  });

  it("resets tree activeValue when closed", async () => {
    const { openRef, tree } = setup();
    openRef.value = true;
    tree.setActiveValue("2");

    openRef.value = false;
    await nextTick();
    expect(tree.activeValue.value).toBeNull();
  });

  describe("2D Navigation", () => {
    function setup2D(
      options: {
        rtl?: boolean;
        items?: any[];
        isItemDisabled?: (item: any) => boolean;
      } = {},
    ) {
      scope = effectScope();

      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");

      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let resultContext: any;
      let tree: ReturnType<typeof useTree>;

      const items = options.items || [
        {
          id: "1",
          children: [{ id: "1-1" }, { id: "1-2" }],
        },
        { id: "2" },
      ];

      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });

        tree = useTree({
          items,
          getItemId: (item) => item.id,
          getItemChildren: (item) => item.children,
          isItemDisabled: options.isItemDisabled,
        });

        const navigation = useListNavigation(context, {
          collection: tree.rootBranch,
          orientation: "vertical",
          rtl: options.rtl,
          onEnter(activeValue) {
            if (tree.hasChildren(activeValue)) {
              tree.expandBranch(activeValue);
              const firstEnabled = tree.getFirstEnabledDescendantValue(activeValue);
              if (firstEnabled) {
                tree.setActiveValue(firstEnabled);
              }
            }
          },
          onExit(activeValue) {
            const parentValue = tree.getParentValue(activeValue);
            if (parentValue) {
              tree.setActiveValue(parentValue);
              tree.collapseBranch(parentValue);
            }
          },
        });

        resultContext = { context, navigation, tree, floatingEl, items };
      });

      return resultContext as {
        context: ReturnType<typeof useFloating>;
        navigation: ReturnType<typeof useListNavigation>;
        tree: ReturnType<typeof useTree>;
        floatingEl: HTMLDivElement;
        items: any[];
      };
    }

    it("expands branch and moves to first child on ArrowRight", () => {
      const { floatingEl, tree } = setup2D();
      tree.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowRight");

      expect(tree.expandedValues.value.has("1")).toBe(true);
      expect(tree.activeValue.value).toBe("1-1");
    });

    it("onExit fires for root-level items only (branch-scoped)", () => {
      const { floatingEl, tree } = setup2D();
      tree.setActiveValue("1");

      // ArrowLeft on a root item with no parent — onExit fires but does nothing
      dispatchKey(floatingEl, "ArrowLeft");
      expect(tree.activeValue.value).toBe("1");

      // Cross-branch exit (child → parent) requires a child branch's useListNavigation
      tree.expandBranch("1");
      tree.setActiveValue("1-1");
      // rootBranch.activeValue is null here, so onExit won't fire from rootBranch
      dispatchKey(floatingEl, "ArrowLeft");
      // Active value stays at "1-1" — no cross-branch exit from rootBranch
      expect(tree.activeValue.value).toBe("1-1");
    });

    it("respects RTL for expanding branches", () => {
      const { floatingEl, tree } = setup2D({ rtl: true });
      tree.setActiveValue("1");

      // Expand on ArrowLeft in RTL (enter intent)
      dispatchKey(floatingEl, "ArrowLeft");
      expect(tree.expandedValues.value.has("1")).toBe(true);
      expect(tree.activeValue.value).toBe("1-1");
    });

    it("skips disabled immediate children on branch expansion and targets first enabled descendant", () => {
      const customItems = [
        {
          id: "1",
          children: [
            { id: "1-1", disabled: true },
            { id: "1-2", disabled: true, children: [{ id: "1-2-1", disabled: true }] },
            { id: "1-3", disabled: false },
          ],
        },
      ];
      const { floatingEl, tree } = setup2D({
        items: customItems,
        isItemDisabled: (item) => !!item.disabled,
      });
      tree.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowRight");

      expect(tree.expandedValues.value.has("1")).toBe(true);
      expect(tree.activeValue.value).toBe("1-3"); // skipped disabled 1-1, 1-2, 1-2-1
    });

    it("stays on parent opener when expanding a branch where all descendants are disabled", () => {
      const customItems = [
        {
          id: "1",
          children: [
            { id: "1-1", disabled: true },
            { id: "1-2", disabled: true },
          ],
        },
      ];
      const { floatingEl, tree } = setup2D({
        items: customItems,
        isItemDisabled: (item) => !!item.disabled,
      });
      tree.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowRight");

      expect(tree.expandedValues.value.has("1")).toBe(true);
      expect(tree.activeValue.value).toBe("1"); // stays on opener
    });

    it("navigates strictly within sibling items on ArrowDown/Up when parent is expanded", () => {
      const { floatingEl, tree } = setup2D();
      // Setup: "1" is expanded with children "1-1" and "1-2". Next sibling of "1" is "2".
      tree.expandBranch("1");
      tree.setActiveValue("1");

      // Press ArrowDown on "1". rootBranch navigates root-level only → moves to "2".
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("2");

      // Press ArrowUp on "2". rootBranch navigates root-level only → moves back to "1".
      dispatchKey(floatingEl, "ArrowUp");
      expect(tree.activeValue.value).toBe("1");
    });
  });

  describe("Option: enabled", () => {
    it("does not respond when disabled initially", () => {
      const { anchorEl, openRef } = setup({ enabled: false });
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });

    it("does not respond on floating element when disabled initially", () => {
      const { floatingEl, openRef, tree } = setup({ enabled: false });
      openRef.value = true;
      tree.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("1");
    });

    it("supports dynamic changes of enabled status", async () => {
      const enabledRef = ref(true);
      const { anchorEl, openRef } = setup({ enabled: enabledRef });

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(true);

      openRef.value = false;
      enabledRef.value = false;
      await nextTick();

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });
  });

  describe("Option: loop", () => {
    it("does not wrap when loop is false", () => {
      const { floatingEl, openRef, tree } = setup({ loop: false });
      openRef.value = true;
      tree.setActiveValue("3");

      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("3");
    });

    it("does not wrap when loop defaults to false", () => {
      const { floatingEl, openRef, tree } = setup({ loop: undefined });
      openRef.value = true;
      tree.setActiveValue("3");

      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("3");
    });
  });

  describe("Option: orientation", () => {
    describe("horizontal orientation", () => {
      it("opens on ArrowRight and ArrowLeft when closed", () => {
        const { anchorEl, openRef, tree } = setup({ orientation: "horizontal", loop: false });

        dispatchKey(anchorEl, "ArrowRight");
        expect(openRef.value).toBe(true);
        expect(tree.activeValue.value).toBe("1");

        openRef.value = false;
        tree.setActiveValue(null);

        dispatchKey(anchorEl, "ArrowLeft");
        expect(openRef.value).toBe(true);
        expect(tree.activeValue.value).toBe("3");
      });

      it("respects RTL for opening in horizontal orientation", () => {
        const { anchorEl, openRef, tree } = setup({
          orientation: "horizontal",
          loop: false,
          rtl: true,
        });

        dispatchKey(anchorEl, "ArrowLeft");
        expect(openRef.value).toBe(true);
        expect(tree.activeValue.value).toBe("1");

        openRef.value = false;
        tree.setActiveValue(null);

        dispatchKey(anchorEl, "ArrowRight");
        expect(openRef.value).toBe(true);
        expect(tree.activeValue.value).toBe("3");
      });

      it("navigates on ArrowRight/Left and ignores ArrowUp/Down when open", () => {
        const { floatingEl, openRef, tree } = setup({ orientation: "horizontal" });
        openRef.value = true;
        tree.setActiveValue("1");

        dispatchKey(floatingEl, "ArrowDown");
        expect(tree.activeValue.value).toBe("1");
        dispatchKey(floatingEl, "ArrowUp");
        expect(tree.activeValue.value).toBe("1");

        dispatchKey(floatingEl, "ArrowRight");
        expect(tree.activeValue.value).toBe("2");
        dispatchKey(floatingEl, "ArrowLeft");
        expect(tree.activeValue.value).toBe("1");
      });
    });
  });

  describe("Option: openOnArrowKeyDown", () => {
    it("does not open when openOnArrowKeyDown is false", () => {
      const { anchorEl, openRef } = setup({ openOnArrowKeyDown: false });
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });
  });

  describe("Option: closeOnTab", () => {
    it("does not close on Tab when closeOnTab is false", () => {
      const { floatingEl, openRef } = setup({ closeOnTab: false });
      openRef.value = true;

      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(true);
    });
  });

  describe("Virtual Element Support", () => {
    it("binds listeners and works with VirtualElement contextElement", () => {
      const contextEl = document.createElement("button");
      const virtualAnchor = {
        contextElement: contextEl,
      };

      const { openRef, tree } = setup({ anchorEl: virtualAnchor });

      dispatchKey(contextEl, "ArrowDown");
      expect(openRef.value).toBe(true);
      expect(tree.activeValue.value).toBe("1");
    });
  });

  describe("Cleanup method", () => {
    it("removes all listeners and stops watchers when cleanup is called", () => {
      const { navigation, anchorEl, openRef } = setup();

      navigation.cleanup();

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });
  });

  describe("Typeable Targets Handling", () => {
    it("ignores arrow keydowns if target is typeable element inside the anchor", () => {
      const anchorEl = document.createElement("div");
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      anchorEl.appendChild(inputEl);

      const { openRef } = setup({ anchorEl });

      inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(openRef.value).toBe(false);
    });
  });

  describe("Real-world patterns & Edge Cases", () => {
    it("skips disabled elements during navigation", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let tree: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        tree = useTree({
          items: [
            { id: "1", disabled: false },
            { id: "2", disabled: true },
            { id: "3", disabled: false },
          ],
          getItemId: (item) => item.id,
          isItemDisabled: (item) => item.disabled,
        });
        useListNavigation(context, { collection: tree.rootBranch, orientation: "vertical" });
      });

      tree.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("3");

      dispatchKey(floatingEl, "ArrowUp");
      expect(tree.activeValue.value).toBe("1");
    });

    it("handles dynamic updates of tree items", async () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      const itemsRef = ref([{ id: "1" }, { id: "2" }]);
      let tree: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        tree = useTree({
          items: itemsRef,
          getItemId: (item) => item.id,
        });
        useListNavigation(context, { collection: tree.rootBranch, orientation: "vertical" });
      });

      tree.setActiveValue("2");
      itemsRef.value = [{ id: "1" }];
      await nextTick();

      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("1");
    });

    it("only prevents default on handled key events", () => {
      const { floatingEl, openRef } = setup();
      openRef.value = true;

      const unhandledEvent = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      floatingEl.dispatchEvent(unhandledEvent);
      expect(unhandledEvent.defaultPrevented).toBe(false);

      const handledEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      floatingEl.dispatchEvent(handledEvent);
      expect(handledEvent.defaultPrevented).toBe(true);
    });

    it("handles typeable elements inside floating list", () => {
      const { floatingEl, openRef, tree } = setup();
      openRef.value = true;

      const input = document.createElement("input");
      floatingEl.appendChild(input);
      elementsToCleanUp.push(input);

      const typingEvent = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(typingEvent);
      expect(typingEvent.defaultPrevented).toBe(false);

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(arrowEvent);
      expect(tree.activeValue.value).toBe("1");
      expect(arrowEvent.defaultPrevented).toBe(true);
    });

    it("respects top-level collapse boundaries in 2D Navigation", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let tree: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        tree = useTree({
          items: [{ id: "1" }, { id: "2" }],
          getItemId: (item) => item.id,
        });
        useListNavigation(context, { collection: tree.rootBranch, orientation: "vertical" });
      });

      tree.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowLeft");
      expect(tree.activeValue.value).toBe("1");
    });
  });

  describe("Complex Keyboard Sequences Marathon", () => {
    it("simulates a flat menu keyboard marathon navigation flow", async () => {
      const { anchorEl, floatingEl, openRef, tree } = setup();

      // 1. Initially closed. ArrowDown opens and sets to first
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(true);
      expect(tree.activeValue.value).toBe("1");

      // 2. ArrowDown moves next
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("2");

      // 3. ArrowDown moves next
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("3");

      // 4. ArrowDown wraps around (loop defaults to true in setup)
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("1");

      // 5. Home jumps to first
      dispatchKey(floatingEl, "Home");
      expect(tree.activeValue.value).toBe("1");

      // 6. End jumps to last
      dispatchKey(floatingEl, "End");
      expect(tree.activeValue.value).toBe("3");

      // 7. ArrowDown wraps
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("1");

      // 8. ArrowUp wraps to last
      dispatchKey(floatingEl, "ArrowUp");
      expect(tree.activeValue.value).toBe("3");

      // 9. ArrowUp moves previous
      dispatchKey(floatingEl, "ArrowUp");
      expect(tree.activeValue.value).toBe("2");

      // 10. Tab closes the menu and clears activeValue
      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(false);
      await nextTick();
      expect(tree.activeValue.value).toBeNull();

      // 11. Closed. ArrowUp opens and sets active to last
      dispatchKey(anchorEl, "ArrowUp");
      expect(openRef.value).toBe(true);
      expect(tree.activeValue.value).toBe("3");

      // 12. ArrowDown wraps
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("1");

      // 13. Tab closes again
      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(false);
    });

    it("simulates a 2D Nested Submenu navigation marathon", async () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      type TreeNode = { id: string; children?: TreeNode[] };
      const items: TreeNode[] = [
        {
          id: "1",
          children: [{ id: "1-1" }, { id: "1-2" }],
        },
        { id: "2" },
      ];

      let tree: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        tree = useTree({
          items,
          getItemId: (item) => item.id,
          getItemChildren: (item) => item.children,
        });
        useListNavigation(context, {
          collection: tree.rootBranch,
          orientation: "vertical",
          onEnter(activeValue) {
            if (tree.hasChildren(activeValue)) {
              tree.expandBranch(activeValue);
              const firstEnabled = tree.getFirstEnabledDescendantValue(activeValue);
              if (firstEnabled) {
                tree.setActiveValue(firstEnabled);
              }
            }
          },
          onExit(activeValue) {
            const parentValue = tree.getParentValue(activeValue);
            if (parentValue) {
              tree.setActiveValue(parentValue);
              tree.collapseBranch(parentValue);
            }
          },
        });
      });

      // 1. Set active to root item "1"
      tree.setActiveValue("1");

      // 2. ArrowRight expands branch "1" and moves to first child "1-1"
      dispatchKey(floatingEl, "ArrowRight");
      expect(tree.expandedValues.value.has("1")).toBe(true);
      expect(tree.activeValue.value).toBe("1-1");

      // 3. ArrowDown — activeValue "1-1" is in child branch, rootBranch.activeValue is null,
      // so rootBranch.setNext() activates the first root item "1"
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("1");

      // 4. ArrowDown moves to next root sibling "2"
      dispatchKey(floatingEl, "ArrowDown");
      expect(tree.activeValue.value).toBe("2");

      // 5. ArrowLeft on root "2" (no parent) does nothing
      dispatchKey(floatingEl, "ArrowLeft");
      expect(tree.activeValue.value).toBe("2");

      // 6. ArrowUp moves back to root "1"
      dispatchKey(floatingEl, "ArrowUp");
      expect(tree.activeValue.value).toBe("1");

      // 7. ArrowRight expands again and moves to child "1-1"
      dispatchKey(floatingEl, "ArrowRight");
      expect(tree.expandedValues.value.has("1")).toBe(true);
      expect(tree.activeValue.value).toBe("1-1");

      // 8. ArrowLeft — "1-1" is in child branch, rootBranch doesn't see it.
      // Exit doesn't fire from rootBranch. Manually collapse to test the tree API.
      // Cross-branch exit requires child branch's useListNavigation.
      // Use tree API directly to simulate the exit:
      tree.setActiveValue("1");
      tree.collapseBranch("1");
      expect(tree.expandedValues.value.has("1")).toBe(false);
      expect(tree.activeValue.value).toBe("1");

      // 9. Close trigger resets activeValue to null
      openRef.value = false;
      await nextTick();
      expect(tree.activeValue.value).toBeNull();
    });
  });

  describe("Decoupled Callbacks & Custom Collection", () => {
    it("supports decoupled custom collection conforming to NavigableCollection interface", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let setNextCalled = false;
      let setPreviousCalled = false;

      const mockCollection = {
        activeValue: ref("item-1"),
        setActiveValue: () => {},
        setNext: () => {
          setNextCalled = true;
        },
        setPrevious: () => {
          setPreviousCalled = true;
        },
        setFirst: () => {},
        setLast: () => {},
      };

      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        useListNavigation(context, {
          collection: mockCollection,
          orientation: "vertical",
        });
      });

      dispatchKey(floatingEl, "ArrowDown");
      expect(setNextCalled).toBe(true);

      dispatchKey(floatingEl, "ArrowUp");
      expect(setPreviousCalled).toBe(true);
    });

    it("triggers onEnter and onExit with activeValue and KeyboardEvent", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let enterArgs: any[] = [];
      let exitArgs: any[] = [];

      const mockCollection = {
        activeValue: ref("item-active"),
        setActiveValue: () => {},
        setNext: () => {},
        setPrevious: () => {},
        setFirst: () => {},
        setLast: () => {},
      };

      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        useListNavigation(context, {
          collection: mockCollection,
          orientation: "vertical",
          onEnter: (activeValue, e) => {
            enterArgs = [activeValue, e];
          },
          onExit: (activeValue, e) => {
            exitArgs = [activeValue, e];
          },
        });
      });

      dispatchKey(floatingEl, "ArrowRight");
      expect(enterArgs[0]).toBe("item-active");
      expect(enterArgs[1] instanceof KeyboardEvent).toBe(true);

      dispatchKey(floatingEl, "ArrowLeft");
      expect(exitArgs[0]).toBe("item-active");
      expect(exitArgs[1] instanceof KeyboardEvent).toBe(true);
    });
  });
});
