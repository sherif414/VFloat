<script setup lang="ts">
import { useListNavigation, type UseFloatingTreeReturn } from "@/composables"
import { inject, provide, ref } from "vue"

interface MenuListContext {
  registerItem: (el: HTMLElement | null, disabled?: boolean) => number
  isActive: (index: number) => boolean
}

const menuId = inject<string>("currentMenuId")
const tree = inject<UseFloatingTreeReturn>("floatingTree")

if (!tree || !menuId) {
  throw new Error("no menu parent found")
}

const node = tree.findNodeById(menuId)
const floatingEl = node?.data.refs.floatingEl ?? ref(null)

const listRefs = ref<Array<HTMLElement | null>>([])
const activeIndex = ref<number | null>(null)
const disabledLookup = ref<Record<number, boolean>>({})

const registerItem = (el: HTMLElement | null, disabled?: boolean) => {
  const index = listRefs.value.length
  listRefs.value[index] = el
  if (disabled) {
    disabledLookup.value[index] = true
  }
  return index
}

const isActive = (index: number) => activeIndex.value === index

if (node) {
  useListNavigation(node, {
    listRef: listRefs,
    activeIndex,
    onNavigate: (index) => {
      activeIndex.value = index
    },
    loop: true,
    orientation: "vertical",
    disabledIndices: (index) => !!disabledLookup.value[index],
    focusItemOnHover: true,
    openOnArrowKeyDown: true,
    focusItemOnOpen: "auto",
    nested: !!node.parent.value,
  })
}

provide<MenuListContext>("menuListContext", {
  registerItem,
  isActive,
})
</script>

<template>
  <div
    ref="floatingEl"
    :style="{ ...node?.data.floatingStyles.value }"
    v-if="node?.data.open.value"
    :id="`menu-panel-${node.id}`"
    class="menu-panel flex flex-col items-start"
    role="menu"
    :aria-labelledby="`menu-trigger-${node.id}`"
  >
    <slot></slot>
  </div>
</template>
