# Safe Polygon

The safe polygon feature prevents floating elements from closing prematurely when a user's mouse moves between the anchor and the floating element.

## The Basics

When a user hovers over a trigger to open a menu or tooltip, they often move their cursor diagonally toward the floating element. If they accidentally hover outside both elements during this movement, a standard `mouseleave` event would close the floating element before they reach it.

To fix this, enable `safePolygon` on the `useHover` interaction.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useHover } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: 'right'
})

// Enable safe polygon to bridge the gap
useHover(context, { 
  safePolygon: true 
})
</script>

<template>
  <button ref="anchorEl">Hover Me</button>
  
  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    Move your mouse here!
  </div>
</template>
```

::: tip
`safePolygon` dynamically generates an invisible geometric bridge between the reference and floating elements. As long as the cursor stays within this shape, the floating element remains open.
:::

## Deep Dive

You can configure how forgiving the safe polygon is by passing an object instead of a boolean.

### Customizing the Polygon

You can adjust the `buffer` to make the safe area wider, which is especially useful for users with less precise mouse movements. You can also use `blockPointerEvents` to stop elements underneath the polygon from stealing hover events.

```ts
useHover(context, {
  safePolygon: {
    buffer: 10, // Adds 10px of extra padding to the safe area
    blockPointerEvents: true, // Prevents underlying elements from interfering
  }
})
```

::: warning
While `blockPointerEvents: true` makes traversing the safe area very reliable, it temporarily blocks interactions with other elements on the page that happen to be underneath the invisible polygon.
:::

## Further Reading

- [`useHover` API](/api/use-hover)
- [Interactions](/guide/interactions)
