# useHover

The `useHover` composable enables hover-based interactions for floating elements. It provides a way to show and hide floating UI elements when the user hovers over a reference element with advanced features like delays, rest detection, and safe polygon traversal.

## Basic Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Create hover interaction
useHover(context)
</script>

<template>
  <button ref="referenceRef">Hover Me</button>

  <div v-if="context.open.value" ref="floatingRef" :style="{ ...context.floatingStyles }">
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
): void
```

| Parameter | Type                | Description                                                                    |
| --------- | ------------------- | ------------------------------------------------------------------------------ |
| context   | `FloatingContext`   | The context object returned from `useFloating`. Contains refs and state.       |
| options   | `UseHoverOptions`   | Optional configuration options for hover behavior.                            |

### Options (`UseHoverOptions`)

The `useHover` composable accepts several options to customize its behavior:

| Option      | Type                                               | Default | Description                                                                      |
| ----------- | -------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| enabled     | `MaybeRef<boolean>`                                | `true`  | Whether hover event listeners are enabled                                       |
| delay       | `MaybeRef<number \| { open?: number; close?: number }>` | `0`     | Delay in milliseconds before showing/hiding the floating element                |
| restMs      | `MaybeRef<number>`                                 | `0`     | Time in milliseconds the pointer must rest before opening (when no open delay)  |
| mouseOnly   | `MaybeRef<boolean>`                                | `false` | Whether to only trigger for mouse-like pointers (mouse, pen, stylus)           |
| safePolygon | `MaybeRef<boolean \| SafePolygonOptions>`           | `false` | Enable safe polygon traversal algorithm                                         |

### Return Value

`useHover` returns `void`. It performs its actions by attaching event listeners to the reference and floating elements obtained from the `FloatingContext`.

## Adding Hover Delay

One of the most common customizations is adding a delay to hover interactions to prevent the UI from flickering when the user briefly moves their cursor over the reference element:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Add delay for both opening and closing
useHover(context, {
  delay: 300, // 300ms delay for both open and close
})

// Or different delays for opening and closing
// useHover(context, {
//   delay: {
//     open: 500, // Wait 500ms before opening
//     close: 150, // Wait 150ms before closing
//   },
// })
</script>

<template>
  <button ref="referenceRef">Hover with delay</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Delayed hover tooltip
  </div>
</template>
```

## Making Hover Delay Reactive

You can make the hover delay reactive by using a ref:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const hoverDelay = ref(300)

const context = useFloating(referenceRef, floatingRef)

// Use reactive delay
useHover(context, {
  delay: hoverDelay,
})

// Later you can update the delay
function setFasterDelay() {
  hoverDelay.value = 150
}
</script>

<template>
  <div>
    <button ref="referenceRef">Hover with reactive delay</button>
    <button @click="setFasterDelay">Make delay faster</button>
  </div>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Delay: {{ hoverDelay }}ms
  </div>
</template>
```

## Conditionally Enabling Hover

You can conditionally enable or disable the hover interaction:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
// Control whether hover is enabled
const hoverEnabled = ref(true)

const context = useFloating(referenceRef, floatingRef)

// Use reactive enabled option
useHover(context, {
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

<template>
  <div>
    <button ref="referenceRef">Conditional hover</button>
    <button @click="disableHover">Disable hover</button>
    <button @click="enableHover">Enable hover</button>
  </div>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Hover is {{ hoverEnabled ? 'enabled' : 'disabled' }}
  </div>
</template>
```

## Cursor Resting Time

The `restMs` option allows you to set a minimum time that the cursor must "rest" over the element before the hover interaction is triggered:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Only trigger hover after cursor has rested for 100ms
useHover(context, {
  restMs: 100,
})
</script>

<template>
  <button ref="referenceRef">Rest-based hover</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Triggered after resting
  </div>
</template>
```

This is useful for preventing tooltips from appearing when a user is just moving their cursor across the screen.

## Mouse-Only Mode

You can configure hover to only respond to mouse-like devices (mouse, pen, stylus) and ignore touch interactions:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Only respond to mouse-like pointers
useHover(context, {
  mouseOnly: true,
})
</script>

<template>
  <button ref="referenceRef">Mouse-only hover</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Only triggered by mouse/pen
  </div>
</template>
```

## Safe Polygon

The `safePolygon` feature allows users to move their cursor from the reference element to the floating element without accidentally closing it:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  placement: "right-start"
})

