# Interactions

## Philosophy & Guiding Principles

Interaction composables are the heart of creating dynamic, user-responsive floating elements. Their design is guided by a few core principles:

1.  **Declarative & Composable:** You shouldn't have to manually wire up complex event listeners and state management. Instead, you declaratively _state_ which interactions your component needs (e.g., `useClick`, `useFocus`). The library then composes these behaviors into a cohesive and predictable system.

2.  **Centralized State, Decentralized Logic:** All interactions revolve around a single source of truth: the `FloatingContext`. This context holds the core `open` state. Each interaction composable is a self-contained unit of logic that knows _how_ to modify that central state based on specific user actions. This separation of concerns makes the system predictable and easier to debug.

3.  **Accessibility as a Feature, Not an Afterthought:** Interactions like `useFocus` are not optional add-ons; they are first-class citizens. By making it trivial to add keyboard and screen-reader support, the library encourages building accessible components by default.

## The Core Engine: `FloatingContext`

Before diving into specific interactions, it's crucial to understand the `FloatingContext`. This object, provided by the main `useFloating` composable, is the central hub that all interaction composables plug into.

It provides:

- **A reactive `open` state:** The single source of truth for whether the floating element is visible.
- **An `onOpenChange` function:** The designated way for interactions to request a change to the `open` state.
- **Element References:** Reactive `refs` to the anchor and floating elements, which the interactions use to attach event listeners.

Every interaction composable you use will accept this `context` as its first argument, allowing it to read state and dispatch changes in a coordinated way.

```vue
<script setup>
// ...
const open = ref(false)

const { context } = useFloating(reference, floating, {
  // The context is configured with the reactive `open` state
  // and an `onOpenChange` handler to update it.
  open,
  onOpenChange: (value) => {
    open.value = value
  },
})

// All subsequent interactions plug into this same `context`.
useClick(context)
useEscapeKey(context, { onEscape: () => context.setOpen(false) })
// ...
</script>
```

## Building a Component: The Dropdown Menu

Instead of looking at each interaction in isolation, let's build a common UI pattern: a fully-featured dropdown menu. This will demonstrate how different composables work together to create a robust user experience. A good dropdown should:

1.  Open/close on **click**.
2.  Close when the **Escape** key is pressed.
3.  Close when the user **clicks outside** the menu.
4.  Be fully **keyboard accessible**, opening on focus and allowing navigation.
5.  Support **hierarchical focus behavior** for nested menus with tree-aware interactions.

We can achieve all of this by composing four interactions: `useClick`, `useFocus`, `useEscapeKey`, and `useRole`.

```vue
<script setup>
import { ref } from "vue"
import { useFloating, autoUpdate, offset } from "v-float"
// Assume these are imported from your library
import { useClick, useFocus, useEscapeKey, useRole } from "./composables"

// 1. Core Floating UI setup
const reference = ref(null)
const floating = ref(null)
const open = ref(false)

const { floatingStyles, context } = useFloating(reference, floating, {
  open,
  onOpenChange: (value) => {
    open.value = value
  },
  placement: "bottom-start",
  whileElementsMounted: autoUpdate,
  middleware: [offset(5)],
})

// 2. Composing the Interactions
// ---
// Handles opening and closing on click.
useClick(context)

// Handles closing on Escape key presses.
useEscapeKey(context, { onEscape: () => context.setOpen(false) })

// Handles opening on keyboard focus for accessibility.
// Supports both standalone and tree-aware usage for nested menus.
useFocus(context)

// Adds the necessary ARIA attributes for a `menu` role.
useRole(context, { role: "menu" })
</script>

<template>
  <!-- `useRole` adds aria-haspopup, aria-expanded, etc. -->
  <button ref="reference" type="button">Dropdown</button>

  <!-- `useRole` adds role="menu" and manages focus -->
  <div v-if="open" ref="floating" :style="floatingStyles">
    <ul>
      <li><a href="#">Item 1</a></li>
      <li><a href="#">Item 2</a></li>
    </ul>
  </div>
</template>
```

### How It Works Together

- **`useClick(context)`** listens for clicks on the anchor. When a click occurs, it calls `onOpenChange` to toggle the `open` state.
- **`useEscapeKey(context)`** adds a global listener for the Escape key. When pressed _while the menu is open_, it calls `onOpenChange(false)` to close it.
- **`useFocus(context)`** listens for focus events on the anchor. When the element is focused (e.g., via the Tab key), it calls `onOpenChange(true)`. This ensures keyboard users can access the menu without a mouse.
- **`useRole(context)`** enhances accessibility by managing ARIA attributes like `aria-expanded` (which it syncs with the `open` state) and `aria-controls`.

Notice there are no conflicts. Each composable operates on the same shared `open` state but is triggered by different, non-overlapping events. This is the power of the compositional model.

## Advanced Patterns & Common Pitfalls

### Pattern: The Accessible Tooltip

A tooltip has different requirements from a dropdown. It should appear on **hover** or **focus**, not a click.

```vue
// In your <script setup>
// ... (useFloating setup is the same)

// Show on mouse hover, with a slight delay to feel less twitchy.
useHover(context, { delay: 150 })

// Also show on keyboard focus for accessibility.
useFocus(context)

// Allow closing with the Escape key.
useEscapeKey(context, { onEscape: () => context.setOpen(false) })

// Apply the `tooltip` role for screen readers.
useRole(context, { role: 'tooltip' })
```

Here, `useHover` and `useFocus` work in tandem. Whichever happens first will open the tooltip. `useEscapeKey` provides a consistent way to close it.

### Pitfall: Conflicting Triggers (`useClick` vs. `useHover`)

What if you want a popover that opens on click, but can _also_ be opened on hover? Combining `useClick` and `useHover` directly can lead to confusing behavior:

- User clicks to open it.
- User moves the mouse away.
- `useHover`'s `mouseleave` event fires and closes the popover, which the user expected to stay open.

**Solution:** Conditionally enable interactions. You can pass an `enabled` option (a `ref` or `computed`) to most interaction composables. This lets you decide which interaction should be active.

```vue
<script setup>
// ...
const isHovering = ref(false)

// Only enable hover if the element is NOT open.
// This prevents hover from closing a clicked-open element.
useHover(context, { enabled: computed(() => !open.value) })

// Click always works.
useClick(context)
useEscapeKey(context, { onEscape: () => context.setOpen(false) })
// ...
</script>
```

In this scenario, `useHover` can only _open_ the popover. Once `open` is `true`, the hover logic is disabled, preventing it from interfering with the clicked-open state.

### Pitfall: Managing Focus

When a floating element opens, where should keyboard focus go? By default, it stays on the anchor. For dialogs or menus, you often want to move focus inside the floating element. You can handle this by observing the `open` state.

```ts
import { watch, nextTick } from "vue"
const open = ref(false)
const floating = ref<HTMLElement | null>(null)
```
