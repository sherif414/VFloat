---
description: Connects an arrow element to a floating node.
---

# useArrow

`useArrow` owns arrow registration for a floating node and returns the computed arrow coordinates and styles.

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

## Details

`useArrow` connects an arrow element to the floating node and registers the arrow middleware on that node's middleware registry.

- `node.refs.arrowEl` is the arrow element measured by the middleware. Registration is skipped while it is `null`.
- `offset` defaults to `"-4px"`.
- `padding` is passed to the arrow middleware to keep the arrow away from the floating element's edges.
- `middlewareData` and `placement` are read from the node internals registered by `usePosition()`. `useArrow` works when called before `usePosition`: it resolves the internals lazily and retries on mount.
- `arrowX` and `arrowY` fall back to `0` before middleware data arrives, and `arrowStyles` returns `{}` until then.
- `arrowStyles` uses logical inset properties (`inset-inline-start`, `inset-block-start`, and so on) derived from the resolved placement, so the arrow tracks the side opposite the anchor in both LTR and RTL layouts.
- Registration is removed when the calling effect scope disposes.
- The arrow element still needs its own absolute positioning, since `arrowStyles` only supplies inset offsets.

## Example

This example shows the `useArrow()` form paired with `usePosition`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useArrow, useFloatingNode, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl, arrowEl });
const { styles } = usePosition(node, {
  placement: "top",
  middleware: {
    offset: 8,
  },
});

useHover(node);

const { arrowStyles } = useArrow(node, {
  offset: "-4px",
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">
    Floating content
    <div ref="arrowEl" style="position: absolute" :style="arrowStyles">^</div>
  </div>
</template>
```

## See Also

- [`arrow`](/api/arrow)
- [useFloatingNode](/api/use-floating-node)
- [Keep Content in View](/guide/keep-content-in-view)
