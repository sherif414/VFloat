---
description: Switches to alternative placements when the current side is blocked.
---

# flip

`flip` switches to alternative placements when the preferred placement does not fit in the viewport. Use it to start from a preferred side (such as `"bottom"`) and only move elsewhere if that side overflows.

## Type

```ts
function flip(options?: FlipOptions): Middleware;

interface FlipOptions {
  mainAxis?: boolean;
  crossAxis?: boolean | "alignment";
  fallbackAxisSideDirection?: "none" | "start" | "end";
  flipAlignment?: boolean;
  fallbackPlacements?: Array<Placement>;
  fallbackStrategy?: "bestFit" | "initialPlacement";
  padding?: Padding;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  elementContext?: ElementContext;
  altBoundary?: boolean;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `mainAxis` | `boolean` | `true` | Allows flipping to the opposite side along the main axis (e.g. `"bottom"` &rarr; `"top"`). |
| `crossAxis` | `boolean \| "alignment"` | `true` | Allows flipping along the cross axis when both main axis sides overflow. |
| `fallbackAxisSideDirection` | `"none" \| "start" \| "end"` | `"none"` | Which side to try when flipping along the cross axis. |
| `flipAlignment` | `boolean` | `true` | Flips alignment (e.g. `"bottom-start"` &rarr; `"bottom-end"`) when side alignment overflows. |
| `fallbackPlacements` | `Array<Placement>` | Opposite side | Explicit ordered list of placements to try before giving up. |
| `fallbackStrategy` | `"bestFit" \| "initialPlacement"` | `"bestFit"` | Strategy when all placements overflow: pick the best fit, or reset to preferred. |
| `padding` | `Padding` | `0` | Minimum clearance from the clipping boundary. |
| `boundary` | `Boundary` | `"clippingAncestors"` | Clipping boundary element or rect. |

## Returns

`flip` returns a `Middleware` object with `name: "flip"`. It populates `middlewareData.value.flip` with internal overflow metrics.

## Details

### Pipeline Placement

`flip` runs **after `offset` and before `shift`**:

1. `offset`: Adds required spacing.
2. `flip`: Checks if the panel + offset fits on the preferred side. If not, flips to an alternative placement.
3. `shift`: Once the best placement side is determined, shifts the panel along the edge to prevent clipping.

If `shift` runs before `flip`, shifting might slide the panel into an awkward corner and prevent `flip` from triggering properly.

### Mutually Exclusive with `autoPlacement`

`flip` and [`autoPlacement`](/api/autoplacement) solve opposite goals:

- Use `flip` when you have a **preferred placement** and only want to move if it overflows.
- Use `autoPlacement` when you have **no preference** and want the system to choose whichever side has the most space.
- Do not enable both simultaneously.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles, placement } = usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: {
      fallbackPlacements: ["top-start", "right-start", "left-start"],
      padding: 8,
    },
    shift: { padding: 8 },
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div v-if="node.open" ref="floatingEl" :style="styles" :data-placement="placement">
    Flipping floating panel
  </div>
</template>
```

## See Also

- [`autoPlacement`](/api/autoplacement) - Alternative that automatically picks the largest side
- [`shift`](/api/shift) - Nudges the floating element to keep it inside the boundary
- [`offset`](/api/offset) - Adds spacing before flip checks run
- [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) - Detailed ordering rules
