<script setup lang="ts">
import type { Placement } from "v-float";
import {
  useArrow,
  useClick,
  useEscapeKey,
  useFloatingNode,
  useFocusTrap,
  useHover,
  useOutsideClick,
  usePosition,
  useRole,
  useRovingFocus,
} from "v-float";
import { computed, nextTick, shallowRef, watch } from "vue";

interface Props {
  placement: Placement;
  anchorOffset?: { x: number; y: number };
  isDragging?: boolean;
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  anchorOffset: () => ({ x: 0, y: 0 }),
  isDragging: false,
  keepOpen: false,
});

const emit = defineEmits<{
  (e: "pointerdown", event: PointerEvent): void;
}>();

// ============================================================================
// 1. Menu Items Data Definitions
// ============================================================================
interface MenuItemDef {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  hasSubmenu?: boolean;
}

const rootMenuItems: MenuItemDef[] = [
  { id: "duplicate", label: "Duplicate", shortcut: "⌘D" },
  { id: "rename", label: "Rename", shortcut: "↵" },
  { id: "share", label: "Share", hasSubmenu: true },
  { id: "delete", label: "Delete", shortcut: "⌫", danger: true },
];

const subMenuItems: MenuItemDef[] = [
  { id: "copy-link", label: "Copy Link", shortcut: "⌘C" },
  { id: "email-invite", label: "Email Invite", shortcut: "⌘E" },
  { id: "embed-widget", label: "Embed Widget", shortcut: "</>" },
];

// ============================================================================
// 2. Floating Nodes Creation (Parent -> Child Order)
// ============================================================================
const rootAnchorEl = shallowRef<HTMLElement | null>(null);
const rootFloatingEl = shallowRef<HTMLElement | null>(null);
const rootArrowEl = shallowRef<HTMLElement | null>(null);

const rootContext = useFloatingNode({
  anchorEl: rootAnchorEl,
  floatingEl: rootFloatingEl,
  arrowEl: rootArrowEl,
});

const subAnchorEl = shallowRef<HTMLElement | null>(null);
const subFloatingEl = shallowRef<HTMLElement | null>(null);

const subContext = useFloatingNode({
  anchorEl: subAnchorEl,
  floatingEl: subFloatingEl,
  parent: rootContext,
});

// ============================================================================
// 3. Positioning & Middlewares
// ============================================================================
const rootPosition = usePosition(rootContext, {
  placement: computed(() => props.placement),
  middlewares: {
    offset: 6,
    flip: { padding: 8 },
    shift: { padding: 8 },
  },
});

useArrow(rootContext, {
  offset: "-5px",
});

const rootSide = computed(
  () =>
    (rootPosition.placement.value.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right",
);

const subPosition = usePosition(subContext, {
  placement: "right-start",
  middlewares: {
    offset: { mainAxis: 4, crossAxis: -4 },
    flip: {
      padding: 8,
      fallbackPlacements: ["left-start", "bottom-start", "bottom-end"],
    },
    shift: { padding: 8, mainAxis: true },
  },
});

// Safe Polygon Live Geometry State
const polygonPoints = shallowRef<Array<[number, number]>>([]);

const svgPolygonPoints = computed(() => polygonPoints.value.map(([x, y]) => `${x},${y}`).join(" "));

// ============================================================================
// 4. Reactive State Synchronizations
// ============================================================================
watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      rootContext.open.value = true;
    } else {
      rootContext.open.value = false;
      subContext.open.value = false;
      polygonPoints.value = [];
    }
  },
  { immediate: true },
);

watch(rootContext.open, (isOpen) => {
  if (!isOpen) {
    subContext.open.value = false;
    polygonPoints.value = [];
  }
});

// ============================================================================
// 5. Root Menu Interactions
// ============================================================================
useClick(rootContext, {
  enabled: () => !props.keepOpen,
});

useOutsideClick(rootContext, {
  enabled: () => !props.keepOpen,
});

useEscapeKey(rootContext, {
  enabled: () => !props.keepOpen,
});

