# useHover

The `useHover` composable enables hover-based interactions for floating elements. It provides a way to show and hide floating UI elements when the user hovers over a reference element.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useInteractions, useHover } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Create hover interaction with default options
const hover = useHover(floating.context)

// Apply the interactions
const { getReferenceProps, getFloatingProps } = useInteractions([hover])
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Hover Me</button>

  <div v-if="isOpen" ref="floatingRef" v-bind="getFloatingProps()" :style="floating.floatingStyles">
    This tooltip appears on hover
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useHover(
  context: FloatingContext,
  options?: UseHoverOptions
): {
  getReferenceProps: (userProps?: object) => object
  getFloatingProps: (userProps?: object) => object
}
```

| Parameter | Type            | Description                                  |
| --------- | --------------- | -------------------------------------------- |
| context   | FloatingContext | The context object returned from useFloating |
| options   | UseHoverOptions | Optional configuration options               |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useHover` composable accepts several options to customize its behavior:

| Option      | Type                                               | Default | Description                                                                      |
| ----------- | -------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| enabled     | boolean \| Ref&lt;boolean&gt;                      | true    | Whether the hover interaction is enabled                                         |
| delay       | number \| { open?: number; close?: number } \| Ref | 0       | Delay in ms before showing/hiding the floating element                           |
| handleClose | null \| (context: FloatingContext) => void         | null    | Custom close handling logic                                                      |
| restMs      | number                                             | 0       | Time in ms to wait before triggering a hover event after the cursor has "rested" |
| move        | boolean                                            | true    | Whether to update the position when the cursor moves                             |

### Return Value

`useHover` returns an object with functions that generate props:

| Property          | Type                           | Description                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element |
| getFloatingProps  | (userProps?: object) => object | Function that returns props to apply to the floating element  |

## Adding Hover Delay

One of the most common customizations is adding a delay to hover interactions to prevent the UI from flickering when the user briefly moves their cursor over the reference element:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Add delay for both opening and closing
const hover = useHover(floating.context, {
  delay: 300, // 300ms delay for both open and close
})

// Or different delays for opening and closing
const hoverWithCustomDelay = useHover(floating.context, {
  delay: {
    open: 500, // Wait 500ms before opening
    close: 150, // Wait 150ms before closing
  },
})

const { getReferenceProps, getFloatingProps } = useInteractions([hover])
</script>
```

## Making Hover Delay Reactive

You can make the hover delay reactive by using a ref:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useInteractions, useHover } from "v-float"

const hoverDelay = ref(300)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Use reactive delay
const hover = useHover(floating.context, {
  delay: hoverDelay,
})

// Later you can update the delay
function setFasterDelay() {
  hoverDelay.value = 150
}
</script>
```

## Conditionally Enabling Hover

You can conditionally enable or disable the hover interaction:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useInteractions, useHover } from "v-float"

// Control whether hover is enabled
const hoverEnabled = ref(true)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Use reactive enabled option
const hover = useHover(floating.context, {
  enabled: hoverEnabled,
})

// Later in your component
function disableHover() {
  hoverEnabled.value = false
}

function enableHover() {
  hoverEnabled.value = true
}
</script>
```

## Cursor Resting Time

The `restMs` option allows you to set a minimum time that the cursor must "rest" over the element before the hover interaction is triggered:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Only trigger hover after cursor has rested for 100ms
const hover = useHover(floating.context, {
  restMs: 100,
})
</script>
```

This is useful for preventing tooltips from appearing when a user is just moving their cursor across the screen.

## Disabling Move Updates

By default, `useHover` will update the position of the floating element as the cursor moves. You can disable this behavior with the `move` option:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Disable position updates on cursor movement
const hover = useHover(floating.context, {
  move: false,
})
</script>
```

## Combining with Other Interactions

`useHover` is commonly combined with other interaction composables for a better user experience:

```vue
<script setup>
import { useFloating, useInteractions, useHover, useFocus, useRole } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Hover interaction
const hover = useHover(floating.context, {
  delay: { open: 200, close: 100 },
})

// Focus interaction (for accessibility)
const focus = useFocus(floating.context)

// Role for proper ARIA attributes
const role = useRole(floating.context, { role: "tooltip" })

// Combine all interactions
const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role])
</script>
```

This creates a tooltip that appears both on hover and on focus, with proper ARIA attributes for accessibility.

## Usage with FloatingDelayGroup

For UIs with multiple hover elements that should share delay settings, you can use `useHover` with the `FloatingDelayGroup` component:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useInteractions, useHover, FloatingDelayGroup, useDelayGroup } from "v-float"

const isOpen = ref(false)
const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Set an ID for this floating element
const id = "tooltip-1"

// Access delay group context
const { delay } = useDelayGroup(floating.context, { id })

// Use shared delay from the group
const hover = useHover(floating.context, { delay })

const { getReferenceProps, getFloatingProps } = useInteractions([hover])
</script>

<template>
  <!-- Wrap multiple tooltips in a delay group -->
  <FloatingDelayGroup :delay="{ open: 500, close: 100 }">
    <!-- First tooltip -->
    <button ref="referenceRef" v-bind="getReferenceProps()">Hover Me</button>

    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
    >
      This tooltip uses shared delay settings
    </div>

    <!-- Add more tooltips here... -->
  </FloatingDelayGroup>
</template>
```

This ensures all hover elements in the group share the same delay settings and behavior.

## Example: Interactive Tooltip

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useInteractions,
  useHover,
  useFocus,
  useRole,
  offset,
  flip,
  shift,
} from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const isOpen = ref(false)

const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [offset(10), flip(), shift({ padding: 5 })],
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Create interactions
const hover = useHover(floating.context, {
  delay: { open: 300, close: 200 },
  move: true,
})

const focus = useFocus(floating.context)
const role = useRole(floating.context, { role: "tooltip" })

// Combine them
const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role])
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()" class="info-button">
    <span class="icon">ℹ️</span>
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="tooltip"
  >
    <p>This is an interactive tooltip with hover delay for a smoother user experience.</p>
    <button @click="isOpen = false" class="close-button">Close</button>
  </div>
</template>

<style scoped>
.info-button {
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  border: none;
  cursor: pointer;
}

.info-button:hover {
  background: #d0d0d0;
}

.tooltip {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 300px;
}

.close-button {
  font-size: 12px;
  padding: 2px 6px;
  margin-top: 8px;
}
</style>
```

## Best Practices

1. **Always add a delay**: Adding at least a small delay (100-300ms) improves the user experience by preventing flickering for accidental hovers.

2. **Combine with focus**: Always combine `useHover` with `useFocus` for better accessibility, ensuring keyboard users can also access the content.

3. **Consider mobile users**: Hover doesn't work on mobile devices, so provide alternative interaction methods like click or touch.

4. **Use with ARIA attributes**: Combine with `useRole` to ensure proper accessibility for screen readers.

5. **Set appropriate z-index**: Ensure your floating element has a suitable z-index to appear above other content.

6. **Handle edge cases**: Consider what happens when users hover quickly between multiple elements with the `FloatingDelayGroup` component.
