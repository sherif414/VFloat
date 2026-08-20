<script setup lang="ts">
import type { Placement, UsePositionMiddlewareOptions } from "v-float";
import { computed, shallowRef, watch } from "vue";
import {
  useArrow,
  useClick,
  useEscapeKey,
  useFloatingContext,
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

useClick(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useOutsideClick(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useEscapeKey(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useRole(context, {
  role: "dialog",
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
        <span>{{ context.state.open.value ? "Close card" : "Open card" }}</span>
      </button>
    </div>

    <div
      v-if="context.state.open.value"
      ref="floatingEl"
      role="dialog"
      aria-modal="false"
      class="floating-panel panel-popover"
      :style="position.styles.value"
    >
      <div class="popover-header">
        <span class="popover-title">Share link</span>
        <button
          type="button"
          class="popover-close-btn"
          aria-label="Close"
          @click="context.state.setOpen(false)"
        >
          ✕
        </button>
      </div>

      <p class="popover-description">
        Anyone with this link will have view permissions for this workspace.
      </p>

      <div class="popover-footer">
        <button
          type="button"
          class="action-btn action-btn--secondary"
          @click="context.state.setOpen(false)"
        >
          Done
        </button>
        <button
          type="button"
          class="action-btn action-btn--primary"
          @click="context.state.setOpen(false)"
        >
          Copy Link
        </button>
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  user-select: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.anchor-btn:hover {
  border-color: var(--vp-c-text-3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.anchor-btn.is-active {
  border-color: var(--vp-c-brand-1, #3eaf7c);
}

.anchor-btn.is-dragging {
  cursor: grabbing;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.anchor-btn__drag-icon {
  color: var(--vp-c-text-3);
  opacity: 0.7;
}

.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv, #fff);
  color: var(--vp-c-text-1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

:root.dark .floating-panel {
  background: #1e1e22;
}

.panel-popover {
  width: 260px;
  padding: 0.85rem;
  border-radius: 10px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.popover-title {
  font-size: 0.85rem;
  font-weight: 600;
}

.popover-close-btn {
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
}

.popover-close-btn:hover {
  color: var(--vp-c-text-1);
}

.popover-description {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.popover-footer {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}

.action-btn {
  padding: 0.32rem 0.65rem;
  border-radius: 6px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-btn--primary {
  border: none;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.action-btn--primary:hover {
  opacity: 0.9;
}

.action-btn--secondary {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
}

.action-btn--secondary:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}
</style>