useFocusTrap(rootContext, {
  modal: false,
  initialFocus: rootFloatingEl,
  returnFocus: true,
});

useRole(rootContext, {
  role: "menu",
});

// ============================================================================
// 6. Submenu Interactions & Safe Polygon
// ============================================================================
useHover(subContext, {
  delay: { open: 40, close: 300 },
  safePolygon: {
    buffer: 12,
    requireIntent: false,
    onPolygonChange: (poly) => {
      polygonPoints.value = poly;
    },
  },
});

useClick(subContext, {
  ignoreKeyboard: true,
});

useOutsideClick(subContext);

useEscapeKey(subContext);

useRole(subContext, {
  role: "menu",
});

// ============================================================================
// 7. Roving Focus & Element References
// ============================================================================
const rootMenuItemEls = shallowRef<Array<HTMLElement | null>>([]);
const subMenuItemEls = shallowRef<Array<HTMLElement | null>>([]);

function setRootItemRef(el: any, index: number, hasSubmenu?: boolean) {
  rootMenuItemEls.value[index] = el as HTMLElement | null;
  if (hasSubmenu) {
    subAnchorEl.value = el as HTMLElement | null;
  }
}

function setSubItemRef(el: any, index: number) {
  subMenuItemEls.value[index] = el as HTMLElement | null;
}

const {
  activeIndex: rootActiveIndex,
  getTabindex: getRootTabindex,
  setActiveIndex: setRootActiveIndex,
} = useRovingFocus(rootContext, {
  elementsList: rootMenuItemEls,
  loop: true,
  openOnArrowKeyDown: true,
  onEnter: (index) => {
    if (rootMenuItems[index]?.hasSubmenu) {
      subContext.open.value = true;
      void nextTick(() => {
        subMenuItemEls.value[0]?.focus();
        setSubActiveIndex(0);
      });
    }
  },
  onSelect: (index) => {
    if (rootMenuItems[index]?.hasSubmenu) {
      subContext.open.value = !subContext.open.value;
      if (subContext.open.value) {
        void nextTick(() => {
          subMenuItemEls.value[0]?.focus();
          setSubActiveIndex(0);
        });
      }
    } else {
      closeAllMenus();
    }
  },
});

const {
  activeIndex: subActiveIndex,
  getTabindex: getSubTabindex,
  setActiveIndex: setSubActiveIndex,
} = useRovingFocus(subContext, {
  elementsList: subMenuItemEls,
  loop: true,
  onExit: () => {
    // ArrowLeft: Collapse submenu and return focus to the parent 'Share' trigger
    subContext.open.value = false;
    subAnchorEl.value?.focus();
    const shareIndex = rootMenuItems.findIndex((item) => item.id === "share");
    if (shareIndex !== -1) {
      setRootActiveIndex(shareIndex);
    }
  },
  onSelect: () => {
    closeAllMenus();
  },
});

function closeAllMenus() {
  subContext.open.value = false;
  rootContext.open.value = false;
  polygonPoints.value = [];
}

function onRootItemKeydown(e: KeyboardEvent, item: MenuItemDef) {
  if (item.hasSubmenu && (e.key === "ArrowRight" || e.key === "Enter")) {
    e.preventDefault();
    subContext.open.value = true;
    void nextTick(() => {
      subMenuItemEls.value[0]?.focus();
      setSubActiveIndex(0);
    });
  }
}

function onSubItemClick() {
  closeAllMenus();
}

function onRootItemClick(item: MenuItemDef) {
  if (!item.hasSubmenu) {
    closeAllMenus();
  }
}

defineExpose({
  context: rootContext,
  position: rootPosition,
  update: () => {
    void rootPosition.update();
    if (subContext.open.value) {
      void subPosition.update();
    }
  },
});
</script>

