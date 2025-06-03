<script setup lang="ts">
import { arrow, flip, offset, shift, useArrow, useFloating } from "v-float"
import { ref } from "vue"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

const middlewares = [
  offset(4),
  flip({
    fallbackAxisSideDirection: "end",
    padding: 5,
  }),
  shift({ padding: 5 }),
  arrow({ element: arrowRef }),
]

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom",
  open: ref(true),
  middlewares,
})

const { arrowStyles } = useArrow(context)
</script>

<template>
  <div
    class="border border-dashed border-gray-200 h-[20rem] overflow-hidden grid place-items-center overflow-y-auto relative"
  >
    <div class="flex flex-col items-center gap-4 w-full h-800px rounded-md overflow-y-auto">
      <div class="h-150px"></div>
      <button
        ref="anchorEl"
        class="px-4 py-2 bg-black text-white rounded cursor-pointer text-base whitespace-nowrap transition-colors duration-200 hover:bg-black-800"
      >
        (with middleware)
      </button>
    </div>

    <div
      ref="floatingEl"
      :style="{ ...context.floatingStyles.value }"
      class="bg-gray-800 text-white px-4 py-3 rounded-md text-sm max-w-xs shadow-lg"
    >
      Tooltip
      <div
        ref="arrowRef"
        class="absolute w-2 h-2 bg-red-800 rotate-45"
        :style="{ ...arrowStyles }"
      />
    </div>
  </div>
</template>
