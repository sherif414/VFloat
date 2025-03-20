import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useClientPoint } from "../interactions/use-client-point";

describe("useClientPoint", () => {
  const mockContext = {
    open: ref(false),
    onOpenChange: vi.fn(),
    reference: document.createElement("div"),
    floating: document.createElement("div"),
    middlewareData: ref({}),
  };

  it("should handle click events", () => {
    const clientPoint = useClientPoint(mockContext, {
      enabled: true,
    });

    const { getReferenceProps } = clientPoint;
    const referenceProps = getReferenceProps();

    // Simulate click with coordinates
    const event = new MouseEvent("click", {
      clientX: 100,
      clientY: 200,
    });
    referenceProps.onClick?.(event);

    expect(mockContext.middlewareData.value.arrow).toBeDefined();
  });

  it("should not update position when disabled", () => {
    const clientPoint = useClientPoint(mockContext, {
      enabled: false,
    });

    const { getReferenceProps } = clientPoint;
    const referenceProps = getReferenceProps();

    const event = new MouseEvent("click", {
      clientX: 100,
      clientY: 200,
    });
    referenceProps.onClick?.(event);

    expect(mockContext.middlewareData.value.arrow).toBeUndefined();
  });

  it("should handle custom event handler", () => {
    const customHandler = vi.fn();
    const clientPoint = useClientPoint(mockContext, {
      enabled: true,
    });

    const { getReferenceProps } = clientPoint;
    const referenceProps = getReferenceProps({
      onClick: customHandler,
    });

    const event = new MouseEvent("click");
    referenceProps.onClick?.(event);

    expect(customHandler).toHaveBeenCalled();
  });
});
