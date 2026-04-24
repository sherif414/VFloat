---
description: Build a click-driven popover and see how VFloat changes behavior without changing the core shape.
---

# First Popover

Let's build the next small surface: a popover.

A popover uses the same basic VFloat shape as the tooltip, but the interaction changes. Instead of opening on hover, it opens on click and stays open while the user works inside it.

By the end of this page, you will have a click-driven popover with outside-click and Escape handling.

## A Few Words First

The names on this page should already feel familiar:

- `anchorEl` is the button or trigger
- `floatingEl` is the popover panel
- `context` is the shared object returned by [`useFloating`](/api/use-floating)

The main difference from the tooltip page is the interaction layer. For a popover, we usually want:

- Click to open
- Click again to close
- Click outside to close
- Escape to close for keyboard users

That means we will use [`useFloating`](/api/use-floating), [`useClick`](/api/use-click), [`useEscapeKey`](/api/use-escape-key), and [`offset`](/api/offset).

If those names still feel abstract, that is fine. The example makes the shape easier to see.

## Step 1: Build The Shared Context

Start with the same refs and placement you used for the tooltip.

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

Now swap the hover behavior for click-based interaction.

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

This gives you the behavior most popovers need:

- Clicking the anchor toggles it
- Clicking outside closes it
- Pressing Escape closes it

## Step 3: Render The Popover

Now render the trigger and the panel with the shared `context`.

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

The template is still small on purpose. That is one of the nicer parts of VFloat: the rendering shape stays familiar even when the interaction changes.

## Recap

The popover uses the same core shape as the tooltip:

- `anchorEl`
- `floatingEl`
- `context`

The difference is that you replaced `useHover` with [`useClick`](/api/use-click) and [`useEscapeKey`](/api/use-escape-key).

## Next Step

Read [Control Open State](/guide/control-open-state) if you want to understand when the `context` should own open state and when the parent component should own it instead.
