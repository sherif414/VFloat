# useHover

`useHover` opens and closes a floating context when the pointer enters or leaves the anchor or floating element.

## Type

```ts
function useHover(context: FloatingContext, options?: UseHoverOptions): void;

interface UseHoverOptions {
  enabled?: MaybeRef<boolean>;
  delay?: MaybeRef<number | { open?: number; close?: number }>;
  restMs?: MaybeRef<number>;
  mouseOnly?: MaybeRef<boolean>;
  safePolygon?: MaybeRef<boolean | SafePolygonOptions>;
}

interface SafePolygonOptions {
  buffer?: number;
  requireIntent?: boolean;
  onPolygonChange?: (polygon: Polygon) => void;
}
```

## Details

`useHover` is the right fit for tooltips, previews, and other surfaces that should follow pointer intent. It uses the shared `FloatingContext`, so hover can coexist with click or focus on the same surface.

- `delay` can be a single number or separate open and close values.
- `restMs` only matters when the open delay is `0`.
- `mouseOnly` limits hover behavior to mouse-like pointers.
- `safePolygon` keeps the surface open while the pointer moves between trigger and panel.

`useHover` opens and closes with the `hover` reason.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
});

useHover(context, {
  delay: { open: 100, close: 150 },
  safePolygon: true,
});
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Tooltip content
  </div>
</template>
```

## See Also

- [`useClick`](/api/use-click)
- [`useFocus`](/api/use-focus)
- [`useFloating`](/api/use-floating)
- [Build Accessible Tooltips](/guide/build-accessible-tooltips)
