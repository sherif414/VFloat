# FloatingPortal

The `FloatingPortal` component renders its content in a different part of the DOM tree, typically the document body. This is essential for floating elements like tooltips, popovers, and modals to avoid clipping issues caused by parent elements with `overflow` styles or z-index stacking contexts.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, FloatingPortal } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});
</script>

<template>
  <button ref="referenceRef">Toggle Portal</button>

  <FloatingPortal>
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
      Content rendered in a portal
    </div>
  </FloatingPortal>
</template>
```

## Props

<script setup>
import { ref } from 'vue'
</script>

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>root</td>
      <td>String | Element</td>
      <td>document.body</td>
      <td>The DOM element where the portal content will be rendered</td>
    </tr>
    <tr>
      <td>id</td>
      <td>String</td>
      <td>auto-generated</td>
      <td>ID for the portal container element</td>
    </tr>
    <tr>
      <td>preserveTabOrder</td>
      <td>Boolean</td>
      <td>true</td>
      <td>Whether to maintain the tab order relative to the reference element</td>
    </tr>
  </tbody>
</table>

## Features

### Automatic Portal Container

By default, `FloatingPortal` creates a container element (a `<div>`) inside the document body where it will render its content. This container has an auto-generated ID that ensures stability across renders.

If you want to specify a custom element or location for the portal content, you can use the `root` prop:

```vue
<FloatingPortal :root="document.getElementById('my-portal-root')">
  <div v-if="isOpen" ref="floatingRef">
    Content rendered in a specific element
  </div>
</FloatingPortal>
```

### Tab Order Preservation

When navigating with the Tab key, the browser follows the order of elements in the DOM. However, since a portal renders content in a different location in the DOM, this can disrupt the natural tab order of your application.

By default, `FloatingPortal` preserves the tab order of your application by automatically adding hidden elements that redirect focus. This ensures that when a user tabs out of the portal content, focus correctly moves to the next focusable element in the document.

You can disable this behavior by setting `preserveTabOrder` to `false`:

```vue
<FloatingPortal :preserve-tab-order="false">
  <!-- Portal content -->
</FloatingPortal>
```

## Advanced Usage

### Multiple Portals

You can have multiple instances of `FloatingPortal` in your application. Each instance will create its own container with a unique ID:

```vue
<template>
  <FloatingPortal>
    <div v-if="isTooltipOpen" ref="tooltipRef">Tooltip content</div>
  </FloatingPortal>

  <FloatingPortal>
    <div v-if="isModalOpen" ref="modalRef">Modal content</div>
  </FloatingPortal>
</template>
```

### Nested Portals

You can nest `FloatingPortal` components to create complex UI structures while maintaining proper stacking:

```vue
<template>
  <FloatingPortal>
    <div v-if="isModalOpen" ref="modalRef">
      Modal content

      <FloatingPortal>
        <div v-if="isTooltipOpen" ref="tooltipRef">Tooltip inside modal</div>
      </FloatingPortal>
    </div>
  </FloatingPortal>
</template>
```

### Using with FloatingFocusManager

The `FloatingPortal` component works well with `FloatingFocusManager` for accessibility:

```vue
<template>
  <FloatingPortal>
    <FloatingFocusManager v-if="isOpen" :context="floating.context">
      <div ref="floatingRef">
        <button>Focus 1</button>
        <button>Focus 2</button>
      </div>
    </FloatingFocusManager>
  </FloatingPortal>
</template>
```

This combination ensures that:

1. The content appears outside of clipping contexts (via the portal)
2. Keyboard focus is properly trapped within the floating element (via the focus manager)

## Common Issues

### Z-Index

Even though the content is rendered in a portal, you may still need to specify a z-index to ensure it appears above other content on the page:

```vue
<FloatingPortal>
  <div 
    v-if="isOpen" 
    ref="floatingRef"
    :style="{
      position: floating.strategy,
      top: '0px',
      left: '0px',
      transform: `translate(${floating.x}px, ${floating.y}px)`,
      zIndex: 999
    }"
  >
    Portal content with z-index
  </div>
</FloatingPortal>
```
