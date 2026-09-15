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
  <div class="tooltip-demo">
    <button ref="anchorEl" class="tooltip-demo__button" type="button">
      Save changes
    </button>

    <div
      v-if="node.open.value"
      ref="floatingEl"
      class="tooltip-demo__floating"
      role="tooltip"
    >
      <span>This button saves your changes.</span>
    </div>
  </div>
</template>

<style>
.tooltip-demo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.tooltip-demo__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  box-shadow: var(--vp-shadow-1, 0 1px 2px rgba(0, 0, 0, 0.04));
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tooltip-demo__button:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  box-shadow: var(--vp-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.08));
}

.tooltip-demo__button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.tooltip-demo__floating {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: var(--vp-shadow-3, 0 10px 30px rgba(0, 0, 0, 0.12));
  pointer-events: none;
  z-index: 20;
}
</style>
