<script setup lang="ts">
import type { Placement } from "v-float";
import {
  useArrow,
  useClick,
  useFloatingNode,
  useFocus,
  useHover,
  useOutsideClick,
  usePosition,
  useRole,
} from "v-float";
import { computed, shallowRef, watch } from "vue";

const props = withDefaults(
  defineProps<{
    placement: Placement;
    anchorOffset: { x: number; y: number };
    isDragging: boolean;
    keepOpen?: boolean;
  }>(),
  {
    keepOpen: false,
  },
);

const emit = defineEmits<{
  (e: "pointerdown", event: PointerEvent): void;
}>();

const anchorEl = shallowRef<HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);
const arrowEl = shallowRef<HTMLElement | null>(null);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
  arrowEl,
});

const position = usePosition(context, {
  placement: computed(() => props.placement),
  middlewares: {
    offset: 8,
    flip: { padding: 8 },
    shift: { padding: 8 },
  },
});

useArrow(context, {
  offset: "-5px",
});

const side = computed(
  () => (position.placement.value.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right",
);

watch(
  () => props.keepOpen,
  (keep) => {
    context.open.value = keep;
  },
  { immediate: true },
);

useHover(context, {
  enabled: () => !props.keepOpen,
  delay: 0,
});

useFocus(context, {
  enabled: () => !props.keepOpen,
});

useClick(context, {
  enabled: () => !props.keepOpen,
});

useOutsideClick(context, {
  enabled: () => !props.keepOpen,
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
        <span class="anchor-btn__label">Interactive Anchor</span>
      </button>
    </div>

    <div
      v-if="context.open.value"
      ref="floatingEl"
      role="tooltip"
      class="floating-panel panel-tooltip"
    >
      <span class="tooltip-text">Copy link to clipboard</span>
      <kbd class="shortcut-tag">⌘C</kbd>
      <div ref="arrowEl" :class="['floating-arrow', `floating-arrow--${side}`]" />
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
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
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

.anchor-btn.is-dragging {
  cursor: grabbing;
  border-color: var(--vp-c-brand-text, #18794e);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.floating-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-radius: 6px;
}

.panel-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none !important;
  user-select: none !important;
}

.tooltip-text {
  color: var(--vp-c-text-1);
}

.shortcut-tag {
  font-size: 0.6875rem;
  font-family: var(--vp-font-family-mono, monospace);
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

/* Arrow */
.floating-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--vp-c-bg-elv);
  transform: rotate(45deg);
  border: 1px solid var(--vp-c-divider);
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
