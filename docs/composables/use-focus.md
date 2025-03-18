# useFocus

The `useFocus` composable enables focus-based interactions for floating elements. It provides a way to show and hide floating UI elements when the user focuses on a reference element, which is crucial for keyboard accessibility.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useInteractions, useFocus } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create focus interaction
const focus = useFocus(floating.context);

// Apply the interactions
const { getReferenceProps, getFloatingProps } = useInteractions([focus]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">
    Focus Me (click or tab)
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
  >
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
): {
  getReferenceProps: (userProps?: object) => object;
  getFloatingProps: (userProps?: object) => object;
};
```

| Parameter | Type            | Description                                  |
| --------- | --------------- | -------------------------------------------- |
| context   | FloatingContext | The context object returned from useFloating |
| options   | UseFocusOptions | Optional configuration options               |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useFocus` composable accepts several options to customize its behavior:

| Option       | Type                          | Default | Description                                                                                           |
| ------------ | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| enabled      | boolean \| Ref&lt;boolean&gt; | true    | Whether the focus interaction is enabled                                                              |
| keyboardOnly | boolean                       | false   | When true, only keyboard navigation focus events will trigger the interaction (not mouse clicks)      |
| visibleOnly  | boolean                       | false   | When true, only focus events for visible elements are handled (useful for screenreader accessibility) |

### Return Value

`useFocus` returns an object with functions that generate props:

| Property          | Type                           | Description                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element |
| getFloatingProps  | (userProps?: object) => object | Function that returns props to apply to the floating element  |

## Focus Behavior Options

### Keyboard-Only Focus

In some cases, you may want to show the floating element only when the user navigates to the reference element using the keyboard (via Tab key), but not when they click on it. The `keyboardOnly` option enables this behavior:

```vue
<script setup>
import { useFloating, useInteractions, useFocus } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Only trigger on keyboard focus events
const focus = useFocus(floating.context, {
  keyboardOnly: true,
});

const { getReferenceProps, getFloatingProps } = useInteractions([focus]);
</script>
```

This is particularly useful when combining with other interaction methods like `useHover` or `useClick`, allowing different behaviors for different types of interactions.

### Visible-Only Focus

The `visibleOnly` option makes the focus interaction only trigger for elements that are visible to the user. This is useful for improving accessibility with screen readers, which can focus elements that aren't visually focused:

```vue
<script setup>
import { useFloating, useInteractions, useFocus } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Only trigger on visible focus events
const focus = useFocus(floating.context, {
  visibleOnly: true,
});
</script>
```

## Conditional Enabling

You can conditionally enable or disable the focus interaction with the `enabled` option:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useFocus } from "v-float";

// Control whether focus interaction is enabled
const focusEnabled = ref(true);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Use reactive enabled option
const focus = useFocus(floating.context, {
  enabled: focusEnabled,
});

// Later you can update this
function disableFocus() {
  focusEnabled.value = false;
}

function enableFocus() {
  focusEnabled.value = true;
}
</script>
```

## Combining with Other Interactions

`useFocus` is commonly combined with other interaction composables for a better user experience:

```vue
<script setup>
import {
  useFloating,
  useInteractions,
  useHover,
  useFocus,
  useRole,
} from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create interaction handlers
const hover = useHover(floating.context, {
  delay: { open: 200, close: 100 },
});
const focus = useFocus(floating.context);
const role = useRole(floating.context, { role: "tooltip" });

// Combine them all
const { getReferenceProps, getFloatingProps } = useInteractions([
  hover,
  focus,
  role,
]);
</script>
```

This creates a floating element that appears both when the reference element is hovered and when it's focused, with proper ARIA attributes.

## Focus Management Within Floating Elements

For more complex focus management within floating elements (like modals or complex dialogs), you should use the `FloatingFocusManager` component in addition to `useFocus`:

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useFocus,
  useClick,
  FloatingFocusManager,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Combine focus and click interactions
const focus = useFocus(floating.context);
const click = useClick(floating.context);

const { getReferenceProps, getFloatingProps } = useInteractions([focus, click]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Dialog</button>

  <FloatingFocusManager v-if="isOpen" :context="floating.context" modal>
    <div
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="dialog"
    >
      <h2>Dialog Title</h2>
      <p>Dialog content goes here.</p>
      <div class="button-group">
        <button @click="isOpen = false">Cancel</button>
        <button @click="isOpen = false">Confirm</button>
      </div>
    </div>
  </FloatingFocusManager>
</template>
```

