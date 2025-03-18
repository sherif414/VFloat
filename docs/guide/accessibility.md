# Accessibility in V-Float

Building accessible floating UI elements is essential for creating inclusive web applications. V-Float includes tools and composables specifically designed to help you create accessible tooltips, dropdowns, popovers, and other floating elements.

## Why Accessibility Matters

Accessible floating elements ensure that all users, including those using assistive technologies like screen readers, can interact with your application effectively. Properly implemented floating elements should:

- Be announced appropriately by screen readers
- Be keyboard navigable
- Maintain focus properly
- Have clear relationships between triggering elements and their content

## Key Composables for Accessibility

V-Float provides several composables specifically focused on accessibility:

### useRole

The `useRole` composable helps set appropriate ARIA attributes on both reference and floating elements based on their relationship:

```vue
<script setup>
import { useFloating, useRole, useInteractions } from "v-float";

const { context } = useFloating(referenceRef, floatingRef);

// Set appropriate ARIA attributes based on role
const role = useRole(context, {
  role: "tooltip", // or 'dialog', 'menu', etc.
});

// Include role in interactions
const { getReferenceProps, getFloatingProps } = useInteractions([role]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Trigger</button>
  <div ref="floatingRef" v-bind="getFloatingProps()">Content</div>
</template>
```

Supported roles include:

- `tooltip`: Informational elements that appear on hover/focus
- `dialog`: Modal or non-modal dialogs
- `menu`: Dropdown menus
- `listbox`: Selection lists
- `combobox`: Combined input and dropdown select
- `tree`: Hierarchical tree views

### useListNavigation

For navigable lists like dropdowns and select menus, `useListNavigation` provides keyboard navigation:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useListNavigation, useInteractions } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const activeIndex = ref(null);

const { context } = useFloating(referenceRef, floatingRef);

// Set up keyboard navigation
const listNav = useListNavigation(context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  // Enable wrapping from last to first item and vice versa
  loop: true,
  // Vertical navigation (use 'horizontal' for horizontal lists)
  orientation: "vertical",
});

const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
]);

function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Select</button>

  <div ref="floatingRef" v-bind="getFloatingProps()" role="listbox">
    <div
      v-for="(item, i) in items"
      :key="i"
      :ref="collectItem"
      v-bind="getItemProps({ index: i })"
      :tabindex="activeIndex === i ? 0 : -1"
      role="option"
      :aria-selected="activeIndex === i"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

### FloatingFocusManager

The `FloatingFocusManager` component manages focus within floating elements, ensuring proper focus trapping for modals and other interactive floating UI elements:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, FloatingFocusManager } from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const { context } = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
});
</script>

<template>
  <button ref="referenceRef">Open Dialog</button>

  <FloatingFocusManager v-if="isOpen" :context="context" modal>
    <div ref="floatingRef" role="dialog" aria-modal="true">
      <h2 id="dialog-title">Dialog Title</h2>
      <p id="dialog-desc">Dialog content goes here.</p>

      <div>
        <button>Cancel</button>
        <button>Confirm</button>
      </div>
    </div>
  </FloatingFocusManager>
</template>
```

## ARIA Roles and Attributes

Different floating elements require different ARIA roles and attributes:

### Tooltips

```vue
<button aria-describedby="tooltip-id" ref="referenceRef">
  Help
</button>

<div id="tooltip-id" role="tooltip" ref="floatingRef">
  Help text
</div>
```

### Dropdown Menus

```vue
<button
  aria-haspopup="true"
  aria-expanded="isOpen"
  aria-controls="menu-id"
  ref="referenceRef"
>
  Menu
</button>

<div
  id="menu-id"
  role="menu"
  ref="floatingRef"
>
  <div role="menuitem">Item 1</div>
  <div role="menuitem">Item 2</div>
</div>
```

### Combobox / Select

```vue
<div>
  <label id="select-label" for="select-input">Choose an option</label>
  <div
    ref="referenceRef"
    role="combobox"
    aria-expanded="isOpen"
    aria-haspopup="listbox"
    aria-labelledby="select-label"
  >
    <input
      id="select-input"
      type="text"
      aria-autocomplete="list"
      aria-controls="listbox-id"
    />
  </div>

  <div
    id="listbox-id"
    ref="floatingRef"
    role="listbox"
  >
    <div role="option" aria-selected="activeIndex === 0">Option 1</div>
    <div role="option" aria-selected="activeIndex === 1">Option 2</div>
  </div>