<template>
  <div class="preset-wrapper">
    <!-- Anchor Trigger Button -->
    <div
      class="anchor-slot"
      :style="{ transform: `translate(${anchorOffset.x}px, ${anchorOffset.y}px)` }"
    >
      <button
        ref="rootAnchorEl"
        type="button"
        class="anchor-btn"
        :class="{
          'is-active': rootContext.open.value,
          'is-dragging': isDragging,
        }"
        aria-haspopup="menu"
        :aria-expanded="rootContext.open.value"
        @pointerdown="emit('pointerdown', $event)"
      >
        <svg
          class="anchor-btn__drag-icon"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
        <span>Actions</span>
        <svg
          class="anchor-btn__chevron"
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
    </div>

    <!-- Live Safe Polygon Visual Corridor (Teleported) -->
    <Teleport to="body">
      <svg v-if="polygonPoints.length > 0" class="safe-polygon-overlay" aria-hidden="true">
        <polygon :points="svgPolygonPoints" class="safe-polygon-corridor" />
      </svg>
    </Teleport>

    <!-- Safe Polygon Active Status Pill inside Sandbox -->
    <Transition name="fade-fast">
      <div v-if="polygonPoints.length > 0" class="safepolygon-indicator" aria-live="polite">
        <span class="safepolygon-indicator__dot" />
        <span class="safepolygon-indicator__text">Safe Polygon Active</span>
      </div>
    </Transition>

    <!-- 1. Root Menu Panel -->
    <div
      v-if="rootContext.open.value"
      ref="rootFloatingEl"
      role="menu"
      tabindex="-1"
      class="floating-panel panel-menu panel-menu--root"
    >
      <div
        v-for="(item, index) in rootMenuItems"
        :key="item.id"
        :ref="(el) => setRootItemRef(el, index, item.hasSubmenu)"
        role="menuitem"
        class="menu-item"
        :tabindex="getRootTabindex(index)"
        :class="{
          'is-active': rootActiveIndex === index || (item.hasSubmenu && subContext.open.value),
          'is-danger': item.danger,
          'has-submenu': item.hasSubmenu,
        }"
        :aria-haspopup="item.hasSubmenu ? 'menu' : undefined"
        :aria-expanded="item.hasSubmenu ? subContext.open.value : undefined"
        @mouseenter="setRootActiveIndex(index)"
        @click="onRootItemClick(item)"
        @keydown="onRootItemKeydown($event, item)"
      >
        <span class="menu-item__label">{{ item.label }}</span>

        <template v-if="item.hasSubmenu">
          <svg
            class="menu-item__arrow"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
        </template>
        <template v-else-if="item.shortcut">
          <kbd class="menu-item__shortcut">{{ item.shortcut }}</kbd>
        </template>
      </div>

      <!-- Arrow -->
      <div ref="rootArrowEl" :class="['floating-arrow', `floating-arrow--${rootSide}`]" />
    </div>

    <!-- 2. Submenu Panel (Cascading child FloatingNode) -->
    <div
      v-if="subContext.open.value && rootContext.open.value"
      ref="subFloatingEl"
      role="menu"
      tabindex="-1"
      class="floating-panel panel-menu panel-menu--sub"
    >
      <div class="submenu-header">
        <span class="submenu-header__title">Share with team</span>
      </div>

      <div
        v-for="(subItem, subIndex) in subMenuItems"
        :key="subItem.id"
        :ref="(el) => setSubItemRef(el, subIndex)"
        role="menuitem"
        class="menu-item"
        :tabindex="getSubTabindex(subIndex)"
        :class="{
          'is-active': subActiveIndex === subIndex,
        }"
        @mouseenter="setSubActiveIndex(subIndex)"
        @click="onSubItemClick"
      >
        <span class="menu-item__label">{{ subItem.label }}</span>
        <kbd v-if="subItem.shortcut" class="menu-item__shortcut">{{ subItem.shortcut }}</kbd>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preset-wrapper {
  display: contents;
}

.anchor-slot {
  position: relative;
  touch-action: none;
  z-index: 5;
}

