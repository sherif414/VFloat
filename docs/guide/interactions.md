# Interactions

## Learning Outcomes

- Understand how interaction composables coordinate via `FloatingContext`
- Compose `useClick`, `useHover`, `useFocus`, and `useEscapeKey`
- Add outside click and keyboard dismissal safely

## TL;DR (Quick Start)

```vue
<script setup>
import { ref } from "vue"
import { useFloating, useClick, useEscapeKey } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)

const context = useFloating(anchorEl, floatingEl)
useClick(context, { outsideClick: true })
useEscapeKey(context)
</script>
```

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

## See Also

- [useClick](/api/use-click)
- [useHover](/api/use-hover)
- [useFocus](/api/use-focus)
- [useEscapeKey](/api/use-escape-key)
- [useListNavigation](/api/use-list-navigation)
- [Keyboard List Navigation](/guide/list-navigation)

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
import { useFloating, offset, useClick, useFocus, useEscapeKey } from "v-float"

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
  autoUpdate: true,
  middlewares: [offset(5)],
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

// Add appropriate ARIA attributes in your template as needed
</script>

<template>
  <!-- Add aria-haspopup, aria-expanded, etc. as appropriate -->
  <button ref="reference" type="button">Dropdown</button>

  <!-- Manage focus/roles per your accessibility requirements -->
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
// Add ARIA attributes in your template to announce menu state and relationships

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

// Add role="tooltip" and related ARIA in the template as needed
```

Here, `useHover` and `useFocus` work in tandem. Whichever happens first will open the tooltip. `useEscapeKey` provides a consistent way to close it.

### Pattern: The Context Menu with Static Positioning

Context menus require a different approach to positioning - they should appear at the exact location where the user right-clicked, not follow the cursor:

```vue
<script setup>
import { useFloating, useClientPoint, useClick } from "v-float"
import { flip, shift } from "@floating-ui/dom"

const contextReference = ref(null)
const contextFloating = ref(null)

const context = useFloating(contextReference, contextFloating, {
  placement: "bottom-start",
  middlewares: [flip(), shift({ padding: 8 })]
})

// Static positioning - appears at right-click location and stays there
useClientPoint(contextReference, context, {
  trackingMode: "static"
})

// Handle outside clicks to close menu
useClick(context, { outsideClick: true })

function showContextMenu(event: MouseEvent) {
  event.preventDefault()
  contextReference.value = event.target as HTMLElement
  context.setOpen(true)
}
</script>

<template>
  <div @contextmenu="showContextMenu">
    Right-click for context menu
    
    <Teleport to="body">
      <div
        v-if="context.open.value"
        ref="contextFloating"
        :style="context.floatingStyles.value"
        class="context-menu"
      >
        <!-- Menu items -->
      </div>
    </Teleport>
  </div>
</template>
```

> **Note:** `useClientPoint` is a positioning utility, not an interaction handler. It works alongside `useFloating` to position elements at pointer coordinates. While this example demonstrates its use with interaction composables like `useClick`, `useClientPoint` itself focuses on determining WHERE the floating element should appear. See the [Virtual Elements guide](/guide/virtual-elements) for more details on positioning strategies.

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

### Pattern: Choosing the Right Tracking Mode for Pointer-Based Positioning

When using pointer-based positioning with `useClientPoint`, different tracking behaviors suit different use cases:

- **`"follow"` mode** (default): For tooltips that should track cursor movement
- **`"static"` mode**: For context menus that appear at click location
- **`"initial-only"` mode**: For programmatically controlled positioning

```vue
<script setup>
// Tooltip that follows cursor
useClientPoint(reference, tooltipContext, {
  trackingMode: "follow"
})

// Context menu at right-click position
useClientPoint(reference, menuContext, {
  trackingMode: "static"
})

// Controlled positioning
useClientPoint(reference, controlledContext, {
  trackingMode: "initial-only",
  x: computedX,
  y: computedY
})
</script>
```

Choosing the appropriate mode ensures the positioning behavior matches user expectations for each interaction pattern. For more details on `useClientPoint` and other positioning utilities, see the [Virtual Elements guide](/guide/virtual-elements).

### Pitfall: Managing Focus

When a floating element opens, where should keyboard focus go? By default, it stays on the anchor. For dialogs or menus, you often want to move focus inside the floating element. You can handle this by observing the `open` state.

```ts
import { watch, nextTick } from "vue"
const open = ref(false)
const floating = ref<HTMLElement | null>(null)
```