The `FloatingFocusManager` traps and manages focus within the dialog, enabling proper keyboard navigation within the floating element.

## Example: Accessible Form Input with Suggestions

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useFocus,
  useListNavigation,
  useRole,
  offset,
  flip,
  shift,
} from "v-float";

const suggestions = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Elderberry",
  "Fig",
  "Grape",
];

const inputRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);
const inputValue = ref("");

const floating = useFloating(inputRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift()],
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Focus interaction - show suggestions on input focus
const focus = useFocus(floating.context);

// List navigation - keyboard navigation of suggestions
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

// Set ARIA attributes
const role = useRole(floating.context, { role: "listbox" });

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  focus,
  listNav,
  role,
]);

// Filter suggestions based on input
const filteredSuggestions = computed(() => {
  if (!inputValue.value) return suggestions;
  return suggestions.filter((s) =>
    s.toLowerCase().includes(inputValue.value.toLowerCase())
  );
});

// Track item elements for list navigation
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Select a suggestion
function selectSuggestion(suggestion) {
  inputValue.value = suggestion;
  isOpen.value = false;
}

// Reset list when input changes
function updateInput(e) {
  inputValue.value = e.target.value;
  listRef.value = [];
  if (inputValue.value) {
    isOpen.value = true;
  }
}
</script>

<template>
  <label for="fruit-input">Choose a fruit:</label>
  <input
    id="fruit-input"
    ref="inputRef"
    v-bind="getReferenceProps()"
    v-model="inputValue"
    @input="updateInput"
    placeholder="Type to search..."
    autocomplete="off"
    :aria-expanded="isOpen"
    aria-autocomplete="list"
    aria-controls="suggestions-list"
  />

  <div
    v-if="isOpen && filteredSuggestions.length > 0"
    id="suggestions-list"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="suggestions-list"
  >
    <div
      v-for="(suggestion, index) in filteredSuggestions"
      :key="suggestion"
      :ref="collectItem"
      v-bind="getItemProps({ index })"
      role="option"
      :aria-selected="activeIndex === index"
      :class="{ active: activeIndex === index }"
      class="suggestion-item"
      @click="selectSuggestion(suggestion)"
    >
      {{ suggestion }}
    </div>
  </div>
</template>

<style scoped>
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.suggestions-list {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 100%;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
}

.suggestion-item:hover,
.suggestion-item.active {
  background-color: #f0f0f0;
}
</style>
```

This example shows an accessible form input with suggestions that appear on focus and can be navigated using keyboard.

## Best Practices

1. **Combine with hover**: For non-touch devices, combine with `useHover` to provide multiple interaction methods.

2. **Consider screen readers**: Use `visibleOnly: false` if you want focus behavior to work with screen readers where elements may not be visually focused.

3. **Keyboard accessibility**: Ensure all functionality that's available via mouse is also available via keyboard.

4. **Proper focus management**: For complex floating UIs like dialogs, use `FloatingFocusManager` to trap focus within the floating element.

5. **Return focus on close**: When using modal dialogs, ensure focus returns to the trigger element when the dialog closes.

6. **Test with keyboard**: Always test your implementation by navigating with the Tab key and ensure it works as expected.

7. **Include ARIA attributes**: Use `useRole` to provide appropriate ARIA attributes for accessibility.

## Related Composables

- `useHover`: For hover-based interactions
- `useClick`: For click-based interactions
- `useRole`: For ARIA attribute management
- `useListNavigation`: For keyboard navigation within the floating element
- `FloatingFocusManager`: For managing focus within the floating element
