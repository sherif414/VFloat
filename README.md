# V-Float

A Vue 3 library for positioning floating UI elements like tooltips, popovers, dropdowns, and modals. Built on top of [VFloat](https://vfloat.pages.com/) with Vue 3 Composition API.

## Features

- **Precise Positioning**: Pixel-perfect positioning with automatic collision detection
- **Vue 3 Composables**: Reactive composables designed for the Composition API
- **Interaction Handling**: Built-in hover, focus, click, and dismiss behaviors
- **Nested Elements**: Support for floating element trees and hierarchies
- **Ready-to-use Components**: Pre-built components like `FloatingArrow`
- **Lightweight**: Tree-shakable with minimal bundle impact
- **Cross-platform**: Works on desktop, mobile, and touch devices
- **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
# With pnpm (recommended)
pnpm add v-float

# With npm
npm install v-float

# With yarn
yarn add v-float
```

## Quick Start

### Basic Tooltip

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue"
import { useFloating, useHover, offset } from "v-float"

const anchorEl = useTemplateRef("anchorEl")
const floatingEl = useTemplateRef("floatingEl")

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
})

useHover(context)
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    This is a tooltip
  </div>
</template>
```

### Dropdown Menu

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue"
import { useFloating, useClick, useDismiss, offset, flip, shift } from "v-float"

const triggerEl = useTemplateRef("triggerEl")
const menuEl = useTemplateRef("menuEl")

const context = useFloating(triggerEl, menuEl, {
  placement: "bottom-start",
  middlewares: [offset(4), flip(), shift({ padding: 8 })],
})

useClick(context)
useDismiss(context)
</script>

<template>
  <button ref="triggerEl">Open Menu</button>

  <div v-if="context.open.value" ref="menuEl" :style="context.floatingStyles.value">
    <div>Menu Item 1</div>
    <div>Menu Item 2</div>
    <div>Menu Item 3</div>
  </div>
</template>
```

## Core Composables

### Positioning

- **`useFloating`**: Core positioning logic with middleware support
- **`useArrow`**: Position arrow elements pointing to the anchor
- **`useFloatingTree`**: Manage nested floating element hierarchies

### Interactions

- **`useHover`**: Hover interactions with configurable delays and safe areas
- **`useFocus`**: Focus/blur event handling for keyboard navigation
- **`useClick`**: Click event handling with toggle and dismiss options
- **`useDismiss`**: Close on outside click, ESC key, or scroll events
- **`useClientPoint`**: Position floating elements at cursor/touch coordinates

### Middleware

All [Floating UI middleware](https://floating-ui.com/docs/middleware) are supported:

- **`offset`**: Add distance between anchor and floating element
- **`flip`**: Flip placement when there's insufficient space
- **`shift`**: Shift floating element to stay in view
- **`hide`**: Hide floating element when anchor is not visible
- **`arrow`**: Position arrow elements (via `useArrow`)

## Components

### FloatingArrow

Pre-built SVG arrow component with automatic positioning:

```vue
<script setup lang="ts">
import { FloatingArrow, useFloating, useArrow } from "v-float"

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [arrow({ element: arrowEl })],
})
</script>

<template>
  <div ref="floatingEl" :style="context.floatingStyles.value">
    Tooltip content
    <FloatingArrow :context="context" fill="white" />
  </div>
</template>
```

## Advanced Features

### Floating Trees

For nested floating elements like submenus:

```vue
<script setup lang="ts">
import { useFloatingTree, useFloating } from "v-float"

// Parent menu
const parentTree = useFloatingTree()
const parentContext = useFloating(triggerEl, menuEl, {
  tree: parentTree,
})

// Submenu
const submenuContext = useFloating(submenuTriggerEl, submenuEl, {
  tree: parentTree,
})
</script>
```

### Virtual Elements

Position relative to virtual coordinates:

```vue
<script setup lang="ts">
import { useFloating, useClientPoint } from "v-float"

const virtualEl = ref({
  getBoundingClientRect: () => ({
    x: 100,
    y: 100,
    width: 0,
    height: 0,
    top: 100,
    left: 100,
    right: 100,
    bottom: 100,
  }),
})

const context = useFloating(virtualEl, floatingEl)
useClientPoint(context) // Follow mouse cursor
</script>
```

## TypeScript Support

V-Float is built with TypeScript and provides comprehensive type definitions:

```typescript
import type { FloatingContext, UseFloatingOptions, AnchorElement, FloatingElement } from "v-float"
```

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Mobile browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **Node.js**: SSR compatible (with proper hydration)

## Documentation

For complete documentation with interactive examples, visit the [V-Float Documentation](https://v-float.com).

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our [GitHub repository](https://github.com/v-float/v-float).

## License

MIT License - see [LICENSE](LICENSE) file for details.
