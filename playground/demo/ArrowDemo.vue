<script setup lang="ts">
import { ref } from "vue"
import { useFloating, offset, flip, shift, arrow, useHover } from "@/composables"
import { useArrow } from "@/composables/use-arrow"
import type { Placement } from "@floating-ui/dom"

interface ArrowDemoProps {
  placement?: Placement
}

const props = withDefaults(defineProps<ArrowDemoProps>(), {
  placement: "top",
})

const buttonRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

const context = useFloating(buttonRef, tooltipRef, {
  placement: props.placement,
  open: ref(true),
  middlewares: [offset(8), flip(), shift(), arrow({ element: arrowRef })],
})

// useHover(context)
const { arrowStyles } = useArrow(context, { offset: "-4px" })
</script>

<template>
  <div class="relative flex items-center justify-center p-20">
    <button
      ref="buttonRef"
      class="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 font-medium text-white shadow-md transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95"
    >
      Hover Me
    </button>

    <div
      v-if="context.open.value"
      ref="tooltipRef"
      :style="context.floatingStyles.value"
      class="z-50 rounded bg-gray-800 p-2 text-white shadow-lg"
    >
      This is a tooltip!
      <div
        ref="arrowRef"
        :style="[arrowStyles, { transform: 'rotate(45deg)' }]"
        class="absolute z-10 h-2 w-2 bg-gray-800"
      ></div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles here if needed */
</style>
