import { describe, expect, it } from "vite-plus/test";
import { useTree } from "@/composables/tree/use-tree";
import { nextTick, ref } from "vue";

//=======================================================================================
// Flat List (1D)
//=======================================================================================

describe("useTree (flat list)", () => {
  it("initializes with null activeValue", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2" }],
      getItemId: (item) => item.id,
    });
    expect(tree.activeValue.value).toBeNull();
  });

  it("advances to the next item via rootBranch", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2" }, { id: "3" }],
      getItemId: (item) => item.id,
    });

    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("1");

    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("2");

    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("3");
  });

  it("stops at the last item without wrapping", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2" }],
      getItemId: (item) => item.id,
    });

    tree.setActiveValue("2");
    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("2");
  });

  it("wraps to the start when loop is enabled", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2" }],
      getItemId: (item) => item.id,
    });

    tree.setActiveValue("2");
    tree.rootBranch.setNext({ loop: true });
    expect(tree.activeValue.value).toBe("1");
  });

  it("navigates backwards", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2" }],
      getItemId: (item) => item.id,
    });

    tree.setActiveValue("2");
    tree.rootBranch.setPrevious();
    expect(tree.activeValue.value).toBe("1");
  });

  it("wraps to the end when looping backwards", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2" }],
      getItemId: (item) => item.id,
    });

    tree.setActiveValue("1");
    tree.rootBranch.setPrevious({ loop: true });
    expect(tree.activeValue.value).toBe("2");
  });

  it("skips disabled items", () => {
    const tree = useTree({
      items: [{ id: "1" }, { id: "2", disabled: true }, { id: "3" }],
      getItemId: (item) => item.id,
      isItemDisabled: (item) => !!item.disabled,
    });

    tree.setActiveValue("1");
    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("3");
  });

  it("sets to first and last enabled items", () => {
    const tree = useTree({
      items: [{ id: "1", disabled: true }, { id: "2" }, { id: "3" }, { id: "4", disabled: true }],
      getItemId: (item) => item.id,
      isItemDisabled: (item) => !!item.disabled,
    });

    tree.rootBranch.setFirst();
    expect(tree.activeValue.value).toBe("2");

    tree.rootBranch.setLast();
    expect(tree.activeValue.value).toBe("3");
  });

  it("clears active value when the active item is removed", async () => {
    const items = ref([{ id: "1" }, { id: "2" }]);
    const tree = useTree({
      items,
      getItemId: (item) => item.id,
    });

    tree.setActiveValue("2");
    items.value = [{ id: "1" }];
    await nextTick();

    expect(tree.activeValue.value).toBeNull();
  });

  it("clears active value when the active item becomes disabled", async () => {
    const items = ref([{ id: "1", disabled: false }]);
    const tree = useTree({
      items,
      getItemId: (item) => item.id,
      isItemDisabled: (item) => item.disabled,
    });

    tree.setActiveValue("1");
    items.value = [{ id: "1", disabled: true }];
    await nextTick();

    expect(tree.activeValue.value).toBeNull();
  });

  it("does not allow a disabled item to become active", () => {
    const tree = useTree({
      items: [{ id: "1", disabled: true }],
      getItemId: (item) => item.id,
      isItemDisabled: (item) => item.disabled,
    });

    tree.setActiveValue("1");
    expect(tree.activeValue.value).toBeNull();
  });

  it("returns the correct item via getItem", () => {
    const items = [
      { id: "1", label: "Apple" },
      { id: "2", label: "Banana" },
    ];
    const tree = useTree({
      items,
      getItemId: (item) => item.id,
    });

    expect(tree.getItem("1")).toBe(items[0]);
    expect(tree.getItem("2")).toBe(items[1]);
    expect(tree.getItem("999")).toBeNull();
  });

  it("reports depth 0 for flat items and -1 for unknown", () => {
    const tree = useTree({
      items: [{ id: "1" }],
      getItemId: (item) => item.id,
    });

    expect(tree.getDepth("1")).toBe(0);
    expect(tree.getDepth("unknown")).toBe(-1);
  });
});

