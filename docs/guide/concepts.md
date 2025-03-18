# Core Concepts

V-Float is built around a set of fundamental concepts that provide a flexible foundation for creating floating UI elements. Understanding these concepts will help you use V-Float effectively.

## Positioning Engine

At the heart of V-Float is a powerful positioning engine powered by [Floating UI](https://floating-ui.com/). This engine handles the complex task of positioning floating elements (like tooltips, dropdowns, and popovers) relative to reference elements (like buttons or inputs).

The positioning logic handles:

- Calculating the optimal position based on the chosen placement
- Adjusting positions to avoid overflow at screen edges
- Updating positions when scrolling or resizing
- Applying offsets and other positioning modifications

## Reference and Floating Elements

V-Float's positioning is based on two key elements:

1. **Reference Element**: The trigger or anchor element to which the floating element is positioned relative to. This is typically a button, input, or any other DOM element.

2. **Floating Element**: The element that floats next to the reference element. This could be a tooltip, dropdown menu, popover, or any content that needs to be positioned.

In V-Float, you connect these elements using Vue refs:

```vue
<script setup>
import { ref } from "vue";
import { useFloating } from "v-float";

const referenceRef = ref(null); // Reference to the anchor element
const floatingRef = ref(null); // Reference to the floating element

const floating = useFloating(referenceRef, floatingRef);
</script>

<template>
  <button ref="referenceRef">Trigger</button>
  <div ref="floatingRef" :style="floating.floatingStyles">Floating content</div>
</template>
```

## Placement

The placement determines where the floating element appears relative to the reference element. V-Float supports 12 placements:

- **Primary placements**: `top`, `right`, `bottom`, `left`
- **Alignment variations**: `top-start`, `top-end`, `right-start`, `right-end`, `bottom-start`, `bottom-end`, `left-start`, `left-end`

```js
const floating = useFloating(referenceRef, floatingRef, {
  placement: "bottom-start", // Position at the bottom, aligned to the start
});
```

## Middleware

Middleware are functions that modify the positioning behavior. They run in sequence, with each middleware potentially modifying the positioning data before passing it to the next one.

Common middleware include:

- **offset**: Adds distance between reference and floating elements
- **flip**: Flips the placement when the floating element would overflow
- **shift**: Shifts the floating element to keep it in view
- **arrow**: Positions an arrow element pointing to the reference
- **size**: Adjusts size constraints based on available space

```js
import { useFloating, offset, flip, shift } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  middleware: [
    offset(10), // Add 10px of distance
    flip(), // Flip to opposite side if no space
    shift({ padding: 5 }), // Keep 5px from viewport edges
  ],
});
```

## State Management

V-Float manages several states for floating elements:

1. **Position State**: The x/y coordinates and placement of the floating element

2. **Open State**: Whether the floating element is visible

```js
const isOpen = ref(false);

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen, // Control open state
  onOpenChange: (open) => (isOpen.value = open), // React to internal state changes
});
```

## Interactions

V-Float separates positioning logic from interaction behaviors. This allows you to mix and match different interaction patterns based on your needs.

Key interaction composables include:

- **useHover**: Show on hover
- **useFocus**: Show on focus
- **useClick**: Show on click
- **useDismiss**: Hide when clicking outside or pressing escape
- **useListNavigation**: Navigate through lists with keyboard

```js
import { useFloating, useInteractions, useHover, useFocus } from "v-float";

const floating = useFloating(referenceRef, floatingRef, {
  open: isOpen,
  onOpenChange: (open) => (isOpen.value = open),
});

// Set up interactions
const hover = useHover(floating.context);
const focus = useFocus(floating.context);

// Combine interactions
const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus]);
```

The `useInteractions` composable combines multiple interaction behaviors into a single set of prop getters.

## Prop Getters

Prop getters are functions that return the necessary props to apply to your elements:

- **getReferenceProps**: Returns props to apply to the reference element
- **getFloatingProps**: Returns props to apply to the floating element
- **getItemProps**: Returns props to apply to items within the floating element (for lists)

```vue
<template>
  <button ref="referenceRef" v-bind="getReferenceProps()">Trigger</button>

  <div ref="floatingRef" v-bind="getFloatingProps()">Floating content</div>
</template>
```

These prop getters handle events, accessibility attributes, and other necessary properties to make your floating UI elements work as expected.

## Accessibility

V-Float provides tools to make your floating elements accessible through:

- **ARIA attributes**: Managed by useRole and other composables
- **Keyboard navigation**: Provided by useListNavigation, useTypeahead, etc.
- **Focus management**: Handled by FloatingFocusManager

```js
import { useRole } from "v-float";

const role = useRole(floating.context, {
  role: "tooltip", // Or 'dialog', 'menu', etc.
});
```

## Composition Pattern

V-Float follows Vue's composition pattern, allowing you to compose complex behaviors from simple primitives:

1. Set up positioning with `useFloating`
2. Add interaction behaviors with interaction composables
3. Combine interactions with `useInteractions`
4. Apply props to elements using prop getters

This composable approach provides flexibility and allows you to build exactly what you need.

## Component vs. Composable Approach

V-Float offers two approaches:

1. **Composable-first**: Build custom UI using low-level composables

   ```js
   const floating = useFloating(referenceRef, floatingRef);
   const hover = useHover(floating.context);
   ```

2. **Component-based**: Use pre-built components for common patterns
   ```vue
   <FloatingPortal>
     <FloatingFocusManager>
       <div>Content</div>
     </FloatingFocusManager>
   </FloatingPortal>
   ```

The composable approach offers maximum flexibility, while the component approach simplifies common use cases.

## Context Object

The `context` object from `useFloating` serves as a shared reference that interaction composables can use:

```js
const { context } = useFloating(referenceRef, floatingRef);

// Use context in interaction composables
const hover = useHover(context);
const focus = useFocus(context);
```

This allows different composables to share state and coordinate their behaviors.

## Understanding the Composable Hierarchy

V-Float composables follow this general hierarchy:

1. **Core Positioning**: `useFloating`
2. **Interaction Behaviors**: `useHover`, `useFocus`, `useClick`, etc.
3. **Interaction Coordination**: `useInteractions`
4. **Accessibility**: `useRole`, `FloatingFocusManager`
5. **Utilities**: `FloatingPortal`, `FloatingArrow`

By understanding how these pieces fit together, you can build complex, accessible floating UI elements with minimal code.
