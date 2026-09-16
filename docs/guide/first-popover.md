---
description: Build a click-driven popover and see how VFloat changes behavior without changing the core shape.
---

# First Popover

A popover uses the same basic VFloat shape as the tooltip, but the interaction changes. Instead of opening on hover, it opens on click and stays open while the user works inside it.

By the end of this page, you will have a click-driven popover with outside-click and Escape key handling.

## The complete example

Here is the full working component before we break it down:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
  },
});

useClick(node);
useDismiss(node);
</script>

<template>
  <button ref="anchorEl" type="button">Open popover</button>

  <div v-if="node.open.value" ref="floatingEl">
    <p>Popover content goes here.</p>
    <button type="button">Action</button>
  </div>
</template>
```

Notice how familiar this looks. The template and ref setup match the tooltip guide almost line for line. The only difference is in the interaction layer.

## The shared node and positioning

```ts
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
  },
});
```

Just like the tooltip, [`useFloatingNode`](/api/use-floating-node) creates the shared `node` that coordinates element refs and open state.

[`usePosition`](/api/use-position) places the popover panel below the button aligned with its start edge (`"bottom-start"`), with an 8-pixel gap provided by [`offset`](/api/offset), and applies the positioning styles automatically to `floatingEl`.

## Swapping hover for click and dismissal

```ts
useClick(node);
useDismiss(node);
```

This is where the popover departs from the tooltip:

- **[`useClick`](/api/use-click)** toggles `node.open` when the anchor button is clicked, and prevents double-triggers on keyboard activation.
- **[`useDismiss`](/api/use-dismiss)** listens for outside pointer input and Escape key presses through one shared gate, closing the popover when the user moves away or presses Escape.

Both composables plug into the same `node`, so they share the exact same open state without manual event plumbing.

## The template bindings

```vue
<button ref="anchorEl" type="button">Open popover</button>

<div v-if="node.open.value" ref="floatingEl">
  <p>Popover content goes here.</p>
  <button type="button">Action</button>
</div>
```

The template stays minimal:

- `ref="anchorEl"` connects the trigger button.
- `ref="floatingEl"` connects the floating panel (positioned automatically).
- `v-if="node.open.value"` renders the panel only when open.

Because the popover panel stays rendered while open, users can interact with form controls, buttons, or links inside it without the surface closing prematurely.

## Where to go next

- Read [Control Open State](/guide/control-open-state) to learn when to let VFloat manage open state and when the parent component should control it.
- Read [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) for production enhancements like viewport boundary collisions and focus rules.
- Read [Floating Node](/guide/floating-node) for the complete reference on `node.refs`, `node.open`, and node hierarchy methods.
