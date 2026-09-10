---
description: Adds distance between the anchor and floating element.
---

# offset

`offset` adds distance between the anchor element and the floating element. Use it when the surface needs breathing room from its trigger.

## Type

The factory signature and its value shapes:

```ts
function offset(value?: OffsetValue | OffsetFunction): Middleware;

type OffsetValue = number | OffsetOptions;
type OffsetFunction = (args: OffsetFunctionArgs) => OffsetValue;

interface OffsetOptions {
  mainAxis?: number;
  crossAxis?: number;
  alignmentAxis?: number | null;
}

interface OffsetFunctionArgs {
  placement: Placement;
  rects: ElementRects;
  elements: Elements;
}
```

## Options

| Name | Type | Notes |
| --- | --- | --- |
| `mainAxis` | `number` | Distance along the placement direction. A bare number is shorthand for this. |
| `crossAxis` | `number` | Distance perpendicular to the placement direction. |
| `alignmentAxis` | `number \| null` | Overrides cross-axis offset for aligned placements such as `top-start`. |

## Details

A numeric value is shorthand for `mainAxis`. Use an options object when you need separate control over the main axis, cross axis, or alignment axis. Use a function when the offset needs to depend on the current placement or element sizes.

`mainAxis` follows the placement direction, `crossAxis` is perpendicular to it, and `alignmentAxis` overrides the cross-axis offset for aligned placements such as `top-start`.

## Example

Pass `offset` through the declarative `middleware` option on `usePosition`:

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
    offset: 10,
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## See Also

- [`arrow`](/api/arrow) - Keeps the arrow away from the edge
- [`flip`](/api/flip) - Chooses another placement when space is limited
- [`shift`](/api/shift) - Keeps the floating element in view
