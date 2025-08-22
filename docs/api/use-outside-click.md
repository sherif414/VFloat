# useOutsideClick

The `useOutsideClick` composable enables detecting clicks outside of the floating element and its reference element. This is essential for implementing dismissal behavior in components like dropdowns, modals, and popovers when users click outside the interactive area.

## Basic Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useOutsideClick } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Enable outside click detection to close the floating element
useOutsideClick(context)
</script>

<template>
  <button ref="referenceRef" @click="context.setOpen(!context.open.value)">
    Toggle Dropdown
  </button>

  <div v-if="context.open.value" ref="floatingRef" :style="{ ...context.floatingStyles }">
    Click outside this area to close
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useOutsideClick(
  context: FloatingContext,
  options?: UseOutsideClickProps
): void
```

| Parameter | Type                        | Description                                                                    |
| --------- | --------------------------- | ------------------------------------------------------------------------------ |
| context   | `FloatingContext`           | The context object returned from `useFloating`. Contains refs and state.       |
| options   | `UseOutsideClickProps`      | Optional configuration for the outside click behavior.                        |

### Options (`UseOutsideClickProps`)

| Option          | Type                                           | Default         | Description                                                                              |
| --------------- | ---------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| enabled         | `MaybeRefOrGetter<boolean>`                    | `true`          | Whether outside click listeners are enabled.                                             |
| capture         | `boolean`                                      | `true`          | Whether to use capture phase for document outside click listener.                        |
| eventName       | `"pointerdown" \| "mousedown" \| "click"`      | `"pointerdown"` | The event to use for outside click detection.                                           |
| onOutsideClick  | `(event: MouseEvent, context: FloatingContext) => void` | `undefined`     | Custom function to handle outside clicks instead of default close behavior.              |

### Return Value

`useOutsideClick` returns `void`. It performs its actions by attaching event listeners to the document and the floating element.

## Customizing Outside Click Behavior

### Using Different Events

By default, `useOutsideClick` uses 'pointerdown' events, but you can change it to 'mousedown' or 'click':

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useOutsideClick } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Use click event instead of pointerdown
useOutsideClick(context, {
  eventName: "click"
})
</script>

<template>
  <button ref="referenceRef" @click="context.setOpen(!context.open.value)">
    Click to open
  </button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Click outside to close
  </div>
</template>
```

### Custom Outside Click Handler

You can provide a custom handler function to implement specific behavior when clicking outside:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useOutsideClick } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const outsideClickCount = ref(0)

const context = useFloating(referenceRef, floatingRef)

// Custom handler with additional logic
useOutsideClick(context, {
  onOutsideClick: (event, context) => {
    outsideClickCount.value++
    console.log('Outside click detected', event.target)
    
    // Custom closing logic
    if (outsideClickCount.value >= 2) {
      context.setOpen(false)
      outsideClickCount.value = 0
    }
  }
})
</script>

<template>
  <button ref="referenceRef" @click="context.setOpen(!context.open.value)">
    Click to open
  </button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Click outside twice to close ({{ outsideClickCount }} clicks)
  </div>
</template>
```

### Conditional Enabling

You can dynamically enable or disable outside click detection:

```vue
<script setup>
import { ref, computed } from "vue"
import { useFloating, useOutsideClick } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const isPersistent = ref(false)

const context = useFloating(referenceRef, floatingRef)

// Disable outside click when persistent mode is enabled
useOutsideClick(context, {
  enabled: computed(() => !isPersistent.value)
})
</script>

<template>
  <div>
    <button ref="referenceRef" @click="context.setOpen(!context.open.value)">
      Toggle Modal
    </button>
    
    <label>
      <input v-model="isPersistent" type="checkbox" />
      Persistent mode (disable outside click)
    </label>
  </div>

  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    <p>Modal content</p>
    <p v-if="isPersistent">Outside click disabled</p>
    <p v-else>Click outside to close</p>
    <button @click="context.setOpen(false)">Close</button>
  </div>
</template>
```

### Disabling Event Capture

By default, `useOutsideClick` uses event capture to ensure it receives events before other handlers. You can disable this:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useOutsideClick } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Disable event capture
useOutsideClick(context, {
  capture: false
})
</script>

<template>
  <button ref="referenceRef" @click="context.setOpen(!context.open.value)">
    Click to open
  </button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Outside click detection without capture
  </div>
</template>
```

## Behavior Details

### Event Handling

- **Scrollbar Clicks**: Clicks on scrollbars are ignored and won't trigger outside click behavior
- **Virtual Elements**: Works correctly with virtual reference elements (for context menus, tooltips, etc.)
- **Composed Events**: Properly handles events in Shadow DOM using `composedPath()` when available
- **Event Timing**: Handles the timing between mousedown/pointerdown and click events to prevent false positives

### Integration with Other Interactions

`useOutsideClick` works seamlessly with other interaction composables:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick, useOutsideClick, useEscapeKey } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Combine multiple interactions
useClick(context)           // Click to toggle
useOutsideClick(context)    // Click outside to close
useEscapeKey({              // Press Escape to close
  enabled: context.open,
  onEscape: () => context.setOpen(false)
})
</script>

<template>
  <button ref="referenceRef">
    Click to toggle
  </button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Close by clicking outside or pressing Escape
  </div>
</template>
```

## Accessibility Considerations

- **Keyboard Users**: Should be combined with `useEscapeKey` for comprehensive dismissal options
- **Focus Management**: Consider managing focus when the floating element closes
- **Screen Readers**: Outside click behavior is transparent to screen readers
- **Touch Devices**: Works correctly with touch interactions

## Common Patterns

### Modal Dialog

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useOutsideClick, useEscapeKey } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  strategy: "fixed"
})

useOutsideClick(context)
useEscapeKey({
  enabled: context.open,
  onEscape: () => context.setOpen(false)
})
</script>

<template>
  <button ref="referenceRef" @click="context.setOpen(true)">
    Open Modal
  </button>
  
  <Teleport to="body">
    <div v-if="context.open.value" class="modal-backdrop">
      <div ref="floatingRef" :style="context.floatingStyles" class="modal">
        <h2>Modal Title</h2>
        <p>Modal content goes here.</p>
        <button @click="context.setOpen(false)">Close</button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
</style>
```

### Dropdown Menu

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick, useOutsideClick } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start"
})

useClick(context)
useOutsideClick(context)
</script>

<template>
  <button ref="referenceRef" :aria-expanded="context.open.value">
    Menu ▼
  </button>
  
  <ul v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles" role="menu">
    <li role="menuitem"><button @click="context.setOpen(false)">Item 1</button></li>
    <li role="menuitem"><button @click="context.setOpen(false)">Item 2</button></li>
    <li role="menuitem"><button @click="context.setOpen(false)">Item 3</button></li>
  </ul>
</template>
```

## Related Composables

- [`useClick`](/api/use-click) - For toggling floating elements with click interactions
- [`useEscapeKey`](/api/use-escape-key) - For closing floating elements with the Escape key
- [`useHover`](/api/use-hover) - For hover-based interactions
- [`useFocus`](/api/use-focus) - For focus-based interactions