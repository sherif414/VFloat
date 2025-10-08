# hide

A middleware that provides data to hide the floating element when the reference is obscured or the floating element has escaped its clipping context.

## Signature

```ts
function hide(options?: HideOptions): Middleware
```

## Options

```ts
interface HideOptions {
  strategy?: 'referenceHidden' | 'escaped'
  padding?: Padding
  boundary?: Boundary
  rootBoundary?: RootBoundary
  elementContext?: ElementContext
  altBoundary?: boolean
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| strategy | `'referenceHidden' \| 'escaped'` | `'referenceHidden'` | Detection strategy for hiding |
| padding | `Padding` | `0` | Padding from the boundary edges |
| boundary | `Boundary` | `'clippingAncestors'` | Clipping boundary |
| rootBoundary | `RootBoundary` | `'viewport'` | Root boundary (viewport or document) |
| elementContext | `ElementContext` | `'floating'` | Element context for overflow detection |
| altBoundary | `boolean` | `false` | Use alternate element for boundary |

### Strategy Options

- **`referenceHidden`**: Detects when the reference element is fully hidden by its clipping context
- **`escaped`**: Detects when the floating element has escaped the reference's clipping context

## Return Value

The middleware provides data in `middlewareData.hide`:

```ts
interface HideData {
  referenceHidden?: boolean
  escaped?: boolean
}
```

## Examples

### Basic Usage

```vue
<script setup>
import { computed } from 'vue'
import { useFloating, hide } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [hide()]
})

const visibility = computed(() => {
  const hideData = context.middlewareData.value?.hide
  return hideData?.referenceHidden ? 'hidden' : 'visible'
})
</script>

<template>
  <div ref="floatingEl" :style="{ ...context.floatingStyles.value, visibility }">
    Content
  </div>
</template>
```

### Using Escaped Strategy

```vue
<script setup>
import { useFloating, hide } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    hide({ strategy: 'escaped' })
  ]
})
</script>
```

## See Also

- [shift](/api/shift) - Shifts the floating element to keep it in view
- [flip](/api/flip) - Flips the floating element to an alternative placement
