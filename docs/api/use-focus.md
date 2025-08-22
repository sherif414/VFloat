# useFocus

The `useFocus` composable enables focus-based interactions for floating elements. It provides a way to show and hide floating UI elements when the user focuses on a reference element, which is crucial for keyboard accessibility.

## Basic Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useFocus } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Create focus interaction
useFocus(context)
</script>

<template>
  <button ref="referenceRef">Focus Me (click or tab)</button>

  <div v-if="context.open.value" ref="floatingRef" :style="{ ...context.floatingStyles }">
    This element appears when the button is focused
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useFocus(
  context: FloatingContext,
  options?: UseFocusOptions
): UseFocusReturn
```

| Parameter | Type                | Description                                                                    |
| --------- | ------------------- | ------------------------------------------------------------------------------ |
| context   | `FloatingContext`   | The context object returned from `useFloating`. Contains refs and state.       |
| options   | `UseFocusOptions`   | Optional configuration options for focus behavior.                            |

### Options (`UseFocusOptions`)

The `useFocus` composable accepts several options to customize its behavior:

| Option              | Type                        | Default | Description                                                                          |
| ------------------- | --------------------------- | ------- | ------------------------------------------------------------------------------------ |
| enabled             | `MaybeRefOrGetter<boolean>` | `true`  | Whether focus event listeners are enabled                                            |
| requireFocusVisible | `MaybeRefOrGetter<boolean>` | `true`  | Whether to only open when focus is visible (`:focus-visible` CSS selector)          |

### Return Value

`useFocus` returns `UseFocusReturn` (currently `undefined`). It performs its actions by attaching event listeners to the reference element obtained from the `FloatingContext`.

## Focus Behavior Options

### Requiring Focus-Visible

By default, `useFocus` only opens the floating element when the focus is "visible" (following the `:focus-visible` CSS selector behavior). This means it typically only triggers for keyboard navigation, not mouse clicks:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFocus } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Default behavior - only triggers on keyboard focus
useFocus(context, {
  requireFocusVisible: true, // This is the default
})
</script>

<template>
  <button ref="referenceRef">Tab to me, don't click</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Appears on keyboard focus only
  </div>
</template>
```

### Allowing Any Focus

You can disable the focus-visible requirement to make the floating element appear on any focus event, including mouse clicks:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFocus } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Trigger on any focus event
useFocus(context, {
  requireFocusVisible: false,
})
</script>

<template>
  <button ref="referenceRef">Click or tab to me</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Appears on any focus
  </div>
</template>
```

## Conditional Enabling

You can conditionally enable or disable the focus interaction with the `enabled` option:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFocus } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
// Control whether focus interaction is enabled
const focusEnabled = ref(true)

const context = useFloating(referenceRef, floatingRef)

// Use reactive enabled option
useFocus(context, {
  enabled: focusEnabled,
})

// Later you can update this
function disableFocus() {
  focusEnabled.value = false
}

function enableFocus() {
  focusEnabled.value = true
}
</script>

<template>
  <div>
    <button ref="referenceRef">Focus interaction target</button>
    <button @click="disableFocus">Disable focus</button>
    <button @click="enableFocus">Enable focus</button>
  </div>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Focus interaction is {{ focusEnabled ? 'enabled' : 'disabled' }}
  </div>
</template>
```

## Combining with Other Interactions

`useFocus` is commonly combined with other interaction composables for a better user experience:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useHover, useFocus, useEscapeKey } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Create interaction handlers
useHover(context, {
  delay: { open: 200, close: 100 },
})

useFocus(context)

useEscapeKey({
  enabled: context.open,
  onEscape: () => context.setOpen(false)
})
</script>

<template>
  <button 
    ref="referenceRef" 
    :aria-describedby="context.open.value ? 'tooltip' : undefined"
  >
    Hover or focus me
  </button>
  <div 
    v-if="context.open.value" 
    ref="floatingRef" 
    :style="context.floatingStyles"
    role="tooltip"
    id="tooltip"
  >
    Accessible tooltip with multiple interaction methods
  </div>
</template>
```

This creates a floating element that appears both when the reference element is hovered and when it's focused, with proper ARIA attributes.

## Advanced Focus Handling

The `useFocus` composable automatically handles complex focus scenarios and edge cases:

### Safari Focus-Visible Support

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useFocus } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)

const context = useFloating(referenceRef, floatingRef)

// Automatically handles Safari focus-visible polyfill
useFocus(context)
</script>

<template>
  <button ref="referenceRef">Works correctly in Safari</button>
  <div v-if="context.open.value" ref="floatingRef" :style="context.floatingStyles">
    Focus-visible behavior works across browsers
  </div>
</template>
```

### Modal Dialog Example

```vue
<script setup>
import { ref, nextTick } from "vue"
import { useFloating, useFocus, useEscapeKey, useOutsideClick } from "v-float"

const triggerRef = ref(null)
const dialogRef = ref(null)

const context = useFloating(triggerRef, dialogRef, {
  strategy: "fixed"
})

// Focus management for modal
useFocus(context)

// Close on escape
useEscapeKey({
  enabled: context.open,
  onEscape: () => {
    context.setOpen(false)
    // Return focus to trigger
    nextTick(() => triggerRef.value?.focus())
  }
})

// Close on outside click
useOutsideClick(context)

const openModal = async () => {
  context.setOpen(true)
  await nextTick()
  // Focus the dialog
  dialogRef.value?.focus()
}
</script>

<template>
  <button ref="triggerRef" @click="openModal">
    Open Modal
  </button>
  
  <Teleport to="body">
    <div v-if="context.open.value" class="modal-backdrop">
      <div 
        ref="dialogRef"
        :style="context.floatingStyles"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        class="modal"
      >
        <h2>Modal Dialog</h2>
        <p>This modal handles focus correctly.</p>
        <input placeholder="Focus management works here" />
        <div class="button-group">
          <button @click="context.setOpen(false)">Cancel</button>
          <button @click="context.setOpen(false)">Confirm</button>
        </div>
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
  outline: none;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
</style>
```
## Best Practices

1. **Combine with hover**: For non-touch devices, combine with `useHover` to provide multiple interaction methods.

2. **Use requireFocusVisible**: Keep the default `requireFocusVisible: true` for better UX - it prevents tooltips from appearing on mouse clicks.

3. **Keyboard accessibility**: Ensure all functionality that's available via mouse is also available via keyboard.

4. **Proper focus management**: For modal dialogs, manually manage focus and ensure it returns to the trigger element when closed.

5. **Test with keyboard**: Always test your implementation by navigating with the Tab key and ensure it works as expected.

6. **Include ARIA attributes**: Add appropriate ARIA attributes manually to ensure accessibility for screen readers.

7. **Handle edge cases**: The composable automatically handles window blur/focus scenarios and browser-specific focus-visible behavior.

## Accessibility Considerations

- ✅ **Keyboard Navigation**: Primary purpose - enables keyboard access to floating content
- ✅ **Screen Readers**: Works seamlessly with assistive technologies
- ✅ **WCAG Compliance**: Follows focus visibility best practices with `:focus-visible`
- ✅ **Cross-browser**: Handles Safari-specific focus-visible behavior automatically
- ✅ **Edge Cases**: Automatically prevents issues with window switching and programmatic focus

## Related Composables

- [`useClick`](/api/use-click) - For click-based interactions
- [`useHover`](/api/use-hover) - For hover-based interactions
- [`useEscapeKey`](/api/use-escape-key) - For keyboard dismissal
- [`useOutsideClick`](/api/use-outside-click) - For dismissing with outside clicks
