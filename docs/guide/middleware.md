# Middlewares

Middlewares modify the positioning behavior of floating elements. They execute in sequence to transform the position, size, or visibility before the final coordinates are applied.

## The Basics

When you call `useFloating`, you can pass an array of middlewares. The core positioning engine calculates an initial `x` and `y` based on your `placement`, and then passes those coordinates through your middlewares.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, offset, flip, shift } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  middlewares: [
    offset(10), // Move the element 10px away from the anchor
    flip(),     // Flip to the bottom if there's no room on top
    shift()     // Shift the element along the axis to stay on screen
  ]
})
</script>

<template>
  <button ref="anchorEl">Toggle</button>
  
  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    Floating Content
  </div>
</template>
```

::: tip
Order matters! You almost always want `offset` first, followed by `flip`, and finally `shift` or `size` so that boundary collision checks happen *after* the initial spacing is applied.
:::

## Deep Dive

VFloat comes with several built-in middlewares for common positioning requirements.

### Core Middlewares

- **`offset`**: Adds distance between the reference and floating elements.
- **`flip`**: Changes the placement when the floating element is about to overflow its clipping boundary.
- **`shift`**: Shifts the floating element along its axis to keep it visible on the screen.
- **`size`**: Adjusts the dimensions of the floating element to fit within the available space.
- **`arrow`**: Calculates the coordinates needed to position a pointing arrow element.
- **`autoPlacement`**: Automatically chooses the placement that has the most available space.
- **`hide`**: Detects when the anchor element has scrolled out of view, allowing you to hide the floating element.

### Using the Arrow Middleware

If your tooltip or popover needs a pointing arrow, use the `arrow` middleware. You must pass a ref to the actual arrow element so VFloat can measure it.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, offset, arrow } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: 'right',
  middlewares: [
    offset(8),
    arrow({ 
      element: arrowEl, 
      padding: 5 // Keep arrow from hitting the rounded corners of the tooltip
    })
  ]
})
</script>

<template>
  <button ref="anchorEl">Reference</button>
  
  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    Content
    
    <!-- The arrow element -->
    <div
      ref="arrowEl"
      :style="{
        position: 'absolute',
        left: context.middlewareData.value.arrow?.x != null ? `${context.middlewareData.value.arrow.x}px` : '',
        top: context.middlewareData.value.arrow?.y != null ? `${context.middlewareData.value.arrow.y}px` : '',
      }"
      class="arrow"
    ></div>
  </div>
</template>
```

::: warning
The `arrow` middleware doesn't automatically position the arrow element for you via `floatingStyles`. It outputs the calculated coordinates to `context.middlewareData.value.arrow`, which you must manually apply to your arrow element's styles.
:::

## Further Reading

- [Core Concepts](/guide/concepts)
- [`useFloating` API](/api/use-floating)
