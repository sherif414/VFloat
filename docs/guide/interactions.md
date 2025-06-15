# Interactions

## Introduction/Overview

Interaction composables in this library are designed to manage how and when your floating elements appear and disappear in response to user actions. These functions provide flexible and common interaction patterns like hover, click, focus, and more. They are intended to be used in conjunction with the main `useFloating` composable, building upon the foundation it provides to create fully interactive floating UI components.

## Core Concepts

### Floating Context

All interaction composables operate within a `FloatingContext`. This context, typically provided by the `useFloating` composable, holds the state and methods necessary for managing the floating element, including its `open` state, and references to the anchor and floating elements themselves. Interaction composables leverage this context to react to user inputs and control the visibility of the floating element.

### Event Handling

At their core, interaction composables work by attaching event listeners to either the anchor element, the floating element, or both. For example, `useHover` will attach mouseover and mouseout listeners, while `useClick` will listen for click events. These listeners detect user actions and trigger the appropriate logic to show or hide the floating element.

### State Management

The primary role of most interaction composables is to manage the `open` state of the floating element. Based on the user interactions they are designed to handle (e.g., a hover starting or ending), they will call the `setOpen` function (or a similar mechanism) provided by the `FloatingContext` to toggle the visibility of the floating content.

### Composability

A key feature of these interaction utilities is their composability. You can often combine multiple interaction composables to create richer and more nuanced user experiences. For instance, you might use `useHover` to show a tooltip on mouse hover, and also `useFocus` to show it when the anchor element receives keyboard focus. This allows for building accessible and intuitive UIs that cater to various input methods.

## `useClick`

_Best for dropdown menus, popovers, and action-triggered dialogs._

The `useClick` composable allows you to control the visibility of a floating element by clicking the anchor element. It's a common way to implement dropdown menus, popovers, or any UI element that appears on a click interaction.

### Basic Usage

```vue
<script setup>
const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  whileElementsMounted: autoUpdate,
})

// Apply click interaction
useClick(context)
</script>

<template>
  <button ref="reference" type="button">Anchor Element</button>
  <div v-if="open" ref="floating" :style="floatingStyles">Floating Element</div>
</template>
```

### See Also

- [`useClick`](../../src/composables/interactions/use-click.ts)

## `useHover`

_Best for tooltips and non-critical information that appears on mouseover._

The `useHover` composable shows or hides a floating element when the user hovers their pointer over the anchor element. This is commonly used for tooltips or non-critical information that appears on hover.

### Basic Usage

```vue
<script setup>
const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  whileElementsMounted: autoUpdate,
})

// Apply hover interaction
useHover(context)
</script>

<template>
  <button ref="reference" type="button">Hover Over Me</button>
  <div v-if="open" ref="floating" :style="floatingStyles">Floating Element (Tooltip)</div>
</template>
```

### See Also

- [`useHover`](../../src/composables/interactions/use-hover.ts)

## `useFocus`

_Crucial for accessibility, allowing keyboard users to trigger floating elements._

The `useFocus` composable controls the visibility of a floating element when the anchor element receives keyboard focus. It's often used in conjunction with other hooks like `useClick` or `useHover` to ensure accessibility.

### Basic Usage

```vue
<script setup>
const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  whileElementsMounted: autoUpdate,
})

// Apply focus interaction
useFocus(context)
</script>

<template>
  <button ref="reference" type="button">Focus Me (e.g., using Tab key)</button>
  <div v-if="open" ref="floating" :style="floatingStyles">Floating Element (Visible on Focus)</div>
</template>
```

### See Also

- [`useFocus`](../../src/composables/interactions/use-focus.ts)

## `useDismiss`

_For closing floating elements via outside clicks, the Escape key, or scrolling._

The `useDismiss` composable provides functionality to close (dismiss) a floating element when certain events occur, such as pressing the Escape key or clicking outside the floating element.

### Basic Usage

```vue
<script setup>
const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  whileElementsMounted: autoUpdate,
})

// Open on click
useClick(context)
// Close on dismiss events
useDismiss(context)
</script>

<template>
  <button ref="reference" type="button">Open Popover</button>
  <div v-if="open" ref="floating" :style="floatingStyles">
    <p>Floating content. Click outside or press Esc to close.</p>
  </div>
</template>
```

### See Also

- [`useDismiss`](../../src/composables/interactions/use-dismiss.ts)

## `useClientPoint`

_Ideal for context menus and tooltips that follow the mouse cursor._

The `useClientPoint` composable positions the floating element relative to a client point, typically the mouse cursor's position. It works by updating the `VirtualElement` used by `useFloating`.

### Basic Usage

```vue
<script setup>
const reference = ref(null) // This element's bounds are used for event listening
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  whileElementsMounted: autoUpdate,
})

// Show/hide based on hover
useHover(context, { delay: { open: 300 } })
// Position based on client point, enabled only when open
useClientPoint(reference, context, { enabled: open })
</script>

<template>
  <div
    ref="reference"
    style="width: 200px; height: 100px; border: 1px solid #ccc; text-align: center; line-height: 100px;"
  >
    Hover over me
  </div>
  <div v-if="open" ref="floating" :style="floatingStyles">Context Menu / Tooltip</div>
</template>
```

### See Also

- [`useClientPoint`](../../src/composables/interactions/use-client-point.ts)

## Combining Interactions: Tooltip Example

Many UI elements require multiple interaction types. For example, a tooltip should appear on hover or keyboard focus and be dismissible. Here's how to combine `useHover`, `useFocus`, and `useDismiss`.

```vue
<script setup>
const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  placement: "top",
  whileElementsMounted: autoUpdate,
  middleware: [offset(5)], // Add some space
})

// Show on hover
useHover(context, { delay: { open: 100, close: 50 } })
// Show on focus
useFocus(context)
// Hide on dismiss events (e.g., Escape key)
useDismiss(context)
</script>

<template>
  <button ref="reference" type="button" aria-describedby="tooltip">Hover or Focus Me</button>
  <div v-if="open" ref="floating" :style="floatingStyles" id="tooltip" role="tooltip">
    This is a helpful tooltip!
  </div>
</template>
```

### How it Works Together

- **`useHover(context, ...)`**: Makes the tooltip appear on mouse hover.
- **`useFocus(context)`**: Allows the tooltip to appear on keyboard focus.
- **`useDismiss(context)`**: Ensures the tooltip can be closed by pressing Escape or clicking outside.

By combining these interactions, you create a robust and accessible tooltip that you can adapt for other UI components like dropdowns or popovers.
