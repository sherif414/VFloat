<script lang="ts" setup>
import { useTemplateRef } from "vue"
import { offset, useFloating, useHover } from "v-float"

const anchorEl = useTemplateRef("anchorEl")
const floatingEl = useTemplateRef("floatingEl")

const context = useFloating(anchorEl, floatingEl, { placement: "top", middlewares: [offset(4)] })

useHover(context)
</script>

<template>
  <div class="bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
    <button
      ref="anchorEl"
      class="px-6 py-3 light:outline-size-2 light:outline light:outline-gray-300 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg font-medium border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/20"
    >
      Hover me
    </button>

    <div
      v-if="context.open.value"
      ref="floatingEl"
      :style="{ ...context.floatingStyles.value }"
      class="absolute z-50 bg-gray-900 dark:bg-gray-800 text-white text-sm px-3 py-2 rounded-md max-w-xs shadow-lg border border-gray-700/50 dark:border-gray-600/50"
    >
      This is a tooltip
    </div>
  </div>
</template>
