# V-Float

A Vue 3 library for positioning floating UI elements like tooltips, popovers, dropdowns, and modals. Built on top
of [VFloat](https://vfloat.pages.com/) with Vue 3 Composition API.

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
import { useFloating, useClick, useEscapeKey, offset, flip, shift } from "v-float"

const triggerEl = useTemplateRef("triggerEl")
const menuEl = useTemplateRef("menuEl")

const context = useFloating(triggerEl, menuEl, {
  placement: "bottom-start",
  middlewares: [offset(4), flip(), shift({ padding: 8 })],
})

useClick(context)
useEscapeKey({
  onEscape: () => context.setOpen(false),
})
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

### Tooltip with Arrow

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue"
import { useFloating, useHover, useArrow, offset, flip } from "v-float"

const anchorEl = useTemplateRef("anchorEl")
const tooltipEl = useTemplateRef("tooltipEl")
const arrowEl = useTemplateRef("arrowEl")

const context = useFloating(anchorEl, tooltipEl, {
  placement: "top",
  middlewares: [offset(8), flip()],
})

useHover(context)

// Arrow middleware is automatically registered
const { arrowStyles } = useArrow(arrowEl, context, {
  offset: "-4px",
})
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div
    v-if="context.open.value"
    ref="tooltipEl"
    :style="context.floatingStyles.value"
    class="tooltip"
  >
    This is a tooltip with an arrow
    <div ref="arrowEl" class="arrow" :style="arrowStyles"></div>
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

## Core Composables

### Positioning

- **`useFloating`**: Core positioning logic with middleware support
- **`useArrow`**: Position arrow elements pointing to the anchor
- **`useFloatingTree`**: Manage nested floating element hierarchies

### Interactions

- **`useHover`**: Hover interactions with configurable delays
- **`useFocus`**: Focus/blur event handling for keyboard navigation
- **`useClick`**: Click event handling with toggle and dismiss options
- **`useEscapeKey`**: Close on ESC key press with composition handling
- **`useClientPoint`**: Position floating elements at cursor/touch coordinates

### Middleware

All [Floating UI middleware](https://floating-ui.com/docs/middleware) are supported:

- **`offset`**: Add distance between anchor and floating element
- **`flip`**: Flip placement when there's insufficient space
- **`shift`**: Shift floating element to stay in view
- **`hide`**: Hide floating element when anchor is not visible

**Arrow positioning** is handled by the [`useArrow`](/api/use-arrow) composable, which automatically registers the necessary middleware.

## Advanced Features

### Floating Trees

For nested floating elements like submenus, use `useFloatingTree` to manage hierarchical structures with a streamlined API that eliminates redundant `useFloating` calls.

**Clear Separation of Concerns:**

- Use `useFloating` for isolated floating elements
- Use `useFloatingTree` for hierarchical structures

Here's how you can set up a parent menu with a submenu using the new API:

```vue
<script setup lang="ts">
import { useTemplateRef, ref } from "vue"
import { useFloatingTree, useHover, useClick, offset, flip, shift } from "v-float"

const parentTriggerEl = useTemplateRef("parentTriggerRef")
const parentMenuEl = useTemplateRef("parentMenuRef")
const isParentOpen = ref(false)

const submenuTriggerEl = useTemplateRef("submenuTriggerRef")
const submenuEl = useTemplateRef("submenuRef")
const isSubmenuOpen = ref(false)

// 1. Create the floating tree with root context automatically
const tree = useFloatingTree(parentTriggerEl, parentMenuEl, {
  placement: "bottom-start",
  open: isParentOpen,
  middlewares: [offset(4), flip(), shift({ padding: 8 })],
})

// 2. Add submenu node - no separate useFloating call needed!
const submenuNode = tree.addNode(submenuTriggerEl, submenuEl, {
  placement: "right-start",
  open: isSubmenuOpen,
  middlewares: [offset(4), flip(), shift({ padding: 8 })],
  parentId: tree.root.id, // Link to parent using parentId in options
})

// 3. Add interactions
useClick(tree.root, { outsideClick: true })
useHover(submenuNode, { delay: { open: 100, close: 300 } })

// Access floating styles from the contexts
const { floatingStyles: parentStyles } = tree.rootContext
const { floatingStyles: submenuStyles } = submenuNode.data
</script>

<template>
  <!-- Parent Menu Trigger -->
  <button ref="parentTriggerEl" @click="isParentOpen = !isParentOpen">Open Menu</button>

  <!-- Parent Menu -->
  <div v-if="isParentOpen" ref="parentMenuEl" :style="parentStyles" class="menu">
    <div class="menu-item">Menu Item 1</div>

    <!-- Submenu Trigger -->
    <div
      ref="submenuTriggerEl"
      class="menu-item menu-item--submenu"
      @click="isSubmenuOpen = !isSubmenuOpen"
    >
      Menu Item 2 (Has Submenu)

      <!-- Submenu -->
      <div v-if="isSubmenuOpen" ref="submenuEl" :style="submenuStyles" class="menu submenu">
        <div class="menu-item">Submenu Item A</div>
        <div class="menu-item">Submenu Item B</div>
        <div class="menu-item">Submenu Item C</div>
      </div>
    </div>

    <div class="menu-item">Menu Item 3</div>
  </div>
</template>

<style scoped>
.menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  z-index: 1000;
}

.submenu {
  margin-left: 8px;
  z-index: 1010;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item--submenu {
  position: relative;
}
</style>
```

**API Benefits:**

```ts
// Before: Required separate useFloating calls
const parentContext = useFloating(parentEl, parentFloating, options)
const tree = useFloatingTree(parentContext)
const childContext = useFloating(childEl, childFloating, childOptions)
const childNode = tree.addNode(childContext, parentContext.nodeId)

// After: Streamlined API with internal context creation
const tree = useFloatingTree(parentEl, parentFloating, options)
const childNode = tree.addNode(childEl, childFloating, {
  ...childOptions,
  parentId: tree.root.id,
})
```

This approach eliminates redundant calls and provides a clearer separation between isolated floating elements (`useFloating`) and hierarchical structures (`useFloatingTree`).

## TypeScript Support

V-Float is built with TypeScript and provides comprehensive type definitions:

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Mobile browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **Node.js**: SSR compatible (with proper hydration)

## Documentation

For complete documentation with interactive examples, visit the [V-Float Documentation](https://vfloat.pages.dev/).

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to
our [GitHub repository](https://github.com/sherif414/VFloat).

## License

MIT License - see [LICENSE](LICENSE) file for details.
