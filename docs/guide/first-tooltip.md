---
description: Build your first tooltip with refs, positioning, hover behavior, and offset middleware.
---

# First Tooltip

Let's start with a small tooltip.

A tooltip is a good first example because it uses the main VFloat pieces without adding too much at once.

By the end of this page, you will have a tooltip that sits next to a button, opens on hover, and leaves a little space between the button and the tooltip.

::: demo src="./demos/first-tooltip-demo.vue" title="A small tooltip"
:::

## A Few Words First

There are a few names on this page that are worth knowing up front:

- `anchorEl` is the element the tooltip is positioned against. In this example, that is the button.
- `floatingEl` is the element positioned relative to the anchor. In this example, that is the tooltip.
- [`context`](/guide/floating-context) is the shared object returned by [`useFloating`](/api/use-floating). Other composables use it too.
- `middlewares` are small helpers that adjust the final position. On this page, we will use [`offset`](/api/offset) to add a little space.

If those names do not feel natural yet, that is okay. They will make more sense once we build the example.

## Step 1: Create The Element Refs

We will start by creating refs for the button and the tooltip.

```vue{4-5}
<script setup lang="ts">
import { ref } from "vue";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
</script>
```

These refs connect the template to VFloat. Later, when the button and tooltip are rendered, VFloat will use these refs to know which element is the anchor and which one is the floating surface.

## Step 2: Create The Floating Context

Now pass those refs into `useFloating`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating } from "v-float"; // [!code ++]

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  // [!code focus:4]
  placement: "top", // [!code ++]
  middlewares: [offset(8)], // [!code ++]
}); // [!code ++]
</script>
```

`useFloating()` does two important things here. It computes the tooltip position, and it returns the shared `context` object that the rest of the page will use.

The `placement: "top"` option means we want the tooltip above the button. The `offset(8)` middleware adds a small gap so the tooltip does not sit right against the anchor.

## Step 3: Add Hover Behavior

Next, we will make the tooltip open and close on hover.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating, useHover } from "v-float"; // [!code ++]

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});

useHover(context); // [!code focus]
</script>
```

`useHover(context)` uses the same shared `context`. It listens for pointer entry and exit, and updates `context.state.open.value` for you.

That means we do not need to write hover event handlers ourselves in this first example.

## Step 4: Render The Tooltip

Now we can render the button and the tooltip.

```vue{17,21-23}
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});

useHover(context);
</script>

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="tooltip"
    :style="context.position.styles.value"
  >
    This button saves your changes.
  </div>
</template>
```

There are three lines worth noticing:

- `v-if="context.state.open.value"` decides whether the tooltip exists in the DOM
- `ref="floatingEl"` gives VFloat access to the rendered node
- `:style="context.position.styles.value"` applies the computed position

## Why `offset` Matters Even In A Tiny Example

The tooltip would still work without `offset(8)`, but it would sit right against the button. In most interfaces that feels a little cramped.

Using `offset` here also gives you a first look at what middleware is for. It is just a small function that adjusts the final result.

## Recap

You now have a working tooltip.

The main pieces are:

- [`useFloating`](/api/use-floating) for shared state and position
- [`useHover`](/api/use-hover) for hover-driven open state
- [`offset`](/api/offset) for spacing

If you only remember one thing from this page, remember the `context`:

- `context.state.open.value` tells you if the surface is open
- `context.position.styles.value` tells you how to place it

## Next Step

Read [First Popover](/guide/first-popover) next. It keeps the same basic structure, but changes the interaction from hover to click.
