---
description: Measures available space so the floating element can size itself.
---

# size

`size` provides the available width and height around the floating element so you can resize it to fit the current boundary. Use it for menus and popovers that must stay inside the viewport.

## Type

The factory signature and its state shapes:

```ts
function size(options?: SizeOptions): Middleware;

interface SizeOptions {
  apply?: (state: SizeState) => void;
  padding?: Padding;
  boundary?: Boundary;
  rootBoundary?: RootBoundary;
  elementContext?: ElementContext;
  altBoundary?: boolean;
}

interface SizeState {
  availableWidth: number;
  availableHeight: number;
  rects: MiddlewareState["rects"];
  elements: {
    floating: HTMLElement;
    reference: Element | VirtualElement;
  };
}
```

## Options

| Name | Type | Notes |
| --- | --- | --- |
| `apply` | `(state: SizeState) => void` | Writes styles such as `maxWidth` or `maxHeight`. Nothing resizes on its own. |
| `padding` | `Padding` | Inset from the clipping edge. |
| `boundary` | `Boundary` | Clipping boundary. |
| `rootBoundary` | `RootBoundary` | Root clipping boundary. |
| `elementContext` | `ElementContext` | Element the boundary applies to. |
| `altBoundary` | `boolean` | Uses the alternate boundary. |

## Details

`size` does not resize anything on its own. Use the `apply` callback to write styles such as `maxWidth`, `maxHeight`, or a matched reference width.

This middleware is useful for menus, popovers, and other surfaces that need to stay inside the viewport without overflowing.

When you only need the floating element to match the anchor width, prefer the `matchWidth` shortcut in [`usePosition`](/api/use-position) over writing this middleware by hand.

## Example

Add `size` through `middlewares.custom` when you need full control over the applied styles:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { size, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const node = useFloatingNode({ anchorEl, floatingEl, open });
const { styles } = usePosition(node, {
  middlewares: {
    custom: [
      size({
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${availableWidth}px`,
            maxHeight: `${availableHeight}px`,
          });
        },
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

- [`shift`](/api/shift) - Keeps the floating element in view
- [`flip`](/api/flip) - Chooses another placement when room is tight