//=======================================================================================
// Hierarchical Tree (2D)
//=======================================================================================

describe("useTree (hierarchical)", () => {
  type TreeNode = { id: string; disabled?: boolean; children?: TreeNode[] };

  const createTestTree = () => {
    const items: TreeNode[] = [
      {
        id: "1",
        children: [{ id: "1-1" }, { id: "1-2", children: [{ id: "1-2-1" }] }],
      },
      { id: "2" },
      {
        id: "3",
        children: [{ id: "3-1", disabled: true }, { id: "3-2" }],
      },
    ];
    return useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
      isItemDisabled: (item) => !!item.disabled,
    });
  };

  it("builds tree index with correct parent relationships", () => {
    const tree = createTestTree();

    expect(tree.getParentValue("1")).toBeNull();
    expect(tree.getParentValue("2")).toBeNull();
    expect(tree.getParentValue("1-1")).toBe("1");
    expect(tree.getParentValue("1-2")).toBe("1");
    expect(tree.getParentValue("1-2-1")).toBe("1-2");
    expect(tree.getParentValue("3-1")).toBe("3");
  });

  it("reports correct depth for all nodes", () => {
    const tree = createTestTree();

    expect(tree.getDepth("1")).toBe(0);
    expect(tree.getDepth("2")).toBe(0);
    expect(tree.getDepth("1-1")).toBe(1);
    expect(tree.getDepth("1-2")).toBe(1);
    expect(tree.getDepth("1-2-1")).toBe(2);
  });

  it("identifies branch parents via hasChildren", () => {
    const tree = createTestTree();

    expect(tree.hasChildren("1")).toBe(true);
    expect(tree.hasChildren("1-2")).toBe(true);
    expect(tree.hasChildren("3")).toBe(true);
    expect(tree.hasChildren("2")).toBe(false);
    expect(tree.hasChildren("1-1")).toBe(false);
  });

  it("returns ancestor values from closest to farthest", () => {
    const tree = createTestTree();

    expect(tree.getAncestorValues("1-2-1")).toEqual(["1-2", "1"]);
    expect(tree.getAncestorValues("1-1")).toEqual(["1"]);
    expect(tree.getAncestorValues("1")).toEqual([]);
  });

  it("returns sibling values excluding the node itself", () => {
    const tree = createTestTree();

    expect(tree.getSiblingValues("1")).toEqual(["2", "3"]);
    expect(tree.getSiblingValues("1-1")).toEqual(["1-2"]);
    expect(tree.getSiblingValues("2")).toEqual(["1", "3"]);
  });
});

//=======================================================================================
// Expansion
//=======================================================================================

