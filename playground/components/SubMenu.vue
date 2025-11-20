<script setup lang="ts">
import type { UseFloatingTreeReturn } from "@/composables"
import { useClick, useHover } from "@/composables"
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

// Use new addNode API with parentId in options
const node = tree.addNode(anchorEl, floatingEl, {
  placement: "right-start",
  open: isOpen,
  middlewares: [offset(5), flip(), shift({ padding: 5 })],
  parentId: parentMenuId,
})!

onUnmounted(() => {
  tree.removeNode(node.id)
})

// Provide context for nested submenus/items
provide("currentMenuId", node.id) // This submenu is now the current menu for its children

useHover(node, {
  delay: { open: 75, close: 150 },
  safePolygon: {
    buffer: 8,
  },
})

useClick(node, { outsideClick: true })
</script>

<template>
  <slot></slot>
</template>
