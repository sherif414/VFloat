---
description: Understand the shared node object that ties VFloat behavior together.
---

# Floating Node

The `FloatingNode` is the shared object that keeps a floating surface together.

If you understand the floating node, the rest of the library gets easier to follow. Most confusion in VFloat comes from treating the composables as separate helpers when they are really meant to cooperate through one shared node.

## The three parts

Every floating surface in VFloat is built from three things:

- an anchor element
- a floating element
- a shared `FloatingNode`

The anchor is the thing the surface is positioned against. The floating element is the surface that appears. The `FloatingNode` is the composite object returned by [`useFloatingNode`](/api/use-floating-node) that connects them and lets companion composables coordinate without manual event wiring.

## Why the node exists

VFloat intentionally keeps the shared [`FloatingNode`](/api/types#floatingnode) small and focused:

- `refs` (`anchorEl`, `floatingEl`, `arrowEl`)
- `open`
- Hierarchy relations (`parent`, `children`) and tree methods (`contains`, `traverse`)

That grouping matters because companion composables know where to read and write behavior without forcing the public root shape to grow in random directions. Positioning is added separately with [`usePosition`](/api/use-position), which reads the same node and applies computed geometry. Related surfaces coordinate naturally through the composite node hierarchy without requiring an external tree wrapper.

## `refs`

The `refs` group is about the DOM relationships.

It includes:

- `anchorEl`
- `floatingEl`
- `arrowEl`

## `open`

The open state is a standard mutable Vue `Ref<boolean>`.

Interaction composables such as [`useHover`](/api/use-hover), [`useClick`](/api/use-click), [`useFocus`](/api/use-focus), [`useOutsideClick`](/api/use-outside-click), and [`useEscapeKey`](/api/use-escape-key) all coordinate through this same open state by setting `node.open.value = true` or `node.open.value = false`.

## Positioning lives next to the node

The node itself does not compute coordinates, run middlewares, or wire auto-update listeners.

When a surface needs JavaScript positioning, call `usePosition(node)`. That returns geometry fields such as:

- `x`
- `y`
- `placement`
- `strategy`
- `middlewareData`
- `isPositioned`
- `styles`
- `update`

Most templates do not even need to bind styles manually because `usePosition` synchronizes them directly to `node.refs.floatingEl`. But the return values (including reactive `styles`) are there when you need manual control or deeper integration.

## The core loop

This is the loop to keep in your head:

1. You create refs for the anchor and floating element.
2. You pass them into [`useFloatingNode`](/api/use-floating-node).
3. `useFloatingNode()` returns the shared `node`.
4. `usePosition(node)` adds positioning and automatically synchronizes styles to the floating element.
5. Other composables read from and write to the same `node`.
6. Your template renders from `node.open.value`.

## A minimal example

This small example shows the node in use without extra ceremony.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom",
  middlewares: {
    offset: 8,
  },
});

useHover(node);
</script>

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div v-if="node.open.value" ref="floatingEl">Floating content</div>
</template>
```

## Where to go next

- Read [Placement and Positioning](/guide/placement-and-positioning) to understand what `position` is really computing.
- Read [Interaction Model](/guide/interaction-model) to understand how composables cooperate through open state.
- Read [First Tooltip](/guide/first-tooltip) if you want to see the concept in a working example again.
