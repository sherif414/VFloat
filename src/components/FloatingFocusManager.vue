<script lang="ts">
export interface FloatingFocusManagerProps {
  /** The floating context */
  context: any;
  
  /** Whether the focus manager is disabled */
  disabled?: boolean;
  
  /** Initial element to focus (ref, selector, or index) */
  initialFocus?: number | string | HTMLElement | null;
  
  /** Whether to return focus to the reference element on close */
  returnFocus?: boolean;
  
  /** Whether the focus behavior is modal or non-modal */
  modal?: boolean;
  
  /** Order of elements to try focusing */
  order?: ('reference' | 'floating' | 'content')[];
  
  /** Whether to render a visually hidden dismiss button */
  visuallyHiddenDismiss?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<FloatingFocusManagerProps>(), {
  disabled: false,
  initialFocus: 0,
  returnFocus: true,
  modal: true,
  order: () => ['content'],
  visuallyHiddenDismiss: false
});

// Tracked refs and state
const floatingRef = computed(() => props.context.refs.floating.value);
const previouslyFocusedElement = ref<HTMLElement | null>(null);
const focusableElements = ref<HTMLElement[]>([]);
const trapped = ref(false);

// Tab order variables
const lastNavigationWasTab = ref(false);
const isPointerDown = ref(false);

// Event handlers
const handlePointerDown = () => {
  isPointerDown.value = true;
  setTimeout(() => {
    isPointerDown.value = false;
  });
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    lastNavigationWasTab.value = true;
    
    if (!trapped.value) {
      return;
    }
    
    // Prevent default Tab behavior when trapped
    if (focusableElements.value.length === 0) {
      event.preventDefault();
      return;
    }
    
    const hasTabbableElements = focusableElements.value.length > 0;
    const target = event.target as Element;
    
    if (!props.modal) {
      // Non-modal behavior
      const floating = floatingRef.value;
      const reference = props.context.refs.reference.value;
      
      if (!floating || !reference || !hasTabbableElements) {
        return;
      }
      
      const isReferenceElement = target === reference;
      const isFocusInsideFloating = floating.contains(target);
      
      if (isReferenceElement && event.shiftKey) {
        // Tab+Shift on reference focuses last element
        event.preventDefault();
        const lastTabbableElement = focusableElements.value[focusableElements.value.length - 1];
        lastTabbableElement?.focus();
      } else if (
        isFocusInsideFloating &&
        event.shiftKey &&
        target === focusableElements.value[0]
      ) {
        // Tab+Shift on first element focuses reference
        event.preventDefault();
        reference.focus();
      } else if (
        isFocusInsideFloating &&
        !event.shiftKey &&
        target === focusableElements.value[focusableElements.value.length - 1]
      ) {
        // Tab on last element focuses reference
        event.preventDefault();
        reference.focus();
      }
    } else {
      // Modal behavior
      const activeElement = document.activeElement as HTMLElement;
      const lastIndex = focusableElements.value.length - 1;
      const isLastElement = target === focusableElements.value[lastIndex];
      const isFirstElement = target === focusableElements.value[0];
      
      if (!hasTabbableElements) {
        event.preventDefault();
        return;
      }
      
      if (event.shiftKey && isFirstElement) {
        event.preventDefault();
        focusableElements.value[lastIndex]?.focus();
      } else if (!event.shiftKey && isLastElement) {
        event.preventDefault();
        focusableElements.value[0]?.focus();
      }
    }
  } else {
    lastNavigationWasTab.value = false;
  }
};

// Cleanup event listeners
onBeforeUnmount(() => {
  if (props.returnFocus && previouslyFocusedElement.value) {
    previouslyFocusedElement.value.focus();
  }
  
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('keydown', handleKeyDown);
  }
});

// Get all focusable elements
const getFocusableElements = () => {
  if (!floatingRef.value) return [];
  
  return Array.from(
    floatingRef.value.querySelectorAll(
      'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) => 
      !el.hasAttribute('disabled') && 
      !el.getAttribute('aria-hidden') && 
      el.offsetWidth > 0 && 
      el.offsetHeight > 0
  ) as HTMLElement[];
};

// Focus an element by index, ref, or selector
const focusElement = (target: number | string | HTMLElement | null) => {
  const floating = floatingRef.value;
  
  if (!floating) return;
  
  const tabbableElements = focusableElements.value;
  
  if (target === null) return;
  
  if (typeof target === 'number') {
    // Focus by index
    if (tabbableElements[target]) {
      tabbableElements[target].focus();
    } else {
      // Fallback to floating element itself if no element at index
      floating.focus();
    }
  } else if (typeof target === 'string') {
    // Focus by selector
    const element = floating.querySelector(target) as HTMLElement;
    if (element) {
      element.focus();
    }
  } else {
    // Focus the element directly
    target.focus();
  }
};

// Initialize focus management
watch(() => [props.disabled, props.context.open], ([disabled, open]) => {
  if (disabled || !open) return;
  
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    
    // Save and update focus
    previouslyFocusedElement.value = document.activeElement as HTMLElement;
    
    // Update after DOM is ready
    nextTick(() => {
      focusableElements.value = getFocusableElements();
      
      // Handle initial focus
      const floating = floatingRef.value;
      const initialFocusValue = props.initialFocus;
      
      if (floating) {
        trapped.value = true;
        
        if (initialFocusValue !== null) {
          focusElement(initialFocusValue);
        } else {
          // Default focus strategy
          const order = props.order;
          for (let i = 0; i < order.length; i++) {
            const type = order[i];
            
            if (type === 'reference' && props.context.refs.reference.value) {
              props.context.refs.reference.value.focus();
              return;
            }
            
            if (type === 'floating' && floating) {
              floating.focus();
              return;
            }
            
            if (type === 'content' && focusableElements.value.length > 0) {
              focusableElements.value[0].focus();
              return;
            }
          }
        }
      }
    });
  }
}, { immediate: true });

// Dismiss handler for the hidden button
const handleDismiss = () => {
  if (props.context.onOpenChange) {
    props.context.onOpenChange(false);
  }
};

// Visually hidden styles
const hiddenStyles = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px'
};
</script>

<template>
  <slot></slot>
  <button 
    v-if="visuallyHiddenDismiss"
    type="button"
    :style="hiddenStyles"
    aria-label="Dismiss"
    @click="handleDismiss"
  >
    Dismiss
  </button>
</template> 