import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTypeahead } from "./typeahead";

describe("typeahead", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const items = [
    { id: "1", label: "Apple" },
    { id: "2", label: "Banana" },
    { id: "3", label: "Blueberry" },
    { id: "4", label: "Cherry", disabled: true },
    { id: "5", label: "Cranberry" },
  ];

  const context = {
    items,
    activeIndex: 0,
    isItemDisabled: (item: (typeof items)[number]) => Boolean(item.disabled),
    getItemLabel: (item: (typeof items)[number]) => item.label,
  };

  const createEvent = (key: string, target?: Element, modifiers: Record<string, boolean> = {}) => {
    const e = new KeyboardEvent("keydown", { key, ...modifiers });
    if (target) {
      Object.defineProperty(e, "target", { value: target });
    }
    return e;
  };

  it("matches single characters", () => {
    const controller = createTypeahead();
    const match = controller.handleKey(createEvent("b"), context);
    expect(match).toBe(1); // Banana
  });

  it("cycles on repeated single characters", () => {
    const controller = createTypeahead();

    // First "b" -> Banana (index 1)
    const match1 = controller.handleKey(createEvent("b"), { ...context, activeIndex: 0 });
    expect(match1).toBe(1);

    // Second "b" -> Blueberry (index 2)
    const match2 = controller.handleKey(createEvent("b"), { ...context, activeIndex: 1 });
    expect(match2).toBe(2);

    // Third "b" -> wraps back to Banana (index 1)
    const match3 = controller.handleKey(createEvent("b"), { ...context, activeIndex: 2 });
    expect(match3).toBe(1);
  });

  it("matches multi-character sequences", () => {
    const controller = createTypeahead();

    // "b" -> Banana (index 1)
    controller.handleKey(createEvent("b"), { ...context, activeIndex: 0 });

    // "l" -> "bl" -> Blueberry (index 2)
    const match = controller.handleKey(createEvent("l"), { ...context, activeIndex: 1 });
    expect(match).toBe(2);
  });

  it("skips disabled items", () => {
    const controller = createTypeahead();

    // "c" -> Cherry is disabled (index 3), so matches Cranberry (index 4)
    const match = controller.handleKey(createEvent("c"), { ...context, activeIndex: 0 });
    expect(match).toBe(4);
  });

  it("resets buffer after debounce timeout", () => {
    const controller = createTypeahead({ timeout: 500 });

    controller.handleKey(createEvent("b"), { ...context, activeIndex: 0 });

    // Advance past timeout
    vi.advanceTimersByTime(600);

    // Typing "l" should not form "bl", but search for items starting with "l" (none -> null)
    const match = controller.handleKey(createEvent("l"), { ...context, activeIndex: 0 });
    expect(match).toBeNull();
  });

  it("ignores modifier keys", () => {
    const controller = createTypeahead();
    const match = controller.handleKey(createEvent("b", undefined, { ctrlKey: true }), context);
    expect(match).toBeNull();
  });

  it("ignores input in editable elements", () => {
    const inputEl = document.createElement("input");
    inputEl.type = "text";

    const controller = createTypeahead();
    const match = controller.handleKey(createEvent("b", inputEl), context);
    expect(match).toBeNull();
  });
});
