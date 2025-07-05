<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useDismiss } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)

// Add dismiss behavior
useDismiss(context, {
  outsidePress: true, // Close when clicking outside
  escapeKey: true, // Close when pressing Escape
})
</script>

<template>
  <button ref="anchorEl" @click="context.setOpen(true)">Open Popup</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value" class="popup">
    Click outside or press Escape to close
  </div>
</template>

<style scoped>
.popup {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
</style> 