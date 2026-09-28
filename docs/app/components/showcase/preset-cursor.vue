<script setup lang="ts">
import type { Placement, UsePositionMiddlewaresOptions, VirtualElement } from "v-float";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useClientPoint, useFloatingNode, usePosition } from "v-float";

interface Props {
  placement: Placement;
  middlewareConfig: UsePositionMiddlewaresOptions;
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
const cursorBoundary = shallowRef<HTMLElement | null>(null);

const touchX = ref<number | null>(null);
const touchY = ref<number | null>(null);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
});

onMounted(() => {
  cursorBoundary.value = trackingAreaEl.value;
});

const cursorMiddlewares = computed(() => {
  const boundary = cursorBoundary.value ?? undefined;
  const padding = 8;

  return {
    offset: props.middlewareConfig.offset ?? 8,
    flip:
      props.middlewareConfig.flip !== false
        ? {
            boundary,
            padding,
          }
        : false,
    shift:
      props.middlewareConfig.shift !== false
        ? {
            boundary,
            padding,
            crossAxis: true,
          }
        : false,
  };
});

const position = usePosition(context, {
  placement: computed(() => props.placement),
  middlewares: cursorMiddlewares,
});

const { coordinates } = useClientPoint(context, {
  trackingAreaEl,
  trackingMode: "follow",
  x: touchX,
  y: touchY,
  enabled: () => props.isActive,
});

function clampToTrackingArea(clientX: number, clientY: number): { x: number; y: number } {
  const el = trackingAreaEl.value;
  if (!el) return { x: clientX, y: clientY };

  const rect = el.getBoundingClientRect();
  const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
  const clampedY = Math.max(rect.top, Math.min(rect.bottom, clientY));

  return { x: clampedX, y: clampedY };
}

let rafId: number | null = null;
let pendingPoint: { x: number; y: number } | null = null;

function applyPendingPointer() {
  rafId = null;
  if (!pendingPoint || !props.isActive) return;

  const { x, y } = clampToTrackingArea(pendingPoint.x, pendingPoint.y);
  touchX.value = x;
  touchY.value = y;
  if (!context.open.value) {
    context.open.value = true;
  }
  void position.update();
}

watch(
  () => [coordinates.value.x, coordinates.value.y],
  ([x, y]) => {
    if (x != null && y != null && props.isActive && !context.open.value) {
      context.open.value = true;
    }
  },
);

watch(
  () => [props.keepOpen, props.isActive],
  ([keep, active]) => {
    if (active && keep) {
      context.open.value = true;
    } else {
      context.open.value = false;
      touchX.value = null;
      touchY.value = null;
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

function onPointerEnter() {
  if (props.isActive && coordinates.value.x != null && coordinates.value.y != null) {
    context.open.value = true;
    void position.update();
  }
}

function onPointerLeave(e: PointerEvent) {
  if (e.pointerType === "touch") return;
  if (!props.keepOpen) {
    context.open.value = false;
  }
}

function onPointerDown(e: PointerEvent) {
  if (!props.isActive) return;
  if (e.pointerType === "touch") {
    const target = e.currentTarget as HTMLElement | null;
    if (target?.setPointerCapture) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    const { x, y } = clampToTrackingArea(e.clientX, e.clientY);
    touchX.value = x;
    touchY.value = y;
    context.open.value = true;
    void position.update();
  }
}

function onPointerMove(e: PointerEvent) {
  if (!props.isActive) return;
  if (e.pointerType === "touch") {
    pendingPoint = { x: e.clientX, y: e.clientY };
    if (rafId === null) {
      rafId = requestAnimationFrame(applyPendingPointer);
    }
  }
}

function onPointerUp(e: PointerEvent) {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingPoint = null;

  if (e.pointerType === "touch") {
    const target = e.currentTarget as HTMLElement | null;
    if (target?.releasePointerCapture) {
      try {
        if (target.hasPointerCapture(e.pointerId)) {
          target.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
    if (!props.keepOpen) {
      context.open.value = false;
      touchX.value = null;
      touchY.value = null;
    }
  }
}

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});

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
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Touch guidance prompt (visible before interaction on touch devices) -->
    <div v-if="!context.open.value" class="cursor-touch-prompt" aria-hidden="true">
      <div class="touch-prompt-dot" />
      <span class="touch-prompt-text">Touch &amp; drag anywhere to track</span>
    </div>

    <div
      v-if="context.open.value && coordinates.x !== null"
      ref="floatingEl"
      class="floating-panel panel-cursor"
      :style="[
        position.styles.value,
        {
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        },
      ]"
    >
      <span class="panel-cursor__indicator" />
      <span class="panel-cursor__coords">
        <span class="coord-item">
          <span class="coord-label">x:</span>
          <span class="coord-num">{{ Math.round(coordinates.x ?? 0) }}</span>
          <span class="coord-unit">px</span>
        </span>
        <span class="coord-sep">,</span>
        <span class="coord-item">
          <span class="coord-label">y:</span>
          <span class="coord-num">{{ Math.round(coordinates.y ?? 0) }}</span>
          <span class="coord-unit">px</span>
        </span>
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
  -webkit-tap-highlight-color: transparent;
}

.cursor-touch-prompt {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
  font-weight: 500;
  user-select: none;
  text-align: center;
}

.touch-prompt-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px dashed var(--vp-c-brand-1);
  opacity: 0.6;
  animation: prompt-pulse 2s ease-in-out infinite;
}

@keyframes prompt-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.9;
  }
}

@media (hover: none) and (pointer: coarse) {
  .cursor-touch-prompt {
    display: flex;
  }
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
  justify-content: center;
  width: 184px;
  height: 28px;
  box-sizing: border-box;
  gap: 0.45rem;
  padding: 0 0.6rem;
  border-radius: 6px;
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  font-size: 0.76rem;
  font-family: var(--vp-font-family-mono, monospace);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.panel-cursor * {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

@media (pointer: coarse), (max-width: 640px) {
  .panel-cursor {
    width: 184px;
    height: 30px;
    font-size: 0.78rem;
  }
}

.panel-cursor__indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 6px var(--vp-c-brand-soft, rgba(66, 184, 131, 0.4));
  flex-shrink: 0;
}

.panel-cursor__coords {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}

.coord-item {
  display: inline-flex;
  align-items: center;
  gap: 0.12rem;
}

.coord-label {
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.coord-num {
  display: inline-block;
  min-width: 3ch;
  text-align: right;
  color: var(--vp-c-text-1);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.coord-unit {
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
}

.coord-sep {
  color: var(--vp-c-text-3);
  margin-right: 0.1rem;
}
</style>
