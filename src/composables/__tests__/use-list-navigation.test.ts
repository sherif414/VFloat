import { describe, expect, it, vi } from "vitest";
import { ref, computed } from "vue";
import { useListNavigation } from "../interactions/use-list-navigation";
import type { FloatingStyles } from "../use-floating";
import type { Strategy } from "@floating-ui/dom";

describe("useListNavigation", () => {
  const mockContext = {
    anchorEl: document.createElement("div"),
    floatingEl: document.createElement("div"),
    placement: ref("bottom" as const),
    strategy: ref("absolute" as Strategy),
    middlewareData: ref({}),
    x: ref(0),
    y: ref(0),
    isPositioned: ref(true),
    open: ref(true),
    onOpenChange: () => {},
    update: () => {},
    refs: {
      anchorEl: ref<HTMLElement | null>(null),
      floatingEl: ref<HTMLElement | null>(null),
    },
    floatingStyles: computed<FloatingStyles>(() => ({
      position: "absolute" as Strategy,
      top: "0px",
      left: "0px",
    })),
  };

  const mockListRef = ref<HTMLElement | null>(null);
  const mockActiveIndex = ref<number | null>(null);

  it("should handle keyboard navigation", () => {
    const { getFloatingProps } = useListNavigation(mockContext, {
      listRef: mockListRef,
      activeIndex: mockActiveIndex,
      onNavigate: () => {},
    });

    const floatingProps = getFloatingProps();
    expect(floatingProps.tabIndex).toBe(0);
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
