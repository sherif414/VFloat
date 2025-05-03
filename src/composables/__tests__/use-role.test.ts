import { describe, expect, it, vi } from "vitest";
import { ref, computed } from "vue";
import { useRole } from "../interactions/use-role";
import type { FloatingStyles } from "../use-floating";
import type { Strategy } from "@floating-ui/dom";

describe("useRole", () => {
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

  it("should add role and aria attributes", () => {
    const { getReferenceProps, getFloatingProps } = useRole(mockContext);
    const referenceProps = getReferenceProps();
    const floatingProps = getFloatingProps();

    expect(referenceProps["aria-haspopup"]).toBe("dialog");
    expect(referenceProps["aria-expanded"]).toBe("true");
    expect(referenceProps["aria-controls"]).toBeDefined();
    expect(floatingProps.role).toBe("dialog");
    expect(floatingProps.id).toBeDefined();
  });

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
