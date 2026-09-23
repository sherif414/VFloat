import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick } from "vue";
import { getTestEl } from "@/test-utils";
import { isolateOutsideElements } from "./inert-stack";

function createInertFixture() {
  const Component = defineComponent(() => {
    return () =>
      h("div", { class: "test-wrapper" }, [
        h("div", { "data-testid": "container" }, "Container"),
        h("div", { "data-testid": "outside" }, "Outside"),
        h("div", { "data-testid": "modal" }, "Modal"),
      ]);
  });

  return render(Component);
}

function createNestedTreeFixture() {
  const Component = defineComponent(() => {
    return () =>
      h("div", { class: "test-wrapper" }, [
        h("div", { "data-testid": "outside" }, "Outside"),
        h("div", { "data-testid": "nested-parent" }, [
          h("div", { "data-testid": "nested-modal" }, "Nested Modal"),
          h("div", { "data-testid": "nested-sibling" }, "Nested Sibling"),
        ]),
      ]);
  });

  return render(Component);
}

describe("Feature: Inert Stack Management", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Isolating outside sibling elements from modal roots", () => {
    it("Given rendered modal and outside elements, When isolateOutsideElements is called, Then marks outside elements as inert and restores them on cleanup", async () => {
      // Given
      await createInertFixture();
      await nextTick();

      const modalEl = getTestEl("modal");
      const outsideEl = getTestEl("outside");
      const containerEl = getTestEl("container");

      // When: Isolate outside elements
      const handle = isolateOutsideElements([modalEl]);

      // Then
      expect(outsideEl.hasAttribute("inert")).toBe(true);
      expect(containerEl.hasAttribute("inert")).toBe(true);
      expect(modalEl.hasAttribute("inert")).toBe(false);

      // When: Restore
      handle.restore();

      // Then
      expect(outsideEl.hasAttribute("inert")).toBe(false);
      expect(containerEl.hasAttribute("inert")).toBe(false);
      expect(modalEl.hasAttribute("inert")).toBe(false);
    });

    it("Given nested ancestor trees, When isolating a nested modal, Then preserves ancestors while isolating outside sibling branches", async () => {
      // Given
      await createNestedTreeFixture();
      await nextTick();

      const nestedModalEl = getTestEl("nested-modal");
      const nestedParentEl = getTestEl("nested-parent");
      const nestedSiblingEl = getTestEl("nested-sibling");
      const outsideEl = getTestEl("outside");

      // When: Isolate nested modal
      const handle = isolateOutsideElements([nestedModalEl]);

      // Then
      expect(nestedParentEl.hasAttribute("inert")).toBe(false);
      expect(nestedModalEl.hasAttribute("inert")).toBe(false);
      expect(nestedSiblingEl.hasAttribute("inert")).toBe(true);
      expect(outsideEl.hasAttribute("inert")).toBe(true);

      // When: Restore
      handle.restore();

      // Then
      expect(nestedSiblingEl.hasAttribute("inert")).toBe(false);
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });

    it("Given preferInert is false, When isolating outside elements, Then falls back to aria-hidden attributes", async () => {
      // Given
      await createInertFixture();
      await nextTick();

      const modalEl = getTestEl("modal");
      const outsideEl = getTestEl("outside");

      // When: Isolate with preferInert false
      const handle = isolateOutsideElements([modalEl], false);

      // Then
      expect(outsideEl.getAttribute("aria-hidden")).toBe("true");
      expect(modalEl.hasAttribute("aria-hidden")).toBe(false);

      // When: Restore
      handle.restore();

      // Then
      expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
    });

    it("Given empty allowed elements list, When isolating, Then safely no-ops without applying inert", async () => {
      // Given
      await createInertFixture();
      await nextTick();

      const outsideEl = getTestEl("outside");

      // When
      const handle = isolateOutsideElements([]);
      expect(outsideEl.hasAttribute("inert")).toBe(false);

      // When: Restore
      handle.restore();
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });
  });

  describe("Scenario: Overlapping isolations and reference counting", () => {
    it("Given multiple overlapping isolations, When an early isolation is restored, Then keeps background inert until all isolations finish", async () => {
      // Given
      await createInertFixture();
      await nextTick();

      const modalEl = getTestEl("modal");
      const outsideEl = getTestEl("outside");

      // When: First isolation
      const firstHandle = isolateOutsideElements([modalEl]);
      // When: Second isolation
      const secondHandle = isolateOutsideElements([modalEl]);

      expect(outsideEl.hasAttribute("inert")).toBe(true);

      // When: First handle restored
      firstHandle.restore();

      // Then: Still inert due to second handle
      expect(outsideEl.hasAttribute("inert")).toBe(true);

      // When: Second handle restored
      secondHandle.restore();

      // Then: Fully restored
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });

    it("Given pre-existing inert attribute on an element, When restored, Then preserves the original inert state", async () => {
      // Given
      await createInertFixture();
      await nextTick();

      const modalEl = getTestEl("modal");
      const outsideEl = getTestEl("outside");

      outsideEl.setAttribute("inert", "");
      (outsideEl as HTMLElement & { inert: boolean }).inert = true;

      // When
      const handle = isolateOutsideElements([modalEl]);
      handle.restore();

      // Then: Pre-existing inert preserved
      expect(outsideEl.hasAttribute("inert")).toBe(true);
      expect((outsideEl as HTMLElement & { inert: boolean }).inert).toBe(true);
    });
  });
});
