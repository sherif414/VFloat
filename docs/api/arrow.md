# arrow

A middleware that positions an arrow element pointing toward the anchor element.

## Usage

There are two common ways to use the arrow functionality:

1) Recommended: use the `useArrow` composable, which auto-registers the middleware and returns ready-to-apply styles.
2) Advanced: register the `arrow()` middleware manually and handle positioning styles yourself.

### Recommended: useArrow (auto-registered middleware)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useArrow, offset, flip, shift } from 'v-float'

const referenceEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)

const ctx = useFloating(referenceEl, floatingEl, {
  placement: 'top',
  middleware: [offset(8), flip(), shift()], // arrow is auto-registered by useArrow
})

// Automatically registers the arrow middleware internally and returns styles
const { arrowStyles } = useArrow(arrowEl, ctx, { offset: '-4px' })
</script>

<template>
  <button ref="referenceEl">Hover me</button>
  <div ref="floatingEl" :style="ctx.floatingStyles.value" class="tooltip">
    Tooltip content
    <div ref="arrowEl" class="arrow" :style="arrowStyles" />
  </div>
  
</template>

<style scoped>
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #ddd;
  transform: rotate(45deg);
  z-index: -1; /* keep the arrow behind the panel's content */
}
</style>
```

See [useArrow](/api/use-arrow) for a full guide.

### Advanced: manual middleware registration

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFloating, arrow, offset } from 'v-float'

const referenceEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)

const ctx = useFloating(referenceEl, floatingEl, {
  placement: 'bottom',
  middleware: [
    offset(8),
    arrow({ element: arrowEl }),
  ],
})

// When using the middleware directly, you must read ctx.middlewareData to position the arrow.
// The useArrow composable does this for you automatically.
const arrowStyles = computed(() => {
  const md = ctx.middlewareData.value?.arrow
  if (!md) return {}

  // Logical properties for RTL/LTR-friendly positioning
  const styles: Record<string, string> = {}
  if (md.x != null) styles['inset-inline-start'] = `${md.x}px`
  if (md.y != null) styles['inset-block-start'] = `${md.y}px`
  // Pull the square outward so the rotated diamond forms a triangle
  // Adjust based on placement main-axis
  const mainAxis = ctx.placement.value.split('-')[0]
  if (mainAxis === 'top') styles['inset-block-end'] = '-4px'
  else if (mainAxis === 'bottom') styles['inset-block-start'] = '-4px'
  else if (mainAxis === 'left') styles['inset-inline-end'] = '-4px'
  else if (mainAxis === 'right') styles['inset-inline-start'] = '-4px'
  return styles
})
</script>

<template>
  <div ref="floatingEl">
    Content
    <div ref="arrowEl" class="arrow" :style="arrowStyles" />
  </div>
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

## Styling the arrow

- **Basic shape**: a small square rotated 45° to create a diamond that peeks out from the edge.
- **Positioning**: use the styles provided by `useArrow` (recommended) or compute from `middlewareData.arrow` when using the middleware directly.
- **Borders and background**: match the floating panel so the arrow looks seamless.

Minimal CSS example:

```css
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #ddd;
  transform: rotate(45deg);
  z-index: -1;
}
```

For more patterns (shadows, two-color arrows, and placement-conditional borders), see [useArrow](/api/use-arrow).

## See also

- [useArrow](/api/use-arrow)
- [useFloating](/api/use-floating)
