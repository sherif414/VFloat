<script setup lang="ts">
import type { Placement, UsePositionMiddlewareOptions, VirtualElement } from "v-float";
import { computed, shallowRef, watch } from "vue";
import { useClientPoint, useFloatingContext, usePosition } from "v-float";

interface Props {
  placement: Placement;
  middlewareConfig: UsePositionMiddlewareOptions;
  isActive: boolean;
  keepOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keepOpen: false,
});

const emit = defineEmits<{
  (e: "update:resolvedPlacement", placement: Placement): void;
}>();

const trackingAreaEl = shallowRef<HTMLElement | null>(null);
const anchorEl = shallowRef<VirtualElement | HTMLElement | null>(null);
const floatingEl = shallowRef<HTMLElement | null>(null);

const context = useFloatingContext({
  anchorEl,
  floatingEl,
  defaultOpen: false,
});

const position = usePosition(context, {
  placement: computed(() => props.placement),
  middleware: computed(() => props.middlewareConfig),
});

const { coordinates } = useClientPoint(context, {
  trackingAreaEl,
  trackingMode: "follow",
  enabled: () => props.isActive,
});

watch(
  () => [coordinates.value.x, coordinates.value.y],
  ([x, y]) => {
    if (x != null && y != null && props.isActive) {
      if (!context.state.open.value) {
        context.state.setOpen(true);
      }
      void position.update();
    }
  },
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
  () => props.isActive,
  (active) => {
    if (!active) {
      context.state.setOpen(false);
    }
  },
);

watch(
  position.placement,
  (val) => {
    emit("update:resolvedPlacement", val);
  },
  { immediate: true },
);

function onPointerEnter() {
  if (props.isActive && coordinates.value.x != null && coordinates.value.y != null) {
    context.state.setOpen(true);
    void position.update();
  }
}

function onPointerLeave() {
  if (!props.keepOpen) {
    context.state.setOpen(false);
  }
}

defineExpose({
  context,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div
    ref="trackingAreaEl"
    class="cursor-zone"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <div
      v-if="context.state.open.value && coordinates.x !== null"
      ref="floatingEl"
      class="floating-panel panel-cursor"
      :style="position.styles.value"
    >
      <span class="panel-cursor__indicator" />
      <span class="panel-cursor__coords">
        x: {{ Math.round(coordinates.x ?? 0) }}px, y: {{ Math.round(coordinates.y ?? 0) }}px
      </span>
    </div>
  </div>
</template>

<style scoped>
.cursor-zone {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  touch-action: none;
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

.panel-cursor {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  pointer-events: none;
  font-size: 0.76rem;
  font-family: var(--vp-font-family-mono, monospace);
}

.panel-cursor__indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 6px var(--vp-c-brand-soft, rgba(66, 184, 131, 0.4));
}

.panel-cursor__coords {
  color: var(--vp-c-text-2);
}
</style>
