<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import {
  useClick,
  useEscapeKey,
  useFloatingNode,
  useHover,
  useOutsideClick,
  usePosition,
  useRole,
  useRovingFocus,
} from "@/composables";

const EXPORT_INDEX = 2;

// --- Composite nodes ---------------------------------------------------------

const triggerEl = useTemplateRef<HTMLElement>("trigger");
const menuEl = useTemplateRef<HTMLElement>("menu");
const exportTriggerEl = ref<HTMLElement | null>(null);
const submenuEl = useTemplateRef<HTMLElement>("submenu");

const rootNode = useFloatingNode({ anchorEl: triggerEl, floatingEl: menuEl });
const subNode = useFloatingNode({
  anchorEl: exportTriggerEl,
  floatingEl: submenuEl,
  parent: rootNode,
});

// --- Positioning --------------------------------------------------------------

const rootPosition = usePosition(rootNode, {
  placement: "bottom-start",
  middlewares: { offset: 8, flip: true, shift: { padding: 8 } },
});
const subPosition = usePosition(subNode, {
  placement: "right-start",
  middlewares: { offset: 4, flip: true, shift: { padding: 8 } },
});

// --- Interactions ---------------------------------------------------------------

useClick(rootNode);
useHover(subNode, { delay: { open: 120, close: 200 }, safePolygon: true });
useOutsideClick(rootNode);
useEscapeKey(rootNode);
useRole(rootNode, { role: "menu", label: "File actions" });
useRole(subNode, { role: "menu", label: "Export as" });

// Closing the root cascades explicitly; open never cascades on its own.
function closeDescendants() {
  rootNode.traverse(
    (descendant) => {
      if (descendant.open.value) descendant.open.value = false;
    },
    { order: "bottom-up" },
  );
}

watch(
  () => rootNode.open.value,
  (isOpen) => {
    if (!isOpen) closeDescendants();
  },
);

// --- Items + roving focus ---------------------------------------------------------

const rootItems = ref<Array<HTMLElement | null>>([]);
const subItems = ref<Array<HTMLElement | null>>([]);

function closeMenu() {
  closeDescendants();
  rootNode.open.value = false;
}

function openSubmenu(focusFirst: boolean) {
  if (!rootNode.open.value) return;
  if (!subNode.open.value) subNode.open.value = true;
  if (focusFirst) void nextTick(() => subRoving.focusIndex(0));
}

function setRootItemRef(idx: number) {
  return (el: unknown) => {
    rootItems.value[idx] = el as HTMLElement | null;
    if (idx === EXPORT_INDEX) exportTriggerEl.value = el as HTMLElement | null;
  };
}

function setSubItemRef(idx: number) {
  return (el: unknown) => {
    subItems.value[idx] = el as HTMLElement | null;
  };
}

const rootRoving = useRovingFocus(rootNode, {
  elementsList: rootItems,
  loop: true,
  onSelect: (idx) => {
    if (idx === EXPORT_INDEX) openSubmenu(true);
    else closeMenu();
  },
  onEnter: (idx) => {
    if (idx === EXPORT_INDEX) openSubmenu(true);
  },
});

const subRoving = useRovingFocus(subNode, {
  elementsList: subItems,
  loop: true,
  onSelect: () => closeMenu(),
});

// Focus the first item whenever the root menu opens via click.
watch(
  () => rootNode.open.value,
  (isOpen) => {
    if (isOpen) void nextTick(() => rootRoving.focusIndex(0));
  },
);
</script>

<template>
  <div class="menu-demo">
    <button ref="trigger" type="button" class="linear-btn">File actions <kbd>⌄</kbd></button>

    <Teleport to="body">
      <div
        v-if="rootNode.open.value"
        ref="menu"
        role="menu"
        aria-label="File actions"
        class="linear-menu"
        :style="rootPosition.styles.value"
      >
        <button
          type="button"
          role="menuitem"
          :ref="setRootItemRef(0)"
          :tabindex="rootRoving.getTabindex(0)"
          class="linear-item"
          @click="closeMenu"
        >
          New file
        </button>
        <button
          type="button"
          role="menuitem"
          :ref="setRootItemRef(1)"
          :tabindex="rootRoving.getTabindex(1)"
          class="linear-item"
          @click="closeMenu"
        >
          Open…
        </button>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="subNode.open.value"
          :ref="setRootItemRef(2)"
          :tabindex="rootRoving.getTabindex(2)"
          class="linear-item"
          @click="openSubmenu(false)"
        >
          Export
          <span class="linear-item__chevron">›</span>
        </button>
        <div class="linear-sep" />
        <button
          type="button"
          role="menuitem"
          :ref="setRootItemRef(3)"
          :tabindex="rootRoving.getTabindex(3)"
          class="linear-item linear-item--danger"
          @click="closeMenu"
        >
          Delete
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="subNode.open.value"
        ref="submenu"
        role="menu"
        aria-label="Export as"
        class="linear-menu"
        :style="subPosition.styles.value"
      >
        <button
          v-for="(format, idx) in ['PDF', 'PNG', 'SVG'] as const"
          :key="format"
          type="button"
          role="menuitem"
          :ref="setSubItemRef(idx)"
          :tabindex="subRoving.getTabindex(idx)"
          class="linear-item"
          @click="closeMenu"
        >
          {{ format }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.menu-demo {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.linear-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #f7f8f8;
  background: #5e6ad2;
  border: 1px solid #5e6ad2;
  border-radius: 6px;
  padding: 7px 12px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
.linear-btn:hover {
  background: #717cef;
}
.linear-btn kbd {
  font-family: inherit;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}
</style>

<style>
.linear-menu {
  min-width: 224px;
  padding: 4px;
  border-radius: 8px;
  background: #16181d;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.4);
  outline: none;
  z-index: 60;
}
.linear-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-size: 13px;
  text-align: left;
  color: rgba(247, 248, 248, 0.85);
  background: transparent;
  border: 0;
  border-radius: 5px;
  padding: 7px 8px;
  cursor: pointer;
}
.linear-item:hover,
.linear-item:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}
.linear-item__chevron {
  margin-left: auto;
  color: rgba(247, 248, 248, 0.4);
}
.linear-item--danger {
  color: #ef9a9a;
}
.linear-sep {
  height: 1px;
  margin: 4px 6px;
  background: rgba(255, 255, 255, 0.08);
}
</style>
