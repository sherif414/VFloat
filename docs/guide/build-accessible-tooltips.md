---
description: Build accessible tooltips with the right interaction and dismissal behavior.
---

# Build Accessible Tooltips

Tooltips are easy to underestimate. The surface itself is small, but the interaction details matter a lot. A tooltip should feel lightweight, open from the right triggers, and avoid punishing the user for small pointer movements.

This guide shows a practical tooltip setup for VFloat:

- Hover opens it for pointer users
- Focus opens it for keyboard users
- `offset` creates a visible gap
- `safePolygon` keeps it open when the pointer crosses that gap

## The Goal

We want a tooltip that works for two real user paths:

- A mouse user hovers the trigger
- A keyboard user tabs to the trigger

That means the right combination is usually [`useFloating`](/api/use-floating), [`useHover`](/api/use-hover), [`useFocus`](/api/use-focus), and [`offset`](/api/offset).

## Step 1: Build The Shared Context

Start by wiring the anchor, floating element, and basic placement.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});
</script>
```

## Step 2: Add Hover And Focus Behavior

Now add the interaction layer that matches tooltip expectations.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useFloating, useFocus, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});

useHover(context, {
  safePolygon: true,
});

useFocus(context);
</script>
```

`useHover(context)` opens and closes from pointer movement. `safePolygon: true` protects the pointer path between the trigger and the tooltip. `useFocus(context)` opens the same tooltip for keyboard users.

## Step 3: Render The Tooltip

Render the trigger and tooltip from the same shared state.

```vue
<template>
  <button ref="anchorEl" type="button" aria-describedby="save-tooltip">Save</button>

  <div
    v-if="context.state.open.value"
    id="save-tooltip"
    ref="floatingEl"
    role="tooltip"
    :style="context.position.styles.value"
  >
    Save the current draft without publishing it.
  </div>
</template>
```

Two accessibility details are worth calling out:

- `role="tooltip"` identifies the surface
- `aria-describedby` connects the trigger to the tooltip content

## Why `safePolygon` Shows Up So Often

Once you add `offset(8)`, there is now a visible gap between the trigger and the tooltip. If hover behavior closes immediately on `pointerleave`, the tooltip can disappear while the user is moving naturally toward it.

`safePolygon` solves that by creating a protected pointer corridor between the anchor and the floating element.

## When To Skip `safePolygon`

Skip it when:

- The tooltip never needs pointer interaction
- There is no meaningful gap between anchor and tooltip
- The surface should close the moment the pointer leaves

If you want the full reasoning and tradeoffs, read [Safe Polygon Gotchas](/guide/safe-polygon-gotchas).

## Where To Go Next

- Read [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) if your surface should be click-driven instead.
- Read [Focus Models](/guide/focus-models) if you want to understand the keyboard side in more depth.
- Read [Safe Polygon Gotchas](/guide/safe-polygon-gotchas) if hover behavior still feels sticky or fragile.