</div>
```

### Dialog / Popover

```vue
<button
  aria-haspopup="dialog"
  aria-expanded="isOpen"
  aria-controls="dialog-id"
  ref="referenceRef"
>
  Open Dialog
</button>

<div
  id="dialog-id"
  ref="floatingRef"
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-desc">Dialog content goes here.</p>
</div>
```

## Keyboard Interaction Patterns

Different types of floating elements should support specific keyboard interactions:

### Tooltips

- **Tab/Shift+Tab**: Move focus to/from tooltip trigger
- **Escape**: Dismiss tooltip (optional)

### Dropdown Menus

- **Space/Enter**: Open menu when trigger is focused
- **Escape**: Close menu
- **Up/Down**: Navigate menu items
- **Enter/Space**: Select menu item
- **Tab/Shift+Tab**: Close menu and move focus to next/previous focusable element

### Combobox / Select

- **Down**: Open dropdown when input is focused
- **Escape**: Close dropdown
- **Up/Down**: Navigate options
- **Enter**: Select option
- **Home/End**: Jump to first/last option
- **Typing**: Filter or select matching options

### Dialog / Popover

- **Tab/Shift+Tab**: Cycle through focusable elements within dialog
- **Escape**: Close dialog

## Best Practices

1. **Always use getProps**: Use the prop getters from `useInteractions` to automatically apply accessibility attributes:

   ```js
   const { getReferenceProps, getFloatingProps } = useInteractions([
     interactions,
   ]);
   ```

2. **Maintain focus properly**: Use `FloatingFocusManager` for complex floating elements like modals and popovers to ensure focus is trapped appropriately.

3. **Ensure keyboard accessibility**: Every action possible with a mouse should be possible with a keyboard.

4. **Use semantic HTML**: Choose appropriate HTML elements for your floating elements (`<button>` for triggers, `<ul>`/`<li>` for lists, etc.).

5. **Implement proper ARIA attributes**: Use `useRole` or manually set appropriate ARIA attributes based on the type of floating element.

6. **Handle Escape key properly**: Use `useDismiss` with appropriate options to handle Escape key dismissal.

7. **Test with screen readers**: Verify that your floating elements are properly announced and navigable with screen readers like VoiceOver, NVDA, or JAWS.

8. **Provide both mouse and keyboard interactions**: Implement both click/hover and keyboard-focused interactions.

## Accessibility Testing

After implementing your floating elements, test them with:

1. **Keyboard-only navigation**: Ensure you can operate all functionality without a mouse
2. **Screen readers**: Test with VoiceOver, NVDA, or JAWS
3. **High contrast mode**: Verify visibility in high contrast settings
4. **Zoom**: Test at different zoom levels (up to 200%)
5. **Focus visibility**: Ensure focus indicators are visible at all times

## Example: Accessible Dropdown

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useRole,
  useListNavigation,
  useDismiss,
  offset,
  flip,
  shift,
} from "v-float";

const items = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Orange", value: "orange" },
];

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);
const selectedIndex = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift()],
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const click = useClick(floating.context);
const role = useRole(floating.context, { role: "listbox" });
const dismiss = useDismiss(floating.context);
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  selectedIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  role,
  dismiss,
  listNav,
]);

function selectItem(index) {
  selectedIndex.value = index;
  isOpen.value = false;
}

function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <div>
    <label id="fruit-label">Select a fruit</label>

    <button
      ref="referenceRef"
      v-bind="getReferenceProps()"
      aria-labelledby="fruit-label"
      :aria-expanded="isOpen"
    >
      {{ selectedIndex !== null ? items[selectedIndex].label : "Select fruit" }}
    </button>

    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="dropdown"
    >
      <div
        v-for="(item, i) in items"
        :key="item.value"
        :ref="collectItem"
        v-bind="getItemProps({ index: i })"
        role="option"
        :aria-selected="selectedIndex === i"
        class="dropdown-item"
        :class="{ active: activeIndex === i, selected: selectedIndex === i }"
        @click="selectItem(i)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
  min-width: 120px;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-item.active {
  background-color: #f0f0f0;
}

.dropdown-item.selected {
  font-weight: bold;
}
</style>
```

By following these accessibility best practices, you can ensure your floating UI elements are usable by all users, regardless of ability or assistive technology.
