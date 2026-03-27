# useClientPoint

`useClientPoint` positions a floating element relative to pointer coordinates by swapping the floating context anchor for a virtual element.

## Type

```ts
function useClientPoint(
  context: UseClientPointContext,
  options: UseClientPointOptions & {
    pointerTarget: Ref<HTMLElement | null>;
  },
): UseClientPointReturn;

interface UseClientPointOptions {
  pointerTarget?: Ref<HTMLElement | null>;
  enabled?: MaybeRefOrGetter<boolean>;
  axis?: MaybeRefOrGetter<"x" | "y" | "both">;
  x?: MaybeRefOrGetter<number | null>;
  y?: MaybeRefOrGetter<number | null>;
  trackingMode?: "follow" | "static";
}

interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>;
  updatePosition: (x: number, y: number) => void;
}
```

## Details

`useClientPoint` is now centered on the floating root. Pass the floating context first, then the tracking target in `options.pointerTarget`.

- `trackingMode: "follow"` keeps the floating element in sync with pointer movement.
- `trackingMode: "static"` captures the initial point and keeps the surface anchored there.
- If both `x` and `y` are provided, the composable behaves like a controlled source of coordinates.
- The legacy `useClientPoint(pointerTarget, context, options)` call still works during the transition, but the root-first form is the canonical API.

## Example

This example shows the root-first overload.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useFloating, useHover } from "v-float";

const trackingArea = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "right-start",
});

useClientPoint(context, {
  pointerTarget: trackingArea,
});

useHover(context);
</script>

<template>
  <div ref="trackingArea">
    Move the pointer here

    <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
      Tooltip follows the pointer
    </div>
  </div>
</template>
```

## See Also

- [`useFloating`](/api/use-floating)
- [`useHover`](/api/use-hover)
- [Virtual Elements](/guide/virtual-elements)
- [Migration: Grouped Context](/guide/migration-grouped-context)
