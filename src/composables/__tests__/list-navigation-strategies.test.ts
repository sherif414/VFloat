import { describe, expect, it } from "vite-plus/test"
import {
  GridNavigationStrategy,
  HorizontalNavigationStrategy,
  VerticalNavigationStrategy,
} from "@/composables/interactions/list-navigation/strategies"

const createItems = (count: number) => Array.from({ length: count }, () => document.createElement("div"))

function createContext(overrides: Partial<Parameters<VerticalNavigationStrategy["handleKey"]>[1]> = {}) {
  return {
    current: 0,
    items: createItems(6),
    isRtl: false,
    loop: true,
    allowEscape: false,
    isVirtual: false,
    cols: 3,
    nested: false,
    isDisabled: () => false,
    findNextEnabled: (start: number, dir: 1 | -1, wrap: boolean) => {
      const items = createItems(6)
      let index = start

      for (let step = 0; step < items.length; step++) {
        if (index < 0 || index >= items.length) {
          if (!wrap) {
            return null
          }

          index = (index + items.length) % items.length
        }

        return index
      }

      return null
    },
    getFirstEnabledIndex: () => 0,
    getLastEnabledIndex: () => 5,
    ...overrides,
  }
}

describe("list navigation strategies", () => {
  it("moves vertically with the vertical strategy", () => {
    const strategy = new VerticalNavigationStrategy()
    const result = strategy.handleKey("ArrowDown", createContext({ current: 1 }))

    expect(result).toEqual({ type: "navigate", index: 2 })
  })

  it("moves horizontally with RTL awareness", () => {
    const strategy = new HorizontalNavigationStrategy()
    const result = strategy.handleKey("ArrowRight", createContext({ current: 2, isRtl: true }))

    expect(result).toEqual({ type: "navigate", index: 1 })
  })

  it("wraps inside a grid when configured for row loops", () => {
    const strategy = new GridNavigationStrategy(false, "row")
    const result = strategy.handleKey("ArrowRight", createContext({ current: 2 }))

    expect(result).toEqual({ type: "navigate", index: 0 })
  })
})
