import { afterEach, describe, expect, it } from "vite-plus/test";
import { effectScope, ref, nextTick } from "vue";
import { useListNavigation } from "@/composables/list-navigation/use-list-navigation";
import { useCollection } from "@/composables/collection/use-collection";
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
    let collection: ReturnType<typeof useCollection>;

    scope.run(() => {
      const context = useFloating(anchorRef, floatingRef, { open: openRef });

      collection = useCollection({
        items: [{ id: "1" }, { id: "2" }, { id: "3" }],
        itemValue: (item) => item.id,
      });

      const navigation = useListNavigation(context, {
        collection,
        orientation: options.orientation ?? "vertical",
        loop: "loop" in options ? options.loop : true,
        enabled: options.enabled,
        openOnArrowKeyDown: options.openOnArrowKeyDown,
        rtl: options.rtl,
        closeOnTab: options.closeOnTab,
      });

      resultContext = { context, navigation, collection, anchorEl, floatingEl, openRef };
    });

    return resultContext as {
      context: ReturnType<typeof useFloating>;
      navigation: ReturnType<typeof useListNavigation>;
      collection: ReturnType<typeof useCollection>;
      anchorEl: any;
      floatingEl: HTMLDivElement;
      openRef: ReturnType<typeof ref<boolean>>;
    };
  }

  it("opens on ArrowDown and sets activeValue to first item", () => {
    const { anchorEl, openRef, collection } = setup();

    dispatchKey(anchorEl, "ArrowDown");

    expect(openRef.value).toBe(true);
    expect(collection.activeValue.value).toBe("1");
  });

  it("opens on ArrowUp and sets activeValue to last item", () => {
    const { anchorEl, openRef, collection } = setup();

    dispatchKey(anchorEl, "ArrowUp");

    expect(openRef.value).toBe(true);
    expect(collection.activeValue.value).toBe("3");
  });

  it("navigates next on ArrowDown when floating is open", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("1");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("2");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("3");
  });

  it("navigates previous on ArrowUp when floating is open", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("3");

    dispatchKey(floatingEl, "ArrowUp");
    expect(collection.activeValue.value).toBe("2");

    dispatchKey(floatingEl, "ArrowUp");
    expect(collection.activeValue.value).toBe("1");
  });

  it("navigates to first on Home", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("3");

    dispatchKey(floatingEl, "Home");
    expect(collection.activeValue.value).toBe("1");
  });

  it("navigates to last on End", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("1");

    dispatchKey(floatingEl, "End");
    expect(collection.activeValue.value).toBe("3");
  });

  it("wraps around when loop is enabled", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("3");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("1");
  });

  it("closes on Tab", () => {
    const { floatingEl, openRef } = setup();
    openRef.value = true;

    dispatchKey(floatingEl, "Tab");
    expect(openRef.value).toBe(false);
  });

  it("resets collection activeValue when closed", async () => {
    const { openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("2");

    openRef.value = false;
    await nextTick();
    expect(collection.activeValue.value).toBeNull();
  });

  describe("2D Navigation", () => {
    function setup2D(options: { rtl?: boolean } = {}) {
      scope = effectScope();

      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");

      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let resultContext: any;
      let collection: ReturnType<typeof useCollection>;

      type TreeNode = { id: string; children?: TreeNode[] };
      const items: TreeNode[] = [
        {
          id: "1",
          children: [{ id: "1-1" }, { id: "1-2" }],
        },
        { id: "2" },
      ];

      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });

        collection = useCollection<TreeNode>({
          items,
          itemValue: (item) => item.id,
          itemChildren: (item) => item.children,
        });

        const navigation = useListNavigation(context, {
          collection,
          orientation: "vertical",
          rtl: options.rtl,
        });

        resultContext = { context, navigation, collection, floatingEl, items };
      });

      return resultContext as {
        context: ReturnType<typeof useFloating>;
        navigation: ReturnType<typeof useListNavigation>;
        collection: ReturnType<typeof useCollection>;
        floatingEl: HTMLDivElement;
        items: TreeNode[];
      };
    }

    it("expands branch and moves to first child on ArrowRight", () => {
      const { floatingEl, collection } = setup2D();
      collection.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowRight");

      expect(collection.expandedValues.value.has("1")).toBe(true);
      expect(collection.activeValue.value).toBe("1-1");
    });

    it("collapses branch and moves to parent on ArrowLeft", () => {
      const { floatingEl, collection } = setup2D();
      collection.expandBranch("1");
      collection.setActiveValue("1-1");

      dispatchKey(floatingEl, "ArrowLeft");

      expect(collection.expandedValues.value.has("1")).toBe(false);
      expect(collection.activeValue.value).toBe("1");
    });

    it("respects RTL for expanding and collapsing branches", () => {
      const { floatingEl, collection } = setup2D({ rtl: true });
      collection.setActiveValue("1");

      // Expand on ArrowLeft in RTL
      dispatchKey(floatingEl, "ArrowLeft");
      expect(collection.expandedValues.value.has("1")).toBe(true);
      expect(collection.activeValue.value).toBe("1-1");

      // Collapse on ArrowRight in RTL
      dispatchKey(floatingEl, "ArrowRight");
      expect(collection.expandedValues.value.has("1")).toBe(false);
      expect(collection.activeValue.value).toBe("1");
    });
  });

  describe("Option: enabled", () => {
    it("does not respond when disabled initially", () => {
      const { anchorEl, openRef } = setup({ enabled: false });
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });

    it("does not respond on floating element when disabled initially", () => {
      const { floatingEl, openRef, collection } = setup({ enabled: false });
      openRef.value = true;
      collection.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");
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
      const { floatingEl, openRef, collection } = setup({ loop: false });
      openRef.value = true;
      collection.setActiveValue("3");

      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");
    });

    it("does not wrap when loop defaults to false", () => {
      const { floatingEl, openRef, collection } = setup({ loop: undefined });
      openRef.value = true;
      collection.setActiveValue("3");

      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");
    });
  });

  describe("Option: orientation", () => {
    describe("horizontal orientation", () => {
      it("opens on ArrowRight and ArrowLeft when closed", () => {
        const { anchorEl, openRef, collection } = setup({ orientation: "horizontal", loop: false });

        dispatchKey(anchorEl, "ArrowRight");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("1");

        openRef.value = false;
        collection.setActiveValue(null);

        dispatchKey(anchorEl, "ArrowLeft");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("3");
      });

      it("respects RTL for opening in horizontal orientation", () => {
        const { anchorEl, openRef, collection } = setup({
          orientation: "horizontal",
          loop: false,
          rtl: true,
        });

        dispatchKey(anchorEl, "ArrowLeft");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("1");

        openRef.value = false;
        collection.setActiveValue(null);

        dispatchKey(anchorEl, "ArrowRight");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("3");
      });

      it("navigates on ArrowRight/Left and ignores ArrowUp/Down when open", () => {
        const { floatingEl, openRef, collection } = setup({ orientation: "horizontal" });
        openRef.value = true;
        collection.setActiveValue("1");

        dispatchKey(floatingEl, "ArrowDown");
        expect(collection.activeValue.value).toBe("1");
        dispatchKey(floatingEl, "ArrowUp");
        expect(collection.activeValue.value).toBe("1");

        dispatchKey(floatingEl, "ArrowRight");
        expect(collection.activeValue.value).toBe("2");
        dispatchKey(floatingEl, "ArrowLeft");
        expect(collection.activeValue.value).toBe("1");
      });
    });

    describe("both orientation (grid)", () => {
      it("opens on all arrow keys when closed", () => {
        const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        for (const key of arrowKeys) {
          const { anchorEl, openRef } = setup({ orientation: "both" });
          dispatchKey(anchorEl, key);
          expect(openRef.value).toBe(true);
        }
      });

      it("navigates on all arrow keys when open", () => {
        const { floatingEl, openRef, collection } = setup({ orientation: "both" });
        openRef.value = true;
        collection.setActiveValue("2");

        dispatchKey(floatingEl, "ArrowDown");
        expect(collection.activeValue.value).toBe("3");

        dispatchKey(floatingEl, "ArrowUp");
        expect(collection.activeValue.value).toBe("2");

        dispatchKey(floatingEl, "ArrowLeft");
        expect(collection.activeValue.value).toBe("1");

        dispatchKey(floatingEl, "ArrowRight");
        expect(collection.activeValue.value).toBe("2");
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

      const { openRef, collection } = setup({ anchorEl: virtualAnchor });

      dispatchKey(contextEl, "ArrowDown");
      expect(openRef.value).toBe(true);
      expect(collection.activeValue.value).toBe("1");
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

      let collection: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        collection = useCollection({
          items: [
            { id: "1", disabled: false },
            { id: "2", disabled: true },
            { id: "3", disabled: false },
          ],
          itemValue: (item) => item.id,
          itemDisabled: (item) => item.disabled,
        });
        useListNavigation(context, { collection, orientation: "vertical" });
      });

      collection.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");

      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("1");
    });

    it("handles dynamic updates of collection items", async () => {
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
      let collection: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        collection = useCollection({
          items: itemsRef,
          itemValue: (item) => item.id,
        });
        useListNavigation(context, { collection, orientation: "vertical" });
      });

      collection.setActiveValue("2");
      itemsRef.value = [{ id: "1" }];
      await nextTick();

      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");
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
      const { floatingEl, openRef, collection } = setup();
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
      expect(collection.activeValue.value).toBe("1");
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

      let collection: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        collection = useCollection({
          items: [{ id: "1" }, { id: "2" }],
          itemValue: (item) => item.id,
        });
        useListNavigation(context, { collection, orientation: "vertical" });
      });

      collection.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowLeft");
      expect(collection.activeValue.value).toBe("1");
    });
  });

  describe("Complex Keyboard Sequences Marathon", () => {
    it("simulates a flat menu keyboard marathon navigation flow", async () => {
      const { anchorEl, floatingEl, openRef, collection } = setup();

      // 1. Initially closed. ArrowDown opens and sets to first
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(true);
      expect(collection.activeValue.value).toBe("1");

      // 2. ArrowDown moves next
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("2");

      // 3. ArrowDown moves next
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");

      // 4. ArrowDown wraps around (loop defaults to true in setup)
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");

      // 5. Home jumps to first
      dispatchKey(floatingEl, "Home");
      expect(collection.activeValue.value).toBe("1");

      // 6. End jumps to last
      dispatchKey(floatingEl, "End");
      expect(collection.activeValue.value).toBe("3");

      // 7. ArrowDown wraps
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");

      // 8. ArrowUp wraps to last
      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("3");

      // 9. ArrowUp moves previous
      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("2");

      // 10. Tab closes the menu and clears activeValue
      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(false);
      await nextTick();
      expect(collection.activeValue.value).toBeNull();

      // 11. Closed. ArrowUp opens and sets active to last
      dispatchKey(anchorEl, "ArrowUp");
      expect(openRef.value).toBe(true);
      expect(collection.activeValue.value).toBe("3");

      // 12. ArrowDown wraps
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");

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

      let collection: any;
      scope.run(() => {
        const context = useFloating(anchorRef, floatingRef, { open: openRef });
        collection = useCollection({
          items,
          itemValue: (item) => item.id,
          itemChildren: (item) => item.children,
        });
        useListNavigation(context, { collection, orientation: "vertical" });
      });

      // 1. Set active to root item "1"
      collection.setActiveValue("1");

      // 2. ArrowRight expands branch "1" and moves to first child "1-1"
      dispatchKey(floatingEl, "ArrowRight");
      expect(collection.expandedValues.value.has("1")).toBe(true);
      expect(collection.activeValue.value).toBe("1-1");

      // 3. ArrowDown moves to next child "1-2"
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1-2");

      // 4. ArrowRight on child "1-2" (no children) does nothing
      dispatchKey(floatingEl, "ArrowRight");
      expect(collection.activeValue.value).toBe("1-2");

      // 5. ArrowLeft collapses parent "1" and moves focus back to "1"
      dispatchKey(floatingEl, "ArrowLeft");
      expect(collection.expandedValues.value.has("1")).toBe(false);
      expect(collection.activeValue.value).toBe("1");

      // 6. ArrowDown moves to next root item "2"
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("2");

      // 7. ArrowLeft on root "2" (no parent) does nothing
      dispatchKey(floatingEl, "ArrowLeft");
      expect(collection.activeValue.value).toBe("2");

      // 8. ArrowUp moves back to root "1" (which is now collapsed)
      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("1");

      // 9. ArrowRight expands again and moves to child "1-1"
      dispatchKey(floatingEl, "ArrowRight");
      expect(collection.expandedValues.value.has("1")).toBe(true);
      expect(collection.activeValue.value).toBe("1-1");

      // 10. Close trigger resets activeValue to null
      openRef.value = false;
      await nextTick();
      expect(collection.activeValue.value).toBeNull();
    });
  });
});
