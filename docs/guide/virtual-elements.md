# Virtual Elements

Virtual elements let us position a floating surface against something that is not a real DOM node. That can be a pointer location, a text selection, a map marker, or any computed rectangle.

This is the right tool when the anchor is ephemeral or when there is no single element that should own the geometry.

## A Manual Virtual Anchor

A virtual anchor only needs a `getBoundingClientRect()` method. VFloat treats it like a normal anchor when it computes coordinates.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "v-float";

const floatingEl = ref<HTMLElement | null>(null);

const virtualAnchor = {
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
      toJSON() {
        return this;
      },
    };
  },
};

const anchorEl = ref(virtualAnchor);

const context = useFloating(anchorEl, floatingEl);
</script>

<template>
  <div ref="floatingEl" :style="context.floatingStyles.value">Floating at fixed coordinates</div>
</template>
```

This pattern is useful when the anchor is a selection rectangle, a cursor location, or anything else you can describe with coordinates instead of a DOM node.

::: tip
If you already have a real element, keep using it. Virtual anchors are for the cases where the anchor is temporary, synthetic, or computed from another source.
:::

## Pointer-Driven Positioning

`useClientPoint()` turns pointer coordinates into a virtual anchor. That is the easiest way to build cursor-following tooltips and context menus.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useFloating, useHover } from "v-float";

const trackingArea = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "right-start",
});

useClientPoint(trackingArea, context, {
  trackingMode: "follow",
});

useHover(context);
</script>

<template>
  <div ref="trackingArea">
    Move the pointer over me

    <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
      I follow the cursor
    </div>
  </div>
</template>
```

In follow mode, the floating element keeps tracking the pointer. That is useful for previews, measuring tools, and other surfaces that should feel attached to motion.

## Static Context Menus

If the surface should open at the point of the right-click and stay there, use static tracking instead of follow mode.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useFloating } from "v-float";

const area = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
});

useClientPoint(area, context, {
  trackingMode: "static",
});

function openMenu() {
  context.setOpen(true);
}
</script>

<template>
  <div ref="area" @contextmenu.prevent="openMenu">
    Right-click here

    <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
      Context menu
    </div>
  </div>
</template>
```

`useClientPoint()` controls position, not visibility. Pair it with `useHover()`, `useClick()`, or your own `setOpen()` calls to decide when the surface appears.

::: warning
If the floating content is tied to a selection, cursor, or click location, make sure the coordinates stay stable for as long as the surface remains open. A moving anchor can make the UI feel jumpy even when the math is correct.
:::

## Further Reading

- [`useClientPoint` API](/api/use-client-point)
- [`useFloating` API](/api/use-floating)
- [Interactions](/guide/interactions)
