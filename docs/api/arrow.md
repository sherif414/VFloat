---
description: Positions the arrow so it stays aligned with the reference element.
---

# arrow

`arrow` positions an arrow element so it points toward the anchor element and exposes the resulting coordinates through the node middleware data. Use it when the floating panel needs a visual pointer.

## Type

The factory signature and its data shapes:

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
}
```

## Options

| Name | Type | Notes |
| --- | --- | --- |
| `element` | `Ref<HTMLElement \| null>` | Arrow element ref. When `null`, the middleware returns no data. |
| `padding` | `Padding` | Keeps the arrow away from the floating edges. |

## Details

`arrow` is a thin wrapper around Floating UI's arrow middleware. Pass the arrow element ref through `element`, and use `padding` to keep the arrow away from the edges of the floating element. When `element` is `null`, the middleware returns no data instead of measuring.

The middleware writes its result to `middlewareData.value.arrow`. That data is usually consumed by `useArrow()`, or by a small computed style object when you want to place the arrow manually. Prefer `useArrow()` when you want registration, RTL-aware inset styles, and scope cleanup handled for you.

## Example

Compose `arrow` through `middlewares.custom` and read its data for manual styles:

  ```vue
  <script setup lang="ts">
  import { computed, ref } from "vue";
  import { arrow, useFloatingNode, usePosition } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);
  const arrowEl = ref<HTMLElement | null>(null);
  const open = ref(true);

  const node = useFloatingNode({ anchorEl, floatingEl, open });
  const { middlewareData, styles } = usePosition(node, {
    placement: "top",
    middlewares: {
      offset: 8,
      custom: [arrow({ element: arrowEl, padding: 8 })],
    },
  });

  const arrowStyles = computed(() => {
    const data = middlewareData.value.arrow;
    const nextStyles: Record<string, string> = {};

    if (!data) return nextStyles;
    if (data.x != null) nextStyles.left = `${data.x}px`;
    if (data.y != null) nextStyles.top = `${data.y}px`;

    return nextStyles;
  });
  </script>

  <template>
    <button ref="anchorEl">Anchor</button>

    <div v-if="node.open" ref="floatingEl" :style="styles">
      <div ref="arrowEl" style="position: absolute" :style="arrowStyles">^</div>
      Floating content
    </div>
  </template>
  ```

## See Also

- [`useArrow`](/api/use-arrow) - Registers and styles the arrow element from the floating node
- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [`offset`](/api/offset) - Adds spacing between the anchor and floating element
