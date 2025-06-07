# useDismiss

The `useDismiss` composable provides ways to dismiss or close floating elements based on various user interactions, such as clicking outside the element, pressing the Escape key, or scrolling the page. It's an essential component for creating user-friendly interfaces.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useInteractions, useClick, useDismiss } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Create click interaction to open
const click = useClick(floating.context)

// Add dismiss behavior
const dismiss = useDismiss(floating.context, {
  outsidePress: true, // Close when clicking outside
  escapeKey: true, // Close when pressing Escape
})

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Popup</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="popup"
  >
    Click outside or press Escape to close
  </div>
</template>

<style scoped>
.popup {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
</style>
```

## API Reference

### Arguments

```ts
function useDismiss(
  context: FloatingContext,
  options?: UseDismissOptions
): {
  getReferenceProps: (userProps?: object) => object
  getFloatingProps: (userProps?: object) => object
}
```

| Parameter | Type              | Description                                  |
| --------- | ----------------- | -------------------------------------------- |
| context   | FloatingContext   | The context object returned from useFloating |
| options   | UseDismissOptions | Optional configuration options               |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useDismiss` composable accepts several options to customize its behavior:

| Option              | Type                                        | Default     | Description                                                                  |
| ------------------- | ------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| enabled             | boolean \| Ref&lt;boolean&gt;               | true        | Whether the dismiss interactions are enabled                                 |
| escapeKey           | boolean                                     | true        | Close when the Escape key is pressed                                         |
| outsidePress        | boolean \| ((event: MouseEvent) => boolean) | true        | Close when clicking outside the floating element                             |
| outsidePressEvent   | 'mousedown' \| 'mouseup' \| 'click'         | 'mousedown' | The event that triggers the outside press behavior                           |
| referencePress      | boolean                                     | false       | Close when clicking the reference element while the floating element is open |
| referencePressEvent | 'mousedown' \| 'mouseup' \| 'click'         | 'mousedown' | The event that triggers the reference press behavior                         |
| ancestorScroll      | boolean                                     | false       | Close when scrolling a parent element                                        |
| bubbles             | boolean                                     | true        | Whether to allow events to bubble                                            |

### Return Value

`useDismiss` returns an object with functions that generate props:

| Property          | Type                           | Description                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element |
| getFloatingProps  | (userProps?: object) => object | Function that returns props to apply to the floating element  |

## Customizing Dismiss Behavior

### Outside Press

The `outsidePress` option determines whether clicking outside the floating element will close it:

```vue
<script setup>
import { useFloating, useInteractions, useDismiss } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Basic outside press closing
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
})

// Or use a custom function to determine if a click should close
const customDismiss = useDismiss(floating.context, {
  outsidePress: (event) => {
    // Don't close when clicking elements with a specific class
    if (event.target.closest(".no-dismiss")) {
      return false
    }
    return true
  },
})
</script>
```

You can also control which event triggers the outside press behavior:

```vue
<script setup>
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
  outsidePressEvent: "mouseup", // 'mousedown', 'mouseup', or 'click'
})
</script>
```

### Escape Key

The `escapeKey` option determines whether pressing the Escape key will close the floating element:

```vue
<script setup>
const dismiss = useDismiss(floating.context, {
  escapeKey: true, // Default is true
})

// Disable escape key dismissal
const dismissNoEscape = useDismiss(floating.context, {
  escapeKey: false,
})
</script>
```

### Reference Press

The `referencePress` option determines whether clicking the reference element while the floating element is open will close it:

```vue
<script setup>
// Close when clicking the reference element while open
const dismiss = useDismiss(floating.context, {
  referencePress: true, // Default is false
  referencePressEvent: "click", // Default is 'mousedown'
})
</script>
```

This is useful for toggling behavior, where clicking the reference element opens and closes the floating element.

### Ancestor Scroll

The `ancestorScroll` option determines whether scrolling a parent element will close the floating element:

```vue
<script setup>
// Close when scrolling a parent element
const dismiss = useDismiss(floating.context, {
  ancestorScroll: true, // Default is false
})
</script>
```

This is particularly useful for floating elements that should be dismissed when the user scrolls the page.

## Conditional Enabling

You can conditionally enable or disable the dismiss behavior:

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useInteractions, useDismiss } from "v-float"

// Control whether dismiss is enabled
const dismissEnabled = ref(true)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Use reactive enabled option
const dismiss = useDismiss(floating.context, {
  enabled: dismissEnabled,
})

// Later you can update this
function disableDismiss() {
  dismissEnabled.value = false
}

function enableDismiss() {
  dismissEnabled.value = true
}
</script>
```

## Combining with Other Interactions

`useDismiss` is commonly combined with other interaction composables for a complete user experience:

```vue
<script setup>
import { useFloating, useInteractions, useClick, useDismiss, useRole } from "v-float"

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Create interaction handlers
const click = useClick(floating.context)
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
  escapeKey: true,
})
const role = useRole(floating.context, { role: "dialog" })

