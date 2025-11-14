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
    class="menu-item w-full"
    :class="{ 'menu-item--disabled': props.disabled, 'menu-item--active': isActive }"
    role="menuitem"
    :aria-disabled="props.disabled"
    tabindex="-1"
  >
    <slot>{{ props.label }}</slot>
  </div>
</template>

<style>
.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.menu-item:hover:not(.menu-item--disabled) {
  background-color: #f0f0f0;
}

.menu-item--disabled {
  color: #a0a0a0;
  cursor: not-allowed;
}

.menu-item--active:not(.menu-item--disabled) {
  background-color: #eff6ff;
}
</style>