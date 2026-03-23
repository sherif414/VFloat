# Core Concepts

VFloat keeps the mental model small on purpose. Most components only need three pieces: an anchor element, a floating element, and the context object returned by `useFloating`.

## Anchor And Floating Elements

The anchor is the element the user interacts with, such as a button, input, or list item. The floating element is the surface that appears beside it, such as a tooltip, popover, menu, or dialog.

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: "right-start",
})
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div ref="floatingEl" :style="context.floatingStyles.value">
    Floating element
  </div>
</template>
```

::: tip
`context.floatingStyles.value` already contains the computed position and strategy. Bind it directly to the floating element instead of rebuilding styles yourself.
:::

## Floating Context

`useFloating` returns a `FloatingContext`. That context is the shared object that interactions and positioning layers read from and write to.

- `context.open.value` tells you whether the floating surface is currently open.
- `context.setOpen(...)` changes that state.
- `context.refs.anchorEl` and `context.refs.floatingEl` point at the active DOM nodes.
- `context.middlewareData.value` exposes middleware output when you need extra positioning data.

If you need to coordinate visibility from your own code, keep that logic in the interaction layer or event handler and check the API page for the exact call shape.

## Positioning And Middleware

The context gives you the starting coordinates, then middlewares refine them. Use `middlewares` when you need spacing, flipping, shifting, sizing, or visibility checks.

```ts
import { useFloating, flip, offset, shift } from "v-float"

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
})
```

::: warning
`middlewares` is the option name. The docs and the source use the plural form because the value is a pipeline, not a single modifier.
:::

## Virtual Anchors

Not every floating surface needs a real DOM anchor. Virtual elements let you position against pointer coordinates, selections, or other computed rectangles. The [Virtual Elements](/guide/virtual-elements) page covers the workflows that use them.

## Further Reading

- [Philosophy](/guide/philosophy)
- [Interactions](/guide/interactions)
- [Middleware](/guide/middleware)
