# Virtual Elements

Virtual elements let you position a floating surface against something that is not a real DOM node. That can be a pointer location, a text selection, a map marker, or any computed rectangle.

## The Basics

A virtual element is an object with a `getBoundingClientRect()` method. VFloat treats it like a normal anchor when it computes coordinates.

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFloating } from "v-float"

const floatingEl = ref<HTMLElement | null>(null)

const virtualAnchor = ref({
  getBoundingClientRect() {
    return {
      x: 100,
      y: 100,
      top: 100,
      left: 100,
      right: 100,
      bottom: 100,
      width: 0,
      height: 0,
    }
  },
})

const context = useFloating(virtualAnchor, floatingEl)
</script>

<template>
  <div ref="floatingEl" :style="context.floatingStyles.value">
    Floating at fixed coordinates
  </div>
</template>
```

::: tip
Virtual anchors are useful when the user is interacting with something ephemeral, such as a cursor location or a text selection range.
:::

## Pointer Driven Positioning

`useClientPoint` manages the anchor coordinates while interactions decide when the floating element opens and closes.

Use `trackingMode: "follow"` when the surface should follow the pointer. Use `trackingMode: "static"` when you want to capture the initial point and keep the surface anchored there, such as with a context menu.

### Cursor Follow Tooltip

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useClientPoint, useFloating, useHover } from "v-float"

const trackingArea = ref<HTMLElement | null>(null)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const context = useFloating(anchorEl, floatingEl, {
  placement: "right-start",
})

useClientPoint(trackingArea, context, {
  trackingMode: "follow",
})

useHover(context)
</script>

<template>
  <div ref="trackingArea">
    Move your mouse over me

    <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
      I follow the cursor
    </div>
  </div>
</template>
```

### Static Context Menu

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useClientPoint, useFloating } from "v-float"

const area = ref<HTMLElement | null>(null)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
})

useClientPoint(area, context, {
  trackingMode: "static",
})

const openMenu = () => {
  context.setOpen(true)
}
</script>

<template>
  <div ref="area" @contextmenu.prevent="openMenu()">
    Right-click here

    <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
      Context menu
    </div>
  </div>
</template>
```

::: warning
`useClientPoint` controls position, not visibility. Pair it with `useHover`, `useClick`, or your own `setOpen` calls to decide when the surface appears.
:::

## Further Reading

- [`useClientPoint` API](/api/use-client-point)
- [`useFloating` API](/api/use-floating)
- [Interactions](/guide/interactions)
