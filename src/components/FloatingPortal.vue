<script lang="ts">
export interface FloatingPortalProps {
  /** The root element to render the portal into */
  root?: string | HTMLElement | null;
  
  /** A unique ID for the portal container */
  id?: string;
  
  /** Whether to preserve tab order with the reference element */
  preserveTabOrder?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(defineProps<FloatingPortalProps>(), {
  root: null,
  id: undefined,
  preserveTabOrder: true
});

// Global portal ID counter for unique IDs
let portalIdCounter = 0;

// Get or create the unique ID for this portal
const uniqueId = computed(() => props.id || `floating-portal-${++portalIdCounter}`);

// Get or create the portal container
const portalNode = ref<HTMLDivElement | null>(null);

onMounted(() => {
  // Determine the root element
  let rootElement: HTMLElement;
  if (!props.root) {
    if (typeof document !== 'undefined') {
      rootElement = document.body;
    } else {
      return;
    }
  } else if (typeof props.root === 'string') {
    // Use querySelector if it's a string selector
    const selectedRoot = document.querySelector(props.root);
    if (!selectedRoot) {
      console.error(`Cannot find root element with selector "${props.root}"`);
      return;
    }
    rootElement = selectedRoot as HTMLElement;
  } else {
    // Use the root element directly
    rootElement = props.root;
  }
  
  // Check if the portal already exists
  let existingPortal = document.getElementById(uniqueId.value);
  
  if (existingPortal) {
    portalNode.value = existingPortal as HTMLDivElement;
  } else {
    // Create a new portal container
    const newPortalNode = document.createElement('div');
    newPortalNode.id = uniqueId.value;
    
    // Add necessary styles
    Object.assign(newPortalNode.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%'
    });
    
    // Append the new portal to the root
    rootElement.appendChild(newPortalNode);
    portalNode.value = newPortalNode;
  }
});

// Clean up the portal node if not shared
onBeforeUnmount(() => {
  // Only remove the portal if it was created by this instance
  if (
    portalNode.value && 
    !props.id // If id was provided, it's potentially shared between instances
  ) {
    portalNode.value.remove();
  }
});
</script>

<template>
  <Teleport v-if="portalNode" :to="portalNode">
    <slot></slot>
  </Teleport>
</template> 