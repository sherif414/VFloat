<script setup lang="ts">
import { useClick, useDismiss, useFloating, useFocus } from "@/composables"
import { ref } from "vue"
import type { UseDismissProps } from "@/composables/interactions/use-dismiss"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const floating = useFloating(anchorEl, floatingEl)

const dismissOptions = {
  escapeKey: true,
  outsidePress: true,
  anchorPress: false,
  ancestorScroll: false,
}

useClick(floating)
useDismiss(floating, dismissOptions)
// useFocus(floating)
</script>

<template>
  <div class="h-300px"></div>
  <div class="demo-container">
    <button ref="anchorEl" class="demo-anchor">Click, Focus, or Dismiss me!</button>

    <div
      v-if="floating.open.value"
      ref="floatingEl"
      :style="floating.floatingStyles.value"
      class="demo-floating"
    >
      This tooltip opens on click/focus
    </div>
  </div>
</template>

<style>
body {
  height: 200vh;
}

.demo-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.demo-anchor {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
}

.demo-floating {
  background: #1f2937;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  max-width: 200px;
  position: absolute;
  z-index: 50;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
