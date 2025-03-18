# useRole

The `useRole` composable helps manage ARIA roles and attributes for your floating elements, ensuring they're accessible to all users, including those using assistive technologies like screen readers.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useInteractions, useClick, useRole } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create click interaction
const click = useClick(floating.context);

// Add ARIA role and attributes
const role = useRole(floating.context, {
  role: "dialog", // Set appropriate ARIA role
});

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([click, role]);
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    aria-label="Open dialog"
  >
    Open Dialog
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    aria-labelledby="dialog-title"
    class="dialog"
  >
    <h2 id="dialog-title">Dialog Title</h2>
    <p>This dialog has proper ARIA attributes for accessibility.</p>
  </div>
</template>
```

## API Reference

### Arguments

```ts
function useRole(
  context: FloatingContext,
  options?: UseRoleOptions
): {
  getReferenceProps: (userProps?: object) => object;
  getFloatingProps: (userProps?: object) => object;
};
```

| Parameter | Type            | Description                                  |
| --------- | --------------- | -------------------------------------------- |
| context   | FloatingContext | The context object returned from useFloating |
| options   | UseRoleOptions  | Optional configuration options               |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useRole` composable accepts several options to customize its behavior:

| Option  | Type                                                             | Default        | Description                                                                               |
| ------- | ---------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| enabled | boolean \| Ref&lt;boolean&gt;                                    | true           | Whether the role interactions are enabled                                                 |
| role    | 'tooltip' \| 'dialog' \| 'menu' \| 'listbox' \| 'grid' \| 'tree' | 'dialog'       | The ARIA role to apply to the floating element                                            |
| roleId  | string \| null                                                   | auto-generated | The ID to use for ARIA attributes. If not specified, one will be generated automatically. |

### Return Value

`useRole` returns an object with functions that generate props:

| Property          | Type                           | Description                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element |
| getFloatingProps  | (userProps?: object) => object | Function that returns props to apply to the floating element  |

## Common Role Types

### Tooltip

Use the `tooltip` role for simple informational tooltips that appear on hover:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useHover, useRole } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const hover = useHover(floating.context);
const role = useRole(floating.context, { role: "tooltip" });

const { getReferenceProps, getFloatingProps } = useInteractions([hover, role]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Hover me</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="tooltip"
  >
    This is a tooltip with proper ARIA role
  </div>
</template>
```

`useRole` will automatically apply the `aria-describedby` attribute to the reference element, connecting it to the tooltip.

### Dialog

For modal dialogs or popovers containing interactive content, use the `dialog` role:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useClick, useRole } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const click = useClick(floating.context);
const role = useRole(floating.context, { role: "dialog" });

const { getReferenceProps, getFloatingProps } = useInteractions([click, role]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Dialog</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="dialog"
    aria-labelledby="dialog-title"
    aria-modal="true"
  >
    <h2 id="dialog-title">Dialog Title</h2>
    <p>This is a dialog with proper ARIA role.</p>
    <button @click="isOpen = false">Close</button>
  </div>
</template>
```

For dialogs, you should provide `aria-labelledby` or `aria-label` to describe the dialog's purpose.

### Menu

For dropdown menus, use the `menu` role:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useClick, useRole } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const click = useClick(floating.context);
const role = useRole(floating.context, { role: "menu" });

