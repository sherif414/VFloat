---
description: Positions a floating element from pointer coordinates.
---

# useClientPoint

`useClientPoint` positions a floating element relative to pointer coordinates by swapping the node's anchor for a virtual element.

## Type

```ts
function useClientPoint(
  node: UseClientPointContext,
  options?: UseClientPointOptions,
): UseClientPointReturn;

interface UseClientPointContext extends Pick<FloatingNode, "open"> {
  refs: Pick<FloatingNode["refs"], "anchorEl">;
}

type TrackingMode = "follow" | "static";

interface UseClientPointOptions {
  /**
   * Element that receives pointer listeners and provides fallback geometry
   * for the virtual anchor. Defaults to `document.documentElement`.
   */
  trackingAreaEl?: Ref<HTMLElement | null>;

  /**
   * Enables or disables client-point behavior without removing the composable.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Optional externally controlled x coordinate. Both `x` and `y` must resolve
   * to non-null numbers for controlled mode; a single axis has no effect.
   */
  x?: MaybeRefOrGetter<number | null>;

  /**
   * Optional externally controlled y coordinate. Both `x` and `y` must resolve
   * to non-null numbers for controlled mode; a single axis has no effect.
   */
  y?: MaybeRefOrGetter<number | null>;

  /**
   * Chooses how the pointer position behaves after the floating element opens.
   * Not reactive after setup.
   * @default "follow"
   */
  trackingMode?: TrackingMode;
}

interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `trackingAreaEl` | `Ref<HTMLElement \| null>` | `document.documentElement` | Receives pointer listeners; swapping preserves coordinates. |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive; disabling detaches listeners. |
| `x` / `y` | `MaybeRefOrGetter<number \| null>` | `null` | Both must resolve to finite numbers for controlled mode. |
| `trackingMode` | `TrackingMode` | `"follow"` | `"follow"` syncs while open; `"static"` anchors the opening point. Not reactive after setup. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `coordinates` | `Readonly<Ref<{ x, y }>>` | Empty before first trigger and after close in uncontrolled mode. |

## Details

`useClientPoint` overwrites `node.refs.anchorEl` with a virtual element, so pass a node created by [`useFloatingNode`](/api/use-floating-node) first. The initial `anchorEl` you provide is only a placeholder. By default, pointer tracking listens on `document.documentElement`. Pass `options.trackingAreaEl` when tracking should be scoped to a specific element.

- `trackingMode: "follow"` keeps the floating element in sync with pointer movement while open. Touch movement is ignored; only mouse-like pointers move the surface.
- `trackingMode: "static"` captures the opening point (preferring the latest pointer-down, falling back to hover position) and keeps the surface anchored there. Closing clears the stored point; reopening without a new trigger leaves coordinates empty.
- If both `x` and `y` resolve to finite non-null numbers, the composable enters controlled mode: pointer listeners detach and coordinates are driven entirely by those values. Non-finite values (`NaN`, `Infinity`) are treated as `null`.
- A surface opened while disabled keeps its existing anchor; closing clears the coordinates as usual.

## Example

Track the pointer inside a scoped area:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useFloatingNode, usePosition, useHover } from "v-float";

const trackingAreaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node, {
  placement: "right-start",
});

useClientPoint(node, {
  trackingAreaEl,
});

useHover(node);
</script>

<template>
  <div ref="trackingAreaEl">
    Move the pointer here

    <div v-if="node.open" ref="floatingEl" :style="styles">Tooltip follows the pointer</div>
  </div>
</template>
```

## See Also

- [`useFloatingNode`](/api/use-floating-node) - Creates shared refs and open state
- [`useHover`](/api/use-hover) - Opens on hover
- [Use Virtual Anchors](/guide/use-virtual-anchors) - Coordinate-based positioning
