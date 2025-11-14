<script setup lang="ts">
import { useClick, useFloatingTree, type UseFloatingTreeReturn, useEscapeKey } from "@/composables"
import { flip, shift, offset } from "@floating-ui/dom"
import { onUnmounted, provide, ref } from "vue"

export interface MenuProps {
  label?: string // Optional label for a trigger button
}

const props = defineProps<MenuProps>()

const isOpen = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const tree = useFloatingTree({ deleteStrategy: "recursive" })

const rootNode = tree.addNode(anchorEl, floatingEl, {
  placement: "bottom-start",
  open: isOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
})!

// Provide tree reference for child components (instead of separate context)
provide<UseFloatingTreeReturn>("floatingTree", tree)
provide<string>("currentMenuId", rootNode.id) // Root menu ID

useEscapeKey(rootNode, {
  onEscape(event) {
    const deepest = tree.getDeepestOpenNode()
    if (!deepest) return

    deepest.data.setOpen(false, "escape-key", event)
    const anchor = deepest.data.refs.anchorEl.value
    if (anchor instanceof HTMLElement) {
      anchor.focus({ preventScroll: true })
    } else if ((anchor as any)?.contextElement instanceof HTMLElement) {
      ;(anchor as any).contextElement.focus({ preventScroll: true })
    }
  },
})

useClick(rootNode, { outsideClick: true })

onUnmounted(() => {
  tree.dispose()
})
</script>

<template>
  <slot />
</template>

<style>
.menu-container {
  position: relative;
  display: inline-block;
  /* Or block, depending on layout needs */
}

.menu-arrow {
  transition: transform 0.2s ease-in-out;
}

.menu-arrow--open {
  transform: rotate(180deg);
}

.menu-panel {
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 1000;
  min-width: 200px;
  padding: 4px 0;
  /* For MenuItems to have some space */
}
</style>
