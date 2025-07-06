<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { offset } from "@floating-ui/dom"
import { useFloating, useHover } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const polygonPoints = ref<Array<[number, number]>>([])

const context = useFloating(anchorEl, floatingEl, {
  placement: "right",
  middlewares: [offset(10)],
})

useHover(context, {
  safePolygon: {
    onPolygonChange: (points) => {
      polygonPoints.value = points
    },
  },
})

const svgPoints = computed(() => {
  return polygonPoints.value.map((point) => point.join(",")).join(" ")
})

watch(context.open, (isOpen) => {
  if (!isOpen) {
    polygonPoints.value = []
  }
})
</script>

<template>
  <div class="safe-polygon-demo">
    <p>
      The floating element should remain open when moving the mouse between the reference and the
      floater.
    </p>
    <div class="container">
      <button ref="anchorEl" class="reference">Hover me</button>
      <div
        v-if="context.open.value"
        ref="floatingEl"
        class="floating"
        :style="context.floatingStyles.value"
      >
        Floating Element
      </div>
    </div>

    <svg v-if="context.open.value && svgPoints" class="polygon-svg">
      <polygon :points="svgPoints" />
    </svg>
  </div>
</template>

<style scoped>
.safe-polygon-demo {
  font-family: sans-serif;
  text-align: center;
  padding: 2rem;
  position: relative;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.container {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
  position: relative;
  /* Create a gap to test safePolygon */
  gap: 50px;
  position: relative;
  z-index: 1;
}

.reference {
  background-color: #3b82f6;
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.floating {
  background-color: #1f2937;
  color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  width: 200px;
  z-index: 1;
}

.polygon-svg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
}

.polygon-svg polygon {
  fill: rgba(239, 68, 68, 0.2);
  stroke: rgba(239, 68, 68, 0.5);
  stroke-width: 2;
}
</style>
