import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useFloatingNode } from "@/composables";
import { type UseRoleOptions, type UseRoleReturn, useRole } from "@/composables/role/use-role";
import { getTestEl } from "@/test-utils";

interface FixtureConfig {
  itemCount?: number;
  withChildMenu?: boolean;
  anchorAttrs?: Record<string, string>;
}

function createTestComponent(
  options: UseRoleOptions,
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const openRef = ref(initialOpen);
  const elementsList = ref<Array<HTMLElement | null>>([]);
  let node!: ReturnType<typeof useFloatingNode>;
  let result!: UseRoleReturn;

  const childOpenRef = ref(false);
  let childNode!: ReturnType<typeof useFloatingNode>;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");
    const childFloatingEl = useTemplateRef<HTMLElement>("child-floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });

    const register = (el: Element | null, idx: number) => {
      elementsList.value[idx] = el as HTMLElement | null;
    };

    result = useRole(node, {
      listRef: elementsList,
      ...options,
    });

    if (config.withChildMenu) {
      onMounted(() => {
        childNode = useFloatingNode({
          anchorEl: ref(elementsList.value[1] ?? null),
          floatingEl: childFloatingEl,
          open: childOpenRef,
        });
        useRole(childNode, { role: "menu", label: "Child menu" });
      });
    }

    const count = config.itemCount ?? 3;

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor", ...config.anchorAttrs }, "Trigger"),
        h(
          "div",
          { id: "floating", ref: "floating", "data-testid": "floating" },
          Array.from({ length: count }).map((_, idx) =>
            h(
              "button",
              {
                "data-testid": `item-${idx}`,
                ref: (el) => register(el as Element | null, idx),
              },
              `item-${idx}`,
            ),
          ),
        ),
        ...(config.withChildMenu
          ? [
              h(
                "div",
                {
                  id: "child-menu",
                  ref: "child-floating",
                  "data-testid": "child-floating",
                },
                "Child menu",
              ),
            ]
          : []),
      ]);
  });

  return {
    Component,
    getNode: () => node,
    getResult: () => result,
    getChildNode: () => childNode,
    openRef,
    childOpenRef,
  };
}

async function renderRole(
  options: UseRoleOptions,
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const fixture = createTestComponent(options, initialOpen, config);
  const view = await render(fixture.Component);
  await nextTick();
  await nextTick();
  return {
    anchorEl: getTestEl("anchor", view.container),
    floatingEl: getTestEl("floating", view.container),
    getItemEl: (idx: number) => getTestEl(`item-${idx}`, view.container),
    openRef: fixture.openRef,
    childOpenRef: fixture.childOpenRef,
    result: fixture.getResult(),
    node: fixture.getNode(),
  };
}

