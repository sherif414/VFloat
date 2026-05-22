import { describe, expect, it } from "vite-plus/test";
import { useCollection } from "@/composables/collection/use-collection";
import { nextTick, ref } from "vue";

describe("useCollection", () => {
  it("initializes with null activeValue", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2" }],
      itemValue: (item) => item.id,
    });
    expect(collection.activeValue.value).toBeNull();
  });

  it("advances to the next item", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2" }, { id: "3" }],
      itemValue: (item) => item.id,
    });

    collection.setNext();
    expect(collection.activeValue.value).toBe("1");

    collection.setNext();
    expect(collection.activeValue.value).toBe("2");

    collection.setNext();
    expect(collection.activeValue.value).toBe("3");
  });

  it("stops at the last item without wrapping", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2" }],
      itemValue: (item) => item.id,
    });

    collection.setActiveValue("2");
    collection.setNext();
    expect(collection.activeValue.value).toBe("2");
  });

  it("wraps to the start when loop is enabled", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2" }],
      itemValue: (item) => item.id,
    });

    collection.setActiveValue("2");
    collection.setNext({ loop: true });
    expect(collection.activeValue.value).toBe("1");
  });

  it("navigates backwards", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2" }],
      itemValue: (item) => item.id,
    });

    collection.setActiveValue("2");
    collection.setPrevious();
    expect(collection.activeValue.value).toBe("1");
  });

  it("wraps to the end when looping backwards", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2" }],
      itemValue: (item) => item.id,
    });

    collection.setActiveValue("1");
    collection.setPrevious({ loop: true });
    expect(collection.activeValue.value).toBe("2");
  });

  it("skips disabled items", () => {
    const collection = useCollection({
      items: [{ id: "1" }, { id: "2", disabled: true }, { id: "3" }],
      itemValue: (item) => item.id,
      itemDisabled: (item) => !!item.disabled,
    });

    collection.setActiveValue("1");
    collection.setNext();
    expect(collection.activeValue.value).toBe("3");
  });

  it("sets to first and last enabled items", () => {
    const collection = useCollection({
      items: [{ id: "1", disabled: true }, { id: "2" }, { id: "3" }, { id: "4", disabled: true }],
      itemValue: (item) => item.id,
      itemDisabled: (item) => !!item.disabled,
    });

    collection.setFirst();
    expect(collection.activeValue.value).toBe("2");

    collection.setLast();
    expect(collection.activeValue.value).toBe("3");
  });

  it("clears active value when the active item is removed", async () => {
    const items = ref([{ id: "1" }, { id: "2" }]);
    const collection = useCollection({
      items,
      itemValue: (item) => item.id,
    });

    collection.setActiveValue("2");
    items.value = [{ id: "1" }];
    await nextTick();

    expect(collection.activeValue.value).toBeNull();
  });

  it("clears active value when the active item becomes disabled", async () => {
    const items = ref([{ id: "1", disabled: false }]);
    const collection = useCollection({
      items,
      itemValue: (item) => item.id,
      itemDisabled: (item) => item.disabled,
    });

    collection.setActiveValue("1");
    items.value = [{ id: "1", disabled: true }];
    await nextTick();

    expect(collection.activeValue.value).toBeNull();
  });

  it("does not allow a disabled item to become active", () => {
    const collection = useCollection({
      items: [{ id: "1", disabled: true }],
      itemValue: (item) => item.id,
      itemDisabled: (item) => item.disabled,
    });

    collection.setActiveValue("1");

    expect(collection.activeValue.value).toBeNull();
  });
});

describe("useCollection (2D Tree)", () => {
  it("flattens items based on expanded branches", () => {
    type TreeNode = { id: string; children?: TreeNode[] };
    const items: TreeNode[] = [
      {
        id: "1",
        children: [{ id: "1-1" }, { id: "1-2" }],
      },
      { id: "2" },
    ];

    const collection = useCollection<TreeNode>({
      items,
      itemValue: (item) => item.id,
      itemChildren: (item) => item.children,
    });

    // Initially, only root items should be in flattenedItems
    expect(collection.flattenedItems.value.map((i) => i.id)).toEqual(["1", "2"]);

    // Expand branch 1
    collection.expandBranch("1");
    expect(collection.expandedValues.value.has("1")).toBe(true);
    expect(collection.flattenedItems.value.map((i) => i.id)).toEqual(["1", "1-1", "1-2", "2"]);

    // Collapse branch 1
    collection.collapseBranch("1");
    expect(collection.expandedValues.value.has("1")).toBe(false);
    expect(collection.flattenedItems.value.map((i) => i.id)).toEqual(["1", "2"]);

    // Expand again, then collapse all
    collection.expandBranch("1");
    collection.collapseAll();
    expect(collection.expandedValues.value.size).toBe(0);
    expect(collection.flattenedItems.value.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("clears active value when the active item is hidden by a collapsed branch", () => {
    type TreeNode = { id: string; children?: TreeNode[] };
    const items: TreeNode[] = [
      {
        id: "1",
        children: [{ id: "1-1" }, { id: "1-2" }],
      },
      { id: "2" },
    ];

    const collection = useCollection<TreeNode>({
      items,
      itemValue: (item) => item.id,
      itemChildren: (item) => item.children,
    });

    collection.expandBranch("1");
    collection.setActiveValue("1-1");
    collection.collapseBranch("1");

    expect(collection.activeValue.value).toBeNull();
  });

  it("finds the first enabled descendant value", () => {
    type TreeNode = { id: string; disabled?: boolean; children?: TreeNode[] };
    const items: TreeNode[] = [
      {
        id: "root-1",
        children: [
          { id: "child-1-1", disabled: true },
          {
            id: "child-1-2",
            disabled: true,
            children: [{ id: "grandchild-1-2-1", disabled: true }],
          },
          { id: "child-1-3", disabled: false },
          { id: "child-1-4", disabled: false },
        ],
      },
      {
        id: "root-2",
        children: [
          {
            id: "child-2-1",
            disabled: true,
            children: [{ id: "grandchild-2-1-1", disabled: false }],
          },
        ],
      },
      {
        id: "root-3",
        children: [{ id: "child-3-1", disabled: true }],
      },
    ];

    const collection = useCollection<TreeNode>({
      items,
      itemValue: (item) => item.id,
      itemDisabled: (item) => !!item.disabled,
      itemChildren: (item) => item.children,
    });

    // Case 1: First enabled descendant is immediate but skipped disabled ones
    expect(collection.getFirstEnabledDescendantValue("root-1")).toBe("child-1-3");

    // Case 2: Immediate child is disabled, but its child is enabled (nested DFS check)
    expect(collection.getFirstEnabledDescendantValue("root-2")).toBe("grandchild-2-1-1");

    // Case 3: All descendants are disabled
    expect(collection.getFirstEnabledDescendantValue("root-3")).toBeNull();

    // Case 4: Non-existent item
    expect(collection.getFirstEnabledDescendantValue("non-existent")).toBeNull();

    // Case 5: Item has no children/descendants
    expect(collection.getFirstEnabledDescendantValue("child-1-3")).toBeNull();
  });
});
