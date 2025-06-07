<script setup lang="ts">
import { ref } from "vue"
import { useFloating, offset, flip, shift, useHover, useFocus } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const floating = useFloating(anchorEl, floatingEl, {
  placement: "top",
  open: isOpen,
  setOpen: (open: boolean) => {
    isOpen.value = open
  },
  middlewares: [offset(8), flip(), shift()],
})

// Interaction behaviors
useHover(floating, {
  delay: {
    open: 100,
    close: 200,
  },
})

useFocus(floating)
</script>

<template>
  <div class="demo-container">
    <button ref="anchorEl" class="demo-button">Hover or focus me</button>

    <div
      v-if="isOpen"
      ref="floatingEl"
      :style="{ ...floating.floatingStyles.value }"
      class="demo-tooltip"
    >
      Interactive tooltip with hover and focus
      <div class="demo-arrow"></div>
    </div>
  </div>
</template>

<style scoped>
.demo-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.demo-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.demo-button:hover {
  background: #2563eb;
}

.demo-button:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.demo-tooltip {
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

.demo-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #1f2937;
  transform: rotate(45deg);
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
}
</style>
