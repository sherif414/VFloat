# useArrow

`useArrow` owns arrow registration for a floating context and returns the computed arrow coordinates and styles.

## Type

```ts
function useArrow(
  context: FloatingContext,
  options: {
    element: Ref<HTMLElement | null>;
    offset?: string;
  },
): UseArrowReturn;

interface UseArrowReturn {
  arrowX: ComputedRef<number>;
  arrowY: ComputedRef<number>;
  arrowStyles: ComputedRef<Record<string, string>>;
}
```

## Details

`useArrow` connects an arrow element to the floating context and registers the arrow middleware for that context.

- `options.element` is required in the root-first API.
- `offset` defaults to `"-4px"`.
- `context.position.middlewareData.value.arrow` exposes the raw middleware output if you need it.
- The arrow element still needs its own absolute positioning, since `arrowStyles` only supplies inset offsets.

## Example

This example shows the root-first `useArrow()` form.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { offset, useArrow, useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
  middlewares: [offset(8)],
});

useHover(context);

const { arrowStyles } = useArrow(context, {
  element: arrowEl,
  offset: "-4px",
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
    <div ref="arrowEl" style="position: absolute" :style="arrowStyles">^</div>
  </div>
</template>
```

## See Also

- [`arrow`](/api/arrow)
- [`useFloating`](/api/use-floating)
- [Middleware](/guide/middleware)
