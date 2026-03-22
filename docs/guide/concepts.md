# Core Concepts

Understand the building blocks of VFloat to effectively position and control your floating elements.

## The Basics

VFloat relies on two main concepts: the **Anchor Element** and the **Floating Element**. 

The anchor element is the trigger (like a button or an input) that you want to attach your floating element to. The floating element is the overlay content (like a tooltip or dropdown).

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

// The floating context manages positioning and state
const context = useFloating(anchorEl, floatingEl, {
  placement: 'right-start'
})
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div ref="floatingEl" :style="context.floatingStyles.value">
    Floating Element
  </div>
</template>
```

::: tip
VFloat calculates the coordinates for you and exposes them as `floatingStyles.value`, which you can directly bind to your floating element's `:style` attribute.
:::

## Deep Dive

VFloat separates positioning from interactions, giving you fine-grained control over how elements behave.

### State Management

VFloat uses the `FloatingContext` to manage the `open` state. You can read the current state via `context.open.value` and update it using `context.setOpen()`. The `setOpen` method accepts a `reason` and an `event` parameter, helping you track exactly what triggered the state change.

```ts
// Open the floating element and log that it was triggered programmatically
context.setOpen(true, 'programmatic-trigger')

// Close the floating element
context.setOpen(false, 'close-button-click')
```

### Positioning and Middlewares

The core positioning engine computes the optimal coordinates based on your desired `placement`. To modify this behavior—such as adding distance between elements or preventing overflow—you pass an array of `middlewares`.

```ts
import { useFloating, offset, flip, shift } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  middlewares: [
    offset(8), // Add an 8px gap
    flip(),    // Flip to bottom if there's no space on top
    shift({ padding: 5 }) // Keep it on screen
  ]
})
```

::: warning
The order of `middlewares` matters! For example, `offset` should generally be placed before `flip` and `shift` so that the distance is calculated before boundary checks happen.
:::

### Interaction Composables

Instead of writing custom event listeners for clicks, hovers, and keyboard navigation, VFloat provides interaction composables that hook directly into the `FloatingContext`.

```ts
import { useClick, useEscapeKey } from 'v-float'

// Composing behaviors onto the existing context
useClick(context, { closeOnOutsideClick: true })
useEscapeKey(context, {
  onEscape: () => context.setOpen(false, 'escape-key')
})
```

## Further Reading

- [Middlewares](/guide/middleware)
- [Interactions](/guide/interactions)
- [Getting Started](/guide/index)
