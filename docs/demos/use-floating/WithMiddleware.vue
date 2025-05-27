<script setup lang="ts">
import { ref, computed } from "vue"
import { useFloating, offset, shift, flip, arrow as arrowMiddleware } from "v-float"

const anchorEl = ref<HTMLElement>()
const floatingEl = ref<HTMLElement>()
const arrowRef = ref<HTMLElement>()
const isOpen = ref(false)

const middleware = computed(() => [
  offset(12),
  flip({
    fallbackAxisSideDirection: "end",
    padding: 5,
  }),
  shift({ padding: 5 }),
  arrowMiddleware({ element: arrowRef }),
])

const { floatingStyles, isPositioned, middlewareData, placement, update } = useFloating(
  anchorEl,
  floatingEl,
  {
    placement: "top",
    open: isOpen,
    onOpenChange: (open) => {
      isOpen.value = open
    },
    middlewares: middleware,
  }
)

const arrowStyles = computed(() => {
  if (!middlewareData.value.arrow) return {}

  const { x, y } = middlewareData.value.arrow
  const staticSide =
    {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[placement.value.split("-")[0]] || "bottom"

  return {
    left: x != null ? `${x}px` : "",
    top: y != null ? `${y}px` : "",
    [staticSide]: "-4px",
  }
})

function toggleTooltip() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    update()
  }
}
</script>

<template>
  <div class="demo-container">
    <div class="demo-scrollable">
      <div class="demo-spacer"></div>

      <button ref="anchorEl" @click="toggleTooltip" class="demo-button">
        Click me (with middleware)
      </button>

      <div class="demo-spacer"></div>
    </div>

    <div v-if="isPositioned" ref="floatingEl" :style="floatingStyles" class="demo-tooltip">
      Tooltip with middleware
      <div ref="arrowRef" class="demo-arrow" :style="arrowStyles" />
    </div>
  </div>
</template>

<style scoped>
.demo-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
  min-height: 200px;
  align-items: center;
}

.demo-scrollable {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 2rem 0;
}

.demo-spacer {
  height: 100px;
  width: 100%;
  background: #f3f4f6;
  border-radius: 4px;
}

.demo-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
  transition: background 0.2s;
}

.demo-button:hover {
  background: #2563eb;
}

.demo-tooltip {
  background: #1f2937;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  max-width: 240px;
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
}
</style>
