<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from "vue";
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

// --- Safe polygon visualization ----------------------------------------------

const showCorridor = ref(true);
const submenuGap = ref(20);
const polygonPoints = shallowRef<Array<[number, number]>>([]);

const polygonPointsString = computed(() =>
  polygonPoints.value.map(([x, y]) => `${x},${y}`).join(" "),
);

watch(showCorridor, (show) => {
  if (!show) polygonPoints.value = [];
});

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
  middlewares: computed(() => ({
    offset: submenuGap.value,
    flip: true,
    shift: { padding: 8 },
  })),
});

// --- Interactions ---------------------------------------------------------------

useClick(rootNode);
useClick(subNode, { toggle: false });
useHover(subNode, {
  delay: { open: 120, close: 150 },
  safePolygon: {
    buffer: 4,
    blockPointerEvents: true,
    onPolygonChange: (points) => {
      if (showCorridor.value) {
        polygonPoints.value = points;
      } else {
        polygonPoints.value = [];
      }
    },
  },
});
useOutsideClick(rootNode);
useOutsideClick(subNode);
useEscapeKey(rootNode, {
  onEscape: () => {
    rootNode.open.value = false;
    triggerEl.value?.focus();
  },
});
useEscapeKey(subNode, {
  onEscape: () => {
    subNode.open.value = false;
    exportTriggerEl.value?.focus();
  },
});

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

useRole(rootNode, { role: "menu", label: "File actions", listRef: rootItems });
useRole(subNode, { role: "menu", label: "Export as", listRef: subItems });

function closeMenu() {
  rootNode.open.value = false;
  triggerEl.value?.focus();
}

function openSubmenu(focusFirst: boolean) {
  if (!rootNode.open.value) return;
  subNode.open.value = true;
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
  focusOnHover: true,
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
  focusOnHover: true,
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
    <div class="demo-controls">
      <label class="demo-toggle">
        <input v-model="showCorridor" type="checkbox" />
        <span>Visualize safe polygon</span>
      </label>

      <label class="demo-slider">
        <span>Gap: {{ submenuGap }}px</span>
        <input v-model.number="submenuGap" type="range" min="4" max="48" step="2" />
      </label>

      <span v-if="showCorridor && polygonPoints.length > 0" class="demo-badge">
        <span class="demo-badge__pulse" />
        Corridor active ({{ polygonPoints.length }} vertices)
      </span>
    </div>

    <button ref="trigger" type="button" class="linear-btn">File actions <kbd>⌄</kbd></button>

    <Teleport to="body">
      <div
        v-if="rootNode.open.value"
        ref="menu"
        class="linear-menu"
        :style="rootPosition.styles.value"
      >
        <button
          type="button"
          :ref="setRootItemRef(0)"
          :tabindex="rootRoving.getTabindex(0)"
          class="linear-item"
          :class="{ 'linear-item--active': rootRoving.activeIndex.value === 0 }"
          @click="closeMenu"
        >
          New file
        </button>
        <button
          type="button"
          :ref="setRootItemRef(1)"
          :tabindex="rootRoving.getTabindex(1)"
          class="linear-item"
          :class="{ 'linear-item--active': rootRoving.activeIndex.value === 1 }"
          @click="closeMenu"
        >
          Open…
        </button>
        <button
          type="button"
          :ref="setRootItemRef(2)"
          :tabindex="rootRoving.getTabindex(2)"
          class="linear-item"
          :class="{ 'linear-item--active': rootRoving.activeIndex.value === 2 }"
        >
          Export
          <span class="linear-item__chevron">›</span>
        </button>
        <div class="linear-sep" />
        <button
          type="button"
          :ref="setRootItemRef(3)"
          :tabindex="rootRoving.getTabindex(3)"
          class="linear-item linear-item--danger"
          :class="{ 'linear-item--active': rootRoving.activeIndex.value === 3 }"
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
        class="linear-menu"
        :style="subPosition.styles.value"
      >
        <button
          v-for="(format, idx) in ['PDF', 'PNG', 'SVG'] as const"
          :key="format"
          type="button"
          :ref="setSubItemRef(idx)"
          :tabindex="subRoving.getTabindex(idx)"
          class="linear-item"
          :class="{ 'linear-item--active': subRoving.activeIndex.value === idx }"
          @click="closeMenu"
        >
          {{ format }}
        </button>
      </div>
    </Teleport>

    <!-- Safe Polygon Corridor Visualization -->
    <Teleport to="body">
      <svg
        v-if="showCorridor && polygonPoints.length > 0"
        class="safe-polygon-overlay"
        aria-hidden="true"
      >
        <polygon :points="polygonPointsString" class="safe-polygon-shape" />
        <circle
          v-for="([x, y], idx) in polygonPoints"
          :key="idx"
          :cx="x"
          :cy="y"
          r="3.5"
          class="safe-polygon-vertex"
        />
      </svg>
    </Teleport>
  </div>
</template>

<style scoped>
.menu-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 0;
}
.demo-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 24px;
}
.demo-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(247, 248, 248, 0.75);
  cursor: pointer;
  user-select: none;
}
.demo-toggle input[type="checkbox"] {
  accent-color: #5e6ad2;
  cursor: pointer;
  width: 15px;
  height: 15px;
}
.demo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 9999px;
  background: rgba(94, 106, 210, 0.16);
  border: 1px solid rgba(113, 124, 239, 0.4);
  color: #c7cbff;
}
.demo-badge__pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #717cef;
  box-shadow: 0 0 6px #717cef;
}
.demo-slider {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(247, 248, 248, 0.75);
}
.demo-slider input[type="range"] {
  width: 80px;
  accent-color: #5e6ad2;
  cursor: pointer;
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
  outline: none;
}
.linear-item--active {
  background: rgba(255, 255, 255, 0.08);
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
.safe-polygon-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 100;
  overflow: visible;
}
.safe-polygon-shape {
  fill: rgba(99, 102, 241, 0.32);
  stroke: #818cf8;
  stroke-width: 2;
  stroke-dasharray: 6 3;
}
.safe-polygon-vertex {
  fill: #6366f1;
  stroke: #ffffff;
  stroke-width: 2;
}
</style>
