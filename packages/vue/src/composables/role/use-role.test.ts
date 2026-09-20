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

describe("useRole", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("syncs menu trigger, floating, and item roles", async () => {
    const { anchorEl, floatingEl, getItemEl, openRef } = await renderRole(
      {
        role: "menu",
        label: "Actions",
        disabledIndices: [1],
      },
      false,
    );

    expect(anchorEl.getAttribute("aria-haspopup")).toBe("menu");
    expect(anchorEl.getAttribute("aria-expanded")).toBe("false");
    expect(anchorEl.getAttribute("aria-controls")).toBe("floating");
    expect(floatingEl.getAttribute("role")).toBe("menu");
    expect(floatingEl.getAttribute("aria-label")).toBe("Actions");
    expect(getItemEl(0).getAttribute("role")).toBe("menuitem");
    expect(getItemEl(0).hasAttribute("tabindex")).toBe(false);
    expect(getItemEl(1).getAttribute("aria-disabled")).toBe("true");

    openRef.value = true;
    await nextTick();
    await nextTick();

    expect(anchorEl.getAttribute("aria-expanded")).toBe("true");
  });

  it("supports per-item checkbox roles and checked state", async () => {
    const { getItemEl } = await renderRole({
      role: "menu",
      itemRole: (index) => (index === 0 ? "menuitemcheckbox" : "menuitem"),
      checkedIndices: [0],
    });

    expect(getItemEl(0).getAttribute("role")).toBe("menuitemcheckbox");
    expect(getItemEl(0).getAttribute("aria-checked")).toBe("true");
    expect(getItemEl(1).hasAttribute("aria-checked")).toBe(false);
  });

  it("syncs listbox options and selected state", async () => {
    const { floatingEl, getItemEl } = await renderRole({
      role: "listbox",
      selectedIndices: (index) => index === 2,
    });

    expect(floatingEl.getAttribute("role")).toBe("listbox");
    expect(getItemEl(0).getAttribute("role")).toBe("option");
    expect(getItemEl(2).getAttribute("aria-selected")).toBe("true");
  });

  it("syncs tree and grid roles with items", async () => {
    const tree = await renderRole({
      role: "tree",
      selectedIndices: [1],
    });

    expect(tree.floatingEl.getAttribute("role")).toBe("tree");
    expect(tree.getItemEl(0).getAttribute("role")).toBe("treeitem");
    expect(tree.getItemEl(1).getAttribute("aria-selected")).toBe("true");

    const grid = await renderRole({
      role: "grid",
      selectedIndices: [0],
    });

    expect(grid.floatingEl.getAttribute("role")).toBe("grid");
    expect(grid.getItemEl(0).getAttribute("role")).toBe("gridcell");
    expect(grid.getItemEl(0).getAttribute("aria-selected")).toBe("true");
  });

  it("lets child menu nodes manage submenu trigger relationships", async () => {
    const { getItemEl, childOpenRef } = await renderRole({ role: "menu" }, true, {
      withChildMenu: true,
    });

    expect(getItemEl(1).getAttribute("role")).toBe("menuitem");
    expect(getItemEl(1).getAttribute("aria-haspopup")).toBe("menu");
    expect(getItemEl(1).getAttribute("aria-expanded")).toBe("false");
    expect(getItemEl(1).getAttribute("aria-controls")).toBe("child-menu");

    childOpenRef.value = true;
    await nextTick();
    await nextTick();

    expect(getItemEl(1).getAttribute("aria-expanded")).toBe("true");
  });

  it("links tooltips to the anchor only while open", async () => {
    const { anchorEl, floatingEl, openRef } = await renderRole({ role: "tooltip" }, false);

    expect(floatingEl.getAttribute("role")).toBe("tooltip");
    expect(anchorEl.hasAttribute("aria-describedby")).toBe(false);

    openRef.value = true;
    await nextTick();
    await nextTick();

    expect(anchorEl.getAttribute("aria-describedby")).toBe("floating");
  });

  it("restores attributes on cleanup", async () => {
    // The template value must exist before the first sync run so the
    // composable captures it as the restore value.
    const { anchorEl, floatingEl, result } = await renderRole(
      { role: "dialog", modal: true },
      true,
      { anchorAttrs: { "aria-expanded": "template-value" } },
    );

    expect(anchorEl.getAttribute("aria-expanded")).toBe("true");

    result.cleanup();

    expect(anchorEl.getAttribute("aria-expanded")).toBe("template-value");
    expect(floatingEl.hasAttribute("role")).toBe(false);
    expect(floatingEl.hasAttribute("aria-modal")).toBe(false);
  });
});
