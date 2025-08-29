<script setup lang="ts">
import { offset, useFloating } from "v-float"
import { computed, ref } from "vue"

type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const isOpen = ref(true)
const currentPlacement = ref<Placement>("top")

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

const { floatingStyles, update } = useFloating(anchorEl, floatingEl, {
  placement: currentPlacement,
  open: isOpen,
  middlewares: [offset(10)],
})

function selectPlacement(placement: Placement) {
  currentPlacement.value = placement
  update()
}
</script>

<template>
  <div class="placement-demo">
    <div class="controls">
      <h3>Placement Options</h3>
      <div class="placement-grid">
        <button
          v-for="placement in placements"
          :key="placement"
          @click="selectPlacement(placement)"
          :class="['placement-button', { active: currentPlacement === placement }]"
        >
          {{ placement }}
        </button>
      </div>
    </div>

    <div class="demo-area">
      <div class="anchor-container">
        <div ref="anchorEl" class="anchor">
          Anchor Element
        </div>
        
        <div
          v-if="isOpen"
          ref="floatingEl"
          :style="floatingStyles"
          class="floating"
        >
          {{ currentPlacement }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placement-demo {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.placement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.placement-button {
  padding: 0.5rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.placement-button:hover {
  background: #e5e7eb;
}

.placement-button.active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.demo-area {
  position: relative;
  height: 400px;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9fafb;
}

.anchor-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.anchor {
  padding: 1.5rem 2rem;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.floating {
  position: absolute;
  padding: 0.75rem 1.25rem;
  background: #1f2937;
  color: white;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
}
</style>
