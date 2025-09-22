# Getting Started with V-Float

V-Float is a comprehensive Vue 3 composable library for building sophisticated floating UI elements including tooltips, dropdowns, popovers, context menus, and complex nested menu systems. It provides a complete toolkit with precise positioning, interaction handling, hierarchical management, and accessibility features.

- **Precise positioning engine** - Inspired by Floating UI, handles complex positioning logic with collision detection and middleware support
- **Interaction composables** - Declarative APIs for clicks, hovers, focus, escape key, and custom interactions
- **Floating Tree system** - Hierarchical management for nested floating elements and complex menu structures
- **Middleware system** - Extensible positioning and behavior customization with arrows, offset, and more
- **Accessibility-first** - Built-in ARIA support, keyboard navigation, and screen reader compatibility
- **TypeScript support** - Full type safety and excellent developer experience

**What you'll learn:**

- Install V-Float and understand its capabilities
- Use the `useFloating` composable for precise positioning
- Compose interactions for robust user experiences
- Build accessible tooltips, dropdowns, and nested menus
- Leverage the Floating Tree for complex hierarchies

## What Can You Build with V-Float?

V-Float provides the tools to build a wide range of floating UI components, from simple tooltips to complex nested menu systems:

### Simple Components
- **Tooltips** - Hover-activated informational overlays with precise positioning
- **Popovers** - Rich content panels that appear on user interaction
- **Dropdowns** - Navigation menus and select components with keyboard support

### Advanced Components
- **Context Menus** - Right-click menus with nested options and custom positioning
- **Nested Menus** - Multi-level navigation systems with proper focus management
- **Modal Dialogs** - Full-screen overlays triggered by floating elements
- **Cascading Menus** - File menu → Export submenu → Format options hierarchies

### Complex Interactions
- **Hover tooltips** with keyboard accessibility and focus management
- **Click dropdowns** with escape key handling and click-outside-to-close
- **Context menus** with precise cursor positioning and collision detection
- **Nested hierarchies** with automatic state management and accessibility

Each component type leverages different combinations of V-Float's composables to provide robust, accessible user experiences.

## Before you begin

Ensure your development environment meets the following requirements:

- **Vue 3.2+**
- **Node.js** with a package manager such as `pnpm`, `npm`, or `yarn`.
- **(Recommended)** **TypeScript** for an improved developer experience with type safety.

## Install V-Float

You can add V-Float to your project using your preferred package manager.

::: code-group

```bash [pnpm]
pnpm add v-float
```

```bash [npm]
npm install v-float
```

```bash [yarn]
yarn add v-float
```

:::

While you can use V-Float from a CDN for quick prototyping, we strongly recommend using a package manager for production applications to benefit from tree-shaking and optimized dependency management.

## Create a Basic Tooltip

This example guides you through positioning a simple tooltip that appears when a user hovers over a button. The `useFloating` composable calculates the necessary styles, and you apply them to your floating element.

### Step 1: Set up the component refs

In your `<script setup>` block, import `ref` from Vue and create two `ref` variables. One will be for the `anchor` element (the button) and the other for the `floating` element (the tooltip).

```javascript
import { ref } from "vue"

const anchorEl = ref(null)
const floatingEl = ref(null)
```

### Step 2: Initialize `useFloating`

Import `useFloating` from `v-float`. Call the composable with the anchor and floating element refs. You can pass an options object as the third argument to configure its behavior, such as setting the `placement`.

```javascript
import { useFloating } from "v-float"

const context = useFloating(anchorEl, floatingEl, {
  placement: "top", // Position the tooltip above the anchor
})
```

The `useFloating` composable returns a `context` object containing reactive properties, including the calculated `floatingStyles` and the element's `open` state.

### Step 3: Control visibility

Create functions to toggle the tooltip's visibility. Use the `context.setOpen()` method to update the state.

```javascript
const showTooltip = () => {
  context.setOpen(true)
}

const hideTooltip = () => {
  context.setOpen(false)
}
```

### Step 4: Build the template

In your `<template>`, connect the refs, event listeners, and dynamic styles.

1.  Assign the `anchorEl` ref to your trigger element and attach the `@mouseenter` and `@mouseleave` event listeners.
2.  Use `v-if="context.open.value"` to render the floating element only when it should be visible.
3.  Assign the `floatingEl` ref to your floating element.
4.  Bind the calculated styles to the element using `:style="{ ...context.floatingStyles.value }"`.

### Complete Example

Here is the complete code for the component.

```vue
<script setup>
import { ref } from "vue"
import { useFloating } from "v-float"

// 1. Create refs for the anchor and floating elements.
const anchorEl = ref(null)
const floatingEl = ref(null)

// 2. Initialize useFloating to get the positioning context.
const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
})

// 3. Define functions to control the open state.
const showTooltip = () => {
  context.setOpen(true)
}

const hideTooltip = () => {
  context.setOpen(false)
}
</script>

<template>
  <main>
    <button ref="anchorEl" @mouseenter="showTooltip" @mouseleave="hideTooltip">Hover me</button>

    <div v-if="context.open.value" ref="floatingEl" :style="{ ...context.floatingStyles.value }">
      This is a tooltip positioned by V-Float
    </div>
  </main>
</template>
```

## Browser Support

V-Float supports all modern, evergreen browsers:

- Chrome (and Chromium-based browsers)
- Firefox
- Safari
- iOS Safari
- Android browsers

For older browser compatibility, you may need to provide polyfills for APIs such as `ResizeObserver` and `Promise`.

## What's next

You have successfully created your first floating element with V-Float. To continue learning, explore the following resources:

- [**Core Concepts**](./concepts.md)
- [**Floating Tree**](./floating-tree/floating-tree-introduction.md)
- [**Interactions**](./interactions.md)
- [**V-Float on GitHub**](https://github.com/sherif414/VFloat): Report issues or contribute to the project.
