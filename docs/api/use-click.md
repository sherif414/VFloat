# useClick

The `useClick` composable enables click-based interactions for floating elements. It provides a way to show and hide floating UI elements when the user clicks on a reference element, which is essential for components like dropdowns, popovers, and modals.

## Basic Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)

const context = useFloating(referenceRef, floatingRef)

// Create click interaction
useClick(context)
</script>

<template>
  <button ref="referenceRef">Click Me</button>

  <div v-if="context.open.value" ref="floatingRef" :style="{ ...context.floatingStyles }">
    This element appears when the button is clicked
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useClick(
  context: FloatingContext,
  options?: UseClickOptions
): void // useClick directly attaches event listeners and returns void
```

| Parameter | Type                             | Description                                                                    |
| --------- | -------------------------------- | ------------------------------------------------------------------------------ |
| context   | `FloatingContext`                | The context object returned from `useFloating`. Contains refs and state.       |
| options   | `UseClickOptions` (see below)    | Optional configuration for the click behavior.                                 |

### Options (`UseClickOptions`)

The `useClick` composable accepts several options to customize its behavior. These options can be reactive (e.g., a `Ref`).

| Option           | Type                                     | Default | Description                                                                              |
| ---------------- | ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| enabled          | `MaybeRefOrGetter<boolean>`              | `true`  | Whether the click interaction is enabled.                                                |
| event            | `MaybeRefOrGetter<'click' \| 'mousedown'>` | `'click'` | The mouse event that triggers the interaction. Keyboard clicks are handled separately.   |
| toggle           | `MaybeRefOrGetter<boolean>`              | `true`  | Whether clicking the reference element toggles the floating element's open state.        |
| ignoreMouse      | `MaybeRefOrGetter<boolean>`              | `false` | If `true`, mouse events will be ignored.                                                 |
| ignoreKeyboard   | `MaybeRefOrGetter<boolean>`              | `false` | If `true`, keyboard events (`Enter` and `Space`) will be ignored.                        |
| ignoreTouch      | `MaybeRefOrGetter<boolean>`              | `false` | If `true`, touch events will be ignored.                                                 |

(Note: `MaybeRefOrGetter<T>` means the value can be `T`, `Ref<T>`, or a getter function `() => T`.)

### Return Value

`useClick` returns `void`. It performs its actions by attaching event listeners to the reference element obtained from the `FloatingContext`.

## Customizing Click Behavior

### Changing the Triggering Event

By default, `useClick` uses the 'click' event, but you can change it to 'mousedown' or 'mouseup' for different behavior:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Trigger on mousedown instead of click.
// useClick directly attaches event listeners to the reference element.
useClick(floating.context, {
  event: "mousedown",
})

// ARIA attributes and other non-event props should be handled manually or by other composables.
// For example:
// :aria-expanded="isOpen"
// :aria-controls="floatingId" (if floating element has an ID)
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Trigger on mousedown
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="floating.floatingStyles">
    Floating content
  </div>
</template>
```

Using 'mousedown' can make the interaction feel more responsive since it triggers before the user releases the mouse button.

### Disabling Toggle Behavior

