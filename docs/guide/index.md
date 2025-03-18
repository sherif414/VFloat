# Getting Started with V-Float

V-Float is a Vue 3 port of the popular [Floating UI](https://floating-ui.com/) library. It provides a set of composables and components for creating floating elements like tooltips, popovers, dropdowns, and modals with perfect positioning and interactive behaviors.

## What is V-Float?

V-Float offers two main categories of utilities:

1. **Composables**: A collection of Vue 3 composables to handle positioning, interactions, and accessibility of floating elements.
2. **Components**: Ready-to-use Vue components that simplify common floating UI tasks.

## Key Features

- **Accurate Positioning**: Position floating elements with pixel-perfect accuracy in all scenarios.
- **Smart Overflow Handling**: Built-in support for handling overflow constraints through middleware.
- **Accessibility**: Focus management, ARIA attributes, and keyboard navigation support.
- **Composable Architecture**: Mix and match composables to build exactly what you need.
- **Separation of Concerns**: Positioning logic is separated from UI, giving you full control over styling.

## When to Use V-Float

V-Float is ideal for creating any UI element that floats relative to another element:

- **Tooltips**: Display informational tips when hovering over elements.
- **Dropdown Menus**: Create navigation, selection, or action menus.
- **Popovers**: Show additional content or contextual information.
- **Modals**: Display dialogs or forms that overlay content.
- **Date Pickers**: Position calendar components relative to inputs.
- **Select Menus**: Create accessible dropdown selects.
- **And more!**

## Prerequisites

- **Vue 3**: V-Float is designed specifically for Vue 3 and the Composition API.
- **TypeScript** (recommended): V-Float includes full TypeScript definitions.

## Quick Installation

To add V-Float to your project:

```bash
# Using pnpm (recommended)
pnpm add v-float

# Or with npm
npm install v-float

# Or with yarn
yarn add v-float
```

## Basic Example

Here's a simple tooltip implementation to demonstrate the core concepts:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useHover } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

// 1. Set up the floating element positioning
const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// 2. Add hover interaction
const hover = useHover(floating.context);

// 3. Combine interactions into props getters
const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
</script>

<template>
  <!-- 4. Apply reference props to the trigger element -->
  <button ref="referenceRef" v-bind="getReferenceProps()">Hover me</button>

  <!-- 5. Apply floating props to the tooltip -->
  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="{
      position: floating.strategy,
      top: '0px',
      left: '0px',
      transform: `translate(${floating.x}px, ${floating.y}px)`,
      background: '#333',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
    }"
  >
    This is a tooltip
  </div>
</template>
```

## Next Steps

- [Installation](/guide/installation): Detailed installation instructions
- [Core Concepts](/guide/concepts): Learn about the key concepts behind V-Float
- [Composables](/composables/): Explore the available composables
- [Components](/components/): Discover ready-to-use components
- [Examples](/examples/): See more complex examples
