<script setup lang="ts">
import type { UseFloatingTreeReturn } from "@/composables"
import { useDismiss, useFloating, useHover } from "@/composables"
import { useId } from "@/utils"
import { flip, offset, shift } from "@floating-ui/dom"
import { inject, onUnmounted, provide, ref } from "vue"

export interface SubMenuProps {
  disabled?: boolean
}

const props = defineProps<SubMenuProps>()

const isOpen = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const subMenuId = useId()

const tree = inject<UseFloatingTreeReturn>("floatingTree")
const parentMenuId = inject<string>("currentMenuId")

if (!tree || !parentMenuId) {
  throw new Error(
    "SubMenu must be used within a Menu or another SubMenu component that provides a floatingTree context."
  )
}

// Floating logic for this submenu's panel
const context = useFloating(anchorEl, floatingEl, {
  placement: "right-start",
  open: isOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
})
const node = tree?.addNode(context, parentMenuId)!

onUnmounted(() => {
  tree.removeNode(node.id)
})

// Provide context for nested submenus/items
provide("parentMenuId", parentMenuId) // Pass down the original parent ID
provide("currentMenuId", node.id) // This submenu is now the current menu for its children

useHover(context, { safePolygon: true })
</script>

<template>
  <slot></slot>
</template>

<style scoped>
.submenu {
  position: relative;
  user-select: none;
}

.submenu-trigger {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap;
}

.submenu-trigger:hover:not(.submenu--disabled .submenu-trigger) {
  background-color: #f0f0f0;
}

.submenu--disabled .submenu-trigger {
  color: #a0a0a0;
  cursor: not-allowed;
}

.submenu-arrow {
  font-size: 0.7em;
  margin-left: 8px;
}

.submenu-panel {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 160px;
  padding: 4px 0;
}
</style>
