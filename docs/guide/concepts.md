# Core Concepts

V-Float is a Vue 3 port of [Floating UI](https://floating-ui.com/), providing a flexible foundation for creating floating UI elements like tooltips, popovers, and dropdowns. Understanding these core concepts will help you use V-Float effectively.

## Positioning Engine

At the heart of V-Float is a powerful positioning engine that handles the complex task of positioning floating elements relative to anchor elements. The positioning logic handles:

- Calculating the optimal position based on the chosen placement
- Adjusting positions to avoid overflow at screen edges
- Updating positions when scrolling or resizing

## Anchor and Floating Elements

V-Float's positioning is based on two key elements:

1. **Anchor Element**: The trigger or anchor element to which the floating element is positioned relative to. This is typically a button, input, or any other DOM element.

2. **Floating Element**: The element that floats next to the anchor element. This could be a tooltip, dropdown menu, popover, or any content that needs to be positioned.

```vue
<script setup>
import { ref } from "vue"
import { useFloating } from "v-float"

const anchorEl = ref(null) // Reference to the anchor element
const floatingEl = ref(null) // Reference to the floating element

const floating = useFloating(anchorEl, floatingEl)
</script>

<template>
  <button ref="anchorEl">Trigger</button>
  <div ref="floatingEl" :style="floating.floatingStyles">Floating content</div>
</template>
```

## Placement

The placement determines where the floating element appears relative to the anchor element. V-Float supports the following placements:

- **Primary placements**: `top`, `right`, `bottom`, `left`
- **Alignment variations**: `top-start`, `top-end`, `right-start`, `right-end`, `bottom-start`, `bottom-end`, `left-start`, `left-end`

```js
const floating = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start", // Position at the bottom, aligned to the start
})
```

## Arrow Middleware

V-Float provides an arrow middleware to position an arrow element pointing to the anchor element. This is commonly used for tooltips and popovers.

```vue
<template>
  <button ref="anchorEl">Hover me</button>
  <div ref="floatingEl" :style="floating.floatingStyles">
    Tooltip content
    <div ref="arrowRef" class="arrow" />
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useFloating, arrow as useArrow } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const arrowRef = ref(null)

const floating = useFloating(anchorEl, floatingEl, {
  middleware: [useArrow({ element: arrowRef })],
})
</script>
```

## State Management

V-Float manages the position state of floating elements. You can control the visibility of the floating element using Vue's reactivity system:

```js
const isOpen = ref(false)

const floating = useFloating(anchorEl, floatingEl, {
  open: isOpen, // Control open state
  setOpen: (open) => (isOpen.value = open), // React to state changes
})
```

## Interaction Composable

V-Float provides composables for common interaction patterns. Here's an example of using the hover interaction:

```vue
<template>
  <button ref="anchorEl">Hover me</button>
  <div v-if="isOpen" ref="floatingEl" :style="floating.floatingStyles">Tooltip content</div>
</template>

<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const isOpen = ref(false)

useFloating(anchorEl, floatingEl, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Setup hover interaction
useHover(anchorEl, floatingEl, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})
</script>
```

## Composition Pattern

V-Float follows Vue's composition pattern, allowing you to compose complex behaviors from simple primitives:

1. Set up positioning with `useFloating`
2. Add interaction behaviors with interaction composables
3. Manage the visibility state with Vue's reactivity system

This approach provides flexibility and allows you to build exactly what you need.
