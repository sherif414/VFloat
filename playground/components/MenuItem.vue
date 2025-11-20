<script setup lang="ts">
import { computed, inject, ref } from "vue"

export interface MenuItemProps {
  label?: string
  disabled?: boolean;
}

interface MenuListContext {
  registerItem: (el: HTMLElement | null, disabled?: boolean) => number
  isActive: (index: number) => boolean
}

const props = defineProps<MenuItemProps>()

const menuListContext = inject<MenuListContext | null>("menuListContext", null)
const itemEl = ref<HTMLElement | null>(null)
const index = ref<number | null>(null)

const setItemRef = (el: any) => {
  const htmlEl = el as HTMLElement | null
  itemEl.value = htmlEl
  if (menuListContext && index.value == null) {
    index.value = menuListContext.registerItem(htmlEl, props.disabled)
  }
}

const isActive = computed(() => index.value != null && !!menuListContext?.isActive(index.value))
</script>

<template>
  <div
    :ref="setItemRef"
    :data-disabled="props.disabled ? '' : undefined"
    :data-active="isActive ? '' : undefined"
    role="menuitem"
    :aria-disabled="props.disabled"
    tabindex="-1"
  >
    <slot>{{ props.label }}</slot>
  </div>
</template>