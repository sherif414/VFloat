import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page } from "vitest/browser";
import { defineComponent, h, nextTick } from "vue";
import { getTestEl } from "@/test-utils";
import { isolateOutsideElements } from "./inert-stack";

async function renderInertFixture() {
  const Component = defineComponent(() => {
    return () =>
      h("div", { class: "test-wrapper" }, [
        h("div", { "data-testid": "container" }, "Container"),
        h("div", { "data-testid": "outside" }, "Outside"),
        h("div", { "data-testid": "modal" }, "Modal"),
      ]);
  });

  await render(Component);
  await nextTick();
  return {
    containerEl: page.getByTestId("container"),
    outsideEl: page.getByTestId("outside"),
    modalEl: page.getByTestId("modal"),
    rawContainerEl: getTestEl("container"),
    rawOutsideEl: getTestEl("outside"),
    rawModalEl: getTestEl("modal"),
  };
}

async function renderNestedTreeFixture() {
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

  await render(Component);
  await nextTick();
  return {
    outsideEl: page.getByTestId("outside"),
    nestedParentEl: page.getByTestId("nested-parent"),
    nestedModalEl: page.getByTestId("nested-modal"),
    nestedSiblingEl: page.getByTestId("nested-sibling"),
    rawOutsideEl: getTestEl("outside"),
    rawNestedParentEl: getTestEl("nested-parent"),
    rawNestedModalEl: getTestEl("nested-modal"),
    rawNestedSiblingEl: getTestEl("nested-sibling"),
  };
}

describe("Feature: Inert Stack Management", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Isolating outside sibling elements from modal roots", () => {
    it("Given rendered modal and outside elements, When isolateOutsideElements is called, Then marks outside elements as inert and restores them on cleanup", async () => {
      // Given
      const { containerEl, outsideEl, modalEl, rawModalEl } = await renderInertFixture();

      // When: Isolate outside elements
      const handle = isolateOutsideElements([rawModalEl]);

      // Then
      await expect.element(outsideEl).toHaveAttribute("inert");
      await expect.element(containerEl).toHaveAttribute("inert");
      await expect.element(modalEl).not.toHaveAttribute("inert");

      // When: Restore
      handle.restore();

      // Then
      await expect.element(outsideEl).not.toHaveAttribute("inert");
      await expect.element(containerEl).not.toHaveAttribute("inert");
      await expect.element(modalEl).not.toHaveAttribute("inert");
    });

    it("Given nested ancestor trees, When isolating a nested modal, Then preserves ancestors while isolating outside sibling branches", async () => {
      // Given
      const { nestedParentEl, nestedModalEl, nestedSiblingEl, outsideEl, rawNestedModalEl } =
        await renderNestedTreeFixture();

      // When: Isolate nested modal
      const handle = isolateOutsideElements([rawNestedModalEl]);

      // Then
      await expect.element(nestedParentEl).not.toHaveAttribute("inert");
      await expect.element(nestedModalEl).not.toHaveAttribute("inert");
      await expect.element(nestedSiblingEl).toHaveAttribute("inert");
      await expect.element(outsideEl).toHaveAttribute("inert");

      // When: Restore
      handle.restore();

      // Then
      await expect.element(nestedSiblingEl).not.toHaveAttribute("inert");
      await expect.element(outsideEl).not.toHaveAttribute("inert");
    });

    it("Given preferInert is false, When isolating outside elements, Then falls back to aria-hidden attributes", async () => {
      // Given
      const { outsideEl, modalEl, rawModalEl } = await renderInertFixture();

      // When: Isolate with preferInert false
      const handle = isolateOutsideElements([rawModalEl], false);

      // Then
      await expect.element(outsideEl).toHaveAttribute("aria-hidden", "true");
      await expect.element(modalEl).not.toHaveAttribute("aria-hidden");

      // When: Restore
      handle.restore();

      // Then
      await expect.element(outsideEl).not.toHaveAttribute("aria-hidden");
    });

    it("Given empty allowed elements list, When isolating, Then safely no-ops without applying inert", async () => {
      // Given
      const { outsideEl } = await renderInertFixture();

      // When
      const handle = isolateOutsideElements([]);
      await expect.element(outsideEl).not.toHaveAttribute("inert");

      // When: Restore
      handle.restore();
      await expect.element(outsideEl).not.toHaveAttribute("inert");
    });
  });

  describe("Scenario: Overlapping isolations and reference counting", () => {
    it("Given multiple overlapping isolations, When an early isolation is restored, Then keeps background inert until all isolations finish", async () => {
      // Given
      const { outsideEl, rawModalEl } = await renderInertFixture();

      // When: First isolation
      const firstHandle = isolateOutsideElements([rawModalEl]);
      // When: Second isolation
      const secondHandle = isolateOutsideElements([rawModalEl]);

      await expect.element(outsideEl).toHaveAttribute("inert");

      // When: First handle restored
      firstHandle.restore();

      // Then: Still inert due to second handle
      await expect.element(outsideEl).toHaveAttribute("inert");

      // When: Second handle restored
      secondHandle.restore();

      // Then: Fully restored
      await expect.element(outsideEl).not.toHaveAttribute("inert");
    });

    it("Given pre-existing inert attribute on an element, When restored, Then preserves the original inert state", async () => {
      // Given
      const { outsideEl, rawOutsideEl, rawModalEl } = await renderInertFixture();

      rawOutsideEl.setAttribute("inert", "");
      (rawOutsideEl as HTMLElement & { inert: boolean }).inert = true;

      // When
      const handle = isolateOutsideElements([rawModalEl]);
      handle.restore();

      // Then: Pre-existing inert preserved
      await expect.element(outsideEl).toHaveAttribute("inert");
      expect((rawOutsideEl as HTMLElement & { inert: boolean }).inert).toBe(true);
    });
  });
});
