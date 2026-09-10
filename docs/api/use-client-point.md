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

## Details

`useClientPoint` overwrites `node.refs.anchorEl` with a virtual element, so pass a node created by [`useFloatingNode`](/api/use-floating-node) first. The initial `anchorEl` you provide is only a placeholder. By default, pointer tracking listens on `document.documentElement`. Pass `options.trackingAreaEl` when tracking should be scoped to a specific element.

- `trackingAreaEl` receives pointer listeners and provides fallback geometry for the virtual anchor. Swapping it preserves coordinates and updates the virtual element's context.
- `trackingMode: "follow"` (default) keeps the floating element in sync with pointer movement while open. Touch movement is ignored; only mouse-like pointers move the surface.
- `trackingMode: "static"` captures the opening point (preferring the latest pointer-down, falling back to hover position) and keeps the surface anchored there. Closing clears the stored point; reopening without a new trigger leaves coordinates empty.
- If both `x` and `y` resolve to finite non-null numbers, the composable enters controlled mode: pointer listeners detach and coordinates are driven entirely by those values. Non-finite values (`NaN`, `Infinity`) are treated as `null`.
- `enabled` (default `true`) is reactive: disabling detaches listeners and skips capturing the opening point. A surface opened while disabled keeps its existing anchor; closing clears the coordinates as usual.
- `coordinates` is empty (`{ x: null, y: null }`) before the first trigger and after close in uncontrolled mode.

## Example

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

- [useFloatingNode](/api/use-floating-node)
- [`useHover`](/api/use-hover)
- [Use Virtual Anchors](/guide/use-virtual-anchors)
