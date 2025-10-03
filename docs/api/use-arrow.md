# useArrow

The `useArrow` composable helps position and style an arrow element that points from a floating element to its reference element. This is commonly used in tooltips, popovers, and dropdown menus to create a visual connection between the elements.

## Key Features

- **Automatic Middleware Registration**: The arrow middleware is automatically registered when you use `useArrow`
- **Precise Positioning**: Calculates exact arrow position based on floating element placement
- **Logical CSS Properties**: Uses modern logical inset properties for proper internationalization
- **Customizable Offset**: Control arrow distance from floating element edges

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useArrow, offset, flip, shift } from "v-float"

// Create refs for elements
const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

// Set up floating element - NO need to add arrow middleware manually!
const context = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [offset(8), flip(), shift()], // arrow is auto-registered
})

// Arrow middleware is automatically registered when you call useArrow
const { arrowStyles } = useArrow(arrowRef, context, {
  offset: "-4px", // Optional: control arrow distance from edge
})
</script>

<template>
  <button ref="referenceRef">Hover me</button>

  <div
    v-if="context.open.value"
    ref="floatingRef"
    :style="context.floatingStyles.value"
    class="tooltip"
  >
    This is a tooltip with an arrow
    <div ref="arrowRef" class="arrow" :style="arrowStyles"></div>
  </div>
</template>

<style scoped>
.tooltip {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #ddd;
  transform: rotate(45deg);
  z-index: -1;
}
</style>
```

## API Reference

### useArrow

The `useArrow` composable calculates the position and styles for an arrow element based on the placement and middleware data from a `FloatingContext` (returned by `useFloating`). **The arrow middleware is automatically registered** when you call this composable.

```ts
import { useArrow } from "v-float"

// Function signature:
function useArrow(
  arrowEl: Ref<HTMLElement | null>,
  context: FloatingContext,
  options?: UseArrowOptions
): UseArrowReturn

// Types:
interface UseArrowOptions {
  /**
   * Controls the offset of the arrow from the edge of the floating element.
   * A positive value moves the arrow further into the floating element,
   * while a negative value creates a gap.
   * @default '-4px'
   */
  offset?: string

  /**
   * Padding around arrow element to prevent it from getting too close to edges
   */
  padding?: Padding
}

interface UseArrowReturn {
  arrowX: ComputedRef<number> // The computed X position of the arrow
  arrowY: ComputedRef<number> // The computed Y position of the arrow
  arrowStyles: ComputedRef<Record<string, string>> // CSS styles for positioning
}
```

#### Parameters

1. **`arrowEl: Ref<HTMLElement | null>`**
   - A Vue ref pointing to the arrow DOM element
   - This element will be automatically registered with the floating context

2. **`context: FloatingContext`**
   - The `FloatingContext` object returned by `useFloating`
   - Provides `middlewareData`, `placement`, and other positioning information

3. **`options?: UseArrowOptions`** (optional)
   - **`offset?: string`**: Distance of the arrow from the floating element edge. Default: `'-4px'`
   - **`padding?: Padding`**: Padding around the arrow element (same as Floating UI padding type)

#### Return Value

`useArrow` returns an object with:

- **`arrowX: ComputedRef<number>`**: X-coordinate for the arrow's position
- **`arrowY: ComputedRef<number>`**: Y-coordinate for the arrow's position
- **`arrowStyles: ComputedRef<Record<string, string>>`**: CSS styles using logical properties:
  ```ts
  {
    'inset-inline-start': '10px', // for horizontal positioning
    'inset-block-start': '-4px',  // for vertical positioning
    // OR 'inset-inline-end', 'inset-block-end' depending on placement
  }
  ```
