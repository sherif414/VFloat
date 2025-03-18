# FloatingList

The `FloatingList` component provides a declarative and accessible way to manage lists of items in dropdown menus, select menus, and other floating UI elements. It works in tandem with `useListNavigation` and `FloatingListItem` to provide keyboard navigation and ARIA attributes for accessible list-based UI elements.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useListNavigation,
  FloatingPortal,
  FloatingList,
  FloatingListItem,
} from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const listRef = ref<(HTMLElement | null)[]>([]);
const activeIndex = ref(-1);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const listNavigation = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

const { getReferenceProps, getFloatingProps } = useInteractions([
  listNavigation,
]);

const options = [
  { label: "Option 1", value: 1 },
  { label: "Option 2", value: 2 },
  { label: "Option 3", value: 3 },
];
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    @click="isOpen = !isOpen"
  >
    Select an option
  </button>

  <FloatingPortal>
    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      :style="{
        position: floating.strategy,
        top: '0px',
        left: '0px',
        transform: `translate(${floating.x}px, ${floating.y}px)`,
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        width: '200px',
      }"
    >
      <FloatingList :list-ref="listRef">
        <FloatingListItem
          v-for="(option, index) in options"
          :key="option.value"
          :index="index"
          :active="activeIndex === index"
          :style="{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: activeIndex === index ? '#f0f0f0' : 'transparent',
          }"
          @click="
            () => {
              // Handle selection
              isOpen = false;
            }
          "
        >
          {{ option.label }}
        </FloatingListItem>
      </FloatingList>
    </div>
  </FloatingPortal>
</template>
```

## FloatingList Props

<script setup>
import { ref } from 'vue'
</script>

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>listRef</td>
      <td>Ref&lt;(HTMLElement | null)[]&gt;</td>
      <td><code>required</code></td>
      <td>Reference to the array of list item elements</td>
    </tr>
    <tr>
      <td>labelsRef</td>
      <td>Ref&lt;(string | null)[]&gt;</td>
      <td>undefined</td>
      <td>Optional reference to an array of labels for typeahead functionality</td>
    </tr>
  </tbody>
</table>

## FloatingListItem Props

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>index</td>
      <td>Number</td>
      <td><code>required</code></td>
      <td>The index of the item in the list</td>
    </tr>
    <tr>
      <td>active</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether the item is currently active/highlighted</td>
    </tr>
    <tr>
      <td>selected</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether the item is currently selected</td>
    </tr>
    <tr>
      <td>label</td>
      <td>String</td>
      <td>undefined</td>
      <td>Optional text label for typeahead functionality</td>
    </tr>
    <tr>
      <td>disabled</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether the item is disabled</td>
    </tr>
  </tbody>
</table>

## Features

### Automatic Item Registration

The `FloatingList` component automatically registers each `FloatingListItem` in the `listRef` array. This allows the `useListNavigation` composable to track and manage the items for keyboard navigation.

### Keyboard Navigation

When combined with `useListNavigation`, the `FloatingList` component enables keyboard navigation through the list items:

- Arrow keys to move up/down through the list items
- Home/End keys to jump to the first/last items
- Page Up/Down to move by page
- Enter key to select the active item
- Typing letters to jump to items starting with those letters (when using `useTypeahead`)

### ARIA Attributes

The `FloatingListItem` component automatically adds the appropriate ARIA attributes for accessibility:

- `role="option"` for select-like lists
- `aria-selected` based on the `selected` prop
- `aria-disabled` based on the `disabled` prop

## Advanced Usage

### Typeahead Functionality

You can add typeahead functionality by using the `useTypeahead` composable with `FloatingList`:

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useListNavigation,
  useTypeahead,
  FloatingList,
  FloatingListItem,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const labelsRef = ref([]);
const activeIndex = ref(-1);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const listNavigation = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  // When using `labelsRef`, we can just use that directly
  // instead of manually matching
  labelsRef,
});

const { getReferenceProps, getFloatingProps } = useInteractions([
  listNavigation,
  typeahead,
]);
</script>

<template>
  <FloatingList :list-ref="listRef" :labels-ref="labelsRef">
    <FloatingListItem
      v-for="(option, index) in options"
      :key="option.value"
      :index="index"
      :label="option.label"
      <!--
      This
      populates
      labelsRef
      --
    >
      >
      {{ option.label }}
    </FloatingListItem>
  </FloatingList>
</template>
```

### Complex Lists with Grouping

You can create more complex lists with groups and structure:

```vue
<template>
  <FloatingList :list-ref="listRef">
    <div class="list-group">
      <div class="list-group-label">Group 1</div>
      <FloatingListItem :index="0">Item 1</FloatingListItem>
      <FloatingListItem :index="1">Item 2</FloatingListItem>
    </div>
    <div class="list-group">
      <div class="list-group-label">Group 2</div>
      <FloatingListItem :index="2">Item 3</FloatingListItem>
      <FloatingListItem :index="3">Item 4</FloatingListItem>
    </div>
  </FloatingList>
</template>
```

### Customizing Item Rendering

`FloatingListItem` is designed to be customizable through slots and styling:

```vue
<FloatingListItem
  :index="index"
  :active="activeIndex === index"
  :selected="selectedIndex === index"
  :disabled="option.disabled"
>
  <div class="custom-option">
    <span class="option-label">{{ option.label }}</span>
    <span v-if="option.description" class="option-description">
      {{ option.description }}
    </span>
    <span v-if="selectedIndex === index" class="checkmark">✓</span>
  </div>
</FloatingListItem>
```

## Accessibility Considerations

- Always use `FloatingList` with `useListNavigation` to ensure proper keyboard navigation.
- For select-like components, ensure the reference element (like a button) has appropriate ARIA attributes like `aria-haspopup="listbox"` and `aria-expanded="true/false"`.
- Make sure to use appropriate roles for your specific use case (`listbox` for select-like UI, `menu` for dropdown menus, etc.).
- Add clear visual indicators for active, selected, and disabled states.
- If your list is part of a combobox, make sure to connect it properly with `aria-controls` and other required ARIA attributes.

```vue
<button
  ref="referenceRef"
  aria-haspopup="listbox"
  :aria-expanded="isOpen"
  :aria-controls="isOpen ? 'my-listbox-id' : undefined"
>
  Select an option
</button>

<div v-if="isOpen" ref="floatingRef" id="my-listbox-id" role="listbox">
  <FloatingList :list-ref="listRef">
    <!-- List items -->
  </FloatingList>
</div>
```
