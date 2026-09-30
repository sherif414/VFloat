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
  { id: "copy-link", label: "Copy link", shortcut: "⌘C" },
  { id: "email-invite", label: "Email invite", shortcut: "⌘E" },
  { id: "embed-widget", label: "Embed code", shortcut: "</>" },
];

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

watch(
  () => props.keepOpen,
  (keep) => {
    if (keep) {
      rootContext.open.value = true;
    } else {
      rootContext.open.value = false;
      subContext.open.value = false;
    }
  },
  { immediate: true },
);

watch(rootContext.open, (isOpen) => {
  if (!isOpen) {
    subContext.open.value = false;
  }
});

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

useHover(subContext, {
  delay: { open: 0, close: 100 },
  safePolygon: true,
});

useClick(subContext, {
  ignoreKeyboard: true,
});

useOutsideClick(subContext);
useEscapeKey(subContext);

useRole(subContext, {
  role: "menu",
});

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

// Animated Moving Background Indicators
const rootIndicatorStyle = shallowRef<{ transform: string; height: string; opacity: number }>({
  transform: "translateY(0px)",
  height: "0px",
  opacity: 0,
});

const subIndicatorStyle = shallowRef<{ transform: string; height: string; opacity: number }>({
  transform: "translateY(0px)",
  height: "0px",
  opacity: 0,
});

function updateRootIndicator() {
  const index = rootActiveIndex.value;
  if (index === -1 || index === null || !rootFloatingEl.value) {
    rootIndicatorStyle.value = { ...rootIndicatorStyle.value, opacity: 0 };
    return;
  }
  const targetEl = rootMenuItemEls.value[index];
  if (!targetEl) {
    rootIndicatorStyle.value = { ...rootIndicatorStyle.value, opacity: 0 };
    return;
  }
  const top = targetEl.offsetTop;
  const height = targetEl.offsetHeight;
  rootIndicatorStyle.value = {
    transform: `translateY(${top}px)`,
    height: `${height}px`,
    opacity: 1,
  };
}

function updateSubIndicator() {
  const index = subActiveIndex.value;
  if (index === -1 || index === null || !subFloatingEl.value) {
    subIndicatorStyle.value = { ...subIndicatorStyle.value, opacity: 0 };
    return;
  }
  const targetEl = subMenuItemEls.value[index];
  if (!targetEl) {
    subIndicatorStyle.value = { ...subIndicatorStyle.value, opacity: 0 };
    return;
  }
  const top = targetEl.offsetTop;
  const height = targetEl.offsetHeight;
  subIndicatorStyle.value = {
    transform: `translateY(${top}px)`,
    height: `${height}px`,
    opacity: 1,
  };
}

watch(rootActiveIndex, () => {
  void nextTick(() => {
    updateRootIndicator();
  });
});

watch(rootContext.open, (isOpen) => {
  if (isOpen) {
    void nextTick(() => {
      updateRootIndicator();
    });
  } else {
    rootIndicatorStyle.value = { ...rootIndicatorStyle.value, opacity: 0 };
  }
});

watch(subActiveIndex, () => {
  void nextTick(() => {
    updateSubIndicator();
  });
});

watch(subContext.open, (isOpen) => {
  if (isOpen) {
    void nextTick(() => {
      updateSubIndicator();
    });
  } else {
    subIndicatorStyle.value = { ...subIndicatorStyle.value, opacity: 0 };
  }
});

