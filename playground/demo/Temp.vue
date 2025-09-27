<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClientPoint, useHover } from "@/composables"

const tackingArea = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)

// Set up floating positioning
const context = useFloating(ref(null), tooltip)

// set up hover interaction
useHover(context)

// Enable cursor tracking
useClientPoint(tackingArea, context)
</script>

<template>
  <div 
    ref="tackingArea"
    class="hover-area"
  >
    Hover to see tooltip
  </div>

  <div 
    v-if="context.open.value" 
    ref="tooltip" 
    :style="context.floatingStyles.value"
    class="tooltip"
  >
    Cursor: following
  </div>
</template>
<style scoped>
.hover-area {
  display: grid;
  place-items: center;
  width: min(360px, 100%);
  height: 220px;
  margin: 2.5rem auto;
  border-radius: 1rem;
  border: 2px dashed rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.08);
  color: #1f2937;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.01em;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.hover-area:hover,
.hover-area:focus-visible {
  border-color: rgba(59, 130, 246, 0.85);
  background: rgba(59, 130, 246, 0.16);
}

.tooltip {
  position: relative;
  pointer-events: none;
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  background: rgba(17, 24, 39, 0.9);
  color: #ffffff;
  font-size: 0.875rem;
  line-height: 1.2;
  box-shadow: 0 16px 32px -16px rgba(17, 24, 39, 0.45);
  backdrop-filter: blur(6px);
}

.tooltip::after {
  content: \ \;
  position: absolute;
  inset: auto auto -0.45rem 50%;
  width: 0.75rem;
  height: 0.75rem;
  background: inherit;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 0.125rem;
}
</style>