describe("Feature: useRole ARIA semantics synchronization", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Menu hierarchy semantics and item states", () => {
    it("Given a menu configuration with disabled items, When rendered and toggled open, Then trigger, floating, and item ARIA attributes synchronize accurately", async () => {
      const { anchorEl, floatingEl, getItemEl, openRef } = await renderRole(
        {
          role: "menu",
          label: "Actions",
          disabledIndices: [1],
        },
        false,
      );

      await expect.element(anchorEl).toHaveAttribute("aria-haspopup", "menu");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(anchorEl).toHaveAttribute("aria-controls", "floating");
      await expect.element(floatingEl).toHaveAttribute("role", "menu");
      await expect.element(floatingEl).toHaveAttribute("aria-label", "Actions");
      await expect.element(getItemEl(0)).toHaveAttribute("role", "menuitem");
      expect(getItemEl(0).hasAttribute("tabindex")).toBe(false);
      await expect.element(getItemEl(1)).toHaveAttribute("aria-disabled", "true");

      openRef.value = true;
      await nextTick();
      await nextTick();

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given a menu with dynamic item roles and checked indices, When rendered, Then it applies menuitemcheckbox and aria-checked states", async () => {
      const { getItemEl } = await renderRole({
        role: "menu",
        itemRole: (index) => (index === 0 ? "menuitemcheckbox" : "menuitem"),
        checkedIndices: [0],
      });

      await expect.element(getItemEl(0)).toHaveAttribute("role", "menuitemcheckbox");
      await expect.element(getItemEl(0)).toHaveAttribute("aria-checked", "true");
      expect(getItemEl(1).hasAttribute("aria-checked")).toBe(false);
    });

    it("Given a parent menu with a child menu node, When rendered and child menu opens, Then the submenu item reflects aria-haspopup and aria-expanded", async () => {
      const { getItemEl, childOpenRef } = await renderRole({ role: "menu" }, true, {
        withChildMenu: true,
      });

      await expect.element(getItemEl(1)).toHaveAttribute("role", "menuitem");
      await expect.element(getItemEl(1)).toHaveAttribute("aria-haspopup", "menu");
      await expect.element(getItemEl(1)).toHaveAttribute("aria-expanded", "false");
      await expect.element(getItemEl(1)).toHaveAttribute("aria-controls", "child-menu");

      childOpenRef.value = true;
      await nextTick();
      await nextTick();

      await expect.element(getItemEl(1)).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Scenario: Composite widget roles (listbox, tree, and grid)", () => {
    it("Given a listbox role with selected indices, When rendered, Then floating element and options reflect listbox and aria-selected states", async () => {
      const { floatingEl, getItemEl } = await renderRole({
        role: "listbox",
        selectedIndices: (index) => index === 2,
      });

      await expect.element(floatingEl).toHaveAttribute("role", "listbox");
      await expect.element(getItemEl(0)).toHaveAttribute("role", "option");
      await expect.element(getItemEl(2)).toHaveAttribute("aria-selected", "true");
    });

    it("Given tree and grid roles with selected items, When rendered, Then elements reflect treeitem, gridcell, and aria-selected attributes", async () => {
      const tree = await renderRole({
        role: "tree",
        selectedIndices: [1],
      });

      await expect.element(tree.floatingEl).toHaveAttribute("role", "tree");
      await expect.element(tree.getItemEl(0)).toHaveAttribute("role", "treeitem");
      await expect.element(tree.getItemEl(1)).toHaveAttribute("aria-selected", "true");

      const grid = await renderRole({
        role: "grid",
        selectedIndices: [0],
      });

      await expect.element(grid.floatingEl).toHaveAttribute("role", "grid");
      await expect.element(grid.getItemEl(0)).toHaveAttribute("role", "gridcell");
      await expect.element(grid.getItemEl(0)).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Scenario: Tooltip descriptive relationship", () => {
    it("Given a tooltip role, When open state transitions, Then aria-describedby is linked to the anchor only while open", async () => {
      const { anchorEl, floatingEl, openRef } = await renderRole({ role: "tooltip" }, false);

      await expect.element(floatingEl).toHaveAttribute("role", "tooltip");
      expect(anchorEl.hasAttribute("aria-describedby")).toBe(false);

      openRef.value = true;
      await nextTick();
      await nextTick();

      await expect.element(anchorEl).toHaveAttribute("aria-describedby", "floating");
    });
  });

  describe("Scenario: Teardown and attribute restoration", () => {
    it("Given pre-existing element attributes, When cleanup is invoked, Then modified ARIA attributes are restored to original template values", async () => {
      // The template value must exist before the first sync run so the
      // composable captures it as the restore value.
      const { anchorEl, floatingEl, result } = await renderRole(
        { role: "dialog", modal: true },
        true,
        { anchorAttrs: { "aria-expanded": "template-value" } },
      );

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");

      result.cleanup();

      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "template-value");
      expect(floatingEl.hasAttribute("role")).toBe(false);
      expect(floatingEl.hasAttribute("aria-modal")).toBe(false);
    });
  });
});
