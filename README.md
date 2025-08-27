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
    onEscape: () => context.setOpen(false)
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
- **`arrow`**: Position arrow elements (via `useArrow`)

## Advanced Features

### Floating Trees

For nested floating elements like submenus, you need to manage the tree structure explicitly. `useFloating` creates
contexts for individual floating elements, and `useFloatingTree` manages their hierarchical relationship.

Here's how you can set up a parent menu with a submenu:

```vue

<script setup lang="ts">
  import { useTemplateRef } from "vue";
  import { useFloating, useFloatingTree, offset } from "v-float";

  const parentTriggerEl = useTemplateRef("parentTriggerRef");
  const parentMenuEl = useTemplateRef("parentMenuRef");

  const submenuTriggerEl = useTemplateRef("submenuTriggerRef");
  const submenuEl = useTemplateRef("submenuRef");

  // 1. Create the floating context for the parent menu.
  const parentContext = useFloating(parentTriggerEl, parentMenuEl, {
    placement: "bottom-start",
    middlewares: [offset(4)],
  });

  // 2. Create the floating tree, using the parent's context as the data for the root node.
  //    useFloatingTree will create a root TreeNode whose `data` is parentContext.
  const tree = useFloatingTree(parentContext);

  // 3. Create the floating context for the submenu.
  const submenuContext = useFloating(submenuTriggerEl, submenuEl, {
    placement: "right-start",
    middlewares: [offset(4)],
  });

  // 4. Add the submenu to the tree as a child of the parent menu.
  //    tree.root refers to the TreeNode associated with parentContext.
  const submenuNode = tree.addNode(submenuContext, tree.root.id);
  // submenuNode is the TreeNode for the submenu. You can store it if needed.
</script>

<template>
  <!-- Parent Menu Trigger -->
  <button ref="parentTriggerEl">Open Menu</button>

  <!-- Parent Menu Floating Element -->
  <div
    v-if="parentContext.open.value"
    ref="parentMenuEl"
    :style="parentContext.floatingStyles.value"
    style="background-color: #f0f0f0; border: 1px solid #ccc; padding: 5px; z-index: 1000;"
  >
    <div>Parent Menu Item 1</div>

    <!-- Submenu Trigger (an item within the parent menu) -->
    <div
      ref="submenuTriggerEl"
      style="padding: 5px; cursor: pointer; hover: background-color: #e0e0e0;"
      @mouseenter="() => submenuContext?.setOpen(true)" @mouseleave="() => submenuContext?.setOpen(false)"
    >
    Parent Menu Item 2 (Hover for Submenu)

    <!-- Submenu Floating Element -->
    <div
      v-if="submenuContext.open.value"
      ref="submenuEl"
      :style="submenuContext.floatingStyles.value"
      style="background-color: #e0e0e0; border: 1px solid #bbb; padding: 5px; margin-left: 10px; z-index: 1010;"
    >
      <div>Submenu Item A</div>
      <div>Submenu Item B</div>
    </div>
  </div>
</template>
```

This example demonstrates the manual process of creating contexts and then linking them within the tree. For more
complex scenarios, you would integrate interaction composables (`useClick`, `useHover`, `useEscapeKey`) to manage the
`open` state of each context, potentially using tree methods like `tree.isTopmost()` or `tree.forEach()` to coordinate
behavior (e.g., closing child menus when a parent closes).

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
