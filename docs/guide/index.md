# Start Here

VFloat helps you position floating surfaces — tooltips, popovers, menus, dialogs — relative to an anchor element. It also gives you composables that handle the interaction layer: when things open, close, and respond to user input.

The quickest way to understand what this library does is to build something. Let's start with the smallest possible floating element, then backfill the concepts.

## The Mental Model

Before we write code, let's clarify what VFloat is and is not.

VFloat provides:

- **Positioning** — It calculates where a floating element should appear relative to an anchor.
- **Interactions** — Composables that handle click, hover, focus, keyboard dismissal, and focus trapping.
- **Middleware** — A pipeline that refines the base position (handling collisions, adding offset, resizing).

VFloat is not:

- A component library with prebuilt widgets
- A styling system
- A fork of Floating UI

The goal is to give you the minimum set of primitives so you can build any floating surface that fits your app's design.

## Build Your First Floating Element

Let's put a tooltip next to a button. This will show the three pieces working together: the anchor, the floating element, and the context that connects them.

First, we need two template refs:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
</script>
```

Next, we call `useFloating` and bind the refs. The grouped context it returns gives us the open state and computed styles:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom",
});
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Tooltip content
  </div>
</template>
```

This renders the floating element, but it does not open yet. We have not told VFloat when `context.state.open.value` should change. That is the job of the interaction composables.

## Add Interaction With `useHover`

Let's make the tooltip appear on hover:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom",
});

useHover(context);
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Tooltip content
  </div>
</template>
```

Now `useHover()` manages `context.state.open.value` for us. When the pointer enters the anchor, the floating element appears. When it leaves, it hides.

::: tip
`useHover` works well for tooltips. For menus and popovers, you would typically reach for `useClick` instead, which we will cover in the [Interactions](/guide/interactions) guide.
:::

## Add Spacing With Middleware

Right now the tooltip sits directly against the anchor. Most UIs need a little gap. We add that with the `offset` middleware:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom",
  middlewares: [offset(8)],
});

useHover(context);
</script>
```

The middleware array is a pipeline. `offset(8)` adds 8 pixels of space between the anchor and floating element. Middleware runs after the base position is computed, so you can stack multiple refinements.

## Where To Go Next

You have seen the three layers working together:

1. **Positioning** via `useFloating()` and middleware
2. **Interaction** via composables like `useHover()`
3. **State** via the shared `context`

If you are upgrading from the older flat return shape, read [Migration: Grouped Context](/guide/migration-grouped-context) before updating the rest of your codebase.

From here, the natural next steps are:

- **[How It Works](/guide/how-it-works)** — Learn the three pieces (anchor, floating, context) in detail, including how to control open state from a parent component.
- **[Interactions](/guide/interactions)** — Build click-driven surfaces, modals, and combine multiple interaction patterns.
- **[Middleware](/guide/middleware)** — Handle viewport collisions, add arrows, and resize elements intelligently.

If you want the full learning path, read through the guides in order: Start Here, then How It Works, then Interactions, then Middleware.

For exact signatures and options, jump to the [API Reference](/api/).
