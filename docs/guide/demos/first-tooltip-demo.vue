<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(10)],
});

useHover(context);
</script>

<template>
  <div class="tooltip-demo">
    <div class="tooltip-demo__hint">Hover the button</div>

    <button ref="anchorEl" class="tooltip-demo__button" type="button">Save changes</button>

    <div
      v-if="context.state.open.value"
      ref="floatingEl"
      class="tooltip-demo__floating"
      role="tooltip"
      :style="context.position.styles.value"
    >
      This button saves your changes.
    </div>
  </div>
</template>

<style scoped>
.tooltip-demo {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.85rem;
  min-height: 180px;
  padding: 1.75rem 1rem;
}

.tooltip-demo__hint {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.tooltip-demo__button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0.6rem 0.85rem;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.tooltip-demo__button:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.tooltip-demo__button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.tooltip-demo__floating {
  max-width: 240px;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
  text-align: center;
  font-size: 0.92rem;
  line-height: 1.4;
}
</style>
