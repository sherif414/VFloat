<script lang="ts" setup>
import { flip, offset, shift, useArrow, useFloating } from "v-float"
import { ref, useTemplateRef } from "vue"

const anchorEl = useTemplateRef("anchorEl")
const floatingEl = useTemplateRef("floatingEl")
const arrowEl = useTemplateRef("arrowEl")

const middlewares = [
  offset(4),
  flip({
    fallbackAxisSideDirection: "end",
    padding: 5,
  }),
  shift({ padding: 5 }),
]

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom",
  open: ref(true),
  middlewares,
})

const { arrowStyles } = useArrow(arrowEl, context, { padding: 4 })
</script>

<template>
  <div
    class="w-full border border-dashed border-gray-200 h-[20rem] overflow-hidden grid place-items-center overflow-y-auto relative"
  >
    <div class="flex flex-col items-center gap-4 w-full h-800px rounded-md overflow-y-auto">
      <div class="h-150px"></div>
      <button
        ref="anchorEl"
        class="px-6 py-3 light:outline-size-2 light:outline light:outline-gray-300 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg font-medium border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/20"
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
        ref="arrowEl"
        :style="{ ...arrowStyles }"
        class="absolute w-2 h-2 bg-red-800 rotate-45"
      />
    </div>
  </div>
</template>