// Combine them all
const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])
</script>
```

## Example: Popover with Custom Dismiss

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  offset,
  flip,
  shift,
} from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const isOpen = ref(false)

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom",
  middleware: [offset(10), flip(), shift({ padding: 5 })],
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Click to open
const click = useClick(floating.context)

// Custom dismiss behavior
const dismiss = useDismiss(floating.context, {
  // Close on escape key
  escapeKey: true,

  // Custom outside press handler
  outsidePress: (event) => {
    // Don't close when clicking elements with this class
    if (event.target.closest(".ignore-dismiss")) {
      return false
    }
    return true
  },

  // Don't close when clicking reference element
  referencePress: false,

  // Close when scrolling
  ancestorScroll: true,
})

// Set ARIA attributes
const role = useRole(floating.context, { role: "dialog" })

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])
</script>

<template>
  <div class="container">
    <button ref="referenceRef" v-bind="getReferenceProps()">Show Info</button>

    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="popover"
      aria-labelledby="popover-title"
    >
      <div class="popover-header">
        <h3 id="popover-title">Important Information</h3>
        <button @click="isOpen = false" class="close-button">×</button>
      </div>

      <div class="popover-body">
        <p>This is a popover with custom dismiss behavior.</p>
        <p>Press Escape, scroll, or click outside to close.</p>

        <!-- This button won't dismiss the popover when clicked -->
        <button class="ignore-dismiss">Clicking me won't close the popover</button>
      </div>
    </div>

    <!-- Content that causes scrolling -->
    <div style="height: 1000px; padding-top: 50px;">
      <p>Scroll down to dismiss the popover</p>
    </div>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  padding: 20px;
}

.popover {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 300px;
  z-index: 100;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.popover-body {
  padding: 12px;
}

.close-button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
}

.ignore-dismiss {
  margin-top: 10px;
  padding: 5px 10px;
  background: #e0e0e0;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
```

## Example: Modal Dialog with Locked Dismissal

For modal dialogs where you want more controlled dismissal behavior:

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  FloatingFocusManager,
  FloatingOverlay,
} from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const isOpen = ref(false)
const confirmationShown = ref(false)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: handleOpenChange,
})

// Function to handle open state changes
function handleOpenChange(open) {
  // If trying to close and confirmation is needed
  if (!open && !confirmationShown.value) {
    confirmationShown.value = true
    return // Don't close yet
  }

  // Otherwise update the open state
  isOpen.value = open

  // Reset confirmation state when fully closed
  if (!open) {
    confirmationShown.value = false
  }
}

// Intercept dismiss attempts
function handleDismiss(event) {
  // Only allow Escape key to show confirmation
  if (event.type === "keydown" && event.key === "Escape") {
    if (!confirmationShown.value) {
      confirmationShown.value = true
      return false // Prevent immediate closing
    }
  }

  // Prevent outside clicks from dismissing
  if (event.type.includes("mouse")) {
    return false
  }

  return true
}

// Click to open
const click = useClick(floating.context)

// Custom dismiss behavior
const dismiss = useDismiss(floating.context, {
  escapeKey: true,
  outsidePress: handleDismiss,
})

// Set ARIA attributes
const role = useRole(floating.context, { role: "dialog" })

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

// Handle confirmation
function confirmClose() {
  isOpen.value = false
  confirmationShown.value = false
}

function cancelClose() {
  confirmationShown.value = false
}
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Modal</button>

  <FloatingOverlay v-if="isOpen" lock-scroll>
    <FloatingFocusManager :context="floating.context" modal>
      <div
        ref="floatingRef"
        v-bind="getFloatingProps()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        class="modal"
      >
        <div class="modal-header">
          <h2 id="modal-title">Important Form</h2>
          <button @click="confirmationShown = true" class="close-button">×</button>
        </div>

        <div class="modal-body" v-if="!confirmationShown">
          <p>This is a modal with controlled dismissal.</p>
          <p>Try pressing Escape or clicking the X button.</p>
          <form class="example-form">
            <div class="form-group">
              <label for="name">Name:</label>
              <input id="name" type="text" />
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input id="email" type="email" />
            </div>
          </form>
        </div>

        <!-- Confirmation dialog -->
        <div v-if="confirmationShown" class="confirmation">
          <p>Are you sure you want to close this form? Any unsaved changes will be lost.</p>
          <div class="button-group">
            <button @click="cancelClose" class="cancel-button">No, keep editing</button>
            <button @click="confirmClose" class="confirm-button">Yes, close</button>
          </div>
        </div>
      </div>
    </FloatingFocusManager>
  </FloatingOverlay>
</template>

<style scoped>
.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  margin: 50px auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 20px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.example-form {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.confirmation {
  padding: 20px;
  text-align: center;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 15px;
}

.cancel-button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

## Best Practices

1. **Match UI expectations**: Configure dismissal behavior to match user expectations. For modals, disable `outsidePress` but keep `escapeKey` enabled. For tooltips and popovers, both `outsidePress` and `escapeKey` should typically be enabled.

2. **Consider unsaved changes**: For forms or editors, prompt the user for confirmation before dismissing to avoid data loss.

3. **Provide visible close buttons**: Even with automatic dismissal behaviors, always provide explicit close buttons for better usability.

4. **Optimize event listeners**: Use `outsidePressEvent: 'mousedown'` (the default) for smoother behavior in most cases.

5. **Prevent bubbling issues**: If you have nested floating elements, handle event bubbling appropriately to prevent parent elements from being dismissed when interacting with child elements.

6. **Combine with focus management**: For modal dialogs, use `FloatingFocusManager` to trap focus within the dialog, preventing users from tabbing into areas they shouldn't interact with.

7. **Consider mobile users**: Ensure dismissal works well on touch devices, where behavior might be slightly different.

## Related Composables

- `useClick`: For click-based interactions to open/toggle the floating element
- `useRole`: For ARIA attribute management
- `FloatingFocusManager`: For managing focus within modal dialogs
- `FloatingOverlay`: For creating a backdrop behind modal dialogs
