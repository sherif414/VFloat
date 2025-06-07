# Examples

Explore practical examples of V-Float in action. These examples demonstrate how to use V-Float composables and components to create various floating UI elements.

## Basic Components

### Tooltip

Create a simple tooltip that appears on hover.

[View Tooltip Example →](/examples/tooltip)

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useInteractions, useHover, offset, flip, shift } from "v-float"

const referenceRef = ref(null)
const floatingRef = ref(null)
const isOpen = ref(false)

const floating = useFloating(referenceRef, floatingRef, {
  placement: "top",
  middleware: [offset(8), flip(), shift()],
  open: isOpen,
  setOpen: (open) => (isOpen.value = open),
})

const hover = useHover(floating.context, {
  delay: { open: 300, close: 100 },
})

const { getReferenceProps, getFloatingProps } = useInteractions([hover])
</script>

<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Hover me</button>

  <Transition>
    <div
      v-if="isOpen"
      ref="floatingRef"
      v-bind="getFloatingProps()"
      class="tooltip"
      :style="{
        position: floating.strategy,
        top: '0px',
        left: '0px',
        transform: `translate(${floating.x}px, ${floating.y}px)`,
      }"
    >
      This is a tooltip
    </div>
  </Transition>
</template>

<style scoped>
.tooltip {
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  max-width: 250px;
}

.v-enter-active,
.v-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translate(var(--translate-x, 0), var(--translate-y, 0)) scale(0.95);
}
</style>
```

### Dropdown Menu

Create a dropdown menu with keyboard navigation.

[View Dropdown Example →](/examples/dropdown)

### Popover

Create an interactive popover with focus management.

[View Popover Example →](/examples/popover)

### Modal Dialog

Create an accessible modal dialog with focus trapping.

[View Modal Example →](/examples/modal)

## Advanced Examples

### Combobox

Create a searchable dropdown with autocomplete.

[Coming soon]

### Date Picker

Create a date picker with calendar dropdown.

[Coming soon]

### Nested Dropdowns

Create multi-level dropdown menus.

[Coming soon]

### Context Menu

Create a right-click context menu.

[Coming soon]

## Integration Examples

### Using with Vue Router

Manage floating elements with route changes.

[Coming soon]

### Using with Pinia

Manage state for floating elements.

[Coming soon]

### Using with UI Frameworks

Integrate with popular UI frameworks.

[Coming soon]
