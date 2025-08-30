<template>
  <div class="demo-preview">
    <div class="middleware-demo">
      <div class="controls">
        <div class="control-group">
          <label class="control-label">Placement:</label>
          <select v-model="placement" class="control-select">
            <option v-for="p in placements" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="control-group">
          <label class="control-label">Middleware:</label>
          <div class="checkbox-group">
            <label class="checkbox-item">
              <input v-model="enabledMiddleware.offset" type="checkbox" />
              <span>Offset ({{ offsetValue }}px)</span>
            </label>
            <label class="checkbox-item">
              <input v-model="enabledMiddleware.flip" type="checkbox" />
              <span>Flip</span>
            </label>
            <label class="checkbox-item">
              <input v-model="enabledMiddleware.shift" type="checkbox" />
              <span>Shift</span>
            </label>
            <label class="checkbox-item">
              <input v-model="enabledMiddleware.arrow" type="checkbox" />
              <span>Arrow</span>
            </label>
          </div>
        </div>
      </div>

      <div class="demo-area">
        <button ref="triggerRef" class="demo-trigger" @click="toggleTooltip">
          {{ isOpen ? "Hide" : "Show" }} Tooltip
        </button>

        <Teleport to="body">
          <div
            v-if="floatingContext.open.value"
            ref="floatingRef"
            :style="floatingContext.floatingStyles.value"
            class="tooltip floating-element"
          >
            <div v-show="floatingContext.isPositioned.value" class="tooltip-content">
              <div class="tooltip-header">Middleware Demo</div>
              <div class="tooltip-body">
                <div class="placement-info">
                  Placement: <code>{{ floatingContext.placement.value }}</code>
                </div>
                <div class="middleware-info">
                  Active middleware:
                  <ul class="middleware-list">
                    <li v-if="enabledMiddleware.offset">offset({{ offsetValue }})</li>
                    <li v-if="enabledMiddleware.flip">flip()</li>
                    <li v-if="enabledMiddleware.shift">shift({{ shiftPadding }}px padding)</li>
                    <li v-if="enabledMiddleware.arrow">arrow()</li>
                  </ul>
                </div>
              </div>
              <div
                v-if="enabledMiddleware.arrow"
                ref="arrowRef"
                :style="arrowStyles"
                class="tooltip-arrow"
              ></div>
            </div>
          </div>
        </Teleport>
      </div>

      <div class="info-panel">
        <h4>How Middleware Works</h4>
        <div class="middleware-explanations">
          <div class="middleware-item">
            <strong>Offset:</strong> Adds distance between trigger and tooltip
          </div>
          <div class="middleware-item">
            <strong>Flip:</strong> Changes placement when there's insufficient space
          </div>
          <div class="middleware-item">
            <strong>Shift:</strong> Slides tooltip to stay within viewport
          </div>
          <div class="middleware-item">
            <strong>Arrow:</strong> Positions a pointing arrow element
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue"
import { useFloating, useArrow, offset, flip, shift } from "v-float"
import type { Placement, Middleware } from "@floating-ui/dom"

const triggerRef = useTemplateRef("triggerRef")
const floatingRef = useTemplateRef("floatingRef")
const arrowRef = useTemplateRef("arrowRef")

const isOpen = ref(false)
const placement = ref<Placement>("top")
const offsetValue = ref(8)
const shiftPadding = ref(8)

const placements: Placement[] = [
  "top",
  "top-start",
  "top-end",
  "right",
  "right-start",
  "right-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
]

const enabledMiddleware = ref({
  offset: true,
  flip: true,
  shift: true,
  arrow: true,
})

const middlewaresList = computed(() => {
  const mw: Middleware[] = []
  if (enabledMiddleware.value.offset) mw.push(offset(offsetValue.value))
  if (enabledMiddleware.value.flip) mw.push(flip())
  if (enabledMiddleware.value.shift) mw.push(shift({ padding: shiftPadding.value }))
  return mw
})

const floatingContext = useFloating(triggerRef, floatingRef, {
  open: isOpen,
  placement,
  middlewares: middlewaresList.value,
})

const { arrowStyles } = useArrow(arrowRef, floatingContext)

function toggleTooltip() {
  isOpen.value = !isOpen.value
}
</script>

<style scoped>
.demo-preview {
  position: relative;
}

.middleware-demo {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.control-select {
  padding: 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  margin: 0;
}

.demo-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: var(--vp-c-bg-elv);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  position: relative;
}

.demo-trigger {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-trigger:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
}

.floating-element {
  z-index: 1000;
}

.tooltip {
  max-width: 280px;
}

.tooltip-content {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.tooltip-header {
  background: var(--vp-c-brand-1);
  color: white;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
}

.tooltip-body {
  padding: 0.75rem;
}

.placement-info {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

.placement-info code {
  background: var(--vp-c-bg-soft);
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}

.middleware-info {
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

.middleware-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.middleware-list li {
  margin-bottom: 0.25rem;
  font-family: var(--vp-font-family-mono);
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transform: rotate(45deg);
  z-index: -1;
}

.info-panel {
  padding: 1rem;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.info-panel h4 {
  margin: 0 0 0.75rem 0;
  color: var(--vp-c-text-1);
  font-size: 1rem;
}

.middleware-explanations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.middleware-item {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.middleware-item strong {
  color: var(--vp-c-text-1);
}

@media (max-width: 768px) {
  .controls {
    grid-template-columns: 1fr;
  }

  .middleware-explanations {
    grid-template-columns: 1fr;
  }
}
</style>
