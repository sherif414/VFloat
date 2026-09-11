---
description: Calculates offsets to align an arrow element with the anchor.
---

# arrow

`arrow` calculates the horizontal or vertical offset required to keep an arrow element aligned with the anchor while staying within the floating panel's bounds.

In most applications, prefer [`useArrow`](/api/use-arrow), which automates element measurement, middleware registration, and CSS inset style generation. Use this low-level middleware when building custom positioning pipelines.

## Type

```ts
function arrow(options: ArrowMiddlewareOptions): Middleware;

interface ArrowMiddlewareOptions {
  element: Ref<HTMLElement | null>;
  padding?: Padding;
}

interface ArrowData {
  x?: number;
  y?: number;
  centerOffset: number;
  alignmentOffset?: number;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `element` | `Ref<HTMLElement \| null>` | Required | Vue ref holding the arrow DOM element to measure. |
| `padding` | `Padding` | `0` | Minimum clearance keeping the arrow away from the floating element's rounded corners. |

## Returns

`arrow` returns a `Middleware` object with `name: "arrow"`. It writes calculated coordinates to `middlewareData.value.arrow`:

| Field | Type | Notes |
| --- | --- | --- |
| `x` | `number \| undefined` | Horizontal offset in pixels for top and bottom placements. |
| `y` | `number \| undefined` | Vertical offset in pixels for left and right placements. |
| `centerOffset` | `number` | Distance in pixels from the arrow center to the anchor center. |
| `alignmentOffset` | `number \| undefined` | Offset relative to alignment edges. |

## Details

### Pipeline Placement

`arrow` must run **near the end of the pipeline**, specifically **after `shift`**:

1. `flip` and `shift` determine where the panel sits on screen.
2. If `arrow` ran before `shift`, shifting the panel sideways would leave the arrow misaligned with the anchor.
3. Running `arrow` after `shift` ensures the arrow offset can adapt to the panel's shifted position.

## Example

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { arrow, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl, arrowEl });
const { styles, middlewareData, placement } = usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
    arrow: { element: arrowEl, padding: 4 },
  },
});

const arrowStyle = computed(() => {
  const data = middlewareData.value.arrow;
  if (!data) return {};

  const side = placement.value.split("-")[0];
  const staticSide = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  }[side]!;

  return {
    left: data.x != null ? `${data.x}px` : "",
    top: data.y != null ? `${data.y}px` : "",
    [staticSide]: "-4px",
  };
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="node.open" ref="floatingEl" class="panel" :style="styles">
    Tooltip panel
    <div ref="arrowEl" class="arrow" :style="arrowStyle" />
  </div>
</template>

<style scoped>
.panel {
  position: relative;
  background: black;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
}
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: black;
  transform: rotate(45deg);
}
</style>
```

## See Also

- [`useArrow`](/api/use-arrow) - High-level composable that generates ready-to-bind arrow styles
- [`usePosition`](/api/use-position) - Positioning engine
- [`shift`](/api/shift) - Viewport containment middleware