const { getReferenceProps, getFloatingProps } = useInteractions([click, role]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()" aria-label="Menu">
    ☰
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="menu"
  >
    <div role="menuitem" tabindex="0">Option 1</div>
    <div role="menuitem" tabindex="0">Option 2</div>
    <div role="menuitem" tabindex="0">Option 3</div>
  </div>
</template>
```

For menus, add `role="menuitem"` to each menu item. For complex hierarchical menus, consider using `role="menubar"` for the top-level menu.

### Listbox

For selection dropdowns, use the `listbox` role:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useClick, useRole } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);
const selectedOption = ref("Select an option");

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const click = useClick(floating.context);
const role = useRole(floating.context, { role: "listbox" });

const { getReferenceProps, getFloatingProps } = useInteractions([click, role]);

function selectOption(option) {
  selectedOption.value = option;
  isOpen.value = false;
}
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    aria-haspopup="listbox"
    aria-expanded="isOpen"
  >
    {{ selectedOption }}
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="listbox"
  >
    <div
      role="option"
      tabindex="0"
      :aria-selected="selectedOption === 'Option 1'"
      @click="selectOption('Option 1')"
    >
      Option 1
    </div>
    <div
      role="option"
      tabindex="0"
      :aria-selected="selectedOption === 'Option 2'"
      @click="selectOption('Option 2')"
    >
      Option 2
    </div>
    <div
      role="option"
      tabindex="0"
      :aria-selected="selectedOption === 'Option 3'"
      @click="selectOption('Option 3')"
    >
      Option 3
    </div>
  </div>
</template>
```

For listboxes, add `role="option"` to each option and use `aria-selected` to indicate the selected option.

## Custom ID Management

By default, `useRole` generates a unique ID for ARIA attributes. You can provide your own ID:

```vue
<script setup>
import { useFloating, useInteractions, useRole } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Use a custom ID for ARIA attributes
const role = useRole(floating.context, {
  role: "dialog",
  roleId: "my-custom-dialog-id",
});
</script>
```

This is useful when you need to maintain consistent IDs across component re-renders or want to ensure specific ID values.

## Combining with Other Composables

`useRole` is typically used with other interaction composables:

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useHover,
  useDismiss,
  useRole,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const click = useClick(floating.context);
const hover = useHover(floating.context);
const dismiss = useDismiss(floating.context);
const role = useRole(floating.context, { role: "dialog" });

// Combine all interactions
const { getReferenceProps, getFloatingProps } = useInteractions([
  click,
  hover,
  dismiss,
  role,
]);
</script>
```

## Accessibility Considerations

### Providing Labels and Descriptions

For proper accessibility, always provide labels for your floating elements:

- For tooltips, the tooltip content itself serves as the description
- For dialogs, use `aria-labelledby` pointing to a heading ID inside the dialog
- For menus and listboxes, ensure each option has a clear label

```vue
<template>
  <!-- Dialog example -->
  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    aria-labelledby="dialog-title"
  >
    <h2 id="dialog-title">Dialog Title</h2>
    <p id="dialog-desc">
      This dialog has a title and description for screen readers.
    </p>
  </div>
</template>
```

### Keyboard Navigation

Ensure users can navigate through interactive elements with keyboards:

- Add `tabindex="0"` to interactive elements
- Implement arrow key navigation for menus and listboxes
- Ensure the Escape key can close dialogs and menus

Consider using `useListNavigation` and `useTypeahead` composables for complex navigation.

### Focus Management

For modal dialogs, manage focus properly to prevent keyboard users from tabbing outside the dialog:

```vue
<script setup>
import {
  useFloating,
  useInteractions,
  useRole,
  FloatingFocusManager,
} from "v-float";

// Set up floating element and interactions
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Dialog</button>

  <FloatingFocusManager v-if="isOpen" :context="floating.context" modal>
    <div
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      aria-labelledby="dialog-title"
      aria-modal="true"
    >
      <h2 id="dialog-title">Dialog Title</h2>
      <p>Dialog content...</p>
      <button @click="isOpen = false">Close</button>
    </div>
  </FloatingFocusManager>
</template>
```

The `FloatingFocusManager` component handles focus trapping to keep keyboard focus within the dialog.

## Example: Complete Accessible Dropdown

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
  autoUpdate,
  offset,
  flip,
  size,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref(null);
const isOpen = ref(false);
const selectedIndex = ref(null);
const activeIndex = ref(null);

const options = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "dragonfruit", label: "Dragon Fruit" },
  { value: "elderberry", label: "Elderberry" },
];

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(5),
    flip(),
    size({
      apply({ elements, availableHeight }) {
        Object.assign(elements.floating.style, {
          maxHeight: `${availableHeight}px`,
          overflowY: "auto",
        });
      },
      padding: 10,
    }),
  ],
});

const click = useClick(floating.context);
const dismiss = useDismiss(floating.context);
const role = useRole(floating.context, { role: "listbox" });

// List navigation with keyboard support
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  selectedIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

// Combine all interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  dismiss,
  role,
  listNav,
]);

function selectOption(index) {
  selectedIndex.value = index;
  isOpen.value = false;
}

function getSelectedLabel() {
  if (selectedIndex.value === null) {
    return "Select a fruit";
  }
  return options[selectedIndex.value].label;
}

function handleKeyDown(event, index) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectOption(index);
  }
}
</script>

<template>
  <div class="select-container">
    <button
      ref="referenceRef"
      v-bind="getReferenceProps()"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-labelledby="isOpen ? 'select-label select-button' : 'select-label'"
      id="select-button"
      class="select-button"
    >
      <span id="select-label">{{ getSelectedLabel() }}</span>
      <span class="select-arrow">▼</span>
    </button>

    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="select-listbox"
      role="listbox"
      aria-labelledby="select-label"
    >
      <div ref="listRef">
        <div
          v-for="(option, index) in options"
          :key="option.value"
          v-bind="
            getItemProps({
              index,
              role: 'option',
              onClick: () => selectOption(index),
            })
          "
          :id="`select-option-${index}`"
          :aria-selected="selectedIndex === index"
          :data-selected="selectedIndex === index"
          :data-active="activeIndex === index"
          @keydown="(e) => handleKeyDown(e, index)"
          class="select-option"
          tabindex="0"
        >
          {{ option.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-container {
  position: relative;
  width: 200px;
}

.select-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  text-align: left;
  cursor: pointer;
}

.select-arrow {
  font-size: 10px;
  color: #666;
}

.select-listbox {
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow-y: auto;
  max-height: 250px;
}

.select-option {
  padding: 8px 12px;
  cursor: pointer;
}

.select-option:hover,
.select-option[data-active="true"] {
  background: #f5f5f5;
}

.select-option[data-selected="true"] {
  background: #e0f0ff;
  font-weight: 500;
}
</style>
```

## Best Practices

1. **Match the ARIA role to the UI pattern**: Select the proper role for your component based on its behavior, not just its appearance.

2. **Provide proper labels and descriptions**: Always include accessible names for your floating elements using `aria-label` or `aria-labelledby`.

3. **Handle focus management**: For interactive components like dialogs, manage focus properly so keyboard users can navigate effectively.

4. **Ensure keyboard accessibility**: Make sure all interactions can be performed with keyboard alone.

5. **Test with assistive technologies**: Verify your components work with screen readers like NVDA, JAWS, or VoiceOver.

6. **Consider conditional roles**: For components that can serve different purposes, adjust the role based on context.

7. **Combine with other accessibility utilities**: Use `useRole` alongside composables like `useListNavigation` and wrapper components like `FloatingFocusManager` for complete accessibility.

## Related Composables

- `useFloating`: The core composable for positioning floating elements
- `useListNavigation`: For keyboard navigation in lists, menus, and listboxes
- `useTypeahead`: For keyboard character search in lists and menus
- `useDismiss`: For keyboard escape and click outside behavior
- `FloatingFocusManager`: For managing focus within floating elements

```

```