function closeAllMenus() {
  subContext.open.value = false;
  rootContext.open.value = false;
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
    <!-- Anchor Trigger -->
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
        <span>Actions</span>
        <svg
          class="anchor-btn__chevron"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
    </div>

    <!-- Root Menu -->
    <div
      v-if="rootContext.open.value"
      ref="rootFloatingEl"
      role="menu"
      tabindex="-1"
      class="floating-panel panel-menu panel-menu--root"
    >
      <!-- Moving Animated Active Indicator -->
      <div
        class="menu-active-indicator"
        :class="{ 'is-danger': rootMenuItems[rootActiveIndex]?.danger }"
        :style="rootIndicatorStyle"
      />

      <div
        v-for="(item, index) in rootMenuItems"
        :key="item.id"
        :ref="(el) => setRootItemRef(el, index, item.hasSubmenu)"
        role="menuitem"
        class="menu-item"
        :tabindex="getRootTabindex(index)"
        :class="{
          'is-active': rootActiveIndex === index,
          'is-danger': item.danger,
          'has-submenu': item.hasSubmenu,
        }"
        :aria-haspopup="item.hasSubmenu ? 'menu' : undefined"
        :aria-expanded="item.hasSubmenu ? subContext.open.value : undefined"
        @pointermove="setRootActiveIndex(index)"
        @click="onRootItemClick(item)"
        @keydown="onRootItemKeydown($event, item)"
      >
        <span class="menu-item__label">{{ item.label }}</span>

        <template v-if="item.hasSubmenu">
          <svg
            class="menu-item__arrow"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
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

    <!-- Submenu Panel -->
    <div
      v-if="subContext.open.value && rootContext.open.value"
      ref="subFloatingEl"
      role="menu"
      tabindex="-1"
      class="floating-panel panel-menu panel-menu--sub"
    >
      <!-- Moving Animated Active Indicator -->
      <div class="menu-active-indicator" :style="subIndicatorStyle" />

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
        @pointermove="setSubActiveIndex(subIndex)"
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
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: grab;
  user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  outline: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-elv);
}

.anchor-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-text, #18794e);
  outline-offset: 1px;
}

.anchor-btn.is-active {
  border-color: var(--vp-c-text-2);
}

.anchor-btn.is-dragging {
  cursor: grabbing;
  border-color: var(--vp-c-brand-text, #18794e);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.anchor-btn__chevron {
  width: 9px;
  height: 9px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.anchor-btn.is-active .anchor-btn__chevron {
  transform: rotate(180deg);
  color: var(--vp-c-text-1);
}

/* Floating Panels */
.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-radius: 6px;
}

.panel-menu {
  outline: none;
  position: absolute;
}

.panel-menu--root {
  z-index: 20;
  width: 175px;
  padding: 3px;
}

.panel-menu--sub {
  z-index: 30;
  width: 175px;
  padding: 3px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

/* Moving Animated Active Indicator */
.menu-active-indicator {
  position: absolute;
  top: 0;
  left: 3px;
  right: 3px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  pointer-events: none;
  z-index: 1;
  transition:
    transform 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.12s ease;
}

.menu-active-indicator.is-danger {
  background: var(--vp-c-danger-soft, rgba(229, 72, 77, 0.08));
}

.menu-item {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.55rem;
  border-radius: 4px;
  font-size: 0.78125rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  cursor: pointer;
  touch-action: manipulation;
  background: transparent;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.12s ease;
}

.menu-item.is-active {
  color: var(--vp-c-text-1);
}

.menu-item.has-submenu .menu-item__arrow {
  width: 10px;
  height: 10px;
  color: var(--vp-c-text-3);
  transition: color 0.12s ease;
}

.menu-item.has-submenu.is-active .menu-item__arrow {
  color: var(--vp-c-text-1);
}

.menu-item.is-danger {
  color: var(--vp-c-danger-1, #e5484d);
}

.menu-item.is-danger.is-active {
  color: var(--vp-c-danger-1, #e5484d);
}

.menu-item__shortcut {
  font-size: 0.6875rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}

/* Arrow */
.floating-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--vp-c-bg-elv);
  transform: rotate(45deg);
  border: 1px solid var(--vp-c-divider);
  z-index: 0;
}

.floating-arrow--top {
  border-top: none;
  border-left: none;
}

.floating-arrow--bottom {
  border-bottom: none;
  border-right: none;
}

.floating-arrow--left {
  border-left: none;
  border-bottom: none;
}

.floating-arrow--right {
  border-right: none;
  border-top: none;
}
</style>
