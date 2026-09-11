---
description: Adds distance between the anchor and the floating element along axes.
---

# offset

`offset` adds space between the anchor and the floating element. Use it to create a gap along the main axis, nudge the element along the cross axis, or apply dynamic offsets based on placement.

## Type

```ts
function offset(options?: OffsetOptions): Middleware;

type OffsetOptions =
  | number
  | {
      mainAxis?: number;
      crossAxis?: number;
      alignmentAxis?: number | null;
    }
  | ((state: MiddlewareArguments) => OffsetOptions);
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `mainAxis` | `number` | `0` | Distance in pixels along the placement direction (e.g. gap below anchor for `placement: "bottom"`). |
| `crossAxis` | `number` | `0` | Distance in pixels perpendicular to the placement direction. |
| `alignmentAxis` | `number \| null` | `null` | Distance along the alignment axis for aligned placements (such as `"top-start"`). |

You can also pass a plain `number` directly (e.g. `offset(8)` or `middlewares: { offset: 8 }`), which assigns the value to `mainAxis`.

## Returns

`offset` returns a `Middleware` object with `name: "offset"`. It does not write to `middlewareData`.

## Details

### Pipeline Placement

`offset` should run **first** in your middleware pipeline (or immediately after `inline`). Running `offset` before `flip` and `shift` ensures that collision detection algorithms evaluate the panel's boundary including its spacing gap. If `flip` runs before `offset`, the panel might flip prematurely or collide with the viewport edge.

When using the declarative `middlewares` object in [`usePosition`](/api/use-position), VFloat automatically orders `offset` before `flip` and `shift`.

## Example

### Declarative Usage (Recommended)

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
    shift: { padding: 8 },
  },
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div v-if="node.open" ref="floatingEl" :style="styles">8px offset panel</div>
</template>
```

### Multi-Axis Offset Object

```ts
usePosition(node, {
  placement: "right-start",
  middlewares: {
    offset: { mainAxis: 12, crossAxis: -4 },
  },
});
```

## See Also

- [`usePosition`](/api/use-position) - Positioning engine and declarative middleware configuration
- [`flip`](/api/flip) - Fallback placements when space is constrained
- [`shift`](/api/shift) - Viewport containment
- [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) - Why pipeline order matters
