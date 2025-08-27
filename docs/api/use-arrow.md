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

## Styling the Arrow Element

The arrow element is typically a small square that's rotated 45 degrees to create a triangle-like appearance. Here's how to style it:

### Basic CSS

```css
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #ddd;
  transform: rotate(45deg);
  z-index: -1;
}
```

The `useArrow` composable will add positioning styles (top, left, etc.) and adjust the transform property based on the placement.

### CSS with Shadow

For a more polished look with shadow matching the floating element:

```css
.tooltip {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
}

.arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: inherit;
  /* Only show borders on the sides that face outward */
  border-right: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  z-index: -1;
  /* useArrow will add additional transform */
}

.tooltip[data-placement^="top"] .arrow {
  border-top: none;
  border-left: none;
}

.tooltip[data-placement^="bottom"] .arrow {
  border-bottom: none;
  border-right: none;
}

.tooltip[data-placement^="left"] .arrow {
  border-left: none;
  border-bottom: none;
}

.tooltip[data-placement^="right"] .arrow {
  border-right: none;
  border-top: none;
}
```

## Complete Example

Here's a more complete example showing a tooltip with an arrow that appears on hover:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useArrow, useHover, offset, flip, shift } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

// Set up floating element with multiple middleware
const context = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [
    offset(8), // Add some distance between reference and floating
    flip(), // Flip to the opposite side if needed
    shift({ padding: 5 }), // Shift along the main axis if needed
  ],
})

// Auto-register arrow middleware and get positioning styles
const { arrowStyles } = useArrow(arrowRef, context, {
  offset: "-5px",
  padding: 5, // Keep arrow 5px away from the edges
})

// Handle hover interaction
useHover(context)
</script>

<template>
  <div class="tooltip-container">
    <button ref="referenceRef" class="tooltip-trigger">Hover for Information</button>

    <div
      v-if="context.open.value"
      ref="floatingRef"
      :style="context.floatingStyles.value"
      class="tooltip"
      :data-placement="context.placement.value"
    >
      <div class="tooltip-content">
        This tooltip adjusts its position and features a dynamic arrow that always points to the
        reference element.
      </div>
      <div ref="arrowRef" class="arrow" :style="arrowStyles"></div>
    </div>
  </div>
</template>

<style scoped>
.tooltip-container {
  display: inline-block;
}

.tooltip-trigger {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.tooltip {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  max-width: 300px;
  z-index: 100;
}

.tooltip-content {
  font-size: 14px;
  line-height: 1.4;
}

.arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 1px solid #ddd;
  transform: rotate(45deg);
  z-index: -1;
}

/* Conditional border styles based on placement */
.tooltip[data-placement^="top"] .arrow {
  border-top: none;
  border-left: none;
}

.tooltip[data-placement^="bottom"] .arrow {
  border-bottom: none;
  border-right: none;
}

.tooltip[data-placement^="left"] .arrow {
  border-left: none;
  border-bottom: none;
}

.tooltip[data-placement^="right"] .arrow {
  border-right: none;
  border-top: none;
}
</style>
```

## Example: Popover with Arrow

Here's an example of a clickable popover with an arrow:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useArrow, useClick, useEscapeKey, offset, flip, shift } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const arrowRef = ref<HTMLElement | null>(null)

// Set up floating element
const context = useFloating(referenceRef, floatingRef, {
  placement: "bottom",
  middleware: [offset(12), flip({ padding: 15 }), shift()],
})

// Auto-register arrow middleware and get positioning styles
const { arrowStyles } = useArrow(arrowRef, context, {
  padding: 8,
})

// Click to toggle
useClick(context)

// Press escape to close
useEscapeKey(context)
</script>

<template>
  <div class="popover-container">
    <button ref="referenceRef" class="popover-trigger">Click for Details</button>

    <div
      v-if="context.open.value"
      ref="floatingRef"
      :style="context.floatingStyles.value"
      class="popover"
      :data-placement="context.placement.value"
    >
      <div class="popover-header">
        <h3>Important Information</h3>
        <button @click="context.open.value = false" class="close-button">×</button>
      </div>
      <div class="popover-content">
        <p>This is a popover with interactive content and an arrow.</p>
        <p>Click outside or the close button to dismiss.</p>
        <button class="action-button">Take Action</button>
      </div>
      <div ref="arrowRef" class="arrow" :style="arrowStyles"></div>
    </div>
  </div>
</template>

<style scoped>
.popover-container {
  display: inline-block;
}

.popover-trigger {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.popover {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  width: 300px;
  z-index: 100;
  overflow: hidden;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding: 12px 16px;
  background: #f8f8f8;
}

.popover-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #888;
}

.popover-content {
  padding: 16px;
}

.action-button {
  margin-top: 12px;
  padding: 6px 12px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 1px solid #ddd;
  transform: rotate(45deg);
  z-index: -1;
}

/* Conditional styling based on placement */
.popover[data-placement^="top"] .arrow {
  border-top: none;
  border-left: none;
}

.popover[data-placement^="bottom"] .arrow {
  border-bottom: none;
  border-right: none;
  background: #f8f8f8; /* Match header background for bottom placement */
}

.popover[data-placement^="left"] .arrow {
  border-left: none;
  border-bottom: none;
}

.popover[data-placement^="right"] .arrow {
  border-right: none;
  border-top: none;
}
</style>
```

