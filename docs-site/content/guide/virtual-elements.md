# Virtual Elements

Sometimes you need to position a floating element relative to a virtual point rather than a DOM element. V-Float allows you to use "virtual elements" as reference points, enabling advanced use cases like context menus, pointer-following tooltips, and more.

## Learning Outcomes

- Understand what a virtual element is and when to use it
- Use a `VirtualElement` with `useFloating(anchorEl, floatingEl, options)`
- Build dynamic, pointer-following experiences and static context menus

## TL;DR (Quick Start)

```vue
<script setup>
import { ref } from "vue"
import { useFloating } from "v-float"

const floatingEl = ref(null)

// Minimal virtual element at fixed coordinates
const virtualRef = ref({
  getBoundingClientRect() {
    return { x: 100, y: 100, top: 100, left: 100, right: 100, bottom: 100, width: 0, height: 0 }
  },
})

const context = useFloating(virtualRef, floatingEl)
</script>
```

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

const floatingEl = ref(null)
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

const context = useFloating(virtualRef, floatingEl)
</script>

<template>
  <div ref="floatingEl" :style="context.floatingStyles">Floating content</div>
</template>
```

## Dynamic Virtual Elements

Virtual elements can be updated dynamically, such as following the mouse cursor:

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useFloating } from "v-float"

const floatingEl = ref(null)
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

const context = useFloating(virtualRef, floatingEl, {
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
})

// Update mouse position and floating position
function onMouseMove(e) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY

  // Force update the position
  if (isOpen.value) {
    context.update()
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
  <div v-if="isOpen" ref="floatingEl" :style="context.floatingStyles" class="tooltip">
    Current mouse position: {{ Math.round(mouseX) }}, {{ Math.round(mouseY) }}
  </div>
</template>
```

## Pointer-Based Positioning with useClientPoint

While you can manually create virtual elements that track pointer coordinates (as shown in the examples above), V-Float provides the `useClientPoint` composable to simplify this common pattern. `useClientPoint` is a positioning utility that automatically manages virtual elements at pointer coordinates, integrating seamlessly with `useFloating`.

### What is useClientPoint?

`useClientPoint` is a positioning utility, not an interaction handler. It focuses solely on determining WHERE a floating element should appear based on pointer coordinates, not WHEN it should open or close. Think of it as a specialized tool for creating pointer-following experiences.

### Relationship to useFloating

`useClientPoint` works by updating the `anchorEl` reference in your floating context with a virtual element positioned at the pointer coordinates. This means:

1. You create a floating context with `useFloating`
2. `useClientPoint` automatically updates the anchor to follow the pointer
3. `useFloating` handles the actual positioning calculations

This separation of concerns keeps your code clean and composable.

### Basic Example

Here's how to use `useClientPoint` for a tooltip that follows the mouse:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClientPoint, useHover } from "v-float"

const trackingArea = ref(null)
const anchor = ref(null)
const floating = ref(null)

// Create floating context
const context = useFloating(anchor, floating, {
  placement: "right-start",
})

// Track pointer within the tracking area
useClientPoint(trackingArea, context)

// Control visibility with hover
useHover(context)
</script>

<template>
  <div ref="trackingArea" class="tracking-area">
    Move your mouse here
    <div v-if="context.open.value" ref="floating" :style="context.floatingStyles" class="tooltip">
      Tooltip follows cursor
    </div>
  </div>
</template>
```

### Tracking Modes

`useClientPoint` supports two tracking modes:

#### Follow Mode (Default)

The floating element continuously follows the pointer as it moves:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClientPoint } from "v-float"

const area = ref(null)
const anchor = ref(null)
const floating = ref(null)

const context = useFloating(anchor, floating)

// Continuously follow the pointer
useClientPoint(area, context, {
  trackingMode: "follow",
})
</script>
```

#### Static Mode

The floating element stays at the initial pointer position (useful for context menus):

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClientPoint, useClick } from "v-float"

const area = ref(null)
const anchor = ref(null)
const floating = ref(null)

const context = useFloating(anchor, floating, {
  placement: "bottom-start",
})

// Position at click point, don't follow
useClientPoint(area, context, {
  trackingMode: "static",
})

// Open on click
useClick(context)
</script>

<template>
  <div ref="area" class="clickable-area">
    Click anywhere
    <div v-if="context.open.value" ref="floating" :style="context.floatingStyles" class="menu">
      <ul>
        <li>Option 1</li>
        <li>Option 2</li>
        <li>Option 3</li>
      </ul>
    </div>
  </div>
</template>
```

### Axis Constraints

You can constrain pointer tracking to a single axis:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClientPoint } from "v-float"

const area = ref(null)
const anchor = ref(null)
const floating = ref(null)

const context = useFloating(anchor, floating)

// Only follow horizontal movement
useClientPoint(area, context, {
  axis: "x",
})
</script>
```

Available axis options:
- `'both'` (default): Track both X and Y coordinates
- `'x'`: Only track horizontal movement
- `'y'`: Only track vertical movement

### Controlled Mode

For advanced use cases, you can control the position programmatically:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClientPoint } from "v-float"

const area = ref(null)
const anchor = ref(null)
const floating = ref(null)
const x = ref(200)
const y = ref(100)

const context = useFloating(anchor, floating)

// Control position externally
const { updatePosition } = useClientPoint(area, context, {
  x,
  y,
})

// Programmatically update position
function moveToCenter() {
  updatePosition(window.innerWidth / 2, window.innerHeight / 2)
}
</script>
```

### Context Menu Example with useClientPoint

Here's a cleaner implementation of a context menu using `useClientPoint`:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClientPoint, offset, flip, shift } from "v-float"

const area = ref(null)
const anchor = ref(null)
const menu = ref(null)
const isOpen = ref(false)

const context = useFloating(anchor, menu, {
  middlewares: [offset(5), flip(), shift({ padding: 8 })],
  placement: "bottom-start",
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
})

// Position at right-click point (static mode)
useClientPoint(area, context, {
  trackingMode: "static",
})

// Handle right click
function onContextMenu(e) {
  e.preventDefault()
  isOpen.value = true

  // Force update after setting new coordinates
  context.update()
}

// Close menu when clicking outside
function onDocumentClick(e) {
  if (isOpen.value && menu.value && !menu.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  area.value?.addEventListener("contextmenu", onContextMenu)
  document.addEventListener("click", onDocumentClick)
})

onUnmounted(() => {
  area.value?.removeEventListener("contextmenu", onContextMenu)
  document.removeEventListener("click", onDocumentClick)
})
</script>

<template>
  <div ref="area" class="content-area">
    Right-click anywhere in this area
    <div v-if="isOpen" ref="menu" :style="context.floatingStyles" class="context-menu">
      <ul>
        <li>Cut</li>
        <li>Copy</li>
        <li>Paste</li>
        <li>Delete</li>
      </ul>
    </div>
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

1. **Update on changes**: Call `context.update()` whenever the virtual element's position changes.
2. **Zero dimensions**: For point-like virtual elements, set width and height to 0.
3. **Set contextElement**: If your virtual element exists within a scrollable container, set contextElement.
4. **Middleware**: Use middleware like `offset` to prevent the floating element from appearing directly on top of the virtual point.
5. **Cleanup**: Remove event listeners when the component is unmounted.

By leveraging virtual elements, V-Float gives you the flexibility to position floating elements anywhere in your UI, not just relative to DOM elements.

## See Also

- [useFloating](/api/use-floating)
- [useClientPoint](/api/use-client-point)
- [useHover](/api/use-hover)
