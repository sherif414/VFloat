import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useTypeahead } from "../interactions/use-typeahead";

describe("useTypeahead", () => {
  const mockContext = {
    open: ref(true),
    onOpenChange: vi.fn(),
    reference: document.createElement("div"),
    floating: document.createElement("div"),
  };

  const mockListRef = ref([]);
  const mockActiveIndex = ref(null);

  it("should handle character input", () => {
    const onMatch = vi.fn();
    const typeahead = useTypeahead(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onMatch,
      findMatch: () => 0,
    });

    const { getFloatingProps } = typeahead;
    const floatingProps = getFloatingProps();

    // Simulate typing 'a'
    const keyEvent = new KeyboardEvent("keydown", {
      key: "a",
      code: "KeyA",
    });
    floatingProps.onKeyDown?.(keyEvent);

    expect(onMatch).toHaveBeenCalled();
  });

  it("should reset search string after delay", async () => {
    vi.useFakeTimers();
    const typeahead = useTypeahead(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      resetMs: 1000,
    });

    const { getFloatingProps } = typeahead;
    const floatingProps = getFloatingProps();

    // Simulate typing 'test'
    ['t', 'e', 's', 't'].forEach(key => {
      const keyEvent = new KeyboardEvent("keydown", { key });
      floatingProps.onKeyDown?.(keyEvent);
    });

    vi.advanceTimersByTime(1000);
    vi.useRealTimers();

    // Add assertion here if there's a way to check the internal search string
  });

  it("should not process modifier keys", () => {
    const onMatch = vi.fn();
    const typeahead = useTypeahead(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onMatch,
    });

    const { getFloatingProps } = typeahead;
    const floatingProps = getFloatingProps();

    // Simulate pressing Shift
    const keyEvent = new KeyboardEvent("keydown", {
      key: "Shift",
      code: "ShiftLeft",
    });
    floatingProps.onKeyDown?.(keyEvent);

    expect(onMatch).not.toHaveBeenCalled();
  });

  it("should be disabled when enabled is false", () => {
    const onMatch = vi.fn();
    const typeahead = useTypeahead(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onMatch,
      enabled: false,
    });

    const { getFloatingProps } = typeahead;
    const floatingProps = getFloatingProps();

    // Simulate typing 'a'
    const keyEvent = new KeyboardEvent("keydown", {
      key: "a",
      code: "KeyA",
    });
    floatingProps.onKeyDown?.(keyEvent);

    expect(onMatch).not.toHaveBeenCalled();
  });
}));