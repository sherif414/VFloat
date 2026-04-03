# Middleware

Middleware refines the floating element's position after the base placement is computed. Think of it as a pipeline: `useFloating()` calculates where the element should go, then each middleware function gets a chance to adjust that position.

The way to approach middleware is to ask: "What problem is the base placement still leaving unsolved?" Start simple, then layer in the pieces you need.

## Step 1: Add Space with `offset`

The most common first middleware is `offset`. It adds a gap between the anchor and the floating element.

Without any middleware, the floating element sits directly against the anchor. Most UIs need breathing room:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom",
  middlewares: [offset(8)],
});
</script>

<template>
  <button ref="anchorEl">Open</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
  </div>
</template>
```

`offset(8)` adds 8 pixels of space. When you need more control, pass an object such as `offset({ mainAxis: 8, crossAxis: 16 })`.

::: tip
Always start with `offset` when you need spacing. It is the easiest adjustment and the one you usually need first.
:::

## Step 2: Handle Crowded Screens with `flip`

`flip` changes the placement side when the preferred side does not have enough room. If you ask for `"bottom"` but the viewport bottom is too close, `flip` tries `"top"`.

Let's add it to the pipeline:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom",
  middlewares: [offset(8), flip()],
});
</script>
```

`flip` checks whether the floating element would overflow the viewport (or any clipping ancestor). If it would, it flips to the opposite side.

::: tip
`flip` only changes sides. It does not move the element back into view if it already overflows. For that, you need `shift`.
:::

## Step 3: Keep It In View with `shift`

`shift` nudges the floating element back into the viewport (or a clipping boundary) when it overflows. It is the safety net after `flip` has done its job.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});
</script>
```

The `padding` option keeps a buffer between the floating element and the edge. Without it, the element would sit flush against the boundary, which often looks cramped.

## Step 4: Match Width with `size`

Sometimes the floating element should be the same width as its anchor — a dropdown that mirrors the trigger width, for example. `size` measures available space and can apply min/max width or height constraints.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift, size, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom",
  middlewares: [
    offset(8),
    flip(),
    shift({ padding: 8 }),
    size({
      apply({ rects, availableHeight }) {
        Object.assign(floatingEl.value.style, {
          minWidth: `${rects.reference.width}px`,
          maxHeight: `${availableHeight - 16}px`,
        });
      },
    }),
  ],
});
</script>
```

The `apply` function runs after the position is computed but before styles are finalized. It receives the measured rectangles and available space, letting you adjust sizing directly.

::: warning
`size` is powerful but it modifies the floating element directly in `apply`. Keep these mutations minimal and predictable. If you find yourself doing complex layout in `apply`, consider whether CSS or a different approach would be cleaner.
:::

## Step 5: Add an Arrow with `useArrow`

An arrow keeps the user's eye connected to the anchor. `useArrow` calculates where the arrow should sit so it stays attached to the anchor as the floating element moves.

First, add the `arrow` middleware:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { arrow, offset, useArrow, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  middlewares: [offset(8), arrow({ element: arrowEl })],
});

const { arrowStyles } = useArrow(context, {
  element: arrowEl,
});
</script>

<template>
  <button ref="anchorEl">Open</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
    <div ref="arrowEl" style="position: absolute" :style="arrowStyles">Arrow</div>
  </div>
</template>
```

`useArrow` reads `context.position.middlewareData.value.arrow` and computes the correct styles. The arrow automatically flips and shifts based on the current placement.

## Step 6: Let the Library Choose with `autoPlacement`

When the exact side does not matter and you just want "the best side", `autoPlacement` picks the placement with the most available space. This is useful when the content is flexible and the best side depends on the layout around it.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { autoPlacement, offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  middlewares: [
    offset(8),
    autoPlacement({
      allowedPlacements: ["top", "right", "bottom", "left"],
      crossAxis: true,
    }),
  ],
});
</script>
```

By default `autoPlacement` tries the available placements and picks the one with the most space. You can restrict which placements to consider with the `allowedPlacements` option.

## The Full Pipeline

Putting it all together, a common middleware stack looks like this:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});
</script>
```

The order matters:

1. `offset` sets the intended gap
2. `flip` changes the side if the preferred side is crowded
3. `shift` keeps the element in view if it overflows

## Middleware Reference

| Middleware      | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| `offset`        | Adds space between anchor and floating element        |
| `flip`          | Switches placement when preferred side is crowded     |
| `shift`         | Nudges element back into viewport when it overflows   |
| `size`          | Measures available space and applies size constraints |
| `autoPlacement` | Picks the side with the most room                     |
| `hide`          | Detects when the anchor is clipped or hidden          |
| `arrow`         | Calculates arrow coordinates                          |

## Further Reading

- [Safe Polygon](/guide/safe-polygon) — Handle hover paths between anchor and floating element
- [`useArrow` API](/api/use-arrow)
- [offset API](/api/offset)
- [flip API](/api/flip)
- [shift API](/api/shift)
- [size API](/api/size)
- [autoPlacement API](/api/autoplacement)
