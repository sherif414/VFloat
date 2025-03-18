# useInteractions

The `useInteractions` composable is a utility that combines multiple interaction handlers (like hover, focus, click, etc.) into a unified API with prop getters. It's essential for creating accessible and interactive floating UI elements.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useInteractions, useHover, useFocus } from "v-float";

const referenceRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create interaction handlers
const hover = useHover(floating.context);
const focus = useFocus(floating.context);

// Combine them with useInteractions
const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">
    Hover or Focus Me
  </button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
  >
    This is a floating element
  </div>
</template>
```

## Why useInteractions?

The `useInteractions` composable provides several benefits:

1. **Unified Interface**: Combines multiple interaction handlers into a single set of prop getters
2. **Conflict Resolution**: Properly merges event handlers from different interaction handlers
3. **Accessibility**: Ensures proper event handling for accessibility
4. **Typesafety**: Provides proper TypeScript types for the prop getters

## API Reference

### Arguments

```ts
function useInteractions(interactionHandlers: InteractionHandlers[]): {
  getReferenceProps: (userProps?: object) => object;
  getFloatingProps: (userProps?: object) => object;
  getItemProps?: (userProps?: object) => object;
};
```

| Parameter           | Type                  | Description                                                                           |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| interactionHandlers | InteractionHandlers[] | Array of interaction handlers returned from composables like useHover, useFocus, etc. |

### Return Value

| Property          | Type                           | Description                                                                                                                             |
| ----------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| getReferenceProps | (userProps?: object) => object | Function that returns props to apply to the reference element                                                                           |
| getFloatingProps  | (userProps?: object) => object | Function that returns props to apply to the floating element                                                                            |
| getItemProps      | (userProps?: object) => object | Function that returns props to apply to items within the floating element (only present if one of the interaction handlers provides it) |

## Using the Prop Getters

The prop getters returned by `useInteractions` need to be applied to your elements using the `v-bind` directive:

```vue
<template>
  <!-- Apply reference props to the trigger element -->
  <button ref="referenceRef" v-bind="getReferenceProps()">Trigger</button>

  <!-- Apply floating props to the floating element -->
  <div ref="floatingRef" v-bind="getFloatingProps()">Content</div>

  <!-- If you have list items (e.g., with useListNavigation) -->
  <div
    v-for="(item, index) in items"
    :key="index"
    v-bind="getItemProps({ index })"
  >
    {{ item.label }}
  </div>
</template>
```

### Merging with Custom Props

You can pass custom props to the prop getters, which will be merged with the interaction props:

```vue
<button
  ref="referenceRef"
  v-bind="
    getReferenceProps({
      class: 'my-button',
      'data-custom': 'value',
    })
  "
>
  Trigger
</button>
```

## Combining Different Interactions

The real power of `useInteractions` comes from combining multiple interactions:

```vue
<script setup>
import {
  useFloating,
  useInteractions,
  useHover,
  useFocus,
  useClick,
  useDismiss,
  useRole,
} from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

// Create all your interaction handlers
const hover = useHover(floating.context, { delay: 150 });
const focus = useFocus(floating.context);
const click = useClick(floating.context);
const dismiss = useDismiss(floating.context, { outsidePress: true });
const role = useRole(floating.context, { role: "tooltip" });

// Combine them all with useInteractions
const { getReferenceProps, getFloatingProps } = useInteractions([
  hover,
  focus,
  click,
  dismiss,
  role,
]);
</script>
```

This creates a floating element that will:

- Open on hover (with 150ms delay)
- Open on focus
- Toggle on click
- Close when clicking outside
- Have proper ARIA attributes for a tooltip

## Working with List Interactions

For list-based components like dropdowns or select menus, you'll often use `useListNavigation`:

```vue
<script setup>
import { useFloating, useInteractions, useListNavigation } from "v-float";

const listRef = ref([]);
const activeIndex = ref(null);

const floating = useFloating(referenceRef, floatingRef);

const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
});

// Get the getItemProps function
const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  listNav,
]);

function collectItemElement(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Select</button>

  <div ref="floatingRef" v-bind="getFloatingProps()">
    <div
      v-for="(item, index) in items"
      :key="index"
      :ref="collectItemElement"
      v-bind="getItemProps({ index })"
    >
      {{ item.label }}
    </div>
  </div>
</template>
```

## Best Practices

1. **Always use the prop getters**: Apply getReferenceProps and getFloatingProps to the respective elements for proper event handling.

2. **Keep the order consistent**: The order of interaction handlers in the array matters - handlers added later can override properties from earlier handlers.

3. **Include accessibility handlers**: Always include `useRole` and other accessibility-focused handlers for better user experience.

4. **Use with conditional rendering**: When using `v-if` to conditionally render the floating element, make sure to still keep the reference element in the DOM with the reference props applied.

5. **Handle cleanup**: All interactions will be automatically cleaned up when the component is unmounted, so you don't need to worry about removing event listeners.

## Examples

### Tooltip Example

```vue
<script setup>
import { ref } from "vue";
import {
  useFloating,
  useInteractions,
  useHover,
  useRole,
  offset,
  flip,
  shift,
} from "v-float";

const referenceRef = ref(null);
const floatingRef = ref(null);
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [offset(8), flip(), shift()],
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const hover = useHover(floating.context, { delay: { open: 300, close: 100 } });
const role = useRole(floating.context, { role: "tooltip" });

const { getReferenceProps, getFloatingProps } = useInteractions([hover, role]);
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Hover Me</button>

  <div
    v-if="isOpen"
    ref="floatingRef"
    v-bind="getFloatingProps()"
    :style="floating.floatingStyles"
    class="tooltip"
  >
    Tooltip content
  </div>
</template>
```

### Dropdown Menu Example

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
  { label: "Profile", action: () => console.log("Profile clicked") },
  { label: "Settings", action: () => console.log("Settings clicked") },
  { label: "Logout", action: () => console.log("Logout clicked") },
];

const referenceRef = ref(null);
const floatingRef = ref(null);
const listRef = ref([]);
const isOpen = ref(false);
const activeIndex = ref(null);

const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start",
  middleware: [offset(5), flip(), shift()],
  open: isOpen,
  onOpenChange: (value) => (isOpen.value = value),
});

const click = useClick(floating.context);
const dismiss = useDismiss(floating.context);
const role = useRole(floating.context, { role: "menu" });
const listNav = useListNavigation(floating.context, {
  listRef,
  activeIndex,
  onNavigate: (index) => {
    activeIndex.value = index;
  },
  loop: true,
});

const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
  click,
  dismiss,
  role,
  listNav,
]);

function selectItem(index) {
  items[index].action();
  isOpen.value = false;
}

function collectItemElement(el) {
  if (el && !listRef.value.includes(el)) {
    listRef.value.push(el);
  }
}
</script>

<template>
  <button
    ref="referenceRef"
    v-bind="getReferenceProps()"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
  >
    Menu
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
      :ref="collectItemElement"
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
```
