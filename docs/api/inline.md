---
description: Positions the floating element relative to multi-line inline anchors.
---

# inline

`inline` positions the floating element relative to individual client rects so it stays aligned with multi-line inline anchors such as wrapped links. Use it when the anchor wraps across lines.

## Type

The factory signature and its options shape:

```ts
function inline(options?: InlineOptions): Middleware;

interface InlineOptions {
  padding?: Padding;
  x?: number;
  y?: number;
}
```

## Options

| Name | Type | Notes |
| --- | --- | --- |
| `padding` | `Padding` | Inset from the line rect. |
| `x` | `number` | X offset within the rect. |
| `y` | `number` | Y offset within the rect. |

## Details

Without `inline`, an anchor that wraps across lines is measured as one bounding box and the floating element can detach from the line the pointer is actually over. `inline` measures each client rect instead, so the placement tracks the current line.

In most cases you do not need this middleware directly. Pass `middleware: { inline: true }` (or an options object) to [`usePosition`](/api/use-position) and the declarative entry is added for you.

## Example

Declare `inline` through `usePosition` instead of composing it by hand:

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
    inline: { padding: 4 },
  },
});
</script>

<template>
  <a ref="anchorEl" href="#">A long wrapping link</a>

  <div v-if="node.open" ref="floatingEl" :style="styles">Floating content</div>
</template>
```

## See Also

- [`usePosition`](/api/use-position) - Declares `inline` through `middleware.inline`
- [`offset`](/api/offset) - Adds spacing between the anchor and floating element
- [`shift`](/api/shift) - Keeps the floating element in view
