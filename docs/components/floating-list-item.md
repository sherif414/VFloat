# FloatingListItem

The `FloatingListItem` component is designed to be used with `FloatingList` to create accessible, interactive list-based UI elements such as dropdown menus, select lists, and autocomplete suggestions. It automatically registers itself with the parent `FloatingList` component and provides the necessary attributes and event handling for keyboard navigation and accessibility.

## Basic Usage

The `FloatingListItem` component is typically used within a `FloatingList` component:

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useListNavigation,
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
  <button ref="referenceRef" v-bind="getReferenceProps()">
    Select an option
  </button>

  <div v-if="isOpen" ref="floatingRef" v-bind="getFloatingProps()">
    <FloatingList :list-ref="listRef">
      <FloatingListItem
        v-for="(option, index) in options"
        :key="option.value"
        :index="index"
        :active="activeIndex === index"
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
</template>
```

## Props

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
      <td>index</td>
      <td>Number</td>
      <td><code>required</code></td>
      <td>The index of the item in the list. Must be unique within the list.</td>
    </tr>
    <tr>
      <td>active</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether the item is currently active (highlighted)</td>
    </tr>
    <tr>
      <td>selected</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether the item is currently selected</td>
    </tr>
    <tr>
      <td>disabled</td>
      <td>Boolean</td>
      <td>false</td>
      <td>Whether the item is disabled and not selectable</td>
    </tr>
    <tr>
      <td>label</td>
      <td>String</td>
      <td>undefined</td>
      <td>Text label for the item (useful for typeahead functionality)</td>
    </tr>
    <tr>
      <td>role</td>
      <td>String</td>
      <td>'option'</td>
      <td>ARIA role for the item. Common values are 'option', 'menuitem', etc.</td>
    </tr>
  </tbody>
</table>

## Events

<table>
  <thead>
    <tr>
      <th>Event</th>
      <th>Arguments</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>click</td>
      <td>MouseEvent</td>
      <td>Emitted when the item is clicked</td>
    </tr>
    <tr>
      <td>mouseenter</td>
      <td>MouseEvent</td>
      <td>Emitted when mouse enters the item</td>
    </tr>
    <tr>
      <td>mouseleave</td>
      <td>MouseEvent</td>
      <td>Emitted when mouse leaves the item</td>
    </tr>
  </tbody>
</table>

## Slots

<table>
  <thead>
    <tr>
      <th>Slot</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>default</td>
      <td>Content to render for the list item</td>
    </tr>
  </tbody>
</table>

## Features

### Automatic Registration

Each `FloatingListItem` component automatically registers itself with the parent `FloatingList` component through the use of Vue's provide/inject mechanism. This ensures that the `useListNavigation` composable can properly track and manage the list items.

### Accessibility Attributes

The `FloatingListItem` component automatically applies the appropriate ARIA attributes based on its props:

- `role` - From the `role` prop, defaults to 'option'
- `aria-selected` - Based on the `selected` prop
- `aria-disabled` - Based on the `disabled` prop
- `tabindex` - Set to -1 to ensure proper keyboard navigation
- `data-active` - Set to 'true' when the item is active

These attributes ensure that the list is accessible to users of assistive technologies.

### Event Delegation

The component provides event handling for common interactions like click, mouseenter, and mouseleave, making it easy to implement typical list-based UI patterns like selection and hover effects.

## Styling

The `FloatingListItem` component doesn't apply any default styling, allowing you to style it according to your design system. You can style the component based on its active, selected, and disabled states:

```vue
<FloatingListItem
  :index="index"
  :active="activeIndex === index"
  :selected="selectedIndex === index"
  :disabled="option.disabled"
  :style="{
    padding: '8px 12px',
    backgroundColor: activeIndex === index ? '#f0f0f0' : 'transparent',
    color: option.disabled ? '#999' : 'inherit',
    cursor: option.disabled ? 'not-allowed' : 'pointer',
    fontWeight: selectedIndex === index ? 'bold' : 'normal',
  }"
>
  {{ option.label }}
</FloatingListItem>
```

You can also use CSS selectors to style the component based on its attributes:

```css
.my-list-item {
  padding: 8px 12px;
  cursor: pointer;
}

.my-list-item[data-active="true"] {
  background-color: #f0f0f0;
}

.my-list-item[aria-selected="true"] {
  font-weight: bold;
}

.my-list-item[aria-disabled="true"] {
  color: #999;
  cursor: not-allowed;
}
```

```vue
<FloatingListItem
  :index="index"
  :active="activeIndex === index"
  :selected="selectedIndex === index"
  :disabled="option.disabled"
  class="my-list-item"
>
  {{ option.label }}
</FloatingListItem>
```

## Advanced Usage

### Custom Content

You can customize the content of each list item to create more complex UI patterns:

```vue
<FloatingListItem :index="index" :active="activeIndex === index">
  <div class="custom-option">
    <img :src="option.icon" class="option-icon" />
    <div class="option-content">
      <div class="option-label">{{ option.label }}</div>
      <div class="option-description">{{ option.description }}</div>
    </div>
    <div v-if="selectedIndex === index" class="option-checkmark">✓</div>
  </div>
</FloatingListItem>
```

### Working with useTypeahead

When using `useTypeahead` for keyboard typing to select items, the `label` prop becomes important:

```vue
<script setup>
import { ref } from "vue";
import { useFloating, useListNavigation, useTypeahead } from "v-float";

const listRef = ref([]);
const labelsRef = ref([]);
const activeIndex = ref(-1);

const typeahead = useTypeahead(floating.context, {
  listRef,
  activeIndex,
  onMatch: (index) => {
    activeIndex.value = index;
  },
  labelsRef,
});
</script>

<template>
  <FloatingList :list-ref="listRef" :labels-ref="labelsRef">
    <FloatingListItem
      v-for="(option, index) in options"
      :key="option.value"
      :index="index"
      :active="activeIndex === index"
      :label="option.label"
      <!--
      This
      populates
      labelsRef
      for
      typeahead
      --
    >
      >
      {{ option.label }}
    </FloatingListItem>
  </FloatingList>
</template>
```

### Nested Lists

For complex UI patterns like submenus, you can nest `FloatingList` and `FloatingListItem` components:

```vue
<FloatingList :list-ref="listRef">
  <FloatingListItem :index="0">Item 1</FloatingListItem>
  <FloatingListItem :index="1">Item 2</FloatingListItem>

  <FloatingListItem
    :index="2"
    :active="activeIndex === 2"
    @mouseenter="openSubmenu"
  >
    Item with Submenu

    <FloatingList
      v-if="submenuOpen"
      :list-ref="submenuListRef"
    >
      <FloatingListItem :index="0">Submenu Item 1</FloatingListItem>
      <FloatingListItem :index="1">Submenu Item 2</FloatingListItem>
    </FloatingList>
  </FloatingListItem>
</FloatingList>
```

## Accessibility Considerations

- Always provide a unique `index` prop for each item
- Use the `selected` prop to indicate which item(s) are currently selected
- Use the `disabled` prop for items that are not selectable
- Ensure there's sufficient color contrast for active and selected states
- Provide clear visual feedback for the currently active (focused) item
- Consider implementing keyboard shortcuts (like typing a letter to jump to items that start with that letter) via `useTypeahead`
- Use appropriate ARIA roles based on your use case (e.g., 'option' for select-like components, 'menuitem' for menus)
