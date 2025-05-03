import { describe, expect, it, vi } from "vitest";
import { ref, computed } from "vue";
import { useTransitionStatus, useTransitionStyles } from "../interactions/use-transition";
import type { FloatingStyles } from "../use-floating";
import type { Strategy } from "@floating-ui/dom";

describe("useTransition", () => {
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

  describe("useTransitionStatus", () => {
    it("should return initial status when open is false", () => {
      const { status } = useTransitionStatus(mockContext);
      expect(status.value).toBe("unmounted");
    });

    it("should return open status when open is true", () => {
      mockContext.open.value = true;
      const { status } = useTransitionStatus(mockContext);
      expect(status.value).toBe("open");
    });

    it("should handle transition states correctly", async () => {
      const { status } = useTransitionStatus(mockContext, {
        duration: 100,
      });

      mockContext.open.value = true;
      expect(status.value).toBe("initial");

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(status.value).toBe("open");

      mockContext.open.value = false;
      expect(status.value).toBe("close");

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(status.value).toBe("unmounted");
    });
  });

  describe("useTransitionStyles", () => {
    it("should return empty styles when unmounted", () => {
      const { styles } = useTransitionStyles(mockContext);
      expect(styles.value).toEqual({});
    });

    it("should return initial styles when status is initial", () => {
      mockContext.open.value = true;
      const { styles } = useTransitionStyles(mockContext);
      expect(styles.value).toEqual({
        opacity: "0",
        transform: "translateY(2px) scale(0.99)",
      });
    });

    it("should return open styles when status is open", async () => {
      mockContext.open.value = true;
      const { styles } = useTransitionStyles(mockContext);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(styles.value).toEqual({
        opacity: "1",
        transform: "translateY(0) scale(1)",
        transition: expect.stringContaining("300ms"),
      });
    });

    it("should return close styles when status is close", () => {
      mockContext.open.value = false;
      const { styles } = useTransitionStyles(mockContext);
      expect(styles.value).toEqual({
        opacity: "0",
        transform: "translateY(2px) scale(0.99)",
        transition: expect.stringContaining("300ms"),
      });
    });
  });
});
