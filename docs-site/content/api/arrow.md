# arrow

A middleware that provides positioning data for an arrow element pointing toward the reference element.

## Signature

```ts
function arrow(options: ArrowOptions): Middleware
```

## Options

```ts
interface ArrowOptions {
  element: Ref<HTMLElement | null>
  padding?: Padding
}
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| element | `Ref<HTMLElement | null>` | Yes | Reference to the arrow element |
| padding | `Padding` | No | Padding from the floating element edges |

## Return Value

The middleware provides data in `middlewareData.arrow`:

```ts
interface ArrowData {
  x?: number
  y?: number
  centerOffset: number
}
```

| Property | Type | Description |
|----------|------|-------------|
| x | `number | undefined` | X-axis position of the arrow |
| y | `number | undefined` | Y-axis position of the arrow |
| centerOffset | `number` | Offset from the center of the reference element |

## Examples

### Basic Usage

```vue
<script setup>
import { ref, computed } from 'vue'
import { useFloating, arrow, offset } from 'v-float'

const anchorEl = ref(null)
const floatingEl = ref(null)
const arrowEl = ref(null)

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    offset(8),
    arrow({ element: arrowEl })
  ]
})

const arrowStyles = computed(() => {
  const arrowData = context.middlewareData.value?.arrow
  if (!arrowData) return {}
  
  const styles: Record<string, string> = {}
  if (arrowData.x != null) styles.left = `${arrowData.x}px`
  if (arrowData.y != null) styles.top = `${arrowData.y}px`
  return styles
})
</script>

<template>
  <div ref="floatingEl">
    Content
    <div ref="arrowEl" :style="arrowStyles" />
  </div>
</template>
```

### With Padding

```vue
<script setup>
import { useFloating, arrow } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    arrow({ 
      element: arrowEl,
      padding: 8
    })
  ]
})
</script>
```

## See Also

- [useArrow](/api/use-arrow) - Composable that auto-registers this middleware and provides ready-to-use styles
- [offset](/api/offset) - Commonly used with arrow for spacing
