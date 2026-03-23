# Middleware

Middleware is the positioning pipeline. `useFloating` computes the base position first, then each middleware refines that result before the final coordinates are applied.

## The Usual Order

Most components start with spacing, then collision handling, then layout correction:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { flip, offset, shift, useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(10), flip(), shift({ padding: 8 })],
})
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

::: tip
`offset` usually comes first. `flip` and `shift` should run after spacing so collision checks see the final intended gap.
:::

## Picking The Right Middleware

- `offset` adds distance between the anchor and the floating element.
- `flip` changes placement when the preferred side does not have enough room.
- `shift` keeps the floating element in view.
- `size` measures the available space so you can resize the floating element.
- `autoPlacement` chooses the placement with the most room.
- `hide` exposes visibility state when the anchor is clipped or hidden.
- `arrow` calculates arrow coordinates and pairs naturally with [`useArrow`](/api/use-arrow).

## Arrow Workflows

If your floating surface needs a pointing arrow, use [`useArrow`](/api/use-arrow) to keep the arrow element in sync with the context, or read the coordinates from `context.middlewareData.value.arrow` if you are wiring styles manually.

## Further Reading

- [Core Concepts](/guide/concepts)
- [`useFloating` API](/api/use-floating)
- [`useArrow` API](/api/use-arrow)
