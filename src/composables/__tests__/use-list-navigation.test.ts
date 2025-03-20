import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useListNavigation } from "../interactions/use-list-navigation";

describe("useListNavigation", () => {
  const mockContext = {
    open: ref(true),
    onOpenChange: vi.fn(),
    reference: document.createElement("div"),
    floating: document.createElement("div"),
  };

  const mockListRef = ref([]);
  const mockActiveIndex = ref(null);

  it("should handle keyboard navigation", () => {
    const listNav = useListNavigation(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onNavigate: vi.fn(),
    });

    const { getFloatingProps } = listNav;
    const floatingProps = getFloatingProps();

    // Simulate ArrowDown key press
    const downEvent = new KeyboardEvent("keydown", { key: "ArrowDown" });
    floatingProps.onKeydown?.(downEvent);

    expect(mockContext.onOpenChange).toHaveBeenCalled();
  });

  it("should handle mouse interactions", () => {
    const onNavigate = vi.fn();
    const listNav = useListNavigation(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onNavigate,
    });

    const { getItemProps } = listNav;
    const itemProps = getItemProps({ index: 0 });

    // Simulate mouse enter
    const mouseEvent = new MouseEvent("mouseenter");
    itemProps.onMouseEnter?.(mouseEvent);

    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it("should handle focus events", () => {
    const listNav = useListNavigation(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onNavigate: vi.fn(),
    });

    const { getFloatingProps } = listNav;
    const floatingProps = getFloatingProps();

    // Simulate focus
    const focusEvent = new FocusEvent("focus");
    floatingProps.onFocus?.(focusEvent);

    expect(mockContext.onOpenChange).toHaveBeenCalled();
  });

  it("should handle virtual list", () => {
    const listNav = useListNavigation(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onNavigate: vi.fn(),
      virtual: true,
    });

    const { getFloatingProps } = listNav;
    const floatingProps = getFloatingProps();

    expect(floatingProps.role).toBe("listbox");
  });
});
