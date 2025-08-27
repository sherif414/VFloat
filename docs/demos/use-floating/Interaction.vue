<script setup lang="ts">
import { useClick, useFloating, useFocus, useEscapeKey } from "v-float"
import { ref } from "vue"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const floating = useFloating(anchorEl, floatingEl)

useClick(floating)
useEscapeKey(floating, { onEscape: () => floating.setOpen(false) })
useFocus(floating)

</script>

<template>
  <div class="demo-container">
    <button ref="anchorEl" class="demo-anchor">
      Click, Focus, or press Escape to close!
    </button>

    <div
      v-if="floating.open.value"
      ref="floatingEl"
      :style="floating.floatingStyles.value"
      class="demo-floating"
    >
      This tooltip opens on click/focus and closes with escape or outside click.
    </div>
  </div>
</template>

<style scoped>
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
