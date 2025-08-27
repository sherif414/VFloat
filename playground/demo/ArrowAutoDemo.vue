<script setup lang="ts">
import { ref } from "vue"
import { useFloating, offset, flip, shift } from "@/composables"
import { useArrow } from "@/composables/use-arrow"
import type { Placement } from "@floating-ui/dom"

interface ArrowAutoDemoProps {
  placement?: Placement
}

const buttonRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

// Notice: No need to add arrow middleware manually!
const context = useFloating(buttonRef, tooltipRef, {
  placement: "bottom",
  open: ref(true),
  middlewares: [offset(8), flip(), shift()], // arrow is auto-registered
})

// Arrow middleware is automatically registered
const { arrowStyles } = useArrow(arrowRef, context, {
  offset: "-4px",
})
</script>

<template>
  <div class="demo-container">
    <h3>Auto-Registration Arrow Demo</h3>
    <p>
      This demo shows the new auto-registration pattern where the arrow middleware is automatically
      added when you provide an element to useArrow.
    </p>

    <button ref="buttonRef" class="demo-button">Hover me (Auto Arrow)</button>

    <div ref="tooltipRef" class="tooltip" :style="context.floatingStyles.value">
      <div class="tooltip-content">
        Auto-registered arrow tooltip!
        <br />
        <small>Placement: bottom</small>
      </div>

      <!-- Arrow element with auto-computed styles -->
      <div ref="arrowRef" class="arrow" :style="arrowStyles" />
    </div>
  </div>
</template>

<style scoped>
.demo-container {
  padding: 20px;
  margin: 20px 0;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.demo-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: transform 0.2s;
}

.demo-button:hover {
  transform: translateY(-2px);
}

.tooltip {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 250px;
}

.tooltip-content {
  position: relative;
  z-index: 1;
}

.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(0, 0, 0, 0.9);
  transform: rotate(45deg);
  z-index: -1;
}
</style>
