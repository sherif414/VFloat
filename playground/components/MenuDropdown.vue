<script setup lang="ts">
import { useFocusTrap, useListNavigation, type UseFloatingTreeReturn } from "@/composables"
import { computed, inject, provide, ref } from "vue"

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
const isTopLevelMenu = computed(() => {
  if (!node) return false
  return !node.parent.value
})
const shouldCloseOnFocusOut = computed(() => !isTopLevelMenu.value)

const registerItem = (el: HTMLElement | null, disabled?: boolean) => {
  const index = listRefs.value.length
  listRefs.value[index] = el
  if (disabled) {
    disabledLookup.value[index] = true
  }
  return index
}

const isActive = (index: number) => activeIndex.value === index

const getInitialFocusTarget = () => {
  for (let i = 0; i < listRefs.value.length; i += 1) {
    if (!disabledLookup.value[i]) {
      const el = listRefs.value[i]
      if (el) return el
    }
  }
  return floatingEl.value
}

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
    openOnArrowKeyDown: !node.parent.value,
    focusItemOnOpen: "auto",
    nested: !!node.parent.value,
  })

  useFocusTrap(node, {
    order: ["reference", "content"],
    modal: isTopLevelMenu,
    outsideElementsInert: isTopLevelMenu,
    closeOnFocusOut: shouldCloseOnFocusOut,
    restoreFocus: true,
    initialFocus: () => getInitialFocusTarget(),
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
    role="menu"
    :aria-labelledby="`menu-trigger-${node.id}`"
  >
    <slot></slot>
  </div>
</template>
