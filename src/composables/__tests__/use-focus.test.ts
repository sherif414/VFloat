import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import { type UseFocusOptions, type UseFocusContext, useFocus } from "@/composables/interactions";
import type { AnchorElement, FloatingElement } from "@/composables/positioning";

// Mock the shared platform module to allow spying on matchesFocusVisible
vi.mock("@/shared/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/platform")>();
  return {
    ...actual,
    matchesFocusVisible: vi.fn(actual.matchesFocusVisible),
  };
});

import { matchesFocusVisible } from "@/shared/platform";

describe("useFocus", () => {
  let context: UseFocusContext;
  let referenceEl: HTMLElement;
  let floatingEl: HTMLElement;
  let scope: ReturnType<typeof effectScope>;

  const initFocus = (options?: UseFocusOptions) => {
    scope = effectScope();
    scope.run(() => {
      // biome-ignore lint/suspicious/noExplicitAny: testing setup
      useFocus(context as any, options);
    });
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    referenceEl = document.createElement("button");
    referenceEl.id = "reference";
    referenceEl.textContent = "Trigger";
    document.body.appendChild(referenceEl);

    floatingEl = document.createElement("div");
    floatingEl.id = "floating";
    floatingEl.tabIndex = -1; // make focusable
    floatingEl.textContent = "Content";
    document.body.appendChild(floatingEl);

    const openRef = ref(false);
    const setOpenMock = vi.fn((v: boolean) => {
      openRef.value = v;
    });
    const anchorRef = ref<AnchorElement>(referenceEl);
    const floatingRef = ref<FloatingElement>(floatingEl);
    const arrowRef = ref<HTMLElement | null>(null);

    context = {
      refs: {
        anchorEl: anchorRef,
        floatingEl: floatingRef,
        arrowEl: arrowRef,
        setAnchor: (value) => {
          anchorRef.value = value;
        },
        setFloating: (value) => {
          floatingRef.value = value;
        },
        setArrow: (value) => {
          arrowRef.value = value;
        },
      },
      state: {
        open: openRef,
        setOpen: setOpenMock,
      },
    };

    await nextTick();
  });

  afterEach(() => {
    if (scope) scope.stop();

    if (referenceEl.isConnected) document.body.removeChild(referenceEl);
    if (floatingEl.isConnected) document.body.removeChild(floatingEl);

    vi.clearAllMocks();
    vi.mocked(matchesFocusVisible).mockRestore();
    vi.useRealTimers();
  });

  // --- Basic Functionality ---
  describe("basic functionality", () => {
    it("opens on focus (requireFocusVisible = false)", async () => {
      initFocus({ requireFocusVisible: false });
      await nextTick(); // Wait for watchPostEffect to attach listeners

      expect(context.state.open.value).toBe(false);

      referenceEl.focus();
      await nextTick();
      expect(context.state.open.value).toBe(true);
    });

    it("closes on blur (requireFocusVisible = false)", async () => {
      initFocus({ requireFocusVisible: false });
      await nextTick();

      // Open first
      referenceEl.focus();
      await nextTick();
      expect(context.state.open.value).toBe(true);
      // no-op: we no longer track calls; we assert on state only

      // Blur should schedule a close on next tick (timeout 0)
      referenceEl.blur();
      vi.runAllTimers();
      await nextTick();

      expect(context.state.open.value).toBe(false);
    });
  });

  // --- requireFocusVisible option ---
  describe("requireFocusVisible option", () => {
    it("only opens when element matches :focus-visible", async () => {
      // Control the utility used by the composable to detect focus-visible
      vi.mocked(matchesFocusVisible).mockReturnValue(false);

      initFocus({ requireFocusVisible: true });
      await nextTick();

      // Focus not considered focus-visible -> should not open
      referenceEl.focus();
      await nextTick();
      expect(context.state.open.value).toBe(false);

      // Now simulate focus-visible
      vi.mocked(matchesFocusVisible).mockReturnValue(true);

      // Re-focus to trigger the handler again
      referenceEl.blur();
      vi.runAllTimers();
      await nextTick();

      referenceEl.focus();
      await nextTick();

      expect(context.state.open.value).toBe(true);
    });
  });

  // --- Disabled State ---
  describe("disabled state", () => {
    it("does not respond to focus when disabled", async () => {
      const enabled = ref(false);
      initFocus({ enabled, requireFocusVisible: false });
      await nextTick();

      referenceEl.focus();
      await nextTick();

      expect(context.state.open.value).toBe(false);
    });
  });

  // --- Focus strategy behavior ---
  describe("focus strategy", () => {
    it("remains open when focus moves into the floating element", async () => {
      initFocus({ requireFocusVisible: false });
      await nextTick();

      // Open via focus on reference
      referenceEl.focus();
      await nextTick();
      expect(context.state.open.value).toBe(true);

      // Move focus to floating (should remain open according to strategy)
      floatingEl.focus();
      // The blur handler uses a timeout, flush it
      vi.runAllTimers();
      await nextTick();

      expect(context.state.open.value).toBe(true);
    });
  });

  // --- Window blur/focus blocking behavior ---
  describe("window focus/blur blocking", () => {
    it("prevents auto-open when window was blurred while anchor remained focused and closed", async () => {
      initFocus({ requireFocusVisible: false });
      await nextTick();

      // Open first
      referenceEl.focus();
      await nextTick();
      expect(context.state.open.value).toBe(true);

      // Programmatically close while the anchor stays focused
      context.state.setOpen(false);
      await nextTick();
      expect(context.state.open.value).toBe(false);

      // Window loses focus while the anchor is focused and popover is closed
      window.dispatchEvent(new Event("blur"));

      // Refocus sequence should be blocked once due to isFocusBlocked flag
      referenceEl.blur();
      referenceEl.focus();
      vi.runAllTimers();
      await nextTick();

      expect(context.state.open.value).toBe(false);

      // Regaining window focus resets the block; focusing again should open
      window.dispatchEvent(new Event("focus"));
      referenceEl.blur();
      referenceEl.focus();
      vi.runAllTimers();
      await nextTick();

      expect(context.state.open.value).toBe(true);
    });
  });

  // --- Cleanup handling ---
  describe("cleanup return", () => {
    it("removes listeners so further focus/blur do not change state", async () => {
      // Initialize and capture cleanup explicitly
      let cleanup: (() => void) | undefined;
      scope = effectScope();
      scope.run(() => {
        const ret = useFocus(context as any, { requireFocusVisible: false });
        cleanup = ret.cleanup;
      });
      await nextTick();

      // Sanity: focusing opens
      referenceEl.focus();
      await nextTick();
      expect(context.state.open.value).toBe(true);

      // Call cleanup and verify no further reactions
      cleanup?.();

      referenceEl.blur();
      vi.runAllTimers();
      await nextTick();
      referenceEl.focus();
      vi.runAllTimers();
      await nextTick();

      expect(context.state.open.value).toBe(true); // unchanged since last open
    });
  });
});
