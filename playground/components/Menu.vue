<script setup lang="ts">
import { useClick, useDismiss, useFloatingTree, type UseFloatingTreeReturn } from '@/composables';
import {
  useFloating
} from '@/composables'; // Assuming v-float exports these
import { flip, shift, offset } from '@floating-ui/dom'
import { onUnmounted, provide, ref } from 'vue';

export interface MenuProps {
  label?: string; // Optional label for a trigger button
}

const props = defineProps<MenuProps>();

const isOpen = ref(false);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// 1. Floating logic for the main menu panel
const context = useFloating(
  anchorEl,
  floatingEl,
  {
    placement: 'bottom-start',
    open: isOpen,
    middlewares: [offset(5), flip(), shift({ padding: 5 })],
  }
);

// 2. Initialize useFloatingTree
// The tree's root node data is the FloatingContext of this Menu.vue instance.
const tree = useFloatingTree(context, { deleteStrategy: 'recursive' });
provide<UseFloatingTreeReturn>('floatingTree', tree);
provide<string | null>('parentMenuId', null); // Root menu has no parent
provide<string>('currentMenuId', tree.root.id); // Provide its own ID

useDismiss(context)
useClick(context)

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