# FloatingFocusManager

The `FloatingFocusManager` component manages focus when floating elements are open, trapping focus within the floating element and returning focus to the reference element when closed. This is essential for accessibility and keyboard navigation in modal dialogs, dropdown menus, and other floating UI elements.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  FloatingFocusManager,
} from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open
const click = useClick(floating.context);

// Dismiss on Escape key or outside click
const dismiss = useDismiss(floating.context);

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  click,
  dismiss,
]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Dialog</button>

  <FloatingFocusManager v-if="isOpen" :context="floating.context" modal>
    <div
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="dialog"
      role="dialog"
      aria-modal="true"
    >
      <h2>Dialog Title</h2>
      <p>This dialog traps focus within it when open.</p>

      <div class="form-fields">
        <input type="text" placeholder="Name" />
        <input type="email" placeholder="Email" />
      </div>

      <div class="dialog-buttons">
        <button @click="isOpen = false">Cancel</button>
        <button @click="isOpen = false" class="primary">Submit</button>
      </div>
    </div>
  </FloatingFocusManager>
</template>
```

## Props

| Prop              | Type                                | Default     | Description                                                                       |
| ----------------- | ----------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| context           | FloatingContext                     | required    | The context object returned from useFloating                                      |
| order             | string[]                            | []          | Order of elements to focus when tabbing                                           |
| modal             | boolean                             | false       | Whether focus should be trapped within the floating element                       |
| initialFocus      | number \| Ref&lt;HTMLElement&gt;    | -1          | Element or index to receive focus when the floating element opens                 |
| returnFocus       | boolean                             | true        | Whether focus should return to the reference when the floating element closes     |
| guards            | boolean                             | true        | Whether to use focus guards to detect keyboard focus leaving the floating element |
| outsidePressEvent | 'mousedown' \| 'mouseup' \| 'click' | 'mousedown' | Event used to detect clicks outside the floating element                          |

## Features

### Modal Focus Trapping

When the `modal` prop is set to `true` (recommended for dialogs), focus will be completely trapped within the floating element:

- Tab navigation will cycle through all focusable elements inside the floating element
- Focus will not escape to elements outside the floating element
- Screen readers will announce the content as a modal dialog

```vue
<FloatingFocusManager v-if="isOpen" :context="floating.context" :modal="true">
  <div ref="floatingRef" role="dialog" aria-modal="true">
    <!-- Dialog content -->
  </div>
</FloatingFocusManager>
```

### Custom Initial Focus

By default, the first focusable element inside the floating element receives focus. You can customize this behavior:

```vue
<script setup>
import { ref } from "vue";

const initialFocusRef = ref(null);
</script>

<template>
  <FloatingFocusManager
    v-if="isOpen"
    :context="floating.context"
    :initialFocus="initialFocusRef"
  >
    <div ref="floatingRef">
      <button>First button</button>
      <button ref="initialFocusRef">This gets focused first</button>
      <button>Third button</button>
    </div>
  </FloatingFocusManager>
</template>
```

Alternatively, you can specify the index of the element to focus:

```vue
<FloatingFocusManager
  v-if="isOpen"
  :context="floating.context"
  :initialFocus="1"
  <!--
  Focus
  the
  second
  focusable
  element
  --
>
>
  <!-- Content -->
</FloatingFocusManager>
```

Special values for `initialFocus`:

- `-1`: Focus the floating element itself (container)
- `0`: Focus the first focusable element
- Specific index: Focus the nth focusable element (0-based)

### Custom Focus Order

You can customize the order in which elements receive focus when tabbing:

```vue
<script setup>
const customOrder = ["name", "submit", "cancel", "email"];
</script>

<template>
  <FloatingFocusManager
    v-if="isOpen"
    :context="floating.context"
    :order="customOrder"
    modal
  >
    <div ref="floatingRef">
      <h2>Sign Up</h2>
      <input id="name" name="name" type="text" placeholder="Name" />
      <input id="email" name="email" type="email" placeholder="Email" />
      <button id="cancel" name="cancel">Cancel</button>
      <button id="submit" name="submit">Submit</button>
    </div>
  </FloatingFocusManager>
</template>
```

This would create a tab order of: Name field → Submit button → Cancel button → Email field.

### Return Focus

By default, focus returns to the reference element when the floating element closes. You can disable this:

```vue
<FloatingFocusManager
  v-if="isOpen"
  :context="floating.context"
  :returnFocus="false"
>
  <!-- Content -->
</FloatingFocusManager>
```

### Focus Guards

Focus guards detect when keyboard focus attempts to leave the floating element. This is enabled by default with `guards: true`. In non-modal usage, this can be useful to detect when focus should return to the reference element.

## Examples

### Modal Dialog with Focus Management

```vue
<script setup lang="ts">
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

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open
const click = useClick(floating.context);

// Dismiss on Escape key
const dismiss = useDismiss(floating.context, {
  outsidePress: false, // Prevent closing when clicking outside for modal
});

// ARIA role
const role = useRole(floating.context, { role: "dialog" });

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  click,
  dismiss,
  role,
]);

function handleConfirm() {
  // Handle confirm action
  isOpen.value = false;
}
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Modal</button>

  <!-- Overlay provides a backdrop -->
  <FloatingOverlay v-if="isOpen" :lock-scroll="true" class="modal-overlay">
    <!-- Focus manager traps focus -->
    <FloatingFocusManager :context="floating.context" modal>
      <div
        ref="floatingRef"
        v-bind="getFloatingProps()"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div class="modal-header">
          <h2 id="dialog-title">Confirm Action</h2>
          <button
            @click="isOpen = false"
            class="close-button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div class="modal-body">
          <p>Are you sure you want to continue with this action?</p>
          <p>This will apply all the changes you've made.</p>
        </div>

        <div class="modal-footer">
          <button @click="isOpen = false" class="button-secondary">
            Cancel
          </button>
          <button @click="handleConfirm" class="button-primary">Confirm</button>
        </div>
      </div>
    </FloatingFocusManager>
  </FloatingOverlay>
</template>

<style scoped>
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  margin: auto;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  gap: 12px;
}

.button-secondary {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.button-primary {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### Form with Custom Initial Focus and Tab Order

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  FloatingFocusManager,
} from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const submitButtonRef = ref<HTMLElement | null>(null);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open
const click = useClick(floating.context);

// Dismiss on outside click or Escape
const dismiss = useDismiss(floating.context);

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  click,
  dismiss,
]);

// Custom tab order
const customTabOrder = [
  "email",
  "confirm-button",
  "name",
  "message",
  "cancel-button",
];
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Form</button>

  <FloatingFocusManager
    v-if="isOpen"
    :context="floating.context"
    :initialFocus="submitButtonRef"
    :order="customTabOrder"
    modal
  >
    <div
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="floating-form"
      role="dialog"
    >
      <h2>Contact Form</h2>

      <div class="form-group">
        <label for="name">Name</label>
        <input id="name" name="name" type="text" />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" />
      </div>

      <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" name="message" rows="4"></textarea>
      </div>

      <div class="form-buttons">
        <button id="cancel-button" name="cancel-button" @click="isOpen = false">
          Cancel
        </button>

        <button
          id="confirm-button"
          name="confirm-button"
          ref="submitButtonRef"
          @click="isOpen = false"
          class="primary"
        >
          Submit
        </button>
      </div>
    </div>
  </FloatingFocusManager>
</template>

<style scoped>
.floating-form {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 20px;
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button.primary {
  background: #4a90e2;
  color: white;
  border: none;
}
</style>
```

### Non-Modal Combobox with Focus Management

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useListNavigation,
  FloatingFocusManager,
  offset,
  flip,
} from "v-float";

const options = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Elderberry",
  "Fig",
  "Grape",
  "Kiwi",
  "Lemon",
  "Mango",
];

const inputRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement[]>([]);
const isOpen = ref(false);
const activeIndex = ref<number | null>(null);
const selectedOption = ref<string | null>(null);
const inputValue = ref("");

// Filtered options based on input
const filteredOptions = computed(() => {
  const value = inputValue.value.toLowerCase();
  if (!value) return options;
  return options.filter((option) => option.toLowerCase().includes(value));
});

const floating = useFloating(inputRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip()],
  open: isOpen,
  onOpenChange: (value) => {
    isOpen.value = value;
    if (!value) {
      // Reset list when closing
      listRef.value = [];
    }
  },
});

// List navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  // This opens the list when arrow keys are pressed
  openOnArrowKeyDown: true,
});

// Click to toggle
const click = useClick(floating.context);

// Dismiss on outside click
const dismiss = useDismiss(floating.context);

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
  click,
  dismiss,
]);

// Collect item elements
function collectItem(el: HTMLElement | null) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Handle input changes
function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  inputValue.value = target.value;
  if (!isOpen.value) {
    isOpen.value = true;
  }
}

// Select an option
function selectOption(option: string) {
  selectedOption.value = option;
  inputValue.value = option;
  isOpen.value = false;
}

// Handle keyboard events
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && activeIndex.value !== null) {
    selectOption(filteredOptions.value[activeIndex.value]);
    event.preventDefault();
  }
}
</script>

<template>
  <div class="combobox-container">
    <label for="fruit-input">Select Fruit</label>
    <input
      id="fruit-input"
      ref="inputRef"
      v-bind="getReferenceProps()"
      v-model="inputValue"
      @input="handleInput"
      @keydown="handleKeydown"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      aria-controls="fruit-listbox"
      aria-activedescendant="activeIndex !== null ? `option-${activeIndex}` : undefined"
      class="combobox-input"
    />

    <FloatingFocusManager
      v-if="isOpen && filteredOptions.length > 0"
      :context="floating.context"
      :initial-focus="-1"
      :modal="false"
    >
      <div
        id="fruit-listbox"
        ref="floatingRef"
        v-bind="getFloatingProps()"
        :style="floating.floatingStyles"
        role="listbox"
        class="combobox-listbox"
      >
        <div
          v-for="(option, index) in filteredOptions"
          :key="option"
          :ref="collectItem"
          v-bind="getItemProps({ index })"
          :id="`option-${index}`"
          role="option"
          :aria-selected="selectedOption === option"
          :data-active="activeIndex === index"
          @click="selectOption(option)"
          class="combobox-option"
        >
          {{ option }}
        </div>
      </div>
    </FloatingFocusManager>
  </div>
</template>

<style scoped>
.combobox-container {
  position: relative;
  width: 250px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.combobox-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.combobox-listbox {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-height: 250px;
  overflow-y: auto;
  width: 100%;
  z-index: 100;
}

.combobox-option {
  padding: 8px 12px;
  cursor: pointer;
}

.combobox-option[data-active="true"] {
  background: #f0f0f0;
}
</style>
```

## Accessibility Considerations

### ARIA Attributes

When using `FloatingFocusManager`, it's important to add appropriate ARIA attributes to your floating element:

For modal dialogs:

```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Dialog Title</h2>
  <!-- Content -->
</div>
```

For comboboxes:

```html
<input
  role="combobox"
  aria-autocomplete="list"
  aria-expanded="isOpen"
  aria-controls="listbox-id"
  aria-activedescendant="activeOptionId"
/>
<div id="listbox-id" role="listbox">
  <!-- Options -->
</div>
```

### Keyboard Navigation

For optimal keyboard navigation:

1. Make sure all interactive elements are focusable
2. Provide clear focus styles for all elements
3. Ensure Escape key closes the floating element
4. For modal dialogs, confirm buttons should typically come before cancel buttons in the tab order

## Best Practices

1. **Use modal for dialogs**: When creating modal dialogs, always set `modal={true}` to properly trap focus.

2. **Provide keyboard shortcuts**: In addition to focus management, implement keyboard shortcuts for common actions (Escape to close, Enter to confirm, etc.).

3. **Test with screen readers**: Verify that your implementation works well with screen readers and announces the floating element appropriately.

4. **Use with FloatingOverlay**: For modal dialogs, combine `FloatingFocusManager` with `FloatingOverlay` to create a backdrop and prevent scrolling.

5. **Return focus**: Keep the default `returnFocus={true}` to ensure the user's focus returns to a logical position when closing.

6. **Consider non-modal contexts**: For non-modal elements like dropdowns, set `modal={false}` but still use the focus manager to improve keyboard navigation.

## Related Components and Composables

- `FloatingOverlay`: Creates a backdrop for modal dialogs
- `useFloating`: Core composable for positioning floating elements
- `useInteractions`: Manages interactions between reference and floating elements
- `useDismiss`: Handles closing behavior on outside click or Escape key
- `useRole`: Sets appropriate ARIA roles and attributes

```

```
