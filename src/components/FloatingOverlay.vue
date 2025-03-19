<script lang="ts">
export interface FloatingOverlayProps {
  /** Whether to lock scroll when overlay is visible */
  lockScroll?: boolean;

  /** Overlay z-index */
  zIndex?: number;

  /** Background color */
  background?: string;

  /** Custom CSS class */
  class?: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(defineProps<FloatingOverlayProps>(), {
  lockScroll: false,
  zIndex: 999,
  background: 'rgba(0, 0, 0, 0.5)',
  class: ''
});

// Track scroll locks
const hasScrollLock = ref(false);
const originalStyles = ref<Record<string, string>>({});

// Lock the body scroll
const lockBodyScroll = () => {
  if (typeof document === 'undefined' || hasScrollLock.value) return;
  
  // Save original styles
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const documentElementStyle = document.documentElement.style;
  
  // Store original styles to restore later
  originalStyles.value = {
    overflow: documentElementStyle.overflow,
    overflowX: documentElementStyle.overflowX,
    overflowY: documentElementStyle.overflowY,
    paddingRight: documentElementStyle.paddingRight
  };
  
  // Apply scroll lock
  documentElementStyle.overflow = 'hidden';
  documentElementStyle.overflowX = 'hidden';
  documentElementStyle.overflowY = 'hidden';
  
  // Add padding equal to scrollbar width
  if (scrollbarWidth > 0) {
    documentElementStyle.paddingRight = `${scrollbarWidth}px`;
  }
  
  hasScrollLock.value = true;
};

// Unlock the body scroll
const unlockBodyScroll = () => {
  if (typeof document === 'undefined' || !hasScrollLock.value) return;
  
  // Restore original styles
  const documentElementStyle = document.documentElement.style;
  
  documentElementStyle.overflow = originalStyles.value.overflow || '';
  documentElementStyle.overflowX = originalStyles.value.overflowX || '';
  documentElementStyle.overflowY = originalStyles.value.overflowY || '';
  documentElementStyle.paddingRight = originalStyles.value.paddingRight || '';
  
  hasScrollLock.value = false;
};

// Setup and teardown
onMounted(() => {
  if (props.lockScroll) {
    lockBodyScroll();
  }
});

onBeforeUnmount(() => {
  if (hasScrollLock.value) {
    unlockBodyScroll();
  }
});

// Computed styles for the overlay
const overlayStyles = computed(() => ({
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: props.zIndex,
  background: props.background
}));
</script>

<template>
  <div :style="overlayStyles" :class="class">
    <slot></slot>
  </div>
</template> 