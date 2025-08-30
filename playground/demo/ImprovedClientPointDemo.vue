<template>
  <div class="demo-container">
    <h2>Improved useClientPoint Demo</h2>
    <p>This demo showcases the enhanced static mode behavior:</p>

    <div class="demo-section">
      <h3>Context Menu (Click-triggered)</h3>
      <p>
        Right-click the element below. The context menu should appear exactly where you clicked,
        even if you moved the mouse beforehand.
      </p>

      <div
        ref="contextMenuTarget"
        class="demo-element context-menu-element"
        @contextmenu.prevent="showContextMenu"
      >
        Right-click me for context menu
      </div>

      <div
        v-if="contextMenuOpen"
        ref="contextMenuFloating"
        class="floating-element context-menu"
        @click="hideContextMenu"
      >
        <div class="menu-item">Copy</div>
        <div class="menu-item">Paste</div>
        <div class="menu-item">Delete</div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Tooltip (Hover-triggered with delay)</h3>
      <p>
        Hover over the element below and stop moving your mouse. After a delay, the tooltip should
        appear at your final mouse position.
      </p>

      <div
        ref="tooltipTarget"
        class="demo-element tooltip-element"
        @mouseenter="startTooltipDelay"
        @mouseleave="hideTooltip"
      >
        Hover me for tooltip
      </div>

      <div v-if="tooltipOpen" ref="tooltipFloating" class="floating-element tooltip">
        This is a tooltip that appears at your cursor position
      </div>
    </div>

    <div class="debug-info">
      <h4>Debug Information</h4>
      <p>Context Menu Coordinates: {{ contextMenuCoords }}</p>
      <p>Tooltip Coordinates: {{ tooltipCoords }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue"
import { useFloating, useClientPoint } from "@/composables"

// Context Menu Setup
const contextMenuTarget = ref<HTMLElement | null>(null)
const contextMenuFloating = ref<HTMLElement | null>(null)
const contextMenuOpen = ref(false)

const contextMenuFloatingContext = useFloating(contextMenuTarget, contextMenuFloating, {
  placement: "bottom-start",
  open: contextMenuOpen,
})

const { coordinates: contextMenuCoords } = useClientPoint(
  contextMenuTarget,
  contextMenuFloatingContext,
  {
    trackingMode: "static",
  }
)

// Tooltip Setup
const tooltipTarget = ref<HTMLElement | null>(null)
const tooltipFloating = ref<HTMLElement | null>(null)
const tooltipOpen = ref(false)

const tooltipFloatingContext = useFloating(tooltipTarget, tooltipFloating, {
  placement: "top",
  open: tooltipOpen,
})

const { coordinates: tooltipCoords } = useClientPoint(tooltipTarget, tooltipFloatingContext, {
  trackingMode: "static",
})

// Context Menu Logic
const showContextMenu = async () => {
  contextMenuOpen.value = true
  await nextTick()
}

const hideContextMenu = () => {
  contextMenuOpen.value = false
}

// Tooltip Logic
let tooltipTimeout: number | undefined

const startTooltipDelay = () => {
  tooltipTimeout = window.setTimeout(() => {
    tooltipOpen.value = true
  }, 500) // 500ms delay
}

const hideTooltip = () => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
    tooltipTimeout = undefined
  }
  tooltipOpen.value = false
}
</script>

<style scoped>
.demo-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.demo-section {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.demo-element {
  display: inline-block;
  padding: 20px 40px;
  margin: 10px;
  border: 2px solid #007acc;
  border-radius: 6px;
  background: #f0f8ff;
  cursor: pointer;
  user-select: none;
}

.context-menu-element {
  border-color: #cc7a00;
  background: #fff8f0;
}

.tooltip-element {
  border-color: #00cc7a;
  background: #f0fff8;
}

.floating-element {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.context-menu {
  min-width: 120px;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.tooltip {
  padding: 8px 12px;
  background: #333;
  color: white;
  font-size: 14px;
  max-width: 200px;
}

.debug-info {
  margin-top: 30px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
</style>
