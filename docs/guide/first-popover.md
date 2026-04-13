---
description: Build a click-driven popover and see how VFloat changes behavior without changing the core shape.
---

# First Popover

A popover looks similar to a tooltip in the DOM, but it behaves differently. A tooltip is usually hover-driven and lightweight. A popover is usually click-driven, stays open while the user interacts with it, and needs clearer dismissal rules.

This page shows the smallest useful click-driven surface so you can see how VFloat changes behavior without changing its core structure.

## What Changes Compared To A Tooltip

The anchor ref, floating ref, and `context` shape all stay the same. What changes is the interaction layer.

For a popover, we usually want:

- Click to open
- Click again to close
- Click outside to dismiss
- Escape to dismiss for keyboard users

That means we will use [`useFloating`](/api/use-floating), [`useClick`](/api/use-click), [`useEscapeKey`](/api/use-escape-key), and [`offset`](/api/offset).

## Step 1: Build The Shared Context

Start with the same setup you used for the tooltip.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8)],
});
</script>
```

## Step 2: Add Click And Escape Behavior

Now add the interaction composables that match a popover.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8)],
});

useClick(context, {
  closeOnOutsideClick: true,
});

useEscapeKey(context);
</script>
```

This gives you a reasonable default popover behavior:

- Clicking the anchor toggles it
- Clicking outside closes it
- Pressing Escape closes it

## Step 3: Render The Popover

Render the anchor and the floating element with the shared `context`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8)],
});

useClick(context, {
  closeOnOutsideClick: true,
});

useEscapeKey(context);
</script>

<template>
  <button ref="anchorEl" type="button">Open popover</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    <p>Popover content goes here.</p>
    <button type="button">Action</button>
  </div>
</template>
```

This template is nearly identical to the tooltip template. That is one of the main design wins of VFloat: the rendering shape stays stable while the behavior swaps out underneath it.

## Recap

The popover uses the same core shape as the tooltip:

- `anchorEl`
- `floatingEl`
- `context`

The difference is that you replaced `useHover` with [`useClick`](/api/use-click) and [`useEscapeKey`](/api/use-escape-key).

## Next Step

Read [Control Open State](/guide/control-open-state) if you want to understand when the `context` should own open state and when the parent component should own it instead.
