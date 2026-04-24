---
description: Understand the shared context object that ties VFloat behavior together.
---

# Floating Context

The `context` is the shared root that keeps a floating surface together.

If you understand the floating context, the rest of the library gets easier to follow. Most confusion in VFloat comes from treating the composables as separate helpers when they are really meant to cooperate through one shared object.

## The Three Parts

Every floating surface in VFloat is built from three things:

- an anchor element
- a floating element
- a shared `context`

The anchor is the thing the surface is positioned against. The floating element is the surface that appears. The `context` is the object that connects them and lets other composables work together.

## Why The Context Exists

VFloat intentionally groups the returned data into:

- `refs`
- `state`
- `position`

That grouping matters because companion composables know where to read and write behavior without forcing the public root shape to grow in random directions.

## `refs`

The `refs` group is about the DOM relationships.

It includes:

- `anchorEl`
- `floatingEl`
- `arrowEl`
- setter helpers for those refs

## `state`

The `state` group is about visibility.

It includes:

- `open`
- `setOpen`

Interaction composables such as [`useHover`](/api/use-hover), [`useClick`](/api/use-click), [`useFocus`](/api/use-focus), and [`useEscapeKey`](/api/use-escape-key) all coordinate through this same state object.

## `position`

The `position` group is about geometry and the computed result.

It includes things like:

- `x`
- `y`
- `placement`
- `strategy`
- `middlewareData`
- `isPositioned`
- `styles`
- `update`

Most templates only need `context.position.styles.value`, but the rest of the data is there when you need deeper control or helpers such as arrows.

## The Core Loop

This is the loop to keep in your head:

1. You create refs for the anchor and floating element.
2. You pass them into [`useFloating`](/api/use-floating).
3. `useFloating()` returns the shared `context`.
4. Other composables read from and write to that `context`.
5. Your template renders from `context.state` and `context.position`.

## A Minimal Example

This small example shows the context in use without much extra ceremony.

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

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
  </div>
</template>
```

## Next Step

- Read [Placement and Positioning](/guide/placement-and-positioning) to understand what `position` is really computing.
- Read [Interaction Model](/guide/interaction-model) to understand how composables cooperate through `state`.
- Read [First Tooltip](/guide/first-tooltip) if you want to see the concept in a working example again.