// Enable safe polygon with default settings
useHover(context, {
  safePolygon: true,
})

// Or with custom options
// useHover(context, {
//   safePolygon: {
//     buffer: 2, // Custom buffer area
//     blockPointerEvents: true // Block pointer events during traversal
//   }
// })
</script>

<template>
  <button ref="referenceRef">Safe polygon hover</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    <p>You can move your cursor here without closing!</p>
    <button>Interactive content</button>
  </div>
</template>
```

## Combining with Other Interactions

`useHover` is commonly combined with other interaction composables for a better user experience:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover, useFocus, useEscapeKey } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Hover interaction
useHover(context, {
  delay: { open: 200, close: 100 },
})

// Focus interaction (for accessibility)
useFocus(context)

// Escape key support
useEscapeKey({
  enabled: context.open,
  onEscape: () => context.setOpen(false)
})
</script>

<template>
  <button ref="referenceRef" :aria-describedby="context.open.value ? 'tooltip' : undefined">
    Accessible tooltip trigger
  </button>
  <div 
    v-if="context.open.value" 
    ref="floatingRef" 
    :style="context.floatingStyles"
    role="tooltip"
    id="tooltip"
  >
    This tooltip works with hover, focus, and keyboard dismissal
  </div>
</template>
```

This creates a tooltip that appears both on hover and on focus, with proper ARIA attributes for accessibility.

## Example: Interactive Tooltip

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover, useFocus, offset, flip, shift } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [offset(10), flip(), shift({ padding: 5 })],
})

// Create interactions
useHover(context, {
  delay: { open: 300, close: 200 },
})

useFocus(context)
</script>

<template>
  <button ref="referenceRef" class="info-button" :aria-describedby="context.open.value ? 'tooltip' : undefined">
    <span class="icon">ℹ️</span>
  </button>

  <div
    v-if="context.open.value"
    ref="floatingRef"
    :style="context.floatingStyles"
    class="tooltip"
    role="tooltip"
    id="tooltip"
  >
    <p>This is an interactive tooltip with hover delay for a smoother user experience.</p>
    <button @click="context.setOpen(false)" class="close-button">Close</button>
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

3. **Consider mobile users**: Hover doesn't work on mobile devices, so use `mouseOnly: true` or provide alternative interaction methods like click or touch.

4. **Use proper ARIA attributes**: Add appropriate ARIA attributes manually to ensure accessibility for screen readers.

5. **Set appropriate z-index**: Ensure your floating element has a suitable z-index to appear above other content.

6. **Use `safePolygon` for complex layouts**: For menus or tooltips with interactive content, `safePolygon` can prevent the floating element from closing when the user moves the cursor between the reference and floating elements.

7. **Handle rest detection**: Use `restMs` to prevent tooltips from appearing when users are just moving their cursor across the screen.

## Accessibility Considerations

- ⚠️ **Touch Devices**: Consider using `mouseOnly: true` to avoid hover conflicts on touch devices
- ✅ **Keyboard Users**: Should be paired with `useFocus` for accessibility
- ⚠️ **Screen Readers**: Hover-only interactions may not be accessible - consider adding proper ARIA attributes
- ✅ **Composition**: Works seamlessly with other interaction composables

## Related Composables

- [`useFocus`](/api/use-focus) - Essential for keyboard accessibility
- [`useClick`](/api/use-click) - Alternative interaction method for mobile devices
- [`useOutsideClick`](/api/use-outside-click) - For dismissing with outside clicks
- [`useEscapeKey`](/api/use-escape-key) - For keyboard dismissal

## Safe Polygon

The `safePolygon` option creates a virtual polygon around the reference and floating elements, allowing the user's cursor to move between them without closing the floating element. This is particularly useful for dropdown menus or tooltips that contain interactive elements.

To enable it, set the `safePolygon` option to `true`:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Enable safe polygon
const hover = useHover(floating.context, {
  safePolygon: true,
})

const { getReferenceProps, getFloatingProps } = useInteractions([hover])
</script>
```

### Customizing the Safe Polygon

You can also provide an object with options to customize the `safePolygon` behavior:

```vue
<script setup>
import { useFloating, useInteractions, useHover } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Customize safe polygon
const hover = useHover(floating.context, {
  safePolygon: {
    buffer: 10, // Add a 10px buffer around the polygon
    requireIntent: true, // Only trigger with intentional movement
  },
})
</script>
```
