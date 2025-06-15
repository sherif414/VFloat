# Interactions

## Introduction/Overview

Interaction composables in this library are designed to manage how and when your floating elements appear and disappear in response to user actions. These functions provide flexible and common interaction patterns like hover, click, focus, and more. They are intended to be used in conjunction with the main `useFloating` composable, building upon the foundation it provides to create fully interactive floating UI components.

## Core Concepts

### Floating Context

All interaction composables operate within a `FloatingContext`. This context, typically provided by the `useFloating` composable, holds the state and methods necessary for managing the floating element, including its `open` state, and references to the reference and floating elements themselves. Interaction composables leverage this context to react to user inputs and control the visibility of the floating element.

### Event Handling

At their core, interaction composables work by attaching event listeners to either the reference element, the floating element, or both. For example, `useHover` will attach mouseover and mouseout listeners, while `useClick` will listen for click events. These listeners detect user actions and trigger the appropriate logic to show or hide the floating element.

### State Management

The primary role of most interaction composables is to manage the `open` state of the floating element. Based on the user interactions they are designed to handle (e.g., a hover starting or ending), they will call the `onOpenChange` function (or a similar mechanism) provided by the `FloatingContext` to toggle the visibility of the floating content.

### Composability

A key feature of these interaction utilities is their composability. You can often combine multiple interaction composables to create richer and more nuanced user experiences. For instance, you might use `useHover` to show a tooltip on mouse hover, and also `useFocus` to show it when the reference element receives keyboard focus. This allows for building accessible and intuitive UIs that cater to various input methods.

## `useClick`

The `useClick` composable allows you to control the visibility of a floating element by clicking the reference element. It's a common way to implement dropdown menus, popovers, or any UI element that appears on a click interaction.

### Basic Usage

To use `useClick`, you first need a `FloatingContext` from the `useFloating` composable. Then, you pass this context to `useClick`.

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick, autoUpdate } from '@floating-ui/vue' // Assuming this path

const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  whileElementsMounted: autoUpdate
})

// Apply click interaction
useClick(context)
</script>

<template>
  <button ref="reference" type="button">
    Reference Element
  </button>
  <div v-if="open" ref="floating" :style="floatingStyles">
    Floating Element
  </div>
</template>
```

### Key Options

-   `enabled`: A boolean `MaybeRefOrGetter` to enable or disable the hook. Defaults to `true`.
-   `event`: Specifies the mouse event type to trigger the interaction. Can be `'click'` or `'mousedown'`. Defaults to `'click'`.
-   `toggle`: A boolean `MaybeRefOrGetter`. If `true` (default), clicking the reference element again when the floating element is open will close it. If `false`, it will only open.
-   `ignoreMouse`: A boolean `MaybeRefOrGetter`. If `true`, mouse events will be ignored. Useful if you only want keyboard interactions or are handling mouse events separately. Defaults to `false`.
-   `keyboardHandlers`: A boolean `MaybeRefOrGetter`. If `true` (default), enables keyboard interactions (Space and Enter keys) to open/close the floating element.

### Read More

For a deeper understanding and more advanced options, you can refer to the source code: [`src/composables/interactions/use-click.ts`](../../src/composables/interactions/use-click.ts)

## `useHover`

The `useHover` composable shows or hides a floating element when the user hovers their pointer (like a mouse) over the reference element. This is commonly used for tooltips or non-critical information that appears on hover.

### Basic Usage

Like other interaction hooks, `useHover` takes the `FloatingContext` from `useFloating`.

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useHover, autoUpdate } from '@floating-ui/vue' // Assuming this path

const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  whileElementsMounted: autoUpdate
})

// Apply hover interaction
useHover(context)
</script>

<template>
  <button ref="reference" type="button">
    Hover Over Me
  </button>
  <div v-if="open" ref="floating" :style="floatingStyles">
    Floating Element (Tooltip)
  </div>
</template>
```

### Key Options

-   `enabled`: A `MaybeRefOrGetter<boolean>` to enable or disable the hook. Defaults to `true`.
-   `delay`: A `MaybeRef<number | { open?: number; close?: number }>`. Sets the delay in milliseconds before showing or hiding the floating element. You can provide a single number for both open and close, or an object for different delays. Defaults to `0`.
-   `restMs`: A `MaybeRef<number>`. If `delay.open` is 0, this option specifies the time in milliseconds the pointer must rest within the reference element before the floating element opens. This helps prevent accidental triggering. Defaults to `0`.
-   `mouseOnly`: A `MaybeRef<boolean>`. If `true`, hover events will only trigger for mouse-like pointers (e.g., mouse, pen), ignoring touch events. Defaults to `false`.

