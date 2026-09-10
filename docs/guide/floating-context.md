---
description: Understand the shared node object that ties VFloat behavior together.
---

# Floating Context

The `context` is the shared node that keeps a floating surface together.

If you understand the floating node, the rest of the library gets easier to follow. Most confusion in VFloat comes from treating the composables as separate helpers when they are really meant to cooperate through one shared object.

## The Three Parts

Every floating surface in VFloat is built from three things:

- an anchor element
- a floating element
- a shared `context`

The anchor is the thing the surface is positioned against. The floating element is the surface that appears. The `context` is the node object returned by [`useFloatingNode`](/api/use-floating-node) that connects them and lets other composables work together.

## Why The Node Exists

VFloat intentionally keeps the shared node small:

- `refs`
- `open` and `setOpen`

That grouping matters because companion composables know where to read and write behavior without forcing the public root shape to grow in random directions. Positioning is added separately with [`usePosition`](/api/use-position), which reads the same node and returns the computed geometry. Related surfaces coordinate through an explicit [`useFloatingTree`](/api/use-floating-tree) that nodes join with `tree.addNode()`.

## `refs`

The `refs` group is about the DOM relationships.

It includes:

- `anchorEl`
- `floatingEl`
- `arrowEl`

## `open` and `setOpen`

The open pair is about visibility.

It includes:

- `open`
- `setOpen`

Interaction composables such as [`useHover`](/api/use-hover), [`useClick`](/api/use-click), [`useFocus`](/api/use-focus), and [`useEscapeKey`](/api/use-escape-key) all coordinate through this same open state, tagging each change with a reason such as `"hover"` or `"anchor-click"`.

## Positioning Lives Next To The Node

The node itself does not compute coordinates, run middlewares, or wire auto-update listeners.

When a surface needs JavaScript positioning, call `usePosition(context)`. That returns geometry fields such as:

- `x`
- `y`
- `placement`
- `strategy`
- `middlewareData`
- `isPositioned`
- `styles`
- `update`

Most templates only need to bind `:style="styles"`, but the rest of the data is there when you need deeper control or helpers such as arrows.

## The Core Loop

This is the loop to keep in your head:

1. You create refs for the anchor and floating element.
2. You pass them into [`useFloatingNode`](/api/use-floating-node).
3. `useFloatingNode()` returns the shared `context`.
4. `usePosition(context)` adds positioning when the surface needs it.
5. Other composables read from and write to the same `context`.
6. Your template renders from `context.open` and the returned `styles`.

## A Minimal Example

This small example shows the node in use without much extra ceremony.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, {
  placement: "bottom",
  middleware: {
    offset: 8,
  },
});

useHover(context);
</script>

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div v-if="context.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## Next Step

- Read [Placement and Positioning](/guide/placement-and-positioning) to understand what `position` is really computing.
- Read [Interaction Model](/guide/interaction-model) to understand how composables cooperate through open state.
- Read [First Tooltip](/guide/first-tooltip) if you want to see the concept in a working example again.
