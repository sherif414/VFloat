---
description: Build accessible tooltips with the right interaction and dismissal behavior.
---

# Build Accessible Tooltips

Let's build a tooltip that feels natural for both pointer and keyboard users.

Tooltips are small, but the interaction details matter. A good tooltip opens from the right triggers, stays out of the way, and does not disappear the moment the pointer crosses the gap between the trigger and the surface.

This guide uses the same core VFloat shape you saw on the first tooltip page, then adds the pieces that make it accessible:

- Hover opens it for pointer users
- Focus opens it for keyboard users
- `offset` creates a visible gap
- `safePolygon` keeps it open when the pointer crosses that gap

## The Goal

We want one tooltip that works for two real user paths:

- A mouse user hovers the trigger
- A keyboard user tabs to the trigger

That usually means [`useFloating`](/api/use-floating), [`useHover`](/api/use-hover), [`useFocus`](/api/use-focus), and [`offset`](/api/offset).

## Step 1: Build The Shared Context

Start by wiring the anchor, floating element, and placement.

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

## Why `safePolygon` Matters

Once you add `offset(8)`, there is a visible gap between the trigger and the tooltip. If hover closes immediately on `pointerleave`, the tooltip can disappear while the pointer is still moving naturally toward it.

`safePolygon` protects that path between the anchor and the floating element.

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
