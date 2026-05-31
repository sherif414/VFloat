---
description: Connects an arrow element to a floating context.
---

# useArrow

`useArrow` owns arrow registration for a floating context and returns the computed arrow coordinates and styles.

## Type

```ts
function useArrow(
  context: FloatingContext,
  position: FloatingPosition,
  options?: UseArrowOptions,
): UseArrowReturn;

interface UseArrowOptions {
  offset?: string;
  padding?: Padding;
}

interface UseArrowReturn {
  arrowX: ComputedRef<number>;
  arrowY: ComputedRef<number>;
  arrowStyles: ComputedRef<Record<string, string>>;
}
```

## Details

`useArrow` connects an arrow element to the floating context and registers the arrow middleware for that context.

- `context.refs.arrowEl` is the arrow element used by the middleware.
- `offset` defaults to `"-4px"`.
- `padding` is passed to the arrow middleware.
- `position.middlewareData.value.arrow` exposes the raw middleware output if you need it.
- The arrow element still needs its own absolute positioning, since `arrowStyles` only supplies inset offsets.

## Example

This example shows the root-first `useArrow()` form.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useArrow, useFloatingContext, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({
  refs: { anchorEl, floatingEl, arrowEl },
});
const position = usePosition(context, {
  placement: "top",
  middleware: {
    offset: 8,
  },
});
const { styles } = position;

useHover(context);

const { arrowStyles } = useArrow(context, position, {
  offset: "-4px",
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="styles">
    Floating content
    <div ref="arrowEl" style="position: absolute" :style="arrowStyles">^</div>
  </div>
</template>
```

## See Also

- [`arrow`](/api/arrow)
- [`useFloatingContext`](/api/use-floating-context)
- [Keep Content in View](/guide/keep-content-in-view)
