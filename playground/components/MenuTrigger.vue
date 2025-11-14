<script setup lang="ts">
import type { UseFloatingTreeReturn } from "@/composables"
import { inject, ref } from "vue"

interface MenuListContext {
  registerItem: (el: HTMLElement | null, disabled?: boolean) => number
  isActive: (index: number) => boolean
}

const menuId = inject<string>("currentMenuId")
const tree = inject<UseFloatingTreeReturn>("floatingTree")
const menuListContext = inject<MenuListContext | null>("menuListContext", null)

if (!tree || !menuId) {
  throw new Error("no menu parent found")
}

const node = tree.findNodeById(menuId)
const anchorEl = node?.data.refs.anchorEl ?? ref<HTMLElement | null>(null)
const itemIndex = ref<number | null>(null)

const setAnchorRef = (el: any) => {
  const htmlEl = el as HTMLElement | null
  ;(anchorEl as any).value = htmlEl
  if (menuListContext && itemIndex.value == null) {
    itemIndex.value = menuListContext.registerItem(htmlEl)
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (!node) return
  // When this trigger belongs to a submenu (has a parent node) and Right Arrow is pressed,
  // open the child menu and let its own list navigation manage focus.
  if (event.key === "ArrowRight" && node.parent.value) {
    event.preventDefault()
    event.stopPropagation()
    node.data.setOpen(true, "keyboard-activate", event)
  }
}
</script>

<template>
  <button
    :ref="setAnchorRef"
    class="menu-trigger-button"
    type="button"
    :id="node ? `menu-trigger-${node.id}` : undefined"
    :aria-expanded="node?.data.open.value"
    :aria-controls="node ? `menu-panel-${node.id}` : undefined"
    aria-haspopup="menu"
    @keydown="onKeyDown"
  >
    <slot />
  </button>
</template>
