<script lang="ts" setup>
import { useTemplateRef } from "vue"
import { offset, useFloating, useHover } from "v-float"

const anchorEl = useTemplateRef("anchorEl")
const floatingEl = useTemplateRef("floatingEl")

const context = useFloating(anchorEl, floatingEl, { 
  placement: "top", 
  middlewares: [offset(8)] 
})

useHover(context)
</script>

<template>
  <div class="bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
    <button
      ref="anchorEl"
      class="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-medium border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      Hover me
    </button>

    <div
      v-if="context.open.value"
      ref="floatingEl"
      :style="context.floatingStyles.value"
    >
    
    <!-- Content -->
    <div class="relative z-50 bg-gray-900 dark:bg-gray-700 text-white text-sm px-4 py-3 rounded-lg max-w-xs border border-gray-800 dark:border-gray-600">
      This is a clean, minimal tooltip
    </div>
      <!-- Arrow -->
      <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-gray-700 border-r border-b border-gray-800 dark:border-gray-600 rotate-45"></div>
    </div>
  </div>
</template>