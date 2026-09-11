---
description: Build accessible tooltips with the right interaction and dismissal behavior.
---

# Build Accessible Tooltips

Tooltips are small, but the interaction details matter. A good tooltip opens from the right triggers, stays out of the way, and does not disappear the moment the pointer crosses the gap between the trigger and the surface.

This guide builds an accessible tooltip that works for two user paths:

- A mouse user hovering over the trigger
- A keyboard user tabbing to the trigger

## The complete example

Here is the full working tooltip before we disassemble each part:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useFocus, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, {
  placement: "top",
  middlewares: {
    offset: 8,
  },
});

useHover(context, {
  safePolygon: true,
});

useFocus(context);
</script>

<template>
  <button ref="anchorEl" type="button" aria-describedby="save-tooltip">Save draft</button>

  <div v-if="context.open.value" id="save-tooltip" ref="floatingEl" role="tooltip" :style="styles">
    Save the current draft without publishing it.
  </div>
</template>
```

## Pointer and keyboard triggers

```ts
useHover(context, {
  safePolygon: true,
});

useFocus(context);
```

Two composables share the same `context`:

- **[`useHover`](/api/use-hover)** opens the tooltip on pointer enter and closes it on pointer leave. Setting `safePolygon: true` keeps the tooltip open while the pointer travels across the 8-pixel gap toward the tooltip content.
- **[`useFocus`](/api/use-focus)** opens the tooltip when a keyboard user tabs to the button, respecting `:focus-visible` so mouse clicks do not spuriously re-trigger focus tooltips.

Because both composables update the same `context.open` state, pointer and keyboard interactions never fight each other.

## Why `safePolygon` matters

Once you add `middlewares: { offset: 8 }`, there is a visible gap between the trigger and the tooltip. If hover closes immediately on `pointerleave`, the tooltip disappears while the pointer is still traveling naturally toward it.

`safePolygon: true` computes a triangular or rectangular corridor connecting the cursor's exit position with the bounds of the floating panel. As long as the cursor moves through that corridor toward the tooltip, the surface stays open.

## When to skip `safePolygon`

Skip `safePolygon` when:

- The tooltip content contains no interactive elements and does not need to be selectable
- There is no gap between the anchor and the floating panel
- The surface should close the instant the cursor leaves the trigger boundary

For deeper tuning options like `buffer` and `requireIntent`, read [Safe Polygon Gotchas](/guide/safe-polygon-gotchas).

## Semantic template bindings

```vue
<button ref="anchorEl" type="button" aria-describedby="save-tooltip">Save draft</button>

<div v-if="context.open.value" id="save-tooltip" ref="floatingEl" role="tooltip" :style="styles">
  Save the current draft without publishing it.
</div>
```

Two accessibility attributes ensure screen readers understand the relationship:

- `role="tooltip"` identifies the floating panel as an accessible description.
- `aria-describedby="save-tooltip"` on the anchor associates the trigger with the tooltip's `id`. When a screen reader focuses the button, it automatically announces the tooltip content.

## Where to go next

- Read [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) if your surface should be click-driven instead.
- Read [Focus Models](/guide/focus-models) to explore keyboard focus patterns in greater depth.
- Read [Safe Polygon Gotchas](/guide/safe-polygon-gotchas) to tune or debug cursor corridors.
