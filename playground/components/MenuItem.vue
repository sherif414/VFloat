<script setup lang="ts">
import { defineProps } from 'vue';

export interface MenuItemProps {
  label?: string
  disabled?: boolean;
}

const props = defineProps<MenuItemProps>();
</script>

<template>
  <div class="menu-item w-full" :class="{ 'menu-item--disabled': props.disabled }" role="menuitem" :aria-disabled="props.disabled"
    tabindex="-1">
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
</style>