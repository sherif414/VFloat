import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useRole } from "../interactions/use-role";

describe("useRole", () => {
  const mockContext = {
    open: ref(false),
    onOpenChange: vi.fn(),
    reference: document.createElement("div"),
    floating: document.createElement("div"),
  };

  it("should set correct ARIA attributes for dialog role", () => {
    const role = useRole(mockContext, {
      role: "dialog",
    });

    const { getReferenceProps, getFloatingProps } = role;
    const referenceProps = getReferenceProps();
    const floatingProps = getFloatingProps();

    expect(referenceProps["aria-haspopup"]).toBe("dialog");
    expect(referenceProps["aria-expanded"]).toBe(false);
    expect(floatingProps.role).toBe("dialog");
  });

  it("should set correct ARIA attributes for listbox role", () => {
    const role = useRole(mockContext, {
      role: "listbox",
    });

    const { getReferenceProps, getFloatingProps } = role;
    const referenceProps = getReferenceProps();
    const floatingProps = getFloatingProps();

    expect(referenceProps["aria-haspopup"]).toBe("listbox");
    expect(referenceProps["aria-expanded"]).toBe(false);
    expect(floatingProps.role).toBe("listbox");
  });

  it("should update aria-expanded when open state changes", () => {
    mockContext.open.value = true;
    const role = useRole(mockContext, {
      role: "menu",
    });

    const { getReferenceProps } = role;
    const referenceProps = getReferenceProps();

    expect(referenceProps["aria-expanded"]).toBe(true);
  });

  it("should not set ARIA attributes when disabled", () => {
    const role = useRole(mockContext, {
      role: "dialog",
      enabled: false,
    });

    const { getReferenceProps, getFloatingProps } = role;
    const referenceProps = getReferenceProps();
    const floatingProps = getFloatingProps();

    expect(referenceProps["aria-haspopup"]).toBeUndefined();
    expect(referenceProps["aria-expanded"]).toBeUndefined();
    expect(floatingProps.role).toBeUndefined();
  });
});
