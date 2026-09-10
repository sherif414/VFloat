---
description: Keeps the floating element within the available viewport space.
---

# shift

`shift` nudges the floating element back into view after placement has been chosen. Use it when you want to preserve the chosen placement and only adjust coordinates enough to stay visible.

## Type

The factory signature and its options shape:

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

| Name | Type | Notes |
| --- | --- | --- |
| `mainAxis` | `boolean` | Allows shifting on the main axis. |
| `crossAxis` | `boolean` | Allows shifting on the cross axis. |
| `limiter` | `{ fn, options? }` | Constrains shift movement. |
| `padding` | `Padding` | Inset from the clipping edge. |
| `boundary` | `Boundary` | Clipping boundary. |
| `rootBoundary` | `RootBoundary` | Root clipping boundary. |
| `elementContext` | `ElementContext` | Element the boundary applies to. |
| `altBoundary` | `boolean` | Uses the alternate boundary. |

## Details

`shift` is the right choice when you want to preserve the chosen placement and only adjust the coordinates enough to keep the floating element visible. It can shift on the main axis, the cross axis, or both.

Use it together with `flip()` when you want a stable preferred placement plus a fallback if that placement cannot fit.

## Example

Pass `shift` through the declarative `middleware` option on `usePosition`:

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
    shift: { padding: 8, crossAxis: true },
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## See Also

- [`flip`](/api/flip) - Chooses another placement when the preferred one overflows
- [`offset`](/api/offset) - Adds spacing before shifting
- [`size`](/api/size) - Adjusts the floating element to the available space
