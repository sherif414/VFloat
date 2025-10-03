# arrow

A middleware that positions an arrow element pointing toward the reference.

## Usage

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'
import { arrow } from 'v-float'

const arrowEl = ref(null)

const { x, y, strategy } = useFloating(anchorEl, floatingEl, {
  middlewares: [
    arrow({ element: () => arrowEl.value })
  ]
})
</script>

<template>
  <div ref="arrowEl" class="arrow" />
</template>
```

## Options

```ts
interface ArrowOptions {
  // The arrow HTMLElement/SVGElement that should be positioned
  element: HTMLElement | SVGElement | (() => HTMLElement | SVGElement | null)
  // Optional padding between arrow tip and edges used in collision checks
  padding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>
}
```
