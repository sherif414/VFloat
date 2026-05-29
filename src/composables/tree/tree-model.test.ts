import { describe, expect, it, vi } from "vite-plus/test";
import { TreeModel } from "./tree-model";

interface TestNode {
  id: string;
  disabled?: boolean;
  children?: TestNode[];
}

describe("TreeModel", () => {
  const getItemId = (item: TestNode) => item.id;
  const isItemDisabled = (item: TestNode) => !!item.disabled;
  const getItemChildren = (item: TestNode) => item.children;

  describe("Flat List (1D)", () => {
    const items: TestNode[] = [{ id: "1" }, { id: "2", disabled: true }, { id: "3" }];

    it("indexes items correctly", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled });

      expect(model.getItem("1")).toEqual({ id: "1" });
      expect(model.getItem("2")).toEqual({ id: "2", disabled: true });
      expect(model.getItem("unknown")).toBeNull();

      expect(model.isItemDisabled("1")).toBe(false);
      expect(model.isItemDisabled("2")).toBe(true);
    });

    it("assigns depth 0 to all root items", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled });
      expect(model.getDepth("1")).toBe(0);
      expect(model.getDepth("2")).toBe(0);
      expect(model.getDepth("unknown")).toBe(-1);
    });

    it("reports correct siblings and ancestors for flat items", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled });
      expect(model.getSiblingValues("1")).toEqual(["2", "3"]);
      expect(model.getAncestorValues("1")).toEqual([]);
    });
  });

  describe("Hierarchical Tree (2D)", () => {
    const items: TestNode[] = [
      {
        id: "1",
        children: [
          { id: "1-1" },
          {
            id: "1-2",
            children: [{ id: "1-2-1" }],
          },
        ],
      },
      { id: "2" },
      {
        id: "3",
        children: [{ id: "3-1", disabled: true }, { id: "3-2" }],
      },
    ];

    it("correctly identifies parent relationships", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled, getItemChildren });

      expect(model.getParentValue("1")).toBeNull();
      expect(model.getParentValue("1-1")).toBe("1");
      expect(model.getParentValue("1-2-1")).toBe("1-2");
    });

    it("calculates depth correctly at all levels", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled, getItemChildren });

      expect(model.getDepth("1")).toBe(0);
      expect(model.getDepth("1-2")).toBe(1);
      expect(model.getDepth("1-2-1")).toBe(2);
    });

    it("reports hasChildren accurately", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled, getItemChildren });

      expect(model.hasChildren("1")).toBe(true);
      expect(model.hasChildren("1-1")).toBe(false);
      expect(model.hasChildren("2")).toBe(false);
      expect(model.hasChildren("3")).toBe(true);
    });

    it("retrieves ancestors from closest to farthest", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled, getItemChildren });

      expect(model.getAncestorValues("1-2-1")).toEqual(["1-2", "1"]);
      expect(model.getAncestorValues("1")).toEqual([]);
    });

    it("retrieves sibling values correctly", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled, getItemChildren });

      expect(model.getSiblingValues("1")).toEqual(["2", "3"]);
      expect(model.getSiblingValues("1-1")).toEqual(["1-2"]);
    });

    it("flattens items based on expansion state", () => {
      const model = new TreeModel(items, { getItemId, isItemDisabled, getItemChildren });

      // No expanded branches
      expect(model.getFlattenedItems(new Set()).map(getItemId)).toEqual(["1", "2", "3"]);

      // Expand "1"
      expect(model.getFlattenedItems(new Set(["1"])).map(getItemId)).toEqual([
        "1",
        "1-1",
        "1-2",
        "2",
        "3",
      ]);

      // Expand "1" and "1-2"
      expect(model.getFlattenedItems(new Set(["1", "1-2"])).map(getItemId)).toEqual([
        "1",
        "1-1",
        "1-2",
        "1-2-1",
        "2",
        "3",
      ]);
    });

    it("finds the first enabled descendant recursively", () => {
      const nestedItems: TestNode[] = [
        {
          id: "root-1",
          children: [
            { id: "child-1-1", disabled: true },
            {
              id: "child-1-2",
              disabled: true,
              children: [{ id: "grandchild-1-2-1", disabled: true }],
            },
            { id: "child-1-3" },
          ],
        },
        {
          id: "root-2",
          children: [
            {
              id: "child-2-1",
              disabled: true,
              children: [{ id: "grandchild-2-1-1" }],
            },
          ],
        },
      ];

      const model = new TreeModel(nestedItems, { getItemId, isItemDisabled, getItemChildren });

      // Skips disabled direct children
      expect(model.getFirstEnabledDescendantValue("root-1")).toBe("child-1-3");

      // Traverses nested disabled parent to find enabled grandchild
      expect(model.getFirstEnabledDescendantValue("root-2")).toBe("grandchild-2-1-1");

      // Non-existent or leaf
      expect(model.getFirstEnabledDescendantValue("non-existent")).toBeNull();
      expect(model.getFirstEnabledDescendantValue("child-1-3")).toBeNull();
    });
  });

  describe("Hardened Integrity and Performance Optimization", () => {
    it("detects and throws on duplicate IDs", () => {
      const items: TestNode[] = [
        { id: "1" },
        { id: "2" },
        { id: "1" }, // Duplicate root ID
      ];

      expect(() => new TreeModel(items, { getItemId })).toThrow(
        '[VFloat] Duplicate item ID detected: "1"',
      );

      const itemsNested: TestNode[] = [
        {
          id: "1",
          children: [{ id: "duplicate-id" }],
        },
        {
          id: "2",
          children: [{ id: "duplicate-id" }], // Sibling branch duplicate ID
        },
      ];

      expect(() => new TreeModel(itemsNested, { getItemId, getItemChildren })).toThrow(
        '[VFloat] Duplicate item ID detected: "duplicate-id"',
      );
    });

    it("detects and throws on cyclic parent/child structures", () => {
      const nodeA: TestNode = { id: "A", children: [] };
      const nodeB: TestNode = { id: "B", children: [nodeA] };
      nodeA.children = [nodeB]; // A -> B -> A cycle

      expect(() => new TreeModel([nodeA], { getItemId, getItemChildren })).toThrow(
        '[VFloat] Cyclic tree dependency detected at item: "A"',
      );
    });

    it("does not call getItemChildren a second time during flattening", () => {
      const items: TestNode[] = [
        {
          id: "1",
          children: [{ id: "1-1" }],
        },
      ];

      const childrenSpy = vi.fn((item: TestNode) => item.children);

      const model = new TreeModel(items, {
        getItemId,
        getItemChildren: childrenSpy,
      });

      // Clear spy call counts from constructor traversal pass
      childrenSpy.mockClear();

      // Flatting
      const flattened = model.getFlattenedItems(new Set(["1"]));
      expect(flattened.map((i) => i.id)).toEqual(["1", "1-1"]);

      // getItemChildren should NOT be called at all during getFlattenedItems
      expect(childrenSpy).not.toHaveBeenCalled();
    });
  });
});
