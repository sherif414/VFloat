import { describe, expect, it } from "vite-plus/test";
import {
  createNavigationStrategy,
  GridNavigationStrategy,
  HorizontalNavigationStrategy,
  isMainOrientationKey,
  isMainOrientationToEndKey,
  isTreeChildOpenKey,
  type StrategyContext,
  VerticalNavigationStrategy,
} from "@/composables/interactions/list-navigation/strategies";

function createItems(count: number) {
  return Array.from({ length: count }, () => document.createElement("div"));
}

function createContext(
  overrides: Partial<StrategyContext> = {},
  disabledIndices: number[] = [],
): StrategyContext {
  const items = overrides.items ?? createItems(6);
  const isDisabled = overrides.isDisabled ?? ((index: number) => disabledIndices.includes(index));
  const getFirstEnabledIndex =
    overrides.getFirstEnabledIndex ??
    (() => {
      for (let i = 0; i < items.length; i++) {
        if (!isDisabled(i)) {
          return i;
        }
      }

      return null;
    });
  const getLastEnabledIndex =
    overrides.getLastEnabledIndex ??
    (() => {
      for (let i = items.length - 1; i >= 0; i--) {
        if (!isDisabled(i)) {
          return i;
        }
      }

      return null;
    });
  const findNextEnabled =
    overrides.findNextEnabled ??
    ((start: number, dir: 1 | -1, wrap: boolean) => {
      let index = start;

      for (let step = 0; step < items.length; step++) {
        if (index < 0 || index >= items.length) {
          if (!wrap) {
            return null;
          }

          index = (index + items.length) % items.length;
        }

        if (!isDisabled(index)) {
          return index;
        }

        index += dir;
      }

      return null;
    });

  return {
    allowEscape: false,
    cols: 3,
    current: 0,
    findNextEnabled,
    getFirstEnabledIndex,
    getLastEnabledIndex,
    isDisabled,
    isRtl: false,
    isVirtual: false,
    items,
    loop: true,
    nested: false,
    ...overrides,
  };
}