describe("useTree (expansion)", () => {
  type TreeNode = { id: string; children?: TreeNode[] };

  it("flattens items based on expanded branches", () => {
    const items: TreeNode[] = [{ id: "1", children: [{ id: "1-1" }, { id: "1-2" }] }, { id: "2" }];
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    expect(tree.flattenedItems.value.map((i) => i.id)).toEqual(["1", "2"]);

    tree.expandBranch("1");
    expect(tree.isExpanded("1")).toBe(true);
    expect(tree.flattenedItems.value.map((i) => i.id)).toEqual(["1", "1-1", "1-2", "2"]);

    tree.collapseBranch("1");
    expect(tree.isExpanded("1")).toBe(false);
    expect(tree.flattenedItems.value.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("collapseAll collapses everything", () => {
    const items: TreeNode[] = [
      { id: "1", children: [{ id: "1-1" }] },
      { id: "2", children: [{ id: "2-1" }] },
    ];
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    tree.expandBranch("1");
    tree.expandBranch("2");
    tree.collapseAll();
    expect(tree.expandedValues.value.size).toBe(0);
  });

  it("does not auto-clear active value when hidden by a collapsed branch (unopinionated)", () => {
    const items: TreeNode[] = [{ id: "1", children: [{ id: "1-1" }, { id: "1-2" }] }, { id: "2" }];
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    tree.expandBranch("1");
    tree.setActiveValue("1-1");
    tree.collapseBranch("1");

    // Unopinionated: active value persists even when the item is hidden
    expect(tree.activeValue.value).toBe("1-1");
  });

  it("ignores expandBranch on leaf nodes", () => {
    const items: TreeNode[] = [{ id: "1" }];
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    tree.expandBranch("1");
    expect(tree.expandedValues.value.size).toBe(0);
  });
});

//=======================================================================================
// Branch Navigation
//=======================================================================================

describe("useTree (branch navigation)", () => {
  type TreeNode = { id: string; disabled?: boolean; children?: TreeNode[] };

  it("rootBranch navigates only root-level items", () => {
    const tree = useTree<TreeNode>({
      items: [{ id: "1", children: [{ id: "1-1" }] }, { id: "2" }, { id: "3" }],
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("1");

    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("2");

    tree.rootBranch.setNext();
    expect(tree.activeValue.value).toBe("3");
  });

  it("child branch navigates only its own items", () => {
    const tree = useTree<TreeNode>({
      items: [
        {
          id: "parent",
          children: [{ id: "child-1" }, { id: "child-2" }, { id: "child-3" }],
        },
      ],
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    const branch = tree.getBranch("parent")!;
    expect(branch).not.toBeNull();

    branch.setNext();
    expect(tree.activeValue.value).toBe("child-1");

    branch.setNext();
    expect(tree.activeValue.value).toBe("child-2");

    branch.setNext();
    expect(tree.activeValue.value).toBe("child-3");
  });

  it("branch activeValue projects only when active value belongs to the branch", () => {
    const tree = useTree<TreeNode>({
      items: [
        {
          id: "parent",
          children: [{ id: "child-1" }, { id: "child-2" }],
        },
        { id: "sibling" },
      ],
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    const rootBranch = tree.rootBranch;
    const childBranch = tree.getBranch("parent")!;

    // Active value at root level
    tree.setActiveValue("sibling");
    expect(rootBranch.activeValue.value).toBe("sibling");
    expect(childBranch.activeValue.value).toBeNull();

    // Active value at child level
    tree.setActiveValue("child-1");
    expect(rootBranch.activeValue.value).toBeNull();
    expect(childBranch.activeValue.value).toBe("child-1");

    // No active value
    tree.setActiveValue(null);
    expect(rootBranch.activeValue.value).toBeNull();
    expect(childBranch.activeValue.value).toBeNull();
  });

  it("branch skips disabled items during navigation", () => {
    const tree = useTree<TreeNode>({
      items: [
        {
          id: "parent",
          children: [{ id: "child-1" }, { id: "child-2", disabled: true }, { id: "child-3" }],
        },
      ],
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
      isItemDisabled: (item) => !!item.disabled,
    });

    const branch = tree.getBranch("parent")!;
    branch.setFirst();
    expect(tree.activeValue.value).toBe("child-1");

    branch.setNext();
    expect(tree.activeValue.value).toBe("child-3");
  });

  it("getBranch returns null for leaf nodes", () => {
    const tree = useTree<TreeNode>({
      items: [{ id: "leaf" }],
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    expect(tree.getBranch("leaf")).toBeNull();
  });

  it("getBranch returns cached branch (same reference)", () => {
    const tree = useTree<TreeNode>({
      items: [{ id: "parent", children: [{ id: "child-1" }] }],
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    const branch1 = tree.getBranch("parent");
    const branch2 = tree.getBranch("parent");
    expect(branch1).toBe(branch2);
  });
});

//=======================================================================================
// Descendant Queries
//=======================================================================================

describe("useTree (descendant queries)", () => {
  type TreeNode = { id: string; disabled?: boolean; children?: TreeNode[] };

  it("finds the first enabled descendant value", () => {
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

    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      isItemDisabled: (item) => !!item.disabled,
      getItemChildren: (item) => item.children,
    });

    // First enabled descendant skips disabled ones
    expect(tree.getFirstEnabledDescendantValue("root-1")).toBe("child-1-3");

    // DFS into nested disabled parent to find enabled grandchild
    expect(tree.getFirstEnabledDescendantValue("root-2")).toBe("grandchild-2-1-1");

    // All descendants disabled
    expect(tree.getFirstEnabledDescendantValue("root-3")).toBeNull();

    // Non-existent item
    expect(tree.getFirstEnabledDescendantValue("non-existent")).toBeNull();

    // Leaf node (no children)
    expect(tree.getFirstEnabledDescendantValue("child-1-3")).toBeNull();
  });
});

describe("useTree (hardened features & lifecycle)", () => {
  type TreeNode = { id: string; children?: TreeNode[] };

  it("exposes readonly expandedValues ref which prevents direct mutations", () => {
    const tree = createTestTree();
    // TS check - expandedValues doesn't support add/delete/clear due to ReadonlySet type
    // @ts-expect-error - expandedValues.value is ReadonlySet
    tree.expandedValues.value.add?.("xyz");

    // The set must not be mutated
    expect(tree.expandedValues.value.size).toBe(0);
  });

  it("prunes stale expandedValues when tree model changes", async () => {
    const items = ref<TreeNode[]>([
      { id: "parent-1", children: [{ id: "child-1" }] },
      { id: "parent-2", children: [{ id: "child-2" }] },
    ]);
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    tree.expandBranch("parent-1");
    tree.expandBranch("parent-2");

    expect(tree.isExpanded("parent-1")).toBe(true);
    expect(tree.isExpanded("parent-2")).toBe(true);

    // parent-2 is removed completely, parent-1 children are removed (becomes leaf)
    items.value = [{ id: "parent-1" }];
    await nextTick();

    // parent-2 is no longer in the tree, parent-1 is now a leaf, so both are pruned
    expect(tree.isExpanded("parent-1")).toBe(false);
    expect(tree.isExpanded("parent-2")).toBe(false);
    expect(tree.expandedValues.value.size).toBe(0);
  });

  it("keeps TreeBranch references stable across model refreshes", async () => {
    const items = ref<TreeNode[]>([
      { id: "parent", children: [{ id: "child-1" }, { id: "child-2" }] },
    ]);
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    const rootBranchBefore = tree.rootBranch;
    const parentBranchBefore = tree.getBranch("parent");
    expect(parentBranchBefore).not.toBeNull();

    // Trigger data refresh/model change
    items.value = [
      { id: "parent", children: [{ id: "child-1" }, { id: "child-2" }, { id: "child-3" }] },
    ];
    await nextTick();

    const rootBranchAfter = tree.rootBranch;
    const parentBranchAfter = tree.getBranch("parent");

    // References MUST remain identical
    expect(rootBranchBefore).toBe(rootBranchAfter);
    expect(parentBranchBefore).toBe(parentBranchAfter);

    // But the branch fields should dynamically reflect the latest items
    expect(parentBranchAfter?.items.value.map((i) => i.id)).toEqual([
      "child-1",
      "child-2",
      "child-3",
    ]);
  });

  it("gracefully degrades when cached branch parent is removed", async () => {
    const items = ref<TreeNode[]>([{ id: "parent", children: [{ id: "child-1" }] }]);
    const tree = useTree<TreeNode>({
      items,
      getItemId: (item) => item.id,
      getItemChildren: (item) => item.children,
    });

    const branch = tree.getBranch("parent");
    expect(branch).not.toBeNull();
    expect(branch?.items.value.length).toBe(1);

    // Parent is removed
    items.value = [{ id: "other" }];
    await nextTick();

    // getBranch still returns the exact same cached branch object
    expect(tree.getBranch("parent")).toBe(branch);
    // But it has degraded gracefully to empty items
    expect(branch?.items.value).toEqual([]);
  });
});

// Helper for test tree creation
function createTestTree() {
  type TreeNode = { id: string; children?: TreeNode[] };
  const items: TreeNode[] = [{ id: "1", children: [{ id: "1-1" }] }];
  return useTree<TreeNode>({
    items,
    getItemId: (item) => item.id,
    getItemChildren: (item) => item.children,
  });
}
