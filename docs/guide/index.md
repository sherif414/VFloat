# Getting Started with V-Float: Vue 3 Positioning for Floating Elements

V-Float is a Vue 3 library dedicated to providing precise positioning for floating UI elements like tooltips, popovers, dropdowns, and modals. It is a port inspired by the positioning core of the popular [Floating UI](https://floating-ui.com/) library, adapted for the Vue 3 Composition API.

## When to Use V-Float

V-Float is the ideal choice when you need a robust solution for positioning any UI element that floats relative to another element:

- **Tooltips**: Precisely position informational tips near their triggers.
- **Dropdown Menus**: Ensure navigation or action menus appear correctly beneath their buttons.
- **Popovers**: Accurately place contextual information bubbles.
- **Modals**: Position dialogs or forms centrally or relative to a trigger.
- **Date Pickers**: Align calendar components perfectly with input fields.
- **Custom Selects**: Ensure custom dropdowns open consistently below their input.

## Prerequisites

- **Vue 3**: V-Float is designed specifically for Vue 3 and the Composition API.
- **TypeScript** (recommended): V-Float includes full TypeScript definitions for a better development experience.

## Quick Installation

Add V-Float to your Vue 3 project using your preferred package manager:

```bash
# Using pnpm (recommended)
pnpm add v-float

# Or with npm
npm install v-float

# Or with yarn
yarn add v-float
```

## Basic Positioning Example

This example demonstrates how to use `useFloating` to position a simple tooltip element. We'll manage the `isOpen` state for visibility using standard Vue `ref` and event handling, while `useFloating` provides the `floatingStyles` for accurate placement.

```vue twoslash
<script setup>
import { ref } from "vue"
import { useFloating } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)

const isOpen = ref(false)

const { floatingStyles } = useFloating(anchorEl, floatingEl, {
  placement: "top",
})

const showTooltip = () => {
  isOpen.value = true
}

const hideTooltip = () => {
  isOpen.value = false
}
</script>

<template>
  <button ref="anchorEl" @mouseenter="showTooltip" @mouseleave="hideTooltip">Hover me</button>

  <div v-if="isOpen" ref="floatingEl" :style="{ ...floatingStyles }">
    This is a tooltip positioned by V-Float
  </div>
</template>
```

## Next Steps

Now that you have a basic understanding of V-Float's positioning capabilities, explore further:

- [Installation](/guide/installation): Detailed instructions for various project setups.
- [Core Concepts](/guide/concepts): Dive deeper into how V-Float calculates positions and handles various scenarios.
- [Interaction Composables](/guide/interactions): Understand the benefits of using pre-built interactions for your floating elements.
- [Composables](/composables/): Learn about the other composables available within V-Float for advanced positioning.
- [Examples](/examples/): See more complex use cases and how to integrate V-Float into different UI patterns.