.anchor-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: grab;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--vp-shadow-1, 0 1px 2px rgba(0, 0, 0, 0.04));
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.anchor-btn:hover .anchor-btn__drag-icon {
  color: var(--vp-c-brand-1);
}

.anchor-btn:active {
  transform: scale(0.98);
  background: var(--vp-c-bg-soft);
}

.anchor-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.anchor-btn.is-active {
  border-color: var(--vp-c-brand-1);
}

.anchor-btn.is-dragging {
  cursor: grabbing;
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--vp-shadow-3, 0 8px 20px rgba(0, 0, 0, 0.12));
}

.anchor-btn__drag-icon {
  color: var(--vp-c-text-3);
  opacity: 0.7;
  flex-shrink: 0;
}

.anchor-btn__chevron {
  width: 10px;
  height: 10px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.anchor-btn.is-active .anchor-btn__chevron {
  transform: rotate(180deg);
  color: var(--vp-c-brand-1);
}

@media (pointer: coarse), (max-width: 640px) {
  .anchor-btn {
    min-height: 42px;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}

/* Floating Panels */
.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: var(--vp-shadow-3, 0 10px 30px rgba(0, 0, 0, 0.12));
  border-radius: 8px;
}

.panel-menu {
  outline: none;
}

.panel-menu--root {
  z-index: 20;
  width: 190px;
  max-width: calc(100% - 16px);
  padding: 0.35rem;
}

.panel-menu--sub {
  z-index: 30;
  width: 195px;
  max-width: calc(100% - 16px);
  padding: 0.35rem;
  box-shadow: var(--vp-shadow-3, 0 12px 34px rgba(0, 0, 0, 0.16));
}

.submenu-header {
  padding: 0.3rem 0.55rem 0.25rem;
  margin-bottom: 0.2rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.submenu-header__title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.42rem 0.55rem;
  border-radius: 5px;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.1s ease,
    color 0.1s ease;
}

.menu-item:hover,
.menu-item.is-active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

.menu-item:active {
  background: var(--vp-c-bg-mute);
}

.menu-item.has-submenu .menu-item__arrow {
  color: var(--vp-c-text-3);
  transition: transform 0.12s ease;
}

.menu-item.has-submenu:hover .menu-item__arrow,
.menu-item.has-submenu.is-active .menu-item__arrow {
  color: var(--vp-c-brand-1);
  transform: translateX(1px);
}

.menu-item.is-danger {
  color: var(--vp-c-danger-1, var(--vp-c-red-1, #e5484d));
}

.menu-item.is-danger:hover,
.menu-item.is-danger.is-active {
  background: var(--vp-c-danger-soft, var(--vp-c-red-soft, rgba(229, 72, 77, 0.1)));
  color: var(--vp-c-danger-1, var(--vp-c-red-1, #e5484d));
}

.menu-item.is-danger:active {
  background: var(--vp-c-danger-soft, var(--vp-c-red-soft, rgba(229, 72, 77, 0.15)));
}

.menu-item__shortcut {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}

/* Safe Polygon Live Indicator */
.safepolygon-indicator {
  position: absolute;
  top: 0.75rem;
  left: 0.85rem;
  z-index: 15;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.55rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: none;
}

.safepolygon-indicator__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 6px var(--vp-c-brand-1);
  animation: dot-pulse 1.2s infinite ease-in-out;
}

@keyframes dot-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.4);
    opacity: 1;
  }
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (pointer: coarse), (max-width: 640px) {
  .panel-menu--root {
    width: 200px;
  }
  .panel-menu--sub {
    width: 200px;
  }
  .menu-item {
    min-height: 38px;
    padding: 0.5rem 0.75rem;
    font-size: 0.84rem;
  }
}
</style>

<style>
/* Teleported Safe Polygon SVG Corridor Overlay */
.safe-polygon-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99999;
}

.safe-polygon-corridor {
  fill: var(--vp-c-brand-1, #10b981);
  fill-opacity: 0.14;
  stroke: var(--vp-c-brand-1, #10b981);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
  stroke-opacity: 0.65;
  filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.35));
}
</style>
