import { afterEach, describe, expect, it } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import { type UseRoleOptions, type UseRoleReturn, useRole } from "@/composables/role/use-role";
import type { AnchorElement, FloatingElement } from "@/composables";
import { useFloating } from "@/composables";

type RoleTestContext = {
  anchorEl: HTMLButtonElement;
  context: ReturnType<typeof useFloating>;
  floatingEl: HTMLDivElement;
  items: HTMLButtonElement[];
  listRef: ReturnType<typeof ref<Array<HTMLElement | null>>>;
  openRef: ReturnType<typeof ref<boolean>>;
  result: UseRoleReturn;
  scope: ReturnType<typeof effectScope>;
};

const trackedElements: HTMLElement[] = [];
const activeScopes: ReturnType<typeof effectScope>[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }

  trackedElements.length = 0;
}

function createButton(id: string) {
  const button = trackElement(document.createElement("button"));
  button.id = id;
  button.type = "button";
  button.textContent = id;
  return button;
}

function createFloatingElement(id: string) {
  const floatingEl = trackElement(document.createElement("div"));
  floatingEl.id = id;
  return floatingEl;
}

function createItems(container: HTMLElement, count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const item = createButton(`item-${index}`);
    container.appendChild(item);
    return item;
  });
}

async function flushRole() {
  await nextTick();
  await nextTick();
}

function setupRole(options: UseRoleOptions, initialOpen = false): RoleTestContext {
  const anchorEl = createButton("anchor");
  document.body.appendChild(anchorEl);

  const floatingEl = createFloatingElement("floating");
  document.body.appendChild(floatingEl);

  const items = createItems(floatingEl);
  const listRef = ref<Array<HTMLElement | null>>(items);
  const openRef = ref(initialOpen);
  const anchorRef = ref<AnchorElement>(anchorEl);
  const floatingRef = ref<FloatingElement>(floatingEl);
  const context = useFloating(anchorRef, floatingRef, { open: openRef });
  const scope = effectScope();
  activeScopes.push(scope);

  let result!: UseRoleReturn;
  scope.run(() => {
    result = useRole(context, {
      listRef,
      ...options,
    });
  });

  return {
    anchorEl,
    context,
    floatingEl,
    items,
    listRef,
    openRef,
    result,
    scope,
  };
}

describe("useRole", () => {
  afterEach(() => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }

    activeScopes.length = 0;
    clearTrackedElements();
  });

  it("syncs menu trigger, floating, and item roles", async () => {
    const ctx = setupRole(
      {
        role: "menu",
        label: "Actions",
        disabledIndices: [1],
      },
      false,
    );

    await flushRole();

    expect(ctx.anchorEl.getAttribute("aria-haspopup")).toBe("menu");
    expect(ctx.anchorEl.getAttribute("aria-expanded")).toBe("false");
    expect(ctx.anchorEl.getAttribute("aria-controls")).toBe("floating");
    expect(ctx.floatingEl.getAttribute("role")).toBe("menu");
    expect(ctx.floatingEl.getAttribute("aria-label")).toBe("Actions");
    expect(ctx.items[0].getAttribute("role")).toBe("menuitem");
    expect(ctx.items[0].hasAttribute("tabindex")).toBe(false);
    expect(ctx.items[1].getAttribute("aria-disabled")).toBe("true");

    ctx.openRef.value = true;
    await flushRole();

    expect(ctx.anchorEl.getAttribute("aria-expanded")).toBe("true");
  });

  it("supports per-item checkbox roles and checked state", async () => {
    const ctx = setupRole({
      role: "menu",
      itemRole: (index) => (index === 0 ? "menuitemcheckbox" : "menuitem"),
      checkedIndices: [0],
    });

    await flushRole();

    expect(ctx.items[0].getAttribute("role")).toBe("menuitemcheckbox");
    expect(ctx.items[0].getAttribute("aria-checked")).toBe("true");
    expect(ctx.items[1].hasAttribute("aria-checked")).toBe(false);
  });

  it("syncs listbox options and selected state", async () => {
    const ctx = setupRole({
      role: "listbox",
      selectedIndices: (index) => index === 2,
    });

    await flushRole();

    expect(ctx.floatingEl.getAttribute("role")).toBe("listbox");
    expect(ctx.items[0].getAttribute("role")).toBe("option");
    expect(ctx.items[2].getAttribute("aria-selected")).toBe("true");
  });

  it("lets child menu contexts manage submenu trigger relationships", async () => {
    const parent = setupRole({ role: "menu" }, true);
    const childFloatingEl = createFloatingElement("child-menu");
    document.body.appendChild(childFloatingEl);

    const childOpen = ref(false);
    const childContext = useFloating(
      ref<AnchorElement>(parent.items[1]),
      ref<FloatingElement>(childFloatingEl),
      {
        open: childOpen,
      },
    );
    const scope = effectScope();
    activeScopes.push(scope);
    scope.run(() => {
      useRole(childContext, { role: "menu", label: "Child menu" });
    });

    await flushRole();

    expect(parent.items[1].getAttribute("role")).toBe("menuitem");
    expect(parent.items[1].getAttribute("aria-haspopup")).toBe("menu");
    expect(parent.items[1].getAttribute("aria-expanded")).toBe("false");
    expect(parent.items[1].getAttribute("aria-controls")).toBe("child-menu");

    childOpen.value = true;
    await flushRole();

    expect(parent.items[1].getAttribute("aria-expanded")).toBe("true");
  });

  it("links tooltips to the anchor only while open", async () => {
    const ctx = setupRole({ role: "tooltip" }, false);

    await flushRole();

    expect(ctx.floatingEl.getAttribute("role")).toBe("tooltip");
    expect(ctx.anchorEl.hasAttribute("aria-describedby")).toBe(false);

    ctx.openRef.value = true;
    await flushRole();

    expect(ctx.anchorEl.getAttribute("aria-describedby")).toBe("floating");
  });

  it("restores attributes on cleanup", async () => {
    const ctx = setupRole({ role: "dialog", modal: true }, true);
    ctx.anchorEl.setAttribute("aria-expanded", "template-value");

    await flushRole();

    expect(ctx.anchorEl.getAttribute("aria-expanded")).toBe("true");

    ctx.result.cleanup();

    expect(ctx.anchorEl.getAttribute("aria-expanded")).toBe("template-value");
    expect(ctx.floatingEl.hasAttribute("role")).toBe(false);
    expect(ctx.floatingEl.hasAttribute("aria-modal")).toBe(false);
  });
});
