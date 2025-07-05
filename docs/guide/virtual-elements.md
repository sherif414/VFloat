# Virtual Elements

Sometimes you need to position a floating element relative to a virtual point rather than a DOM element. V-Float allows you to use "virtual elements" as reference points, enabling advanced use cases like context menus, pointer-following tooltips, and more.

## What are Virtual Elements?

A virtual element is an object that implements the minimal interface required by Floating UI's positioning logic:

```ts
interface VirtualElement {
  getBoundingClientRect(): {
    x: number
    y: number
    top: number
    left: number
    right: number
    bottom: number
    width: number
    height: number
  }
  contextElement?: Element
}
```

The key method is `getBoundingClientRect()`, which returns the same data structure as the DOM method of the same name. This allows V-Float to position floating elements relative to arbitrary coordinates.

## Use Cases for Virtual Elements

Virtual elements are particularly useful for:

- **Context menus**: Position relative to the mouse click point
- **Tooltips that follow the cursor**: Update position based on mouse movement
- **Custom reference points**: Position relative to a specific point in the UI
- **Grid selection**: Position based on selected cells or ranges
- **Map markers**: Position tooltips at specific geographic coordinates

## Creating a Virtual Element

Here's how to create a basic virtual element at fixed coordinates:

```js
import { ref } from "vue"

const virtualRef = ref({
  getBoundingClientRect() {
    return {
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 100,
      bottom: 100,
      width: 0,
      height: 0,
    }
  },
})
```

## Using with useFloating

Use the virtual element just like you would use a regular DOM element ref:

```vue
<script setup>
import { ref } from "vue"
import { useFloating } from "v-float"

const floatingRef = ref(null)
const virtualRef = ref({
  getBoundingClientRect() {
    return {
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 100,
      bottom: 100,
      width: 0,
      height: 0,
    }
  },
})

const floating = useFloating({
  elements: {
    reference: virtualRef,
    floating: floatingRef,
  },
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})
</script>

<template>
  <div v-if="isOpen" ref="floatingRef" :style="floating.floatingStyles">Floating content</div>
</template>
```

## Dynamic Virtual Elements

Virtual elements can be updated dynamically, such as following the mouse cursor:

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useFloating } from "v-float"

const floatingRef = ref(null)
const isOpen = ref(false)

// Create a virtual element that follows the mouse
const virtualRef = ref({
  getBoundingClientRect() {
    return {
      x: mouseX.value,
      y: mouseY.value,
      top: mouseY.value,
      left: mouseX.value,
      right: mouseX.value,
      bottom: mouseY.value,
      width: 0,
      height: 0,
    }
  },
})

// Track mouse position
const mouseX = ref(0)
const mouseY = ref(0)

const floating = useFloating({
  elements: {
    reference: virtualRef,
    floating: floatingRef,
  },
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Update mouse position and floating position
function onMouseMove(e) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY

  // Force update the position
  if (isOpen.value) {
    floating.update()
  }
}

// Toggle the floating element
function onMouseDown() {
  isOpen.value = !isOpen.value
}

// Set up and clean up event listeners
onMounted(() => {
  window.addEventListener("mousemove", onMouseMove)
  window.addEventListener("mousedown", onMouseDown)
})

onUnmounted(() => {
  window.removeEventListener("mousemove", onMouseMove)
  window.removeEventListener("mousedown", onMouseDown)
})
</script>

<template>
  <div v-if="isOpen" ref="floatingRef" :style="floating.floatingStyles" class="tooltip">
    Current mouse position: {{ Math.round(mouseX) }}, {{ Math.round(mouseY) }}
  </div>
</template>
```

## Using contextElement for Proper Scrolling

The `contextElement` property is important when your virtual element should be positioned relative to a scrollable container:

```js
const scrollableContainerRef = ref(null)

const virtualRef = ref({
  getBoundingClientRect() {
    return {
      // Position calculation...
      x: 100,
      y: 100,
      // ...
    }
  },
  // This tells Floating UI which element's scroll events to listen to
  contextElement: scrollableContainerRef.value,
})
```

## Example: Context Menu

Here's an example of a context menu positioned where the user right-clicks:

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useFloating, offset, flip, shift } from "v-float"

const menuRef = ref(null)
const isOpen = ref(false)

// Virtual element for right-click position
const virtualRef = ref({
  getBoundingClientRect() {
    return {
      x: clickX.value,
      y: clickY.value,
      top: clickY.value,
      left: clickX.value,
      right: clickX.value,
      bottom: clickY.value,
      width: 0,
      height: 0,
    }
  },
})

// Track click position
const clickX = ref(0)
const clickY = ref(0)

const floating = useFloating({
  elements: {
    reference: virtualRef,
    floating: menuRef,
  },
  middleware: [offset(5), flip(), shift({ padding: 8 })],
  placement: "bottom-start",
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Handle right click
function onContextMenu(e) {
  e.preventDefault()
  clickX.value = e.clientX
  clickY.value = e.clientY
  isOpen.value = true

  // Force update after setting new coordinates
  floating.update()
}

// Close menu when clicking outside
function onDocumentClick(e) {
  if (isOpen.value && menuRef.value && !menuRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener("contextmenu", onContextMenu)
  document.addEventListener("click", onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener("contextmenu", onContextMenu)
  document.removeEventListener("click", onDocumentClick)
})
</script>

<template>
  <div v-if="isOpen" ref="menuRef" :style="floating.floatingStyles" class="context-menu">
    <ul>
      <li>Cut</li>
      <li>Copy</li>
      <li>Paste</li>
      <li>Delete</li>
    </ul>
  </div>
</template>

<style scoped>
.context-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 160px;
}

.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.context-menu li {
  padding: 8px 16px;
  cursor: pointer;
}

.context-menu li:hover {
  background-color: #f5f5f5;
}
</style>
```

## Best Practices

1. **Update on changes**: Call `floating.update()` whenever the virtual element's position changes.
2. **Zero dimensions**: For point-like virtual elements, set width and height to 0.
3. **Set contextElement**: If your virtual element exists within a scrollable container, set contextElement.
4. **Middleware**: Use middleware like `offset` to prevent the floating element from appearing directly on top of the virtual point.
5. **Cleanup**: Remove event listeners when the component is unmounted.

By leveraging virtual elements, V-Float gives you the flexibility to position floating elements anywhere in your UI, not just relative to DOM elements.
