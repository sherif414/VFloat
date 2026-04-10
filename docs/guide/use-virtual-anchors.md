# Use Virtual Anchors

Sometimes there is no real DOM element that should act as the anchor. You may want to position a surface at the cursor, at a saved coordinate, or against a synthetic rectangle such as a text selection.

That is where virtual anchors come in.

This guide covers two practical paths:

- Pointer-driven positioning with [`useClientPoint`](/api/use-client-point)
- Manual virtual anchors passed into [`useFloating`](/api/use-floating)

## When To Reach For A Virtual Anchor

Use a virtual anchor when:

- The surface should appear at a pointer location
- The anchor geometry is computed rather than tied to one element
- You are building a context menu, inspection tool, or selection-based UI

## Path 1: Follow The Pointer

`useClientPoint()` is the easiest entry point when the pointer position should drive the anchor.

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

useClientPoint(context, {
  pointerTarget: trackingArea,
  trackingMode: "follow",
});

useHover(context);
</script>
```

In follow mode, pointer movement updates the virtual anchor and the floating surface keeps tracking while open.

## Path 2: Capture A Static Opening Point

Sometimes you want the surface to open at the pointer location and stay there even if the pointer moves later.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useEscapeKey, useFloating } from "v-float";

const area = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
});

useClientPoint(context, {
  pointerTarget: area,
  trackingMode: "static",
});

useEscapeKey(context);

function openMenu() {
  context.state.setOpen(true);
}
</script>
```

Static mode matters because it prevents the menu from drifting as the pointer moves after open. The coordinate is captured at the opening interaction and held steady.

## Manual Virtual Anchors

If you already have coordinates or a computed rectangle, you do not need `useClientPoint()`. You can pass a manual virtual anchor to `useFloating()`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "v-float";

const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const virtualAnchor = {
  getBoundingClientRect() {
    return {
      x: 160,
      y: 120,
      top: 120,
      left: 160,
      right: 160,
      bottom: 120,
      width: 0,
      height: 0,
      toJSON() {
        return this;
      },
    };
  },
};

const anchorEl = ref(virtualAnchor);

const context = useFloating(anchorEl, floatingEl, {
  open,
});
</script>
```

## Where To Go Next

- Read [Virtual Anchor Gotchas](/guide/virtual-anchor-gotchas) for the sharp edges.
- Read [Placement and Positioning](/guide/placement-and-positioning) if you want a deeper mental model of what VFloat computes around the anchor.