### Read More

For more details on advanced features like custom `handleClose` logic, consult the source code: [`src/composables/interactions/use-hover.ts`](../../src/composables/interactions/use-hover.ts)

## `useFocus`

The `useFocus` composable controls the visibility of a floating element when the reference element receives keyboard focus. This is crucial for accessibility, allowing keyboard users to interact with elements like dropdowns or tooltips that might otherwise only appear on hover or click. It's primarily designed for keyboard interactions and often used in conjunction with other hooks like `useClick` or `useHover`.

### Basic Usage

`useFocus` also operates on the `FloatingContext`.

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useFocus, autoUpdate } from '@floating-ui/vue' // Assuming this path

const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  whileElementsMounted: autoUpdate
})

// Apply focus interaction
useFocus(context)
</script>

<template>
  <button ref="reference" type="button">
    Focus Me (e.g., using Tab key)
  </button>
  <div v-if="open" ref="floating" :style="floatingStyles">
    Floating Element (Visible on Focus)
  </div>
</template>
```

### Key Options

-   `enabled`: A `MaybeRefOrGetter<boolean>` to enable or disable the hook. Defaults to `true`.
-   `requireFocusVisible`: A `MaybeRefOrGetter<boolean>`. If `true` (default), the floating element only opens if the focus event matches the `:focus-visible` CSS pseudo-class. This helps differentiate keyboard focus from programmatic focus or focus initiated by a mouse click, aligning with modern accessibility best practices.

### Read More

To understand the nuances of focus handling, especially regarding `:focus-visible` and browser-specific behaviors, check the source code: [`src/composables/interactions/use-focus.ts`](../../src/composables/interactions/use-focus.ts)

## `useDismiss`

The `useDismiss` composable provides functionality to close (dismiss) a floating element when certain events occur, such as pressing the Escape key, clicking outside the floating element, or scrolling the page. It helps ensure that users can easily close popovers, modals, or menus.

### Basic Usage

`useDismiss` is used with the `FloatingContext` and helps manage the `open` state.

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick, useDismiss, autoUpdate } from '@floating-ui/vue' // Assuming this path

const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  whileElementsMounted: autoUpdate
})

// Open on click
useClick(context)
// Close on dismiss events
useDismiss(context)
</script>

<template>
  <button ref="reference" type="button">
    Open Popover
  </button>
  <div v-if="open" ref="floating" :style="floatingStyles">
    <p>Floating content. Click outside or press Esc to close.</p>
  </div>
</template>
```

### Key Options

-   `enabled`: A `MaybeRefOrGetter<boolean>` to enable or disable the hook. Defaults to `true`.
-   `escapeKey`: A `MaybeRefOrGetter<boolean>`. If `true` (default), pressing the Escape key will close the floating element.
-   `outsidePress`: A `MaybeRefOrGetter<boolean | ((event: MouseEvent) => boolean)>`. If `true` (default), clicking outside the reference and floating elements will close the floating element. It can also be a function for custom logic to determine if an outside press should dismiss.
-   `outsidePressEvent`: A `MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">`. The event type to listen for outside presses. Defaults to `'pointerdown'`.
-   `anchorPress`: A `MaybeRefOrGetter<boolean>`. If `true`, pressing the anchor element (if it's already open) will dismiss the floating element. Defaults to `false`.
-   `ancestorScroll`: A `MaybeRefOrGetter<boolean>`. If `true`, scrolling an ancestor of the floating element will dismiss it. Defaults to `false`.
-   `capture`: A `boolean | { escapeKey?: boolean; outsidePress?: boolean }`. Configures whether to use the capture phase for event listeners. Defaults to `{ escapeKey: false, outsidePress: true }`.

### Read More

For detailed information on dismissal reasons and advanced configurations, see the source code: [`src/composables/interactions/use-dismiss.ts`](../../src/composables/interactions/use-dismiss.ts)

## `useClientPoint`

The `useClientPoint` composable positions the floating element relative to a client point, typically the mouse cursor's position. This is useful for creating context menus, cursor-following tooltips, or any element that needs to be dynamically positioned based on pointer coordinates.

It works by updating the `VirtualElement` used by `useFloating` based on pointer events.

### Basic Usage

`useClientPoint` requires a reference to the element that will trigger pointer events (often the reference element itself or a container) and the `FloatingContext`.

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClientPoint, useHover, autoUpdate } from '@floating-ui/vue' // Assuming this path

