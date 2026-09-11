---
description: Connects an arrow element to a floating node and computes inset styles.
---

# useArrow

`useArrow` connects an arrow element to a floating node, registers arrow positioning into the node's middleware pipeline, and computes logical inset styles for the arrow.

Use `useArrow` instead of the low-level [`arrow`](/api/arrow) middleware when you want automated middleware registration, LTR/RTL-aware side placement, and scope cleanup.

## Type

```ts
function useArrow(node: UseArrowContext, options?: UseArrowOptions): UseArrowReturn;

interface UseArrowContext {
  id: FloatingNodeId;
  refs: FloatingNode["refs"];
}

interface UseArrowOptions {
  offset?: string;
  padding?: Padding;
}

interface UseArrowReturn {
  arrowX: ComputedRef<number>;
  arrowY: ComputedRef<number>;
  arrowStyles: ComputedRef<Record<string, string>>;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `offset` | `string` | `"-4px"` | Gap or overlap between the arrow tip and the floating element edge. |
| `padding` | `Padding` | `0` | Minimum clearance keeping the arrow away from the floating element corners. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `arrowX` | `ComputedRef<number>` | Computed horizontal position in pixels. Falls back to `0` before positioning runs. |
| `arrowY` | `ComputedRef<number>` | Computed vertical position in pixels. Falls back to `0` before positioning runs. |
| `arrowStyles` | `ComputedRef<Record<string, string>>` | Computed CSS style object with logical insets (`top`, `bottom`, `left`, `right`). Empty `{}` before positioned. |

## Details

### Automatic Middleware Registration

When called, `useArrow` inspects the node's internal middleware registry provided by [`usePosition`](/api/use-position) and automatically adds the arrow middleware. It works regardless of whether `useArrow` is declared before or after `usePosition` in your setup script.

The registration is automatically cleaned up when the calling component unmounts.

### Arrow Element Binding

`useArrow` measures the element stored in `node.refs.arrowEl`. Bind `ref="arrowEl"` to the arrow tag in your template and pass it into `useFloatingNode({ anchorEl, floatingEl, arrowEl })`.

### Styling the Arrow

`arrowStyles` outputs the placement-specific coordinates (such as `top: -4px` and `left: 42px`). Your CSS must provide baseline styling:

```css
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: rotate(45deg);
}
```

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useArrow, useFloatingNode, useHover, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl, arrowEl });
const { styles, placement } = usePosition(node, {
  placement: "top",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 6 },
  },
});

const { arrowStyles } = useArrow(node, {
  offset: "-4px",
  padding: 6,
});

useHover(node);
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div
    v-if="node.open"
    ref="floatingEl"
    class="tooltip"
    :style="styles"
    :data-placement="placement"
  >
    <span>Tooltip message</span>
    <div ref="arrowEl" class="tooltip-arrow" :style="arrowStyles" />
  </div>
</template>

<style scoped>
.tooltip {
  position: relative;
  background: #222;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #222;
  transform: rotate(45deg);
}
</style>
```

## See Also

- [`arrow`](/api/arrow) - Low-level Floating UI arrow middleware
- [`usePosition`](/api/use-position) - Coordinates and positioning engine
- [`useFloatingNode`](/api/use-floating-node) - Shared element refs container
- [Keep Content in View](/guide/keep-content-in-view) - Middleware and alignment guide
