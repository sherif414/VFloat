# How It Works

Every floating surface in VFloat is built from three pieces: an **anchor element**, a **floating element**, and a **context** that connects them. Understanding how these three pieces fit together makes the rest of the library click.

## The Three Pieces

### The Anchor

The anchor is the element the user interacts with. It could be a button, an input, a menu item, or a custom trigger. VFloat positions the floating element relative to this element's bounding box.

### The Floating Element

The floating element is the surface that appears — a tooltip, popover, menu, dialog, or anything else that needs to position itself next to something else. It receives its position via `context.floatingStyles.value`.

### The Context

The `FloatingContext` is the glue. It holds:

- `context.open.value` — whether the floating element is visible
- `context.setOpen(value)` — change the open state
- `context.refs.anchorEl` and `context.refs.floatingEl` — the current DOM nodes
- `context.floatingStyles.value` — the computed CSS styles for positioning
- `context.middlewareData.value` — data from the middleware pipeline
- `context.isPositioned.value` — whether position has been computed

## Build It From Scratch

Let's wire up the three pieces step by step.

First, declare the refs:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
</script>
```

Next, call `useFloating` and pass the refs:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)
</script>

<template>
  <button ref="anchorEl">Open</button>

  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    Floating content
  </div>
</template>
```

The floating element renders at `0,0` until `context.open.value` becomes `true`. We have not added any interaction logic yet, so it stays hidden.

::: tip
Bind `context.floatingStyles.value` directly to the floating element's `:style`. VFloat computes the exact coordinates, and applying styles by hand usually introduces subtle positioning errors.
:::

## Open State Lives On The Context

The context owns the open state by default. When you use an interaction composable like `useHover` or `useClick`, they write to `context.open.value` automatically.

But sometimes a parent component needs to own the open state. For example, a form component might control a dropdown from the outside. In that case, pass `open` and `onOpenChange` explicitly:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useClick, useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const open = ref(false)

const context = useFloating(anchorEl, floatingEl, {
  open,
  onOpenChange(value) {
    open.value = value
  },
})

useClick(context)
</script>
```

Now the parent controls visibility via `open.value`. The interaction composable still works — it calls `onOpenChange` instead of writing directly to the context's internal state.

::: warning Keep state on one context
If multiple interaction composables need to affect visibility, they must share the same context. When composables point at different state sources, they fight each other and the component behaves unpredictably.
:::

## How Positioning Works

`useFloating` computes the base position from the anchor's bounding box and the configured `placement`. The placement is a string like `"top"`, `"bottom-start"`, or `"right-end"`:

```ts
const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
})
```

The first word is the side. The optional suffix (`-start` or `-end`) controls alignment along that side.

After the base position, middleware in the pipeline can adjust the result. This two-step process — base position first, then middleware refinement — is what makes VFloat flexible.

## The Middleware Pipeline

Middleware functions sit between the base position and the final styles. Each one receives the current coordinates and returns modified coordinates (or metadata used by other middleware).

You can think of it like an assembly line:

```ts
import { flip, offset, shift, useFloating } from "v-float"

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
})
```

The order matters:

1. `offset(8)` adds 8px of space from the anchor
2. `flip()` flips to the opposite side if there is not enough room
3. `shift({ padding: 8 })` nudges the element back into view if it overflows

We cover each middleware in depth in the [Middleware](/guide/middleware) guide.

## What Lives On `middlewareData`

Middleware can expose data that other parts of your UI need. For example, the `arrow` middleware exposes coordinates for rendering an arrow:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { offset, useArrow, useFloating } from "v-float"

const arrowEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [offset(8)],
})

const { arrowStyles } = useArrow(arrowEl, context)
</script>

<template>
  <button ref="anchorEl">Open</button>

  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    Floating content
    <div ref="arrowEl" :style="arrowStyles">Arrow</div>
  </div>
</template>
```

`useArrow` reads the middleware data from context and calculates the correct position for the arrow so it stays attached to the anchor as the floating element moves.

## Summary

The three pieces are:

- **Anchor** — the trigger element
- **Floating element** — the positioned surface
- **Context** — the shared state and computed styles

The positioning pipeline is:

- `useFloating()` computes the base position
- Middleware refines the result
- `context.floatingStyles.value` applies the final styles

When you need behavior (open, close, keyboard handling), interaction composables write to `context.open.value`. When the parent needs control, pass `open` and `onOpenChange` explicitly.

## Further Reading

- [Interactions](/guide/interactions) — Add click, hover, focus, and dismissal
- [Middleware](/guide/middleware) — Refine positioning with offset, flip, shift, and more
- [`useFloating` API](/api/use-floating) — Exact options and return values
