---
description: Compose popovers and dropdowns with click, focus, and dismissal patterns.
---

# Build Popovers and Dropdowns

Popovers and dropdowns are click-driven surfaces that present rich interactive content. Unlike tooltips, which close when the cursor leaves, a popover stays open while the user works with form controls, links, or actions inside it.

For a reliable popover or dropdown, the core stack combines:

- [`useFloatingNode`](/api/use-floating-node) for shared refs and open state
- [`usePosition`](/api/use-position) with collision-aware middlewares
- [`useClick`](/api/use-click) for anchor toggling
- [`useOutsideClick`](/api/use-outside-click) for outside pointer dismissal
- [`useEscapeKey`](/api/use-escape-key) for Escape key dismissal

## The complete example

Here is a full working popover with collision handling, outside clicks, and keyboard dismissal:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloatingNode, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});

useClick(node);
useOutsideClick(node);
useEscapeKey(node);
</script>

<template>
  <button ref="anchorEl" type="button" class="trigger">Open actions</button>

  <div v-if="node.open.value" ref="floatingEl" class="panel">
    <h2>Quick actions</h2>
    <p>Choose the next step for this record.</p>
    <div class="actions">
      <button type="button">Edit</button>
      <button type="button">Duplicate</button>
      <button type="button">Archive</button>
    </div>
  </div>
</template>
```

## Robust positioning with collision detection

```ts
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});
```

A production popover needs more than just a base placement:

- **`offset: 8`** separates the panel from the trigger by 8 pixels.
- **`flip: true`** checks if the bottom placement fits in the viewport. If the bottom overflows, it flips to `top-start` automatically.
- **`shift: { padding: 8 }`** prevents the panel from overflowing horizontal screen edges by nudging it inward with an 8-pixel margin.

This three-middleware stack (`offset` → `flip` → `shift`) represents the battle-tested default for dropdown panels. `usePosition` automatically applies the resulting GPU-accelerated CSS transforms directly onto `node.refs.floatingEl`.

## Coordinating click, outside click, and Escape

```ts
useClick(node);
useOutsideClick(node);
useEscapeKey(node);
```

These composables cooperate through the shared `node`:

- **[`useClick`](/api/use-click)** opens the popover when the trigger button is clicked, and closes it if clicked again. It safely ignores modifier keys and right clicks.
- **[`useOutsideClick`](/api/use-outside-click)** registers document-level pointer listeners to close the surface when clicking away, while safely ignoring clicks inside `node.refs.floatingEl` (such as on the "Edit" or "Duplicate" buttons).
- **[`useEscapeKey`](/api/use-escape-key)** closes the surface when the user presses Escape, taking care not to intercept keystrokes while an IME is actively composing.

## The template bindings

```vue
<button ref="anchorEl" type="button" class="trigger">Open actions</button>

<div v-if="node.open.value" ref="floatingEl" class="panel">
  ...
</div>
```

The template maintains a clean contract:

- `ref="anchorEl"` associates the trigger button with the positioning engine.
- `ref="floatingEl"` associates the popover container (automatically positioned by `usePosition`).
- `v-if="node.open.value"` mounts the panel when active.

## Where to go next

- Read [Keep Content in View](/guide/keep-content-in-view) to explore advanced sizing and collision strategies.
- Read [Keyboard Navigation](/guide/keyboard-navigation) if your dropdown acts like a menu or listbox with arrow key navigation.
- Read [Build Dialogs and Modals](/guide/build-dialogs-and-modals) if your surface needs focus trapping or modal semantics.
