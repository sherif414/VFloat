# useListNavigation

The `useListNavigation` composable provides keyboard navigation capabilities for list-based floating elements like dropdowns, select menus, and autocomplete suggestions. It enables users to navigate through items using arrow keys, home/end keys, and optionally through typing.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useListNavigation,
} from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement[]>([]);
const isOpen = ref(false);
const activeIndex = ref<number | null>(null);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create click interaction to open
const click = useClick(floating.context);

// Add list navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  listNav,
]);

// Function to collect item elements for the listRef
function collectItemElement(el: HTMLElement | null) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Open Dropdown</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="dropdown"
  >
    <div
      v-for="(item, index) in ['Option 1', 'Option 2', 'Option 3']"
      :key="index"
      :ref="collectItemElement"
      v-bind="getItemProps({ index })"
      :tabindex="activeIndex === index ? 0 : -1"
      :data-active="activeIndex === index"
      class="dropdown-item"
    >
      {{ item }}
    </div>
  </div>
</template>

<style scoped>
.dropdown {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-item[data-active="true"] {
  background: #f0f0f0;
}
</style>
```

## API Reference

### Arguments

```ts
function useListNavigation(
  context: FloatingContext,
  options?: UseListNavigationOptions
): {
  getReferenceProps: (userProps?: object) => object;
  getFloatingProps: (userProps?: object) => object;
  getItemProps: (userProps?: { index: number } & object) => object;
};
```

| Parameter | Type                     | Description                                  |
| --------- | ------------------------ | -------------------------------------------- |
| context   | FloatingContext          | The context object returned from useFloating |
| options   | UseListNavigationOptions | Optional configuration options               |

### Options

<script setup>
import { ref } from 'vue'
</script>

The `useListNavigation` composable accepts several options to customize its behavior:

| Option             | Type                                 | Default    | Description                                                                   |
| ------------------ | ------------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| enabled            | boolean \| Ref&lt;boolean&gt;        | true       | Whether the list navigation is enabled                                        |
| listRef            | Ref&lt;HTMLElement[]&gt;             | required   | Array of list item elements                                                   |
| activeIndex        | Ref&lt;number \| null&gt;            | required   | The currently active index                                                    |
| selectedIndex      | Ref&lt;number \| null&gt;            | null       | The currently selected index (if different from active)                       |
| onNavigate         | (index: number \| null) => void      | undefined  | Callback when navigation changes the active index                             |
| loop               | boolean                              | false      | Whether to loop from last to first item and vice versa                        |
| nested             | boolean                              | false      | Whether the list is nested (e.g., submenu)                                    |
| orientation        | 'vertical' \| 'horizontal' \| 'both' | 'vertical' | The orientation of the list navigation                                        |
| cols               | number                               | 1          | Number of columns (for grid orientation)                                      |
| focusItemOnOpen    | boolean \| 'auto'                    | 'auto'     | Whether to focus an item when the list opens                                  |
| focusItemOnHover   | boolean                              | true       | Whether hovering an item should focus it                                      |
| openOnArrowKeyDown | boolean                              | true       | Whether pressing arrow keys on the reference should open the floating element |
| disabledIndices    | number[]                             | []         | Array of disabled item indices                                                |
| allowEscape        | boolean                              | false      | Whether to allow tabbing out beyond boundaries                                |
| virtual            | boolean                              | false      | Whether the list uses virtual scrolling                                       |
| virtualItemRef     | Ref&lt;HTMLElement&gt;               | undefined  | Reference to a virtual item element                                           |
| itemsCount         | number                               | 0          | Number of items (for virtual lists)                                           |

### Return Value

`useListNavigation` returns an object with functions that generate props:

| Property          | Type                                               | Description                                                   |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object                     | Function that returns props to apply to the reference element |
| getFloatingProps  | (userProps?: object) => object                     | Function that returns props to apply to the floating element  |
| getItemProps      | (userProps?: { index: number } & object) => object | Function that returns props to apply to each list item        |

## Basic List Navigation Setup

The most important aspects of setting up list navigation are:

1. Creating a ref for the list items
2. Tracking the active index
3. Collecting the list item elements
4. Using the `getItemProps` function to apply navigation props

Here's a basic example:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useListNavigation } from "v-float";

const listRef = ref([]);
const activeIndex = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
]);

// Clear and rebuild the list ref when the component updates
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <div v-if="isOpen" ref="floatingRef" v-bind="getFloatingProps()">
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItem"
      v-bind="getItemProps({ index })"
      :tabindex="activeIndex === index ? 0 : -1"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## Navigation Behavior Customization

### Looping Navigation

By default, navigation stops at the first or last item. To enable looping back to the beginning or end when navigating past boundaries:

```vue
<script setup>
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true, // Enable looping
});
</script>
```

### Changing Orientation

By default, list navigation works vertically (up/down arrows). You can change the orientation to horizontal or both:

```vue
<script setup>
// Horizontal navigation (left/right arrows)
const horizontalNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  orientation: "horizontal",
});

