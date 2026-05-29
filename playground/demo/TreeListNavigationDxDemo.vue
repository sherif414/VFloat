<script setup lang="ts">
import { flip, offset, shift } from "@floating-ui/dom";
import { computed, nextTick, ref, watch } from "vue";
import { useClick, useEscapeKey, useFloating, useListNavigation, useTree } from "../../src";

interface MenuItem {
  id: string;
  label: string;
  meta?: string;
  disabled?: boolean;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", meta: "D" },
  {
    id: "workspace",
    label: "Workspace",
    children: [
      { id: "workspace-overview", label: "Overview" },
      { id: "workspace-members", label: "Members" },
      { id: "workspace-billing", label: "Billing", disabled: true },
      { id: "workspace-settings", label: "Settings" },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    children: [
      { id: "theme-light", label: "Light" },
      { id: "theme-dark", label: "Dark" },
      { id: "theme-system", label: "System" },
    ],
  },
  { id: "integrations", label: "Integrations", disabled: true },
  { id: "shortcuts", label: "Keyboard shortcuts", meta: "?" },
];

const tree = useTree<MenuItem>({
  items: menuItems,
  getItemId: (item) => item.id,
  getItemChildren: (item) => item.children,
  isItemDisabled: (item) => item.disabled === true,
});

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const rootOpen = ref(false);

const workspaceAnchorEl = ref<HTMLElement | null>(null);
const workspaceFloatingEl = ref<HTMLElement | null>(null);

const appearanceAnchorEl = ref<HTMLElement | null>(null);
const appearanceFloatingEl = ref<HTMLElement | null>(null);

const rootContext = useFloating(rootAnchorEl, rootFloatingEl, {
  open: rootOpen,
  placement: "bottom-start",
  middlewares: [offset(8), flip(), shift({ padding: 12 })],
});

const workspaceOpen = computed(() => tree.expandedValues.value.has("workspace"));
const workspaceContext = useFloating(workspaceAnchorEl, workspaceFloatingEl, {
  open: workspaceOpen as any,
  placement: "right-start",
  middlewares: [offset(6), flip(), shift({ padding: 12 })],
});

const appearanceOpen = computed(() => tree.expandedValues.value.has("appearance"));
const appearanceContext = useFloating(appearanceAnchorEl, appearanceFloatingEl, {
  open: appearanceOpen as any,
  placement: "right-start",
  middlewares: [offset(6), flip(), shift({ padding: 12 })],
});

const floatingPanels = computed(() => [
  rootFloatingEl.value,
  workspaceFloatingEl.value,
  appearanceFloatingEl.value,
]);

useClick(rootContext, {
  toggle: true,
  closeOnOutsideClick: true,
  ignoreOutsideClick: (target) => {
    return floatingPanels.value.some((el) => el?.contains(target as Node));
  },
});
useEscapeKey(rootContext);
useListNavigation(rootContext, {
  collection: tree.rootBranch,
  loop: true,
  onEnter: openBranch,
});

useListNavigation(workspaceContext, {
  collection: tree.getBranch("workspace")!,
  enabled: workspaceOpen,
  loop: true,
  onExit: closeToParent,
});

useListNavigation(appearanceContext, {
  collection: tree.getBranch("appearance")!,
  enabled: appearanceOpen,
  loop: true,
  onExit: closeToParent,
});

const activeItem = computed(() => {
  const activeValue = tree.activeValue.value;
  return activeValue ? tree.getItem(activeValue) : null;
});

const expandedLabels = computed(() => {
  return [...tree.expandedValues.value].join(", ") || "none";
});

function setRootItemEl(el: Element | null, item: MenuItem) {
  const itemEl = el as HTMLElement | null;

  if (item.id === "workspace") {
    workspaceAnchorEl.value = itemEl;
  } else if (item.id === "appearance") {
    appearanceAnchorEl.value = itemEl;
  }
}

function openBranch(value: string) {
  if (!tree.hasChildren(value)) return;

  tree.expandBranch(value);
  const branch = tree.getBranch(value);
  branch?.setFirst();
}

function closeToParent(value: string) {
  const parentValue = tree.getParentValue(value);
  if (!parentValue) return;

  tree.collapseBranch(parentValue);
  tree.setActiveValue(parentValue);
}

function activateItem(item: MenuItem) {
  if (item.disabled) return;

  tree.setActiveValue(item.id);

  if (item.children) {
    openBranch(item.id);
    return;
  }

  rootContext.state.setOpen(false, "programmatic");
}

function closeOtherBranches(activeValue: string) {
  const parentValue = tree.getParentValue(activeValue);

  for (const expandedValue of tree.expandedValues.value) {
    if (expandedValue !== activeValue && expandedValue !== parentValue) {
      tree.collapseBranch(expandedValue);
    }
  }
}

watch(rootOpen, async (isOpen) => {
  if (!isOpen) {
    tree.collapseAll();
    tree.setActiveValue(null);
    return;
  }

  await nextTick();
  tree.rootBranch.setFirst();
});

watch(tree.activeValue, async (activeValue) => {
  if (!activeValue) return;

  closeOtherBranches(activeValue);
  await nextTick();

  document.getElementById(`tree-menu-${activeValue}`)?.focus({ preventScroll: true });
});
</script>

<template>
  <main class="dx-page">
    <section class="dx-shell" aria-labelledby="dx-title">
      <div class="dx-copy">
        <p class="dx-eyebrow">Playground</p>
        <h1 id="dx-title">useTree + useListNavigation DX</h1>
      </div>

