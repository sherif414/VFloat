# arrow

A middleware that positions an arrow element pointing toward the anchor element.

## Usage

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'
import { arrow } from 'v-float'

const arrowEl = ref(null)

const { x, y, strategy } = useFloating(..., {
  middlewares: [
    arrow({ element: arrowEl })
  ]
})
</script>

<template>
  <div ref="arrowEl" class="arrow" />
</template>
```

## Options

```ts
export interface ArrowMiddlewareOptions {
  /**
   * Padding to apply around the arrow element
   */
  padding?: Padding

  /**
   * Reference to the arrow element
   */
  element: Ref<HTMLElement | null>
}
```
