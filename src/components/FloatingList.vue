<script lang="ts">
export interface FloatingListProps {
  /** The floating context */
  context: any;
  
  /** The list navigation context */
  listRef: ReturnType<typeof import('../composables').useListNavigation>;
  
  /** Function to handle list item selection */
  onSelect?: (index: number) => void;
  
  /** Whether to use role="presentation" on list items */
  rolePresentation?: boolean;
  
  /** Tag name for the list element */
  listTag?: string;
  
  /** Tag name for the list item elements */
  itemTag?: string;
  
  /** Whether to auto-focus the first enabled item */
  autoFocusFirstEnabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, h, onMounted, provide, ref, VNode } from 'vue';

const props = withDefaults(defineProps<FloatingListProps>(), {
  rolePresentation: false,
  listTag: 'div',
  itemTag: 'div',
  autoFocusFirstEnabled: false
});

// Data
const listRef = ref<HTMLElement | null>(null);
const activeIndex = computed(() => props.listRef.activeIndex.value);
const activeId = computed(() => props.listRef.activeId);

// Provide context for list items
provide('floatingListContext', {
  listRef: props.listRef,
  onSelect: props.onSelect || (() => {}),
  rolePresentation: props.rolePresentation
});

// Auto-focus first enabled item if required
onMounted(() => {
  if (props.autoFocusFirstEnabled && props.listRef && activeIndex.value === null) {
    props.listRef.setActiveIndex(
      props.listRef.enabledIndices.value.indexOf(0) !== -1 ? 0 : props.listRef.enabledIndices.value[0]
    );
  }
});

// Get all slots except footer and header
const getSlots = (slots: any) => {
  const { footer, header, ...rest } = slots;
  return rest;
};

// Build the list component
const buildList = (slots: any) => {
  const allSlots = getSlots(slots);
  
  // Return the list with children
  return h(
    props.listTag,
    {
      ref: listRef,
      role: 'menu',
      id: props.listRef.elementsRef.value.id,
      'aria-orientation': props.listRef.orientation.value || undefined,
      ...(props.listRef.getRootProps?.() || {})
    },
    () => {
      // Get all non-header, non-footer slots
      const slotKeys = Object.keys(allSlots);
      const slotContent: VNode[] = [];
      
      // Create list items for each slot
      slotKeys.forEach((key) => {
        if (typeof allSlots[key] === 'function') {
          slotContent.push(
            h(props.itemTag, {}, () => allSlots[key]())
          );
        }
      });
      
      // If there's default slot content, add it directly
      if (slots.default) {
        slotContent.push(slots.default());
      }
      
      return slotContent;
    }
  );
};
</script>

<template>
  <slot name="header"></slot>
  <component :is="buildList($slots)" />
  <slot name="footer"></slot>
</template>