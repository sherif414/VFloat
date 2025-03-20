import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useTransitionStatus, useTransitionStyles } from "../interactions/use-transition";

describe("useTransition", () => {
  const mockContext = {
    open: ref(false),
    onOpenChange: vi.fn(),
    reference: document.createElement("div"),
    floating: document.createElement("div"),
  };

  describe("useTransitionStatus", () => {
    it("should handle initial state", () => {
      const { isMounted, status } = useTransitionStatus(mockContext);

      expect(isMounted.value).toBe(false);
      expect(status.value).toBe("unmounted");
    });

    it("should update status on open change", async () => {
      mockContext.open.value = true;
      const { status } = useTransitionStatus(mockContext, {
        duration: 100,
      });

      expect(status.value).toBe("mounting");

      // Wait for transition
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(status.value).toBe("mounted");
    });

    it("should handle disabled state", () => {
      const { status } = useTransitionStatus(mockContext, {
        enabled: false,
      });

      expect(status.value).toBe("unmounted");
      mockContext.open.value = true;
      expect(status.value).toBe("unmounted");
    });
  });

  describe("useTransitionStyles", () => {
    it("should apply initial styles", () => {
      const { floatingStyles } = useTransitionStyles(mockContext, {
        initial: {
          opacity: 0,
          transform: "scale(0.9)",
        },
      });

      expect(floatingStyles.value).toEqual({
        opacity: 0,
        transform: "scale(0.9)",
      });
    });

    it("should apply final styles when mounted", async () => {
      mockContext.open.value = true;
      const { floatingStyles } = useTransitionStyles(mockContext, {
        initial: { opacity: 0 },
        final: { opacity: 1 },
        duration: 100,
      });

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(floatingStyles.value).toEqual({ opacity: 1 });
    });

    it("should handle custom transition timing", () => {
      const { floatingStyles } = useTransitionStyles(mockContext, {
        initial: { opacity: 0 },
        final: { opacity: 1 },
        duration: 300,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      });

      expect(floatingStyles.value.transition).toContain("300ms");
      expect(floatingStyles.value.transition).toContain("cubic-bezier(0.4, 0, 0.2, 1)");
    });
  });
});
