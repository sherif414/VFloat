---
description: Opens and closes floating content on hover.
---

# useHover

`useHover` opens and closes a floating node when the pointer enters or leaves the anchor or floating element.

## Type

```ts
function useHover(node: FloatingNode, options?: UseHoverOptions): void;

interface UseHoverOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: FloatingTree | null | undefined;
  delay?: MaybeRefOrGetter<number | { open?: number; close?: number }>;
  restMs?: MaybeRefOrGetter<number>;
  mouseOnly?: MaybeRefOrGetter<boolean>;
  safePolygon?: MaybeRefOrGetter<boolean | SafePolygonOptions>;
  ignorePointerLeave?: (target: EventTarget | null) => boolean;
}

interface SafePolygonOptions {
  buffer?: number;
  requireIntent?: boolean;
  onPolygonChange?: (polygon: Polygon) => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Gates all hover listeners. |
| `tree` | `FloatingTree \| null \| undefined` | — | Family-aware leave checks for nested surfaces. |
| `delay` | `MaybeRefOrGetter<number \| { open?: number; close?: number }>` | `0` | Single number or separate open/close values. |
| `restMs` | `MaybeRefOrGetter<number>` | `0` | Requires pointer rest before opening. |
| `mouseOnly` | `MaybeRefOrGetter<boolean>` | `false` | Limits to `pointerType === "mouse"`. |
| `safePolygon` | `MaybeRefOrGetter<boolean \| SafePolygonOptions>` | `false` | Keeps open while moving between trigger and panel. |
| `ignorePointerLeave` | `(target: EventTarget \| null) => boolean` | — | Skips selected leave events. |

## Returns

Returns `void`. Hover shares the node's open state and never closes a surface pinned by another reason.

## Details

`useHover` is the right fit for tooltips, previews, and other surfaces that should follow pointer intent. It shares the node's open state, so hover can coexist with click or focus on the same surface: hover never closes a surface pinned by another reason, and `stickIfOpen` in [`useClick`](/api/use-click) re-affirms the reason so hover leave stops dismissing after a pinning click.

- `delay` can be a single number or separate open and close values. A missing side falls back to `0`. Leaving cancels a pending open; re-entering cancels a pending close.
- `restMs` only matters when the open delay is `0`: pointer movement beyond a small threshold re-arms the timer, and leaving the anchor cancels it.
- `safePolygon` infers travel direction from rendered rectangles, so it does not depend on `usePosition`. Pass `true` for defaults (`buffer: 1`, `requireIntent: true`) or a `SafePolygonOptions` object to tune them. Clearing the polygon (on close or re-enter) reports an empty polygon through `onPolygonChange`.
- `tree` makes pointer-leave checks family-aware across nested surfaces: moving into a descendant's elements does not close the parent. When omitted, only the node's own anchor and floating elements count as inside.
- `ignorePointerLeave` runs after the family check.

`useHover` opens and closes with the `hover` reason.

## Example

Open a tooltip on hover with open/close delays:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "top",
});

useHover(node, {
  delay: { open: 100, close: 150 },
  safePolygon: true,
});
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Tooltip content</div>
</template>
```

## See Also

- [`useClick`](/api/use-click) - Opens on click; pairs with hover pinning
- [`useFocus`](/api/use-focus) - Opens on focus
- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [Build Accessible Tooltips](/guide/build-accessible-tooltips) - Hover workflow
