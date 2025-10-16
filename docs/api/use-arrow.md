# useArrow

A composable that automatically registers the arrow middleware and provides ready-to-use positioning styles for an arrow element.

## Signature

```ts
function useArrow(
  arrowEl: Ref<HTMLElement | null>,
  context: FloatingContext,
  options?: UseArrowOptions
): UseArrowReturn
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| arrowEl | `Ref<HTMLElement \| null>` | Yes | Reference to the arrow element |
| context | `FloatingContext` | Yes | Context from `useFloating` |
| options | `UseArrowOptions` | No | Configuration options |

## Options

```ts
interface UseArrowOptions {
  offset?: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| offset | `string` | `'-4px'` | Distance of arrow from floating element edge |

## Return Value

```ts
interface UseArrowReturn {
  arrowX: ComputedRef<number>
  arrowY: ComputedRef<number>
  arrowStyles: ComputedRef<Record<string, string>>
}
```

| Property | Type | Description |
|----------|------|-------------|
| arrowX | `ComputedRef<number>` | X-coordinate of the arrow |
| arrowY | `ComputedRef<number>` | Y-coordinate of the arrow |
| arrowStyles | `ComputedRef<Record<string, string>>` | CSS styles using logical properties |

## Examples

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useArrow, offset } from 'v-float'

const anchorEl = ref(null)
const floatingEl = ref(null)
const arrowEl = ref(null)

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [offset(8)]
})

const { arrowStyles } = useArrow(arrowEl, context)
</script>

<template>
  <div ref="floatingEl" :style="context.floatingStyles">
    Content
    <div ref="arrowEl" :style="arrowStyles" />
  </div>
</template>
```

### With Custom Offset

```vue
<script setup>
import { useFloating, useArrow } from 'v-float'

const { arrowStyles } = useArrow(arrowEl, context, {
  offset: '-6px'
})
</script>
```

### With Padding

```vue
<script setup>
import { useFloating, useArrow } from 'v-float'

const { arrowStyles } = useArrow(arrowEl, context, {
  padding: 8
})
</script>
```

## See Also

- [arrow](/api/arrow) - The underlying middleware
- [useFloating](/api/use-floating) - Core positioning composable
