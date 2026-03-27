<script lang="ts" setup>
import { offset, useFloating, useHover } from "v-float";
import { useTemplateRef } from "vue";

const anchorEl = useTemplateRef("anchorEl");
const floatingEl = useTemplateRef("floatingEl");

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});

useHover(context);
</script>

<template>
  <div>
    <button
      ref="anchorEl"
      class="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
    >
      Hover me
    </button>

    <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
      <!-- Content -->
      <div
        class="relative z-50 bg-gray-900 dark:bg-gray-700 text-white text-sm px-4 py-3 rounded-lg max-w-xs border border-gray-800 dark:border-gray-600"
      >
        This is a tooltip
      </div>
      <!-- Arrow -->
      <div
        class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-gray-700 border-r border-b border-gray-800 dark:border-gray-600 rotate-45"
      ></div>
    </div>
  </div>
</template>
