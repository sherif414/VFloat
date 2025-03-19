<script lang="ts">
export interface FloatingArrowProps {
  /** The floating context */
  context: any;

  /** Width of the arrow */
  width?: number;

  /** Height of the arrow */
  height?: number;

  /** Radius of the arrow tip */
  tipRadius?: number;

  /** Fill color of the arrow */
  fill?: string;

  /** Stroke color of the arrow */
  stroke?: string;

  /** Stroke width of the arrow */
  strokeWidth?: number;

  /** Static offset for the arrow */
  staticOffset?: number | null;
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArrow } from '../composables/use-arrow';

const props = withDefaults(defineProps<FloatingArrowProps>(), {
  width: 14,
  height: 7,
  tipRadius: 0,
  fill: 'black',
  stroke: 'none',
  strokeWidth: 0,
  staticOffset: null
});

// Get the arrow element ref
const arrowRef = ref<HTMLElement | null>(null);

// Use arrow positioning
const { arrowX, arrowY, arrowStyles } = useArrow({
  element: arrowRef,
  middlewareData: computed(() => props.context.middlewareData),
  placement: computed(() => props.context.placement)
});

// Static offset takes precedence over dynamic positioning
const finalStyles = computed(() => {
  if (props.staticOffset != null) {
    const placement = props.context.placement;
    const staticSide = {
      top: 'bottom',
      right: 'left',
      bottom: 'top',
      left: 'right',
    }[placement.split('-')[0]];
    
    return {
      ...arrowStyles.value,
      left: placement.includes('end') 
        ? `${props.staticOffset}px` 
        : placement.includes('start')
          ? undefined
          : '50%',
      right: placement.includes('start') 
        ? `${props.staticOffset}px` 
        : undefined,
      top: placement.includes('bottom')
        ? undefined 
        : placement.includes('top')
          ? undefined
          : '50%',
      bottom: placement.includes('top')
        ? undefined
        : undefined,
      transform: 'rotate(45deg)',
      [staticSide]: '-4px'
    };
  }
  
  return arrowStyles.value;
});

// Generate path for the arrow
const pathData = computed(() => {
  const { width, height, tipRadius } = props;
  
  if (tipRadius > 0) {
    const halfWidth = width / 2;
    const arcRadius = tipRadius;
    const arcX = halfWidth;
    const arcStartY = 0;
    
    return `M0,${height} L${halfWidth - arcRadius},0 Q${halfWidth},0 ${halfWidth + arcRadius},0 L${width},${height}`;
  }
  
  return `M0,${height} L${width / 2},0 L${width},${height}`;
});
</script>

<template>
  <div 
    ref="arrowRef" 
    :style="finalStyles"
    class="floating-arrow"
  >
    <svg 
      :width="width" 
      :height="height" 
      :viewBox="`0 0 ${width} ${height}`" 
      :fill="fill"
      :stroke="stroke"
      :stroke-width="strokeWidth"
    >
      <path :d="pathData" />
    </svg>
  </div>
</template>

<style scoped>
.floating-arrow {
  position: absolute;
  pointer-events: none;
  width: max-content;
  height: max-content;
}
</style> 