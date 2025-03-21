import { describe, expect, it, vi, beforeEach } from "vitest";
import { useInteractions } from "../interactions/use-interactions";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

describe("useInteractions Unit Tests", () => {
  const createMockInteraction = () => ({
    getReferenceProps: (props = {}) => ({
      ...props,
      onClick: () => {},
      onFocus: () => {},
    }),
    getFloatingProps: (props = {}) => ({
      ...props,
      onBlur: () => {},
    }),
  });

  it("should combine multiple interaction handlers", () => {
    // Arrange
    const mockInteraction1 = createMockInteraction();
    const mockInteraction2 = createMockInteraction();

    // Act
    const { getReferenceProps, getFloatingProps } = useInteractions([
      mockInteraction1,
      mockInteraction2,
    ]);
    const referenceProps = getReferenceProps();
    const floatingProps = getFloatingProps();

    // Assert
    expect(referenceProps.onClick).toBeDefined();
    expect(referenceProps.onFocus).toBeDefined();
    expect(floatingProps.onBlur).toBeDefined();
  });

  it("should merge props from multiple interactions", () => {
    // Arrange
    const mockInteraction1 = createMockInteraction();
    const mockInteraction2 = createMockInteraction();

    // Act
    const { getReferenceProps } = useInteractions([mockInteraction1, mockInteraction2]);
    const props = getReferenceProps({ customProp: "test" });

    // Assert
    expect(props.customProp).toBe("test");
    expect(props.onClick).toBeDefined();
    expect(props.onFocus).toBeDefined();
  });

  it("should handle empty interactions array", () => {
    // Act
    const { getReferenceProps, getFloatingProps } = useInteractions([]);
    const props = getReferenceProps({ customProp: "test" });

    // Assert
    expect(getReferenceProps).toBeDefined();
    expect(getFloatingProps).toBeDefined();
    expect(props.customProp).toBe("test");
  });
});

describe("useInteractions Component Integration", () => {
  // Mock event handlers
  const mockClickFn1 = vi.fn();
  const mockClickFn2 = vi.fn();
  const mockFocusFn1 = vi.fn();
  const mockFocusFn2 = vi.fn();
  const mockBlurFn1 = vi.fn();
  const mockBlurFn2 = vi.fn();

  // Create test component with mocked handlers and proper ref handling
  const TestComponent = defineComponent({
    setup() {
      const mockInteraction1 = {
        getReferenceProps: (props = {}) => ({
          ...props,
          onClick: mockClickFn1,
          onFocus: mockFocusFn1,
        }),
        getFloatingProps: (props = {}) => ({
          ...props,
          onBlur: mockBlurFn1,
        }),
      };

      const mockInteraction2 = {
        getReferenceProps: (props = {}) => ({
          ...props,
          onClick: mockClickFn2,
          onFocus: mockFocusFn2,
        }),
        getFloatingProps: (props = {}) => ({
          ...props,
          onBlur: mockBlurFn2,
        }),
      };

      const interactions = useInteractions([mockInteraction1, mockInteraction2]);

      return {
        interactions,
      };
    },
    render() {
      return h("div", { class: "container" }, [
        h("button", this.interactions.getReferenceProps(), "Reference"),
        h("div", this.interactions.getFloatingProps(), "Floating"),
      ]);
    },
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockClickFn1.mockReset();
    mockClickFn2.mockReset();
    mockFocusFn1.mockReset();
    mockFocusFn2.mockReset();
    mockBlurFn1.mockReset();
    mockBlurFn2.mockReset();
  });

  it("should assign events correctly", async () => {
    // Arrange
    const wrapper = mount(TestComponent);
    const reference = wrapper.find("button");
    const floating = wrapper.find(".container > div");

    // Act
    await reference.trigger("click");

    // Assert
    expect(mockClickFn1).toHaveBeenCalledTimes(1);
    expect(mockClickFn2).toHaveBeenCalledTimes(1);

    // Act
    await reference.trigger("focus");

    // Assert
    expect(mockFocusFn1).toHaveBeenCalledTimes(1);
    expect(mockFocusFn2).toHaveBeenCalledTimes(1);

    // Act
    await floating.trigger("blur");

    // Assert
    expect(mockBlurFn1).toHaveBeenCalledTimes(1);
    expect(mockBlurFn2).toHaveBeenCalledTimes(1);
  });
});
