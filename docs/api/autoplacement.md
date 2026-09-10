---
description: Chooses a placement that fits the available space.
---

# autoPlacement

`autoPlacement` chooses the best placement from the available space so the floating element stays in view. Use it when the best side matters more than a preferred side.

## Type

The factory signature and its options shape:

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

| Name | Type | Notes |
| --- | --- | --- |
| `crossAxis` | `boolean` | Evaluates cross-axis placements. |
| `alignment` | `"start" \| "end" \| null` | Required alignment. |
| `autoAlignment` | `boolean` | Chooses alignment automatically. |
| `allowedPlacements` | `Array<Placement>` | Limits the placements to choose from. |
| `boundary` | `Boundary` | Clipping boundary. |
| `rootBoundary` | `RootBoundary` | Root clipping boundary. |
| `elementContext` | `ElementContext` | Element the boundary applies to. |
| `altBoundary` | `boolean` | Uses the alternate boundary. |
| `padding` | `Padding` | Inset from the clipping edge. |

## Details

Use `autoPlacement` when the best side matters more than a preferred side. It can evaluate cross-axis placements, respect alignment, and limit the placements it is allowed to choose from.

If you want to keep a preferred placement and only fall back when needed, `flip()` is usually the better fit.

## Example

Add `autoPlacement` through `middleware.custom` with a limited placement list:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { autoPlacement, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const node = useFloatingNode({ anchorEl, floatingEl, open });
const { styles } = usePosition(node, {
  middleware: {
    custom: [
      autoPlacement({
        allowedPlacements: ["top", "bottom"],
      }),
    ],
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## See Also

- [`flip`](/api/flip) - Keeps a preferred placement and falls back when needed
- [`shift`](/api/shift) - Nudges the floating element back into view
- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