describe("list navigation strategies", () => {
  describe("linear strategies", () => {
    it("moves vertically with the vertical strategy", () => {
      const strategy = new VerticalNavigationStrategy();
      const result = strategy.handleKey("ArrowDown", createContext({ current: 1 }));

      expect(result).toEqual({ type: "navigate", index: 2 });
    });

    it("moves horizontally with RTL awareness", () => {
      const strategy = new HorizontalNavigationStrategy();
      const result = strategy.handleKey("ArrowRight", createContext({ current: 2, isRtl: true }));

      expect(result).toEqual({ type: "navigate", index: 1 });
    });

    it("closes nested vertical lists with the RTL backward key", () => {
      const strategy = new VerticalNavigationStrategy();
      const result = strategy.handleKey("ArrowRight", createContext({ isRtl: true, nested: true }));

      expect(result).toEqual({ type: "close" });
    });

    it("closes nested horizontal lists with ArrowUp", () => {
      const strategy = new HorizontalNavigationStrategy();
      const result = strategy.handleKey("ArrowUp", createContext({ nested: true }));

      expect(result).toEqual({ type: "close" });
    });

    it("can escape to a null active index in virtual looping lists", () => {
      const strategy = new VerticalNavigationStrategy();
      const result = strategy.handleKey(
        "ArrowDown",
        createContext(
          {
            allowEscape: true,
            current: 5,
            isVirtual: true,
            loop: true,
          },
          [0, 1, 2, 3, 4, 5],
        ),
      );

      expect(result).toEqual({ type: "navigate", index: null });
    });
  });

  describe("grid RTL behavior", () => {
    it("wraps within the same row in RTL mode", () => {
      const strategy = new GridNavigationStrategy(false, "row");

      const wrapToRowEnd = strategy.handleKey(
        "ArrowRight",
        createContext({ cols: 3, current: 0, isRtl: true }),
      );
      const wrapToRowStart = strategy.handleKey(
        "ArrowLeft",
        createContext({ cols: 3, current: 2, isRtl: true }),
      );

      expect(wrapToRowEnd).toEqual({ type: "navigate", index: 2 });
      expect(wrapToRowStart).toEqual({ type: "navigate", index: 0 });
    });

    it("wraps into the adjacent row in RTL next-loop mode", () => {
      const strategy = new GridNavigationStrategy(false, "next");

      const moveIntoNextRow = strategy.handleKey(
        "ArrowLeft",
        createContext({ cols: 3, current: 2, isRtl: true }),
      );
      const moveIntoPreviousRow = strategy.handleKey(
        "ArrowRight",
        createContext({ cols: 3, current: 3, isRtl: true }),
      );

      expect(moveIntoNextRow).toEqual({ type: "navigate", index: 3 });
      expect(moveIntoPreviousRow).toEqual({ type: "navigate", index: 2 });
    });

    it("can escape horizontally from the grid boundary in virtual mode", () => {
      const strategy = new GridNavigationStrategy(false, "row");
      const result = strategy.handleKey(
        "ArrowRight",
        createContext({
          allowEscape: true,
          cols: 3,
          current: 5,
          isVirtual: true,
          loop: true,
        }),
      );

      expect(result).toEqual({ type: "navigate", index: null });
    });
  });

  describe("grid disabled-cell wrapping", () => {
    it("skips disabled cells while row-wrapping", () => {
      const strategy = new GridNavigationStrategy(false, "row");
      const result = strategy.handleKey(
        "ArrowRight",
        createContext({ cols: 3, current: 0, isRtl: true }, [2]),
      );

      expect(result).toEqual({ type: "navigate", index: 1 });
    });

    it("skips disabled cells while next-row wrapping", () => {
      const strategy = new GridNavigationStrategy(false, "next");
      const result = strategy.handleKey("ArrowRight", createContext({ cols: 3, current: 2 }, [3]));

      expect(result).toEqual({ type: "navigate", index: 4 });
    });

    it("falls back to linear movement when vertical grid movement is blocked", () => {
      const strategy = new GridNavigationStrategy(true, "row");
      const result = strategy.handleKey(
        "ArrowDown",
        createContext(
          {
            cols: 3,
            current: 1,
            items: createItems(5),
            loop: false,
          },
          [4],
        ),
      );

      expect(result).toEqual({ type: "navigate", index: 2 });
    });

    it("returns null for vertical grid movement when there is only one column", () => {
      const strategy = new GridNavigationStrategy(false, "row");
      const result = strategy.handleKey("ArrowDown", createContext({ cols: 1, current: 0 }));

      expect(result).toBeNull();
    });

    it("starts grid movement from the first enabled item when there is no current index", () => {
      const strategy = new GridNavigationStrategy(false, "row");
      const result = strategy.handleKey("ArrowRight", createContext({ cols: 3, current: null }));

      expect(result).toEqual({ type: "navigate", index: 0 });
    });

    it("can escape vertically from the grid boundary in virtual mode", () => {
      const strategy = new GridNavigationStrategy(false, "row");
      const result = strategy.handleKey(
        "ArrowDown",
        createContext({
          allowEscape: true,
          cols: 2,
          current: 4,
          isVirtual: true,
          items: createItems(5),
          loop: true,
        }),
      );

      expect(result).toEqual({ type: "navigate", index: null });
    });
  });

  describe("orientation helpers", () => {
    it("classifies keys for the main orientation", () => {
      expect(isMainOrientationKey("ArrowDown", "vertical")).toBe(true);
      expect(isMainOrientationKey("ArrowRight", "vertical")).toBe(false);
      expect(isMainOrientationKey("ArrowLeft", "horizontal")).toBe(true);
      expect(isMainOrientationKey("ArrowUp", "horizontal")).toBe(false);
      expect(isMainOrientationKey("ArrowLeft", "both")).toBe(true);
    });

    it("classifies end-direction keys including activation keys", () => {
      expect(isMainOrientationToEndKey("ArrowDown", "vertical", false)).toBe(true);
      expect(isMainOrientationToEndKey("ArrowLeft", "horizontal", true)).toBe(true);
      expect(isMainOrientationToEndKey("Enter", "vertical", false)).toBe(true);
      expect(isMainOrientationToEndKey("ArrowUp", "vertical", false)).toBe(false);
    });

    it("detects tree-child open keys for vertical and horizontal lists", () => {
      expect(isTreeChildOpenKey("ArrowRight", "vertical", false)).toBe(true);
      expect(isTreeChildOpenKey("ArrowLeft", "vertical", true)).toBe(true);
      expect(isTreeChildOpenKey("ArrowDown", "horizontal", false)).toBe(true);
      expect(isTreeChildOpenKey("ArrowRight", "both", false)).toBe(false);
    });
  });

  describe("strategy selection", () => {
    it("creates the expected strategy for each orientation and grid shape", () => {
      expect(createNavigationStrategy("vertical", 1, "row")).toBeInstanceOf(
        VerticalNavigationStrategy,
      );
      expect(createNavigationStrategy("horizontal", 1, "row")).toBeInstanceOf(
        HorizontalNavigationStrategy,
      );
      expect(createNavigationStrategy("horizontal", 2, "row")).toBeInstanceOf(
        GridNavigationStrategy,
      );
      expect(createNavigationStrategy("both", 3, "next")).toBeInstanceOf(GridNavigationStrategy);
    });
  });
});