By default, clicking the reference element toggles the floating element (showing it if hidden and hiding it if shown). You can disable this toggle behavior:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Disable toggle behavior (clicking again won't close if already open)
// useClick directly attaches event listeners.
useClick(floating.context, {
  toggle: false,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Clicking again won't close
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="floating.floatingStyles">
    Floating content
  </div>
</template>
```

This is useful when you want clicking the reference element to only open the floating element, and closing requires another action (like clicking a close button or outside the element).

### Ignoring Mouse Clicks

For touch interfaces, you might want to handle touch events differently from mouse events:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Ignore mouse clicks (only keyboard or programmatic opening through isOpen ref)
// useClick directly attaches event listeners.
useClick(floating.context, {
  ignoreMouse: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Mouse clicks ignored (try keyboard)
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="floating.floatingStyles">
    Floating content
  </div>
</template>
```

This is useful when combining with other interaction methods or when creating touch-specific interfaces.

### Ignoring Touch Events

You can also ignore touch events, which can be useful when you want to handle touch and mouse interactions differently.

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Ignore touch events
useClick(floating.context, {
  ignoreTouch: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Touch events ignored
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="floating.floatingStyles">
    Floating content
  </div>
</template>
```
This is useful when you want to implement custom touch interactions, like swipe gestures, without triggering a click.

### Ignoring Keyboard Handlers

By default, `useClick` handles keyboard events (`Enter` and `Space`) for accessibility. You can ignore this behavior:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Ignore keyboard handling (Enter/Space keys won't trigger)
useClick(floating.context, {
  ignoreKeyboard: true,
})
</script>
<template>
  <button ref="referenceRef" :aria-expanded="isOpen.value">
    Keyboard handlers ignored
  </button>
  <div v-if="isOpen.value" ref="floatingRef" :style="floating.floatingStyles">
    Floating content
  </div>
</template>
```

However, ignoring keyboard handlers is generally not recommended for accessibility reasons unless you provide an alternative way to interact with the component.

## Conditional Enabling

You can conditionally enable or disable the click interaction:

```vue
<script setup>
import { ref } from "vue" // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick } from "v-float"

const isOpen = ref(false)
const referenceRef = ref(null)
const floatingRef = ref(null)

// Control whether click interaction is enabled
const clickEnabled = ref(true)

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Use reactive enabled option.
// useClick directly attaches event listeners based on the 'enabled' state.
useClick(floating.context, {
  enabled: clickEnabled,
})

// Later you can update this:
function disableClick() {
  clickEnabled.value = false
}

function enableClick() {
  clickEnabled.value = true
}
</script>
```

## Combining with Other Interactions

`useClick` is commonly combined with other interaction composables, especially for accessible UI components:

```vue
<script setup>
import { ref } from "vue"; // Assuming isOpen, referenceRef, floatingRef are defined
import { useFloating, useClick, useDismiss /*, useRole */ } from "v-float";
// Note: useInteractions and prop-getters like getReferenceProps are not returned by
// v-float's useClick or useDismiss as per current source.
// Event listeners are attached directly. ARIA props need manual binding or a separate utility.

const isOpen = ref(false);
const referenceRef = ref(null);
const floatingRef = ref(null);
const floatingId = "my-floating-element"; // Example ID for ARIA

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
});

// useClick sets up click listeners on the reference element.
useClick(floating.context);

// Assuming useDismiss works similarly, setting up listeners for Esc/outside click.
useDismiss(floating.context, {
  outsidePress: true, // Example
});

// If a useRole composable exists and provides ARIA logic, it would be used here.
// For now, ARIA attributes are shown manually in the template.
</script>
<template>
  <button
    ref="referenceRef"
    :aria-expanded="isOpen.value"
    :aria-controls="floatingId"
    aria-haspopup="dialog"
  >
    Toggle Dialog
  </button>
  <div
    v-if="isOpen.value"
    :id="floatingId"
    ref="floatingRef"
    :style="floating.floatingStyles"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title" /* Assuming a title element exists */
  >
    <h2 id="dialog-title">Dialog</h2>
    <p>Content... Click outside or press Esc to dismiss (if useDismiss is configured).</p>
    <button @click="isOpen.value = false">Close</button>
  </div>
</template>
```

This creates a dialog that opens when the reference element is clicked, closes when clicking outside, and has proper ARIA attributes.

## Example: Dropdown Menu

```vue
<script setup>
import { ref } from "vue"
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  offset,
  flip,
  shift,
} from "v-float"

const items = [
  { label: "Edit", action: () => console.log("Edit clicked") },
  { label: "Duplicate", action: () => console.log("Duplicate clicked") },
  { label: "Delete", action: () => console.log("Delete clicked") },
  { label: "Export", action: () => console.log("Export clicked") },
]

const referenceRef = ref(null)
const floatingRef = ref(null)
const listRef = ref([])
const isOpen = ref(false)
const activeIndex = ref(null)

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift({ padding: 5 })],
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Click to open the dropdown
const click = useClick(floating.context)

// Close when clicking outside or pressing escape
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
  escapeKey: true,
})

// Set ARIA attributes
const role = useRole(floating.context, { role: "menu" })

// Handle keyboard navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index
  },
  loop: true,
})

// Event listeners from useClick, useDismiss are attached directly.
// ARIA roles from useRole would need manual application or its own prop mechanism.
// useListNavigation typically provides getItemProps or similar for list items.
// Since useInteractions is not available in v-float as per source,
// props need to be managed differently.

// Example: useClick sets up listeners on referenceRef
// Example: useDismiss sets up its listeners
// Example: useRole would mean manually adding role attributes or using its specific return.
// Example: listNav might return getItemProps, which would be bound manually.

// For simplicity, this example will focus on click and manual ARIA.
// The full complexity of combining these without useInteractions is beyond this specific example.

// Track item elements for list navigation (assuming listRef is used by useListNavigation)
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el)
  }
}

// Execute action when item is clicked
function selectItem(index) {
  items[index].action()
  isOpen.value = false
}
</script>

<template>
  <button
    ref="referenceRef"
    <!-- getReferenceProps() from useInteractions is not used here -->
    <!-- Event listeners for click are attached by useClick(floating.context) -->
    aria-haspopup="menu"
    :aria-expanded="isOpen.value"
    class="dropdown-button"
  >
    Actions
    <span class="dropdown-icon">▼</span>
  </button>

  <div
    v-if="isOpen.value"
    ref="floatingRef"
    <!-- getFloatingProps() from useInteractions is not used here -->
    :style="floating.floatingStyles"
    role="menu" <!-- Assuming useRole would handle this, or it's manual -->
    class="dropdown-menu"
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItem"
      <!-- getItemProps() from useListNavigation would be bound here if available and useInteractions wasn't used -->
      role="menuitem"
      :tabindex="activeIndex === index ? 0 : -1"
      class="menu-item"
      :class="{ active: activeIndex === index }"
      @click="selectItem(index)"
      @keydown.enter="selectItem(index)" @keydown.space="selectItem(index)" <!-- Basic keyboard handling for items -->
    >
      {{ item.label }}
    </div>
  </div>
</template>

<style scoped>
.dropdown-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.dropdown-icon {
  font-size: 10px;
}

.dropdown-button:hover {
  background: #e0e0e0;
}

.dropdown-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  z-index: 100;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
}

.menu-item:hover,
.menu-item.active {
  background-color: #f0f0f0;
}
</style>
```

## Example: Modal Dialog

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

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// Click to open the modal
const click = useClick(floating.context)

// Close when pressing escape (but not when clicking outside)
const dismiss = useDismiss(floating.context, {
  outsidePress: false,
  escapeKey: true,
})

// Set ARIA attributes for accessibility
const role = useRole(floating.context, { role: "dialog" })

// Event listeners from useClick and useDismiss are attached directly.
// ARIA roles from useRole would need manual application or its own prop mechanism.
// Since useInteractions is not available in v-float as per source,
// props need to be managed differently.
useClick(floating.context); // Attaches click listeners
useDismiss(floating.context, { outsidePress: false, escapeKey: true }); // Attaches dismiss listeners

// ARIA attributes are shown manually in the template.
</script>

<template>
  <button
    ref="referenceRef"
    class="open-modal-button"
    :aria-expanded="isOpen.value"
    aria-controls="modal-dialog"
    aria-haspopup="dialog"
  >
    Open Modal
  </button>

  <FloatingOverlay v-if="isOpen.value" lock-scroll>
    <FloatingFocusManager :context="floating.context" modal>
      <div
        ref="floatingRef"
        id="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        class="modal"
        :style="floating.floatingStyles"
      >
        <div class="modal-header">
          <h2 id="modal-title">Modal Title</h2>
          <button @click="isOpen = false" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <p>This is a modal dialog that appears when you click the button.</p>
          <p>It traps focus inside the modal and has proper ARIA attributes for accessibility.</p>
        </div>

        <div class="modal-footer">
          <button @click="isOpen = false" class="cancel-button">Cancel</button>
          <button @click="isOpen = false" class="confirm-button">Confirm</button>
        </div>
      </div>
    </FloatingFocusManager>
  </FloatingOverlay>
</template>

<style scoped>
.open-modal-button {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
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

1. **Combine with dismissal**: Always combine `useClick` with `useDismiss` to provide a way to close the floating element.

2. **Ensure keyboard accessibility**: Avoid setting `ignoreKeyboard` to `true` so keyboard users can trigger the interaction with the `Enter` or `Space` keys.

3. **Add ARIA attributes**: Use `useRole` to add appropriate ARIA attributes for accessibility.

4. **Manage focus properly**: For modal dialogs, use `FloatingFocusManager` to trap focus inside the floating element.

5. **Consider mobile users**: Ensure the clickable area is large enough for touch interactions on mobile devices.

6. **Provide visual feedback**: Add hover and active states to indicate the element is clickable.

7. **Handle outside clicks**: Use `useDismiss` with `outsidePress: true` to close the floating element when clicking outside.

## Related Composables

- `useDismiss`: For handling dismissal behavior (clicking outside, escape key)
- `useRole`: For ARIA attribute management
- `useListNavigation`: For keyboard navigation within the floating element
- `FloatingFocusManager`: For managing focus within modal dialogs
- `FloatingOverlay`: For creating a backdrop behind modal dialogs
