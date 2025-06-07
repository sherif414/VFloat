# V-Float: Vue 3 Floating UI Library

A comprehensive Vue 3 port of the [Floating UI](https://floating-ui.com/) library, providing composables and components for creating floating elements like tooltips, popovers, dropdowns, and more with accurate positioning and interaction management.

## Features

- 🎯 **Accurate Positioning**: Position floating elements with pixel-perfect accuracy
- 🧩 **Composables**: Powerful Vue 3 composables for floating element behavior
- 🧰 **Components**: Ready-to-use components to simplify implementation
- 🚀 **Lightweight**: Small footprint with tree-shakable modules
- ♿ **Accessible**: Built with a focus on keyboard navigation and ARIA support
- 📱 **Responsive**: Works on all screen sizes and device types

## Installation

```bash
# With pnpm (recommended)
pnpm add v-float

# With npm
npm install v-float

# With yarn
yarn add v-float
```

## Basic Usage

### Simple Tooltip Example

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useInteractions, useHover } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

// Set up the floating element
const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Add hover interaction
useHover(floating.context, {
  delay: { open: 100, close: 200 },
})
</script>

<template>
  <button ref="referenceRef">Hover me</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    :style="{
      position: floating.strategy,
      top: '0px',
      left: '0px',
      transform: `translate(${floating.x}px, ${floating.y}px)`,
    }"
  >
    This is a tooltip
  </div>
</template>
```

## Available Composables

### Positioning

- `useFloating`: Core positioning logic
- `offset`: Add distance between reference and floating element
- `shift`: Prevent the floating element from overflowing
- `flip`: Flip the placement when there's no space
- `autoPlacement`: Automatically choose the best placement
- `size`: Change the size of the floating element based on available space

### Interactions

- `useHover`: Hover interactions with configurable delay
- `useFocus`: Focus/blur events
- `useClick`: Click events
- `useDismiss`: Close on outside click, ESC key press

## Documentation

For complete documentation, visit our documentation site at [https://v-float.com](https://v-float.com).

## License

MIT License
