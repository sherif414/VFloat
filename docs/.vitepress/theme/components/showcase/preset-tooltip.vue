<script setup lang="ts">
import type { Placement, UsePositionMiddlewareOptions } from "v-float";
import { computed, shallowRef, watch } from "vue";
import { useArrow, useFloatingContext, useFocus, useHover, usePosition, useRole } from "v-float";

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

useHover(context, {
  enabled: () => props.isActive && !props.keepOpen,
  delay: { open: 80, close: 120 },
});

useFocus(context, {
  enabled: () => props.isActive && !props.keepOpen,
});

useRole(context, {
  role: "tooltip",
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
        :class="{ 'is-dragging': isDragging }"
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
        <span>Hover me</span>
      </button>
    </div>

    <div
      v-if="context.state.open.value"
      ref="floatingEl"
      role="tooltip"
      class="floating-panel panel-tooltip"
      :style="position.styles.value"
    >
      <span>Copy link to clipboard</span>
      <kbd class="shortcut-tag">⌘C</kbd>
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

.panel-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
}

.shortcut-tag {
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono, monospace);
  padding: 0.08rem 0.3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}
</style>
