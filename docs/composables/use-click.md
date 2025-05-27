# useClick

The `useClick` composable enables click-based interactions for floating elements. It provides a way to show and hide floating UI elements when the user clicks on a reference element, which is essential for components like dropdowns, popovers, and modals.

## Basic Usage

```vue twoslash
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useClick } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);

const context = useFloating(referenceRef, floatingRef);

// Create click interaction
useClick(context);
</script>

<template>
  <button ref="referenceRef">Click Me</button>

  <div
    v-if="context.open.value"
    ref="floatingRef"
    :style="{...context.floatingStyles}"
  >
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
): {
  getReferenceProps: (userProps?: object) => object;
};
```

| Parameter | Type            | Description                                  |
| --------- | --------------- | -------------------------------------------- |
| context   | FloatingContext | The context object returned from useFloating |
| options   | UseClickOptions | Optional configuration options               |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useClick` composable accepts several options to customize its behavior:

| Option           | Type                                | Default | Description                                                                              |
| ---------------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| enabled          | boolean \| Ref&lt;boolean&gt;       | true    | Whether the click interaction is enabled                                                 |
| event            | 'mousedown' \| 'mouseup' \| 'click' | 'click' | The event that triggers the interaction                                                  |
| toggle           | boolean                             | true    | Whether clicking the reference element toggles the floating element's open state         |
| ignoreMouse      | boolean                             | false   | When true, mouse clicks don't trigger the interaction (useful for touch-only interfaces) |
| keyboardHandlers | boolean                             | true    | Whether to handle keyboard events (Enter and Space) on the reference element             |

### Return Value

`useClick` returns an object with functions that generate props:

| Property          | Type                           | Description                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element |

## Customizing Click Behavior

### Changing the Triggering Event

By default, `useClick` uses the 'click' event, but you can change it to 'mousedown' or 'mouseup' for different behavior:

```vue
<script setup>
import { useFloating, useInteractions, useClick } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Trigger on mousedown instead of click
const click = useClick(floating.context, {
  event: "mousedown",
});

const { getReferenceProps, getFloatingProps } = useInteractions([click]);
</script>
```

Using 'mousedown' can make the interaction feel more responsive since it triggers before the user releases the mouse button.

### Disabling Toggle Behavior

By default, clicking the reference element toggles the floating element (showing it if hidden and hiding it if shown). You can disable this toggle behavior:

```vue
<script setup>
import { useFloating, useInteractions, useClick } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Disable toggle behavior (clicking again won't close)
const click = useClick(floating.context, {
  toggle: false,
});
</script>
```

This is useful when you want clicking the reference element to only open the floating element, and closing requires another action (like clicking a close button or outside the element).

### Ignoring Mouse Clicks

For touch interfaces, you might want to handle touch events differently from mouse events:

```vue
<script setup>
import { useFloating, useInteractions, useClick } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Ignore mouse clicks (only keyboard or programmatic opening)
const click = useClick(floating.context, {
  ignoreMouse: true,
});
</script>
```

This is useful when combining with other interaction methods or when creating touch-specific interfaces.

### Disabling Keyboard Handlers

By default, `useClick` also handles keyboard events (`Enter` and `Space` keys) on the reference element for accessibility. You can disable this behavior:

```vue
<script setup>
import { useFloating, useInteractions, useClick } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Disable keyboard handling
const click = useClick(floating.context, {
  keyboardHandlers: false,
});
</script>
```

However, disabling keyboard handlers is generally not recommended for accessibility reasons, unless you're handling keyboard interactions another way.

## Conditional Enabling

You can conditionally enable or disable the click interaction:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useClick } from "v-float";

// Control whether click interaction is enabled
const clickEnabled = ref(true);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Use reactive enabled option
const click = useClick(floating.context, {
  enabled: clickEnabled,
});

// Later you can update this
function disableClick() {
  clickEnabled.value = false;
}

function enableClick() {
  clickEnabled.value = true;
}
</script>
```

## Combining with Other Interactions

`useClick` is commonly combined with other interaction composables, especially for accessible UI components:

```vue
<script setup>
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
} from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create interaction handlers
const click = useClick(floating.context);
const dismiss = useDismiss(floating.context, {
  outsidePress: true, // Close when clicking outside
});
const role = useRole(floating.context, {
  role: "dialog", // Set ARIA role
});

// Combine them all
const { getReferenceProps, getFloatingProps } = useInteractions([
  click,
  dismiss,
  role,
]);
</script>
```

This creates a dialog that opens when the reference element is clicked, closes when clicking outside, and has proper ARIA attributes.

## Example: Dropdown Menu

```vue
<script setup>
import { ref } from "vue";
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
} from "v-float";

const items = [
  { label: "Edit", action: () => console.log("Edit clicked") },
  { label: "Duplicate", action: () => console.log("Duplicate clicked") },
  { label: "Delete", action: () => console.log("Delete clicked") },
  { label: "Export", action: () => console.log("Export clicked") },
];

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift({ padding: 5 })],
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open the dropdown
const click = useClick(floating.context);

// Close when clicking outside or pressing escape
const dismiss = useDismiss(floating.context, {
  outsidePress: true,
  escapeKey: true,
});

// Set ARIA attributes
const role = useRole(floating.context, { role: "menu" });

// Handle keyboard navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  dismiss,
  role,
  listNav,
]);

// Track item elements for list navigation
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Execute action when item is clicked
function selectItem(index) {
  items[index].action();
  isOpen.value = false;
}
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    class="dropdown-button"
  >
    Actions
    <span class="dropdown-icon">▼</span>
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    role="menu"
    class="dropdown-menu"
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItem"
      v-bind="getItemProps({ index })"
      role="menuitem"
      :tabindex="activeIndex === index ? 0 : -1"
      class="menu-item"
      :class="{ active: activeIndex === index }"
      @click="selectItem(index)"
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
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  FloatingFocusManager,
  FloatingOverlay,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open the modal
const click = useClick(floating.context);

// Close when pressing escape (but not when clicking outside)
const dismiss = useDismiss(floating.context, {
  outsidePress: false,
  escapeKey: true,
});

// Set ARIA attributes for accessibility
const role = useRole(floating.context, { role: "dialog" });

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  click,
  dismiss,
  role,
]);
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    class="open-modal-button"
  >
    Open Modal
  </button>

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
          <h2 id="modal-title">Modal Title</h2>
          <button @click="isOpen = false" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <p>This is a modal dialog that appears when you click the button.</p>
          <p>
            It traps focus inside the modal and has proper ARIA attributes for
            accessibility.
          </p>
        </div>

        <div class="modal-footer">
          <button @click="isOpen = false" class="cancel-button">Cancel</button>
          <button @click="isOpen = false" class="confirm-button">
            Confirm
          </button>
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

2. **Ensure keyboard accessibility**: Keep `keyboardHandlers` enabled so keyboard users can trigger the interaction with Enter or Space keys.

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
