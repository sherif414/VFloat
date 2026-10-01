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

const node = useFloatingNode({
  anchorEl,
  floatingEl,
  arrowEl,
});

const position = usePosition(node, {
  placement: computed(() => props.placement),
  middlewares: {
    offset: 8,
    flip: { padding: 8 },
    shift: { padding: 8 },
  },
});

useArrow(node, {
  offset: "-5px",
});

const side = computed(
  () => (position.placement.value.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right",
);

watch(
  () => props.keepOpen,
  (keep) => {
    node.open.value = keep;
  },
  { immediate: true },
);

useHover(node, {
  enabled: () => !props.keepOpen,
  delay: 0,
});

useFocus(node, {
  enabled: () => !props.keepOpen,
});

useClick(node, {
  enabled: () => !props.keepOpen,
});

useOutsideClick(node, {
  enabled: () => !props.keepOpen,
});

useRole(node, {
  role: "tooltip",
});

defineExpose({
  node,
  context: node,
  position,
  update: () => position.update(),
});
</script>

<template>
  <div class="contents">
    <div
      class="relative touch-none z-[5]"
      :style="{ transform: `translate(${anchorOffset.x}px, ${anchorOffset.y}px)` }"
    >
      <button
        ref="anchorEl"
        type="button"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-md bg-elevated text-highlighted text-[13px] font-medium cursor-grab select-none touch-none shadow-xs outline-none transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        :class="
          isDragging
            ? 'cursor-grabbing border-primary shadow-md'
            : 'border-default hover:border-muted'
        "
        @pointerdown="emit('pointerdown', $event)"
      >
        <span>Interactive Anchor</span>
      </button>
    </div>

    <div
      v-if="node.open.value"
      ref="floatingEl"
      role="tooltip"
      class="absolute top-0 left-0 z-20 inline-flex items-center gap-2 px-2.5 py-1.5 border border-default bg-elevated text-highlighted shadow-md rounded-md text-xs font-medium whitespace-nowrap pointer-events-none select-none"
    >
      <span class="text-highlighted">Copy link to clipboard</span>
      <kbd
        class="text-[11px] font-mono px-1 py-0.5 border border-default rounded-[3px] bg-muted text-toned"
        >⌘C</kbd
      >
      <div
        ref="arrowEl"
        class="absolute size-2 bg-elevated rotate-45 border border-default"
        :class="{
          'border-t-0 border-l-0': side === 'top',
          'border-b-0 border-r-0': side === 'bottom',
          'border-l-0 border-b-0': side === 'left',
          'border-r-0 border-t-0': side === 'right',
        }"
      />
    </div>
  </div>
</template>
