<template>
  <div class="demo-preview">
    <div class="tooltip-demo">
      <button ref="tooltipTrigger" class="demo-button">Hover me</button>
      <Teleport to="body">
        <div
          v-if="tooltipContext.open.value"
          ref="tooltipFloating"
          :style="tooltipContext.floatingStyles.value"
        >
          <div
            v-show="tooltipContext.isPositioned.value"
            class="tooltip floating-element"
          >
            This tooltip is perfectly positioned!
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from "vue";
import { useFloating, useHover, useFocus, useDismiss, offset } from "v-float";

const tooltipTrigger = useTemplateRef("tooltipTrigger");
const tooltipFloating = useTemplateRef("tooltipFloating");

const tooltipContext = useFloating(tooltipTrigger, tooltipFloating, {
  placement: "top",
  middlewares: [offset(4)],
});

useHover(tooltipContext);
useFocus(tooltipContext);
</script>

<style scoped>
.demo-preview {
  position: relative;
}

.demo-button {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-button:hover {
  border-color: var(--vp-c-text-1);
}

.floating-element {
  z-index: 1000;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px) translateX(-50%);
  }

  to {
    opacity: 1;
    transform: translateY(0) translateX(-50%);
  }
}

.tooltip {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip::before {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--vp-c-text-1);
}
</style>
