import { describe, expect, it } from "vite-plus/test";
import {
  GridNavigationStrategy,
  HorizontalNavigationStrategy,
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
  });
});