// Both directions (for grid interfaces)
const gridNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  orientation: "both",
  cols: 3, // Number of columns in the grid
});
</script>
```

### Disabling Items

You can mark certain items as disabled, which will make them skipped during keyboard navigation:

```vue
<script setup>
const disabledIndices = [1, 3]; // Items at index 1 and 3 are disabled

const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  disabledIndices,
});
</script>

<template>
  <div v-if="isOpen" ref="floatingRef" v-bind="getFloatingProps()">
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItem"
      v-bind="
        getItemProps({ index, disabled: disabledIndices.includes(index) })
      "
      :tabindex="activeIndex === index ? 0 : -1"
      :aria-disabled="disabledIndices.includes(index)"
      class="dropdown-item"
      :class="{ disabled: disabledIndices.includes(index) }"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

### Initial Focus Behavior

You can control whether an item is focused when the list opens:

```vue
<script setup>
// Always focus the first item when opening
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  focusItemOnOpen: true,
});

// Only focus if opened via keyboard, not mouse
const autoListNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  focusItemOnOpen: "auto", // Default
});

// Never focus an item automatically
const noFocusListNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  focusItemOnOpen: false,
});
</script>
```

### Selected vs. Active Index

In some cases, like select components, you might want to track both the currently active (focused) item and the selected item:

```vue
<script setup>
const activeIndex = ref(null); // Current focus
const selectedIndex = ref(1); // Currently selected option

const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  selectedIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

function selectItem(index) {
  selectedIndex.value = index;
  isOpen.value = false;
}
</script>

<template>
  <div v-if="isOpen" ref="floatingRef" v-bind="getFloatingProps()">
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItem"
      v-bind="getItemProps({ index })"
      :tabindex="activeIndex === index ? 0 : -1"
      :aria-selected="selectedIndex === index"
      :data-selected="selectedIndex === index"
      :data-active="activeIndex === index"
      @click="selectItem(index)"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## Working with Virtual Lists

For performance with very large lists, you might use virtual scrolling. useListNavigation supports this:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useInteractions, useListNavigation } from "v-float";

const items = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  label: `Item ${i}`,
}));
const virtualItemRef = ref(null);
const activeIndex = ref(null);

const listNav = useListNavigation(floating.context, {
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
    // Scroll item into view in your virtual list implementation
  },
  virtual: true,
  virtualItemRef,
  itemsCount: items.length,
});

const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
]);
</script>
```

## Combining with Other Interactions

useListNavigation is commonly combined with other interaction composables for a complete user experience:

```vue
<script setup>
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useListNavigation,
  useTypeahead,
  useRole,
} from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Click to open
const click = useClick(floating.context);

// Keyboard navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

// Type to search
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  findMatch: (text, item) =>
    item.textContent.toLowerCase().startsWith(text.toLowerCase()),
});

// ARIA attributes
const role = useRole(floating.context, {
  role: "listbox",
});

// Close when clicking outside or pressing escape
const dismiss = useDismiss(floating.context);

// Combine all interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  listNav,
  typeahead,
  role,
  dismiss,
]);
</script>
```

## Example: Complete Select Component

