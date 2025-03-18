<script lang="ts">
export interface FloatingListItemProps {
  /** The index of the item */
  index: number;
  
  /** Whether the item is disabled */
  disabled?: boolean;
  
  /** The active state of the item */
  active?: boolean;
  
  /** Whether the item should be selected on pointer up instead of pointer down */
  selectOnPointerUp?: boolean;
  
  /** Whether the item has a selected state */
  selected?: boolean;
  
  /** Optional label for the item */
  label?: string;
  
  /** Optional ARIA role for the item */
  role?: string;
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<FloatingListItemProps>(), {
  disabled: false,
  active: false,
  selectOnPointerUp: false,
  selected: false,
  role: 'menuitem'
});

const emit = defineEmits(['selected']);

// Get list context
const listContext = inject('floatingListContext', null) as any;

if (!listContext) {
  console.error('FloatingListItem must be used within a FloatingList component');
}

// Element ref
const elementRef = ref<HTMLElement | null>(null);
const { listRef, onSelect, rolePresentation } = listContext || {};

// Register element with list
onMounted(() => {
  if (listRef && elementRef.value) {
    // Register the element with the list navigation
    listRef.elementsRef.value.elements[props.index] = elementRef.value;
    
    // Set disabled state
    if (props.disabled) {
      listRef.disabledIndices.value.push(props.index);
    }
  }
});

// Clean up on unmount
onBeforeUnmount(() => {
  if (listRef) {
    // Remove element from the list navigation
    if (listRef.elementsRef.value.elements[props.index] === elementRef.value) {
      delete listRef.elementsRef.value.elements[props.index];
    }
    
    // Remove from disabled indices if applicable
    if (props.disabled) {
      const index = listRef.disabledIndices.value.indexOf(props.index);
      if (index !== -1) {
        listRef.disabledIndices.value.splice(index, 1);
      }
    }
  }
});

// Watch for changes in the disabled state
watch(() => props.disabled, (isDisabled) => {
  if (!listRef) return;
  
  const disabledIndices = listRef.disabledIndices.value;
  const index = disabledIndices.indexOf(props.index);
  
  if (isDisabled && index === -1) {
    disabledIndices.push(props.index);
  } else if (!isDisabled && index !== -1) {
    disabledIndices.splice(index, 1);
  }
});

// Computed properties for state
const isActive = computed(() => {
  if (props.active !== undefined) {
    return props.active;
  }
  
  return listRef?.activeIndex.value === props.index;
});

// Handle pointer events
const handlePointerDown = (event: PointerEvent) => {
  if (props.disabled || !listRef || props.selectOnPointerUp) return;
  
  event.preventDefault();
  
  // Set the active index and immediately select the item
  listRef.setActiveIndex(props.index);
  onSelect?.(props.index);
  emit('selected', props.index);
};

const handlePointerUp = (event: PointerEvent) => {
  if (props.disabled || !listRef || !props.selectOnPointerUp) return;
  
  event.preventDefault();
  
  // Set the active index and select the item
  listRef.setActiveIndex(props.index);
  onSelect?.(props.index);
  emit('selected', props.index);
};

const handlePointerMove = (event: PointerEvent) => {
  if (props.disabled || !listRef) return;
  
  if (event.pointerType === 'mouse') {
    listRef.setActiveIndex(props.index);
  }
};

// Get all props for the item
const getItemProps = computed(() => {
  const customProps = listRef?.getItemProps?.({
    index: props.index,
    disabled: props.disabled
  }) || {};
  
  return {
    ...customProps,
    id: `${listRef?.elementsRef.value.id}-${props.index}`,
    role: rolePresentation ? 'presentation' : props.role,
    'aria-disabled': props.disabled ? 'true' : undefined,
    'aria-selected': props.selected ? 'true' : undefined,
    tabindex: isActive.value && !props.disabled ? 0 : -1,
    onPointerdown: handlePointerDown,
    onPointerup: handlePointerUp,
    onPointermove: handlePointerMove
  };
});
</script>

<template>
  <li 
    ref="elementRef"
    v-bind="getItemProps"
    :data-active="isActive"
    :data-disabled="disabled"
    :data-selected="selected"
  >
    <slot></slot>
  </li>
</template> 