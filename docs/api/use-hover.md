---
description: Opens and closes floating content on pointer hover.
---

# useHover

`useHover` opens and closes a floating node when the pointer enters or leaves the anchor or floating element. It supports open/close delays, rest-before-open timers, and safe polygons that bridge the gap between trigger and floating panel.

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
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Gates all hover listeners. |
| `tree` | `FloatingTree \| null` | `undefined` | Tree context for family-aware leave checks across nested surfaces. |
| `delay` | `MaybeRefOrGetter<number \| { open?: number; close?: number }>` | `0` | Debounce duration in milliseconds for open and close transitions. |
| `restMs` | `MaybeRefOrGetter<number>` | `0` | Duration the pointer must rest stationary over the anchor before opening. |
| `mouseOnly` | `MaybeRefOrGetter<boolean>` | `false` | When `true`, ignores touch or pen hover events. |
| `safePolygon` | `MaybeRefOrGetter<boolean \| SafePolygonOptions>` | `false` | Keeps panel open while the pointer travels across the gap between anchor and floating panel. |
| `ignorePointerLeave` | `(target: EventTarget \| null) => boolean` | `undefined` | Callback returning `true` to ignore selected pointer-leave events. |

### Safe Polygon Options

When `safePolygon` is `true` or an object, an invisible directional polygon is calculated between the pointer and the floating panel:

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `buffer` | `number` | `1` | Extra pixel padding added around the travel corridor. |
| `requireIntent` | `boolean` | `true` | Requires pointer velocity and direction to point toward the floating element. |
| `onPolygonChange` | `(polygon: Polygon) => void` | `undefined` | Callback receiving updated polygon coordinates for debugging or visualization. |

## Returns

`useHover` returns `void`. It manages listeners on the anchor and floating elements that automatically clean up when components unmount.

## Details

### Preventing Accidental Triggers with `restMs`

When users quickly skim across a row of buttons or table cells, instant tooltips create visual noise. Setting `restMs: 150` waits until the pointer stops moving before opening.

### Bridging Gaps with `safePolygon`

If your floating panel is separated from the anchor by an offset margin, moving the mouse to click an item in the panel would trigger a `pointerleave` event on the anchor and dismiss the panel.

Enabling `safePolygon: true` tracks the pointer trajectory. As long as the cursor moves toward the floating panel inside the dynamic cone, the surface remains open.

### Pinning and Reason Protection

`useHover` opens and closes with reason `"hover"`. If another interaction composable (such as [`useClick`](/api/use-click)) pins the surface with another reason, `useHover` detects the change and will not dismiss the surface on pointer leave.

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
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});

useHover(node, {
  delay: { open: 150, close: 100 },
  safePolygon: true,
});
</script>

<template>
  <button ref="anchorEl">Hover for details</button>

  <div v-if="node.open" ref="floatingEl" class="card" :style="styles">
    <p>Interactive floating card with links</p>
    <a href="#more">Read documentation</a>
  </div>
</template>
```

## See Also

- [`useClick`](/api/use-click) - Click toggle; supports hover pinning with `stickIfOpen`
- [`useFocus`](/api/use-focus) - Keyboard focus trigger for accessible tooltips
- [`useFloatingTree`](/api/use-floating-tree) - Prevents parent dismissal when hovering nested menus
- [Build Accessible Tooltips](/guide/build-accessible-tooltips) - Tooltip patterns and best practices
- [Safe Polygon Gotchas](/guide/safe-polygon-gotchas) - Deep dive on polygon mathematics
