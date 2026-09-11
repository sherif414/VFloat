---
description: Keeps the floating element within the available viewport boundary.
---

# shift

`shift` nudges the floating element along its placement axis to keep it visible inside the boundary. Use it to preserve the chosen placement while adjusting coordinates to prevent clipping against viewport edges.

## Type

```ts
function shift(options?: ShiftOptions): Middleware;

interface ShiftOptions {
  mainAxis?: boolean;
  crossAxis?: boolean;
  limiter?: {
    fn: (state: MiddlewareState) => Coords;
    options?: unknown;
  };
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
| `mainAxis` | `boolean` | `true` | Allows shifting along the placement's cross-direction to prevent clipping against side edges. |
| `crossAxis` | `boolean` | `false` | Allows shifting along the placement direction (e.g. moving closer to or further from the anchor). |
| `limiter` | `{ fn, options? }` | `undefined` | Constrains shifting so the panel never slides beyond the anchor edge (e.g. `limitShift()`). |
| `padding` | `Padding` | `0` | Inset padding from the clipping viewport boundary. |
| `boundary` | `Boundary` | `"clippingAncestors"` | Clipping boundary element or rect. |
| `rootBoundary` | `RootBoundary` | `"viewport"` | Root boundary context (`"viewport"` or `"document"`). |
| `altBoundary` | `boolean` | `false` | When `true`, checks boundaries of the floating element instead of the anchor. |

## Returns

`shift` returns a `Middleware` object with `name: "shift"`. It writes `{ x: number, y: number }` adjustments to `middlewareData.value.shift`.

## Details

### Pipeline Placement

`shift` runs **after `flip`**:

1. `offset` creates separation.
2. `flip` picks the placement side with adequate room.
3. `shift` adjusts coordinates within that side to prevent the floating panel from overflowing the viewport boundaries.

Running `shift` after `flip` ensures that your surface only slides sideways after confirming that the current side fits.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 12, crossAxis: false },
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div v-if="node.open" ref="floatingEl" :style="styles">
    Shifted floating content stays within viewport padding
  </div>
</template>
```

## See Also

- [`flip`](/api/flip) - Chooses alternate placements when space is constrained
- [`offset`](/api/offset) - Adds spacing before shift checks run
- [`size`](/api/size) - Resizes the floating element when shifting is insufficient
- [Keep Content in View](/guide/keep-content-in-view) - Guide to collision and viewport management