const reference = ref(null) // This element's bounds are used for event listening
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  // `placement` is often 'right-start' or similar for cursor-following
  placement: 'right-start',
  whileElementsMounted: autoUpdate
})

// Show/hide based on hover
useHover(context, { delay: { open: 300 } })
// Position based on client point
useClientPoint(reference, context, {
  // enabled: open, // Often linked to the open state
  // axis: 'both' // 'x', 'y', or 'both'
})
</script>

<template>
  <div ref="reference" style="width: 200px; height: 100px; border: 1px solid #ccc; text-align: center; line-height: 100px;">
    Hover over me
  </div>
  <div v-if="open" ref="floating" :style="floatingStyles">
    Context Menu / Tooltip
  </div>
</template>
```
**Note:** In the example above, `useClientPoint` is combined with `useHover`. The `enabled` option of `useClientPoint` would typically be tied to the `open` state, so it only tracks the mouse when the floating element is intended to be visible. The `reference` passed to `useClientPoint` is the DOM element whose bounding box is used as the reference for pointer event listeners and initial positioning.

### Key Options

-   `enabled`: A `MaybeRefOrGetter<boolean>` to enable or disable the hook. Defaults to `true`. It's common to bind this to the `open` state of your floating element.
-   `axis`: A `MaybeRefOrGetter<"x" | "y" | "both">`. Restricts the floating element's position to follow the pointer along the specified axis, or both. Defaults to `'both'`.
-   `x`: A `MaybeRefOrGetter<number | null>`. Allows you to provide a controlled x-coordinate, overriding the pointer's x-position. Defaults to `null`.
-   `y`: A `MaybeRefOrGetter<number | null>`. Allows you to provide a controlled y-coordinate, overriding the pointer's y-position. Defaults to `null`.

### Return Values

`useClientPoint` returns an object with:
-   `coordinates`: A `Readonly<Ref<{ x: number | null; y: number | null }>>` containing the current client coordinates.
-   `updatePosition`: A function `(x: number, y: number) => void` to manually update the floating element's position based on provided coordinates.

### Read More

For a comprehensive understanding of how `useClientPoint` interacts with virtual elements and its coordinate system, refer to the source code: [`src/composables/interactions/use-client-point.ts`](../../src/composables/interactions/use-client-point.ts)

## Combining Interactions: Tooltip Example

Many UI elements require multiple interaction types to provide a good user experience. For example, a tooltip should ideally appear when a user hovers over an element or when they focus it using a keyboard. It should also be dismissible.

Here's how you can combine `useHover`, `useFocus`, and `useDismiss` to create such a tooltip:

```vue
<script setup>
import { ref } from 'vue'
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  autoUpdate,
  offset
} from '@floating-ui/vue' // Assuming this path

const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  placement: 'top',
  whileElementsMounted: autoUpdate,
  middleware: [offset(5)] // Add some space between reference and tooltip
})

// Show on hover
useHover(context, { delay: { open: 100, close: 50 } })
// Show on focus
useFocus(context)
// Hide on dismiss events (e.g., Escape key, click outside)
useDismiss(context)
</script>

<template>
  <button ref="reference" type="button" aria-describedby="tooltip">
    Hover or Focus Me
  </button>
  <div
    v-if="open"
    ref="floating"
    :style="floatingStyles"
    id="tooltip"
    role="tooltip"
  >
    This is a helpful tooltip!
  </div>
</template>
```

### How it Works Together

-   **`useHover(context, { delay: { open: 100, close: 50 } })`**: Makes the tooltip appear when the mouse hovers over the button (with a small open delay) and disappear when the mouse leaves.
-   **`useFocus(context)`**: Allows the tooltip to appear when the button receives keyboard focus (e.g., via the Tab key).
-   **`useDismiss(context)`**: Ensures the tooltip can be closed if the user presses the Escape key or clicks outside of it. This is particularly useful if the tooltip gained focus itself or if other interactions caused it to persist.

By combining these interactions, you create a more robust and accessible tooltip. You can adapt this pattern for other UI components like dropdowns or popovers, choosing the interactions that best suit the desired behavior.
