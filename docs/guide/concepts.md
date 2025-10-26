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

const context = useFloating(anchorEl, floatingEl)
</script>

<template>
  <button ref="anchorEl">Trigger</button>
  <div ref="floatingEl" :style="context.floatingStyles.value">Floating content</div>
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

## Arrow Positioning

V-Float provides the `useArrow` composable to position an arrow element pointing to the anchor element. This is commonly used for tooltips and popovers.

```vue
<template>
  <button ref="anchorEl">Hover me</button>
  <div ref="floatingEl" :style="floating.floatingStyles">
    Tooltip content
    <div ref="arrowRef" class="arrow" :style="arrowStyles" />
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useFloating, useArrow, offset, flip } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const arrowEl = ref(null)

const floating = useFloating(anchorEl, floatingEl, {
  middlewares: [offset(8), flip()],
})

const { arrowStyles } = useArrow(arrowEl, floating, {
  offset: "-4px", // Optional: controls arrow offset from floating element edge
})
</script>
```

## State Management

V-Float manages the position state of floating elements. You can control the visibility of the floating element using Vue's reactivity system:

```js
const isOpen = ref(false)

const context = useFloating(anchorEl, floatingEl, {
  open: isOpen, // Control open state
})

// Use the setOpen property from the context object to update state
context.setOpen(true)
context.setOpen(false)

// or update manually using the isOpen ref
isOpen.value = true
isOpen.value = false
```

## Interaction Composables

V-Float provides a comprehensive set of interaction composables that work with the floating context to handle user interactions. These composables follow a consistent pattern where they accept a `FloatingContext` as their first parameter and manage the `open` state automatically.

### Available Interactions

- **[`useHover`](/api/use-hover)**: Show/hide on mouse hover with configurable delays and safe polygon support
- **[`useClick`](/api/use-click)**: Toggle on click with outside click detection
- **[`useFocus`](/api/use-focus)**: Show on focus for keyboard accessibility
- **[`useEscapeKey`](/api/use-escape-key)**: Close on Escape key press
- **[`useClientPoint`](/api/use-client-point)**: Position at cursor/touch coordinates

### Basic Usage Pattern

```vue
<template>
  <button ref="anchorEl">Hover or click me</button>
  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Tooltip content
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useFloating, useHover, useClick, useFocus, useEscapeKey } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)

// Create the floating context
const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
})

// Add interaction behaviors
useHover(context, { delay: { open: 100, close: 300 } })
useClick(context, { outsideClick: true })
useFocus(context)
useEscapeKey(context, {
  onEscape: () => context.setOpen(false),
})
</script>
```

### Composing Multiple Interactions

Interaction composables are designed to work together seamlessly. You can combine multiple interactions for a rich user experience:

```js
// Create floating context
const context = useFloating(anchorEl, floatingEl)

// Hover for desktop users
useHover(context, {
  delay: 200,
  mouseOnly: true, // Only respond to actual mouse, not touch
})

// Click for mobile and accessibility
useClick(context, {
  toggle: true,
  outsideClick: true,
})

// Keyboard support
useFocus(context)

// Close on escape
useEscapeKey({
  onEscape: () => context.setOpen(false),
})
```

## Composition Pattern

V-Float follows Vue's composition pattern, allowing you to compose complex behaviors from simple primitives:

1. Set up positioning with `useFloating`
2. Add interaction behaviors with interaction composables
3. Manage the visibility state with Vue's reactivity system

This approach provides flexibility and allows you to build exactly what you need.

## See Also

- [useFloating](/api/use-floating)
- [useHover](/api/use-hover)
- [useClick](/api/use-click)
- [useFocus](/api/use-focus)
- [useEscapeKey](/api/use-escape-key)
