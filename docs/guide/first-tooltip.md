# First Tooltip

The fastest way to understand VFloat is to build one small thing that works. A tooltip is a good first success because it exercises the core loop without forcing you to think about every edge case at once.

By the end of this page, you will have a tooltip that positions itself relative to a button, opens on hover, adds a small gap with middleware, and uses the same `context` shape you will use everywhere else in the library.

## What We Are Building

We need five pieces:

- An `anchorEl` ref for the trigger
- A `floatingEl` ref for the tooltip
- [`useFloating`](/api/use-floating) to compute position and expose the shared [`context`](/guide/floating-context)
- [`useHover`](/api/use-hover) to control open state from pointer events
- [`offset`](/api/offset) to add space between the button and the tooltip

## Step 1: Create The Element Refs

Start by declaring refs for the anchor and the floating element.

```vue
<script setup lang="ts">
import { ref } from "vue";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
</script>
```

These refs are the bridge between your template and VFloat. The library needs to know which DOM node acts as the anchor and which DOM node should be positioned as the floating surface.

## Step 2: Create The Floating Context

Now connect those refs to `useFloating`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});
</script>
```

This computes the base placement, applies `offset(8)` after the base placement so the tooltip has breathing room, and returns one grouped object called `context`.

That `context` matters. VFloat intentionally groups things into `refs`, `state`, and `position` so companion composables can share the same root object.

## Step 3: Add Hover Behavior

Next, teach the tooltip when to open and close.

```vue
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
```

`useHover(context)` listens for pointer entry and pointer exit on the anchor and floating element. It updates `context.state.open.value` for you, so your template can stay simple.

## Step 4: Render The Tooltip

Now bind the refs and the computed styles in the template.

```vue
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

Three lines do most of the work:

- `v-if="context.state.open.value"` decides whether the tooltip exists in the DOM
- `ref="floatingEl"` gives VFloat access to the rendered node
- `:style="context.position.styles.value"` applies the computed position

## Why `offset` Matters Even In A Tiny Example

The tooltip would still work without `offset(8)`, but it would sit directly against the anchor. In real interfaces that usually feels cramped, and it also makes it easier to understand the purpose of middleware later.

## Recap

You built a tooltip by combining:

- [`useFloating`](/api/use-floating) for shared state and position
- [`useHover`](/api/use-hover) for hover-driven open state
- [`offset`](/api/offset) for spacing

The main thing to keep in your head is the `context`:

- `context.state.open.value` tells you if the surface is open
- `context.position.styles.value` tells you how to place it

## Next Step

Read [First Popover](/guide/first-popover) next. It uses the same structure, but swaps hover behavior for click behavior so you can see how VFloat changes pattern without changing its core shape.
