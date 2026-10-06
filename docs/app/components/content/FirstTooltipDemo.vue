<script setup lang="ts">
import { useFloatingNode, useHover, usePosition } from "v-float";
import { ref } from "vue";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 8,
  },
});

useHover(node);
</script>

<template>
  <div class="relative flex items-center justify-center">
    <button
      ref="anchorEl"
      class="inline-flex items-center gap-2 px-3.5 py-2 border border-default rounded-lg bg-elevated text-highlighted text-sm font-medium cursor-pointer select-none touch-manipulation shadow-xs hover:border-primary hover:bg-muted hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition-all duration-150"
      type="button"
    >
      Save changes
    </button>

    <div
      v-if="node.open.value"
      ref="floatingEl"
      class="inline-flex items-center gap-2 px-3 py-1.5 border border-default rounded-lg bg-elevated text-highlighted text-[13px] font-medium leading-snug whitespace-nowrap shadow-lg pointer-events-none z-20"
      role="tooltip"
    >
      <span>This button saves your changes.</span>
    </div>
  </div>
</template>
