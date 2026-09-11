---
description: Chooses the placement with the greatest available space.
---

# autoPlacement

`autoPlacement` evaluates available space on all sides of the anchor and selects the placement that fits best. Use it when you have no preferred placement and want the element to dynamically occupy whichever side has the most clearance.

## Type

```ts
function autoPlacement(options?: AutoPlacementOptions): Middleware;

interface AutoPlacementOptions {
  crossAxis?: boolean;
  alignment?: "start" | "end" | null;
  autoAlignment?: boolean;
  allowedPlacements?: Array<Placement>;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  elementContext?: ElementContext;
  altBoundary?: boolean;
  padding?: Padding;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `crossAxis` | `boolean` | `false` | When `true`, evaluates perpendicular placements if primary axis sides are blocked. |
| `alignment` | `"start" \| "end" \| null` | `null` | Constrains choices to a fixed alignment (e.g. only `"top-start"`, `"bottom-start"`). |
| `autoAlignment` | `boolean` | `true` | When `true`, automatically flips alignment to find the best fit. |
| `allowedPlacements` | `Array<Placement>` | All placements | Limits the candidate placements evaluated. |
| `padding` | `Padding` | `0` | Minimum clearance inset from clipping boundaries. |
| `boundary` | `Boundary` | `"clippingAncestors"` | Element or rect defining the clipping area. |

## Returns

`autoPlacement` returns a `Middleware` object with `name: "autoPlacement"`. It stores internal overflow metrics in `middlewareData.value.autoPlacement`.

## Details

### Pipeline Placement

`autoPlacement` is an alternative to [`flip`](/api/flip) and should be placed at the same pipeline step: after `offset` and before `shift`.

When configuring through `usePosition(node, { middlewares: { autoPlacement: ... } })`, VFloat positions it automatically.

### Choosing Between `autoPlacement` and `flip`

- Use **`flip`** when you want predictability: you prefer `"bottom"`, and only accept `"top"` as a fallback when bottom overflows.
- Use **`autoPlacement`** when there is no design preference and you always want whichever side has the most room.
- **Do not enable both.** Both middlewares attempt to choose the base placement side and will conflict.

## Example

### Declarative Usage in `usePosition`

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles, placement } = usePosition(node, {
  middlewares: {
    offset: 8,
    autoPlacement: {
      allowedPlacements: ["top", "bottom"],
      padding: 8,
    },
    shift: { padding: 8 },
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div v-if="node.open" ref="floatingEl" :style="styles" :data-placement="placement">
    Automatically placed on whichever side fits best
  </div>
</template>
```

## See Also

- [`flip`](/api/flip) - Fallback to alternative placements from a preferred starting side
- [`shift`](/api/shift) - Adjusts coordinates to stay inside boundaries
- [`offset`](/api/offset) - Distance between anchor and floating element
- [Keep Content in View](/guide/keep-content-in-view) - Boundary and placement workflows
