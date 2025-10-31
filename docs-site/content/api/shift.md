# shift

A middleware that shifts the floating element along its axis to keep it in view.

## Signature

```ts
function shift(options?: ShiftOptions): Middleware
```

## Options

```ts
interface ShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  limiter?: {
    fn: (state: MiddlewareState) => Coords
    options?: any
  }
  padding?: Padding
  boundary?: Boundary
  rootBoundary?: RootBoundary
  elementContext?: ElementContext
  altBoundary?: boolean
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| mainAxis | `boolean` | `true` | Whether to shift on the main axis |
| crossAxis | `boolean` | `false` | Whether to shift on the cross axis |
| limiter | `object` | `undefined` | Function to limit the shifting behavior |
| padding | `Padding` | `0` | Padding from the boundary edges |
| boundary | `Boundary` | `'clippingAncestors'` | Clipping boundary |
| rootBoundary | `RootBoundary` | `'viewport'` | Root boundary (viewport or document) |
| elementContext | `ElementContext` | `'floating'` | Element context for overflow detection |
| altBoundary | `boolean` | `false` | Use alternate element for boundary |

## Examples

### Basic Usage

```vue
<script setup>
import { useFloating, shift } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [shift()]
})
</script>
```

### With Padding

```vue
<script setup>
import { useFloating, shift } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    shift({ padding: 8 })
  ]
})
</script>
```

### With Cross Axis

```vue
<script setup>
import { useFloating, shift } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    shift({ 
      mainAxis: true,
      crossAxis: true 
    })
  ]
})
</script>
```

## See Also

- [flip](/api/flip) - Flips the floating element to an alternative placement
- [offset](/api/offset) - Offsets the floating element from its anchor
- [size](/api/size) - Controls the size of the floating element
