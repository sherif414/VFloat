---
description: Positions the floating element relative to multi-line inline anchors.
---

# inline

`inline` positions the floating element relative to individual client rects for multi-line inline anchors (such as wrapped links or marked text spans). Use it when the anchor wraps across multiple lines.

## Type

```ts
function inline(options?: InlineOptions): Middleware;

interface InlineOptions {
  padding?: Padding;
  x?: number;
  y?: number;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `padding` | `Padding` | `0` | Boundary padding around the individual line rects. |
| `x` | `number` | `undefined` | Cursor or reference X coordinate used to pick the active line rect. |
| `y` | `number` | `undefined` | Cursor or reference Y coordinate used to pick the active line rect. |

## Returns

`inline` returns a `Middleware` object with `name: "inline"`.

## Details

### The Multi-Line Rect Problem

By default, the browser measures an element's bounding box (`getBoundingClientRect()`). For a wrapped multi-line link, the bounding box encompasses the full span from the top-left of the first line to the bottom-right of the last line, including empty space. As a result, a tooltip might position itself far away from where the user hovered.

`inline` calls `getClientRects()` to inspect each line fragment individually. It adjusts the reference geometry to match only the line segment under the pointer.

### Pipeline Placement

`inline` must run **first in the pipeline**—even before `offset`—because it determines the initial reference rectangle that all subsequent middlewares measure against.

In [`usePosition`](/api/use-position), declaring `middlewares: { inline: true }` guarantees that `inline` runs at the very start of the pipeline.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useHover, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "top",
  middlewares: {
    inline: true,
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});

useHover(node);
</script>

<template>
  <p>
    Here is some introductory text with
    <a ref="anchorEl" href="#">a long wrapping inline link that crosses onto the next line</a>
    inside a paragraph.
  </p>

  <div v-if="node.open" ref="floatingEl" class="tooltip" :style="styles">
    Anchored to the specific active line
  </div>
</template>

<style scoped>
.tooltip {
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}
</style>
```

## See Also

- [`usePosition`](/api/use-position) - Positioning composable and declarative configuration
- [`offset`](/api/offset) - Distance between anchor and floating element
- [`shift`](/api/shift) - Viewport containment
