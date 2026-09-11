---
description: Position floating content from pointer coordinates or other virtual anchors.
---

# Use Virtual Anchors

Sometimes there is no real DOM element that should act as the anchor. You may want to position a surface at the cursor, at a saved coordinate, or against a synthetic rectangle such as a text selection.

That is where virtual anchors come in.

This guide covers two practical paths:

- Pointer-driven positioning with [`useClientPoint`](/api/use-client-point)
- Manual virtual anchors passed into [`useFloatingNode`](/api/use-floating-node)

## When to use a virtual anchor

Use a virtual anchor when:

- The surface should appear at a pointer location
- The anchor geometry is computed rather than tied to one DOM element
- You are building a context menu, inspection tool, or selection-based UI

## Follow the pointer

Point `trackingAreaEl` at the container element that listens for pointer movement. `useClientPoint` replaces the node's anchor with a virtual element that tracks the cursor, so the initial `anchorEl` passed to `useFloatingNode` acts as a placeholder until tracking starts:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useFloatingNode, useHover, usePosition } from "v-float";

const trackingAreaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, {
  placement: "right-start",
});

useClientPoint(context, {
  trackingAreaEl,
  trackingMode: "follow",
});

useHover(context);
</script>

<template>
  <div ref="trackingAreaEl" class="interactive-canvas">
    Hover anywhere in this area to inspect coordinates.

    <div v-if="context.open.value" ref="floatingEl" class="cursor-tooltip" :style="styles">
      Cursor inspection panel
    </div>
  </div>
</template>
```

In `"follow"` mode, pointer movement continuously updates the virtual anchor and the floating surface tracks the cursor position while open.

## Keep the opening point static

For context menus and right-click inspectors, you want the surface to open at the pointer's location at click time and remain fixed there even if the pointer moves afterward:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useDismiss, useFloatingNode, usePosition } from "v-float";

const areaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, {
  placement: "bottom-start",
});

useClientPoint(context, {
  trackingAreaEl: areaEl,
  trackingMode: "static",
});

useDismiss(context);

function onContextMenu(e: MouseEvent) {
  e.preventDefault();
  context.setOpen(true);
}
</script>

<template>
  <div ref="areaEl" class="context-zone" @contextmenu="onContextMenu">
    Right click inside this container.

    <div v-if="context.open.value" ref="floatingEl" class="context-menu" :style="styles">
      <ul>
        <li>Inspect element</li>
        <li>Copy link</li>
        <li>Reload</li>
      </ul>
    </div>
  </div>
</template>
```

Static mode captures coordinates at the triggering interaction and holds them steady, preventing the menu from drifting across the screen as the user moves toward menu items.

## Manual virtual anchors

If you already have coordinates or a computed bounding box (such as a browser `Selection.getRangeAt(0)`), you do not need `useClientPoint()`. You can pass a manual `VirtualElement` object directly as `anchorEl`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { type VirtualElement, useFloatingNode, usePosition } from "v-float";

const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const virtualAnchor: VirtualElement = {
  getBoundingClientRect() {
    return new DOMRect(160, 120, 0, 0);
  },
};

const anchorEl = ref(virtualAnchor);

const context = useFloatingNode({ anchorEl, floatingEl, open });
const { styles } = usePosition(context);
</script>

<template>
  <div v-if="context.open.value" ref="floatingEl" class="fixed-floating" :style="styles">
    Anchored to coordinates (160, 120)
  </div>
</template>
```

## Where to go next

- Read [Virtual Anchor Gotchas](/guide/virtual-anchor-gotchas) for common pitfalls with tracking modes and synthetic events.
- Read [Placement and Positioning](/guide/placement-and-positioning) for the geometry model behind virtual anchors.
