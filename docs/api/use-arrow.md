# useArrow

`useArrow` connects an arrow element to a floating context and returns ready-to-use arrow coordinates and styles.

## Type

```ts
function useArrow(
  arrowEl: Ref<HTMLElement | null>,
  context: FloatingContext,
  options?: UseArrowOptions
): UseArrowReturn

interface UseArrowOptions {
  offset?: string
}

interface UseArrowReturn {
  arrowX: ComputedRef<number>
  arrowY: ComputedRef<number>
  arrowStyles: ComputedRef<Record<string, string>>
}
```

## Details

`useArrow` keeps `context.refs.arrowEl` in sync with your arrow ref so `useFloating()` can register the arrow middleware automatically. It returns logical positioning styles through `arrowStyles`.

- `offset` defaults to `"-4px"`.
- Use `context.middlewareData.value.arrow` if you need the raw middleware output.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue"
import { offset, useArrow, useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [offset(8)],
})

const { arrowStyles } = useArrow(arrowEl, context)
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Floating content
    <div ref="arrowEl" :style="arrowStyles">^</div>
  </div>
</template>
```

## See Also

- [`arrow`](/api/arrow)
- [`useFloating`](/api/use-floating)
- [Middleware](/guide/middleware)
