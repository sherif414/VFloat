# Interaction Composables

V-Float provides a suite of interaction composables designed to simplify common UI patterns for floating elements, such as tooltips, popovers, and dropdowns. These composables abstract away the complex logic involved in managing the visibility and behavior of your floating UI, allowing you to focus on the structure and content of your application.

## Why Use Interaction Composables?

### Simplification of Common Patterns

Many floating UI elements share similar interaction patterns: hovering, clicking, focusing, or combining these. Instead of manually implementing event listeners and state management for each pattern, V-Float's interaction composables provide ready-to-use solutions. This significantly reduces boilerplate code and common pitfalls.

### Enhanced Reusability

By encapsulating interaction logic into composables, you promote reusability across your application. Once defined, an interaction can be applied to any anchor and floating element pair, ensuring consistent behavior wherever it's used. This is especially beneficial for design systems or component libraries.

### Separation of Concerns

Interaction composables help enforce a clean separation of concerns. Your `useFloating` call handles the positioning, while a separate interaction composable manages the `open`/`close` state based on user input. This makes your code more modular, easier to understand, and simpler to debug.

### Accessibility Considerations

Many interaction patterns inherently come with accessibility requirements (e.g., proper keyboard navigation, ARIA attributes). While not exhaustively covered here, V-Float's interaction composables are designed with accessibility in mind, providing a solid foundation to build accessible floating UIs without having to implement all the complex logic yourself.

### Example (Conceptual)

```vue
<template>
  <button ref="anchorEl">Toggle Popover</button>
  <div v-if="isOpen" ref="floatingEl" :style="floating.floatingStyles">
    This is my popover content.
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useFloating, useClick } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const isOpen = ref(false) // Manages the visibility state

const floating = useFloating(anchorEl, floatingEl, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})

// The useClick composable handles the logic for opening/closing on click
useClick(anchorEl, floatingEl, {
  open: isOpen,
  setOpen: (value) => (isOpen.value = value),
})
</script>
```

In the example above, `useClick` takes care of toggling `isOpen` based on clicks on the anchor and dismisses the floating element when clicking outside. This keeps the component logic concise and focused on its primary responsibility.

Later sections will delve into the specific APIs and options available for each interaction composable.