      <button
        ref="rootAnchorEl"
        type="button"
        class="trigger"
        aria-haspopup="menu"
        :aria-expanded="rootOpen"
      >
        <span>Open menu</span>
        <span class="trigger-mark" aria-hidden="true">v</span>
      </button>

      <dl class="state-panel">
        <div>
          <dt>Active</dt>
          <dd>{{ activeItem?.label ?? "none" }}</dd>
        </div>
        <div>
          <dt>Expanded</dt>
          <dd>{{ expandedLabels }}</dd>
        </div>
      </dl>
    </section>

    <Teleport to="body">
      <section
        v-if="rootOpen"
        ref="rootFloatingEl"
        class="menu-panel"
        role="menu"
        aria-label="Tree list navigation demo"
        :style="rootContext.position.styles.value"
      >
        <button
          v-for="(item, idx) in menuItems"
          :id="`tree-menu-${item.id}`"
          :key="item.id"
          :ref="(el) => setRootItemEl(el, item)"
          type="button"
          class="menu-item"
          role="menuitem"
          :class="{
            'is-active': tree.activeValue.value === item.id || tree.isExpanded(item.id),
            'is-disabled': item.disabled,
          }"
          :disabled="item.disabled"
          :aria-disabled="item.disabled ? 'true' : undefined"
          :aria-haspopup="item.children ? 'menu' : undefined"
          :aria-expanded="item.children ? tree.isExpanded(item.id) : undefined"
          @pointermove="!item.disabled && tree.setActiveValue(item.id)"
          @click="activateItem(item)"
        >
          <span>{{ item.label }}</span>
          <span v-if="item.children" class="menu-meta" aria-hidden="true">></span>
          <kbd v-else-if="item.meta" class="menu-kbd">{{ item.meta }}</kbd>
        </button>
      </section>
    </Teleport>

    <Teleport to="body">
      <section
        v-if="workspaceOpen"
        ref="workspaceFloatingEl"
        class="menu-panel menu-panel--sub"
        role="menu"
        aria-label="Workspace"
        :style="workspaceContext.position.styles.value"
      >
        <button
          v-for="item in menuItems[1].children"
          :id="`tree-menu-${item.id}`"
          :key="item.id"
          type="button"
          class="menu-item"
          role="menuitem"
          :class="{
            'is-active': tree.activeValue.value === item.id,
            'is-disabled': item.disabled,
          }"
          :disabled="item.disabled"
          :aria-disabled="item.disabled ? 'true' : undefined"
          @pointermove="!item.disabled && tree.setActiveValue(item.id)"
          @click="activateItem(item)"
        >
          <span>{{ item.label }}</span>
        </button>
      </section>
    </Teleport>

    <Teleport to="body">
      <section
        v-if="appearanceOpen"
        ref="appearanceFloatingEl"
        class="menu-panel menu-panel--sub"
        role="menu"
        aria-label="Appearance"
        :style="appearanceContext.position.styles.value"
      >
        <button
          v-for="item in menuItems[2].children"
          :id="`tree-menu-${item.id}`"
          :key="item.id"
          type="button"
          class="menu-item"
          role="menuitem"
          :class="{ 'is-active': tree.activeValue.value === item.id }"
          @pointermove="tree.setActiveValue(item.id)"
          @click="activateItem(item)"
        >
          <span>{{ item.label }}</span>
        </button>
      </section>
    </Teleport>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #f6f5f1;
  color: #161616;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.dx-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.dx-shell {
  width: min(520px, 100%);
  display: grid;
  gap: 18px;
}

.dx-copy {
  display: grid;
  gap: 6px;
}

.dx-eyebrow,
.dx-copy h1 {
  margin: 0;
}

.dx-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5e6f75;
}

.dx-copy h1 {
  font-size: 28px;
  line-height: 1.15;
  font-weight: 750;
  letter-spacing: 0;
}

.trigger {
  width: fit-content;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid #1d1d1d;
  border-radius: 8px;
  background: #ffffff;
  color: #161616;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
}

.trigger:focus-visible,
.menu-item:focus-visible {
  outline: 2px solid #0f766e;
  outline-offset: 2px;
}

.trigger-mark {
  font-size: 11px;
  color: #667075;
}

.state-panel {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.state-panel div {
  min-width: 0;
  padding: 12px;
  border: 1px solid #d8d4cc;
  border-radius: 8px;
  background: #ffffff;
}

.state-panel dt {
  margin: 0 0 4px;
  color: #687176;
  font-size: 12px;
  font-weight: 700;
}

.state-panel dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 650;
}

.menu-panel {
  z-index: 50;
  width: 250px;
  display: grid;
  gap: 2px;
  padding: 6px;
  border: 1px solid #d8d4cc;
  border-radius: 8px;
  background: #fffdf8;
  box-shadow: 0 18px 42px rgba(30, 30, 30, 0.14);
}

.menu-panel--sub {
  width: 220px;
  z-index: 60;
}

.menu-item {
  min-height: 36px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #1d1d1d;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.menu-item.is-active {
  background: #102a27;
  color: #ffffff;
}

.menu-item.is-disabled {
  cursor: not-allowed;
  color: #9a9790;
}

.menu-item.is-disabled.is-active {
  background: transparent;
}

.menu-meta,
.menu-kbd {
  color: currentColor;
  opacity: 0.68;
}

.menu-kbd {
  min-width: 20px;
  padding: 2px 5px;
  border: 1px solid currentColor;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  text-align: center;
}
</style>
