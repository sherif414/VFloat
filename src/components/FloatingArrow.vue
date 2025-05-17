<script lang="ts">
export interface FloatingArrowProps {
  /** The floating context */
  context: FloatingContext

  /** Width of the arrow */
  width?: number

  /** Height of the arrow */
  height?: number

  /** Radius of the arrow tip */
  tipRadius?: number

  /** Fill color of the arrow */
  fill?: string

  /** Stroke color of the arrow */
  stroke?: string

  /** Stroke width of the arrow */
  strokeWidth?: number

  /** Static offset for the arrow */
  staticOffset?: number | null
}
</script>

<script setup lang="ts">
import { computed } from "vue"
import { useArrow } from "@/composables"
import type { FloatingContext } from "@/composables"

const props = withDefaults(defineProps<FloatingArrowProps>(), {
  width: 14,
  height: 7,
  tipRadius: 0,
  fill: "black",
  stroke: "none",
  strokeWidth: 0,
  staticOffset: null,
})

const { arrowStyles } = useArrow(props.context)

// Generate path for the arrow
const pathData = computed(() => {
  const { width, height, tipRadius } = props

  if (tipRadius > 0) {
    const halfWidth = width / 2
    const arcRadius = tipRadius

    return `M0,${height} L${halfWidth - arcRadius},0 Q${halfWidth},0 ${halfWidth + arcRadius},0 L${width},${height}`
  }

  return `M0,${height} L${width / 2},0 L${width},${height}`
})
</script>

<template>
  <div :style="{
    position: 'absolute', 'pointer-events': 'none', 'width': 'max-content', 'height': 'max-content'
    , ...arrowStyles
  }" class="floating-arrow">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" :fill="fill" :stroke="stroke"
      :stroke-width="strokeWidth">
      <path :d="pathData" />
    </svg>
  </div>
</template>