```vue
<script setup>
import { ref, computed } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useListNavigation,
  useTypeahead,
  useRole,
  offset,
  flip,
  size,
} from "v-float";

const options = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "date", label: "Date" },
  { value: "elderberry", label: "Elderberry" },
  { value: "fig", label: "Fig" },
  { value: "grape", label: "Grape" },
];

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);
const selectedIndex = ref(null);
const selectedLabel = computed(() => {
  if (selectedIndex.value === null) return "Select an option";
  return options[selectedIndex.value].label;
});

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [
    offset(5),
    flip(),
    size({
      apply({ elements, availableHeight }) {
        Object.assign(elements.floating.style, {
          maxHeight: `${Math.min(availableHeight - 10, 250)}px`,
          overflowY: "auto",
        });
      },
    }),
  ],
  open: isOpen,
  onOpenChange: (value) => {
    isOpen.value = value;
    // Reset list ref when closing
    if (!value) {
      listRef.value = [];
    }
  },
});

// Click to toggle
const click = useClick(floating.context);

// Keyboard navigation
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  selectedIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
  focusItemOnOpen: "auto",
});

// Type to search
const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
});

// ARIA roles
const role = useRole(floating.context, {
  role: "listbox",
});

// Dismiss when clicking outside
const dismiss = useDismiss(floating.context);

// Combine all interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  listNav,
  typeahead,
  role,
  dismiss,
]);

// Collect items for list ref
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Select an option
function selectOption(index) {
  selectedIndex.value = index;
  isOpen.value = false;
}

// Handle keyboard selection
function handleItemKeyDown(event, index) {
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
      class="select-button"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      aria-labelledby="select-label"
    >
      <span id="select-label">{{ selectedLabel }}</span>
      <span class="select-arrow">▼</span>
    </button>

    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="floating.floatingStyles"
      class="select-menu"
      role="listbox"
      aria-labelledby="select-label"
    >
      <div
        v-for="(option, index) in options"
        :key="option.value"
        :ref="collectItem"
        v-bind="getItemProps({ index })"
        role="option"
        :id="`option-${index}`"
        :aria-selected="selectedIndex === index"
        :tabindex="activeIndex === index ? 0 : -1"
        :data-active="activeIndex === index"
        :data-selected="selectedIndex === index"
        class="select-option"
        @click="selectOption(index)"
        @keydown="(e) => handleItemKeyDown(e, index)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-container {
  position: relative;
  width: 250px;
}

.select-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.select-arrow {
  font-size: 10px;
  color: #666;
}

.select-menu {
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.select-option {
  padding: 8px 12px;
  cursor: pointer;
}

.select-option[data-active="true"] {
  background: #f0f0f0;
}

.select-option[data-selected="true"] {
  font-weight: 500;
  background: #e6f7ff;
}
</style>
```

## Example: Multi-column Grid Navigation

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useClick,
  useListNavigation,
  offset,
} from "v-float";

const colors = [
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "indigo", label: "Indigo" },
  { value: "violet", label: "Violet" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "gray", label: "Gray" },
  { value: "brown", label: "Brown" },
  { value: "pink", label: "Pink" },
];

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);
const selectedColor = ref(null);

// Number of columns in the grid
const columns = 3;

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom",
  middleware: [offset(10)],
  open: isOpen,
  onOpenChange: (value) => {
    isOpen.value = value;
    if (!value) {
      listRef.value = [];
    }
  },
});

// Click to toggle
const click = useClick(floating.context);

// Grid navigation with both directions
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
  orientation: "both", // Enable both horizontal and vertical navigation
  cols: columns, // Tell the navigation how many columns there are
});

// Combine interactions
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  listNav,
]);

// Collect items for list ref
function collectItem(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}

// Select a color
function selectColor(color, index) {
  selectedColor.value = color;
  isOpen.value = false;
}
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()" class="color-button">
    <span>Select Color</span>
    <div
      v-if="selectedColor"
      class="color-preview"
      :style="{ backgroundColor: selectedColor.value }"
    ></div>
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="color-grid-container"
  >
    <div class="color-grid">
      <div
        v-for="(color, index) in colors"
        :key="color.value"
        :ref="collectItem"
        v-bind="getItemProps({ index })"
        :tabindex="activeIndex === index ? 0 : -1"
        :data-active="activeIndex === index"
        class="color-item"
        @click="selectColor(color, index)"
      >
        <div
          class="color-swatch"
          :style="{ backgroundColor: color.value }"
        ></div>
        <span class="color-label">{{ color.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #ddd;
}

.color-grid-container {
  padding: 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
}

.color-item[data-active="true"] {
  background: #f0f0f0;
}

.color-swatch {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-bottom: 4px;
}

.color-label {
  font-size: 12px;
}
</style>
```

## Best Practices

1. **Always pair with keyboard handlers**: Ensure your implementation works well with keyboard navigation, especially for accessibility.

2. **Manage focus correctly**: Use `tabindex` to ensure only the active item is focusable (tabindex="0") and others are not (tabindex="-1").

3. **Clear list references**: When the floating element closes, clear the listRef array to prevent stale references.

4. **Provide visual feedback**: Add clear visual indication for the active item and selected item.

5. **Use ARIA attributes**: Add appropriate ARIA attributes like `aria-selected` and `aria-activedescendant` for accessibility.

6. **Consider typeahead**: Pair with `useTypeahead` for type-to-select functionality in long lists.

7. **Test edge cases**: Test navigation at list boundaries, with disabled items, and with different keyboard inputs.

8. **Optimize for performance**: For large lists, consider virtual scrolling or pagination.

9. **Handle dynamic content**: If your list can change while open, make sure to update the listRef accordingly.

## Related Composables

- `useTypeahead`: For type-to-select functionality
- `useClick`: For click interactions to open/toggle the floating element
- `useDismiss`: For closing behavior
- `useRole`: For proper ARIA roles and attributes
- `FloatingFocusManager`: For trapping focus within the floating element