## Best Practices

1. **Automatic Middleware Registration**: No need to manually add arrow middleware to `useFloating` - it's automatically registered when you call `useArrow`.

2. **Size the arrow appropriately**: A good size for the arrow is usually between 8-12px. Too small, and it's hard to see; too large, and it looks disproportionate.

3. **Match visual styles**: Make sure the arrow's borders and background match the floating element for a seamless appearance.

4. **Adjust z-index**: Set a negative z-index on the arrow to ensure it appears behind the floating element's content, while still being visible.

5. **Consider conditional styling**: Apply different border styles based on the placement to ensure the arrow's borders match up with the floating element's edges.

6. **Use padding for the arrow**: Use the padding option in `useArrow` to keep the arrow from getting too close to the edges of the floating element.

7. **Use data-placement for styling**: Set a data-placement attribute on the floating element based on the current placement, which makes it easier to apply conditional styles to the arrow.

8. **Pass the arrow ref early**: Create your arrow ref and pass it to `useArrow` as soon as possible to ensure proper middleware registration.

## Styling Tips

### CSS Triangle Method (Alternative)

Instead of using a rotated square with borders, you can create a pure CSS triangle:

```css
.tooltip {
  /* Tooltip styles */
  position: relative;
}

.arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

/* Arrow styles based on placement */
.tooltip[data-placement^="top"] .arrow {
  border-width: 8px 8px 0;
  border-color: #ddd transparent transparent transparent;
}

.tooltip[data-placement^="bottom"] .arrow {
  border-width: 0 8px 8px;
  border-color: transparent transparent #ddd transparent;
}

.tooltip[data-placement^="left"] .arrow {
  border-width: 8px 0 8px 8px;
  border-color: transparent transparent transparent #ddd;
}

.tooltip[data-placement^="right"] .arrow {
  border-width: 8px 8px 8px 0;
  border-color: transparent #ddd transparent transparent;
}
```

This approach creates a triangle using only borders, but it's less flexible when you need to match both background and border colors.

### Using ::before and ::after for Two-Color Arrows

For more complex arrows with both background and border colors:

```css
.tooltip {
  /* Tooltip styles */
  position: relative;
}

.arrow {
  position: absolute;
  width: 20px;
  height: 20px;
}

.arrow::before,
.arrow::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

.tooltip[data-placement^="bottom"] .arrow {
  top: -10px;
}

.tooltip[data-placement^="bottom"] .arrow::before {
  border-width: 0 10px 10px;
  border-color: transparent transparent #ddd transparent; /* Border color */
}

.tooltip[data-placement^="bottom"] .arrow::after {
  border-width: 0 9px 9px;
  border-color: transparent transparent white transparent; /* Background color */
  margin-left: 1px;
  margin-top: 1px;
}

/* Similar styles for other placements */
```

## Related Composables

- [`useFloating`](/api/use-floating): The core composable for positioning floating elements
- [`useHover`](/api/use-hover): Add hover interactions to floating elements
- [`useClick`](/api/use-click): Add click interactions to floating elements
- [`useFocus`](/api/use-focus): Add focus interactions to floating elements
- [`offset`](/api/offset): Middleware to add distance between reference and floating elements
- [`flip`](/api/flip): Middleware to flip placement when there's not enough space
- [`shift`](/api/shift): Middleware to shift the floating element along the main axis if needed
