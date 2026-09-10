---
description: Switches to another placement when the current side is blocked.
---

# flip

`flip` switches to alternative placements when the preferred placement does not fit. Use it when you want to start from one placement and only move elsewhere if that side overflows.

## Type

The factory signature and its options shape:

```ts
function flip(options?: FlipOptions): Middleware;

interface FlipOptions {
  mainAxis?: boolean;
  crossAxis?: boolean | "alignment";
  fallbackAxisSideDirection?: "none" | "start" | "end";
  flipAlignment?: boolean;
  fallbackPlacements?: Array<Placement>;
  fallbackStrategy?: "bestFit" | "initialPlacement";
}
```

## Options

| Name | Type | Notes |
| --- | --- | --- |
| `mainAxis` | `boolean` | Allows flipping on the main axis. |
| `crossAxis` | `boolean \| "alignment"` | Allows flipping on the cross axis or alignment. |
| `fallbackAxisSideDirection` | `"none" \| "start" \| "end"` | Direction for fallback axis sides. |
| `flipAlignment` | `boolean` | Flips the alignment when placement flips. |
| `fallbackPlacements` | `Array<Placement>` | Custom fallback list to try in order. |
| `fallbackStrategy` | `"bestFit" \| "initialPlacement"` | Chooses best fit or keeps the initial placement. |

## Details

`flip` is the common choice when you want to start from a preferred placement and only move elsewhere if that placement overflows. It can also flip alignment, try a custom fallback list, or choose between a best-fit and initial-placement strategy.

## Example

Pass `flip` through the declarative `middleware` option on `usePosition`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const node = useFloatingNode({ anchorEl, floatingEl, open });
const { styles } = usePosition(node, {
  middleware: {
    flip: {
      fallbackPlacements: ["top", "right", "bottom"],
    },
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## See Also

- [`autoPlacement`](/api/autoplacement) - Picks the best placement automatically
- [`shift`](/api/shift) - Keeps the floating element inside the clipping area
- [`offset`](/api/offset) - Adds spacing before flip logic runs
