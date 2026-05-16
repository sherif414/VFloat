import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, ref, nextTick } from "vue";
import { useListNavigation } from "@/composables/list-navigation/use-list-navigation";
import { useCollection } from "@/composables/collection/use-collection";
import { useFloating } from "@/composables";

function dispatchKey(target: EventTarget, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useListNavigation", () => {
  let scope: ReturnType<typeof effectScope>;

  afterEach(() => {
    if (scope) {
      scope.stop();
    }
  });

  function setup() {
    scope = effectScope();

    const anchorEl = document.createElement("button");
    const floatingEl = document.createElement("div");

    document.body.appendChild(anchorEl);
    document.body.appendChild(floatingEl);

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
        orientation: "vertical",
        loop: true,
      });

      resultContext = { context, navigation, collection, anchorEl, floatingEl, openRef };
    });

    return resultContext as {
      context: ReturnType<typeof useFloating>;
      navigation: ReturnType<typeof useListNavigation>;
      collection: ReturnType<typeof useCollection>;
      anchorEl: HTMLButtonElement;
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
});
