<script setup lang="ts">
import type { Placement, UsePositionMiddlewareOptions } from "v-float";
import { computed, shallowRef, watch } from "vue";
import {
  useArrow,
  useClick,
  useCollection,
  useEscapeKey,
  useFloatingContext,
  useFocusManager,
  useListNavigation,
  useOutsideClick,
  usePosition,
  useRole,
} from "v-float";

interface Props {
  placement: Placement;
  middlewareConfig: UsePositionMiddlewareOptions;
  enableArrow: boolean;
  anchorOffset: { x: number; y: number };
  isDragging: boolean;
  isActive: boolean;
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keepOpen: false,
});

const emit = defineEmits<{
  (e: "pointerdown", event: PointerEvent): void;
  (e: "update:resolvedPlacement", placement: Placement): void;
}>();

const anchorEl = shallowRef<HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const arrowEl = shallowRef<HTMLElement | null>(null);

const context = useFloatingContext({
  anchorEl,
  floatingEl,
  arrowEl,
});

const position = usePosition(context, {
  placement: computed(() => props.placement),
  middleware: computed(() => props.middlewareConfig),
});

const { arrowStyles } = useArrow(context, {
  offset: "-5px",
});

const side = computed(
  () => (position.placement.value.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right",
);

watch(
  () => [props.keepOpen, props.isActive],
  ([keep, active]) => {
    if (active && keep) {
      context.state.setOpen(true);
    }
  },
  { immediate: true },
);

watch(
  position.placement,
  (val) => {
    emit("update:resolvedPlacement", val);
  },
  { immediate: true },
);

const menuItems = [
  { id: "duplicate", label: "Duplicate", shortcut: "⌘D" },
  { id: "rename", label: "Rename", shortcut: "↵" },
  { id: "share", label: "Copy Link", shortcut: "⌘C" },
  { id: "delete", label: "Delete", shortcut: "⌫", danger: true },
];

const menuCollection = useCollection({
  values: menuItems.map((item) => item.id),
});

useClick(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useOutsideClick(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useEscapeKey(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useFocusManager(context, {
  enabled: () => props.isActive,
  modal: false,
  initialFocus: floatingEl,
  returnFocus: true,
  guards: false,
});

useListNavigation(context, {
  collection: menuCollection,
  loop: true,
  enabled: () => props.isActive,
  onEnter: () => {
    context.state.setOpen(false);
  },
});

useRole(context, {
  role: "menu",
});

defineExpose({
  context,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div class="preset-wrapper">
    <div
      class="anchor-slot"
      :style="{ transform: `translate(${anchorOffset.x}px, ${anchorOffset.y}px)` }"
    >
      <button
        ref="anchorEl"
        type="button"
        class="anchor-btn"
        :class="{
          'is-active': context.state.open.value,
          'is-dragging': isDragging,
        }"
        aria-haspopup="menu"
        :aria-expanded="context.state.open.value"
        @pointerdown="emit('pointerdown', $event)"
      >
        <svg
          class="anchor-btn__drag-icon"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
        <span>Actions</span>
        <span class="anchor-btn__chevron">▾</span>
      </button>
    </div>

    <div
      v-if="context.state.open.value"
      ref="floatingEl"
      role="menu"
      tabindex="-1"
      class="floating-panel panel-menu"
      :style="position.styles.value"
    >
      <div
        v-for="item in menuItems"
        :key="item.id"
        role="menuitem"
        class="menu-item"
        :class="{
          'is-active': menuCollection.activeValue.value === item.id,
          'is-danger': item.danger,
        }"
        @mouseenter="menuCollection.setActiveValue(item.id)"
        @click="context.state.setOpen(false)"
      >
        <span class="menu-item__label">{{ item.label }}</span>
        <kbd class="menu-item__shortcut">{{ item.shortcut }}</kbd>
      </div>

      <div
        v-if="enableArrow"
        ref="arrowEl"
        :class="['floating-arrow', `floating-arrow--${side}`]"
        :style="arrowStyles"
      />
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
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: grab;
  box-shadow: var(--vp-shadow-1, 0 2px 8px rgba(0, 0, 0, 0.05));
  user-select: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.anchor-btn:hover .anchor-btn__drag-icon {
  color: var(--vp-c-brand-1);
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
}

.anchor-btn__chevron {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: var(--vp-shadow-3, 0 10px 30px rgba(0, 0, 0, 0.12));
  border-radius: 8px;
}

.panel-menu {
  width: 180px;
  max-width: calc(100% - 16px);
  padding: 0.3rem;
  border-radius: 8px;
  outline: none;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.55rem;
  border-radius: 5px;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 0.1s ease;
}

.menu-item:hover,
.menu-item.is-active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

.menu-item.is-danger {
  color: var(--vp-c-danger-1, var(--vp-c-red-1, #e5484d));
}

.menu-item.is-danger:hover,
.menu-item.is-danger.is-active {
  background: var(--vp-c-danger-soft, var(--vp-c-red-soft, rgba(229, 72, 77, 0.1)));
  color: var(--vp-c-danger-1, var(--vp-c-red-1, #e5484d));
}

.menu-item__shortcut {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}
</style>
