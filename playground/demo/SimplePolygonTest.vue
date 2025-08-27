<script setup lang="ts">
import { ref } from "vue"
import { offset } from "@floating-ui/dom"
import { useFloating, useHover } from "../../src/composables"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const polygonPoints = ref<Array<[number, number]>>([])

console.log("Setting up test demo")

const context = useFloating(anchorEl, floatingEl, {
  placement: "right",
  middlewares: [offset(10)],
})

console.log("Context created:", context)

useHover(context, {
  safePolygon: {
    buffer: 8,
    onPolygonChange: (points) => {
      console.log("onPolygonChange called with:", points)
      polygonPoints.value = points
    },
  },
})

console.log("useHover configured")

const { open, floatingStyles } = context
</script>

<template>
  <div style="padding: 50px; text-align: center">
    <h2>Simple Safe Polygon Test</h2>
    <p>Open: {{ open }}</p>
    <p>Polygon Points: {{ polygonPoints.length }}</p>

    <div style="margin: 50px">
      <button
        ref="anchorEl"
        style="padding: 20px; background: blue; color: white; border: none; border-radius: 8px"
      >
        Hover me
      </button>

      <div
        v-if="open"
        ref="floatingEl"
        style="background: white; border: 1px solid black; padding: 20px; border-radius: 8px"
        :style="floatingStyles"
      >
        This is the floating element
        <br />
        Polygon points: {{ polygonPoints.length }}
      </div>
    </div>

    <!-- Debug polygon -->
    <svg
      v-if="polygonPoints.length > 0"
      style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 1000;
      "
    >
      <polygon
        :points="polygonPoints.map((p) => p.join(',')).join(' ')"
        style="fill: rgba(255, 0, 0, 0.3); stroke: red; stroke-width: 2"
      />
    </svg>
  </div>
</template>
