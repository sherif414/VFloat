# autoPlacement

A middleware that automatically chooses the best placement from available options to keep the floating element in view.

## Signature

```ts
function autoPlacement(options?: AutoPlacementOptions): Middleware
```

## Options

```ts
interface AutoPlacementOptions {
  crossAxis?: boolean
  alignment?: 'start' | 'end' | null
  autoAlignment?: boolean
  allowedPlacements?: Array<Placement>
  boundary?: Boundary
  rootBoundary?: RootBoundary
  elementContext?: ElementContext
  altBoundary?: boolean
  padding?: Padding
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| crossAxis | `boolean` | `false` | Consider placements on the cross axis |
| alignment | `'start' \| 'end' \| null` | `undefined` | Lock alignment to specific value |
| autoAlignment | `boolean` | `false` | Automatically infer alignment from preferred side |
| allowedPlacements | `Array<Placement>` | All placements | Restrict which placements can be chosen |
| boundary | `Boundary` | `'clippingAncestors'` | Clipping boundary |
| rootBoundary | `RootBoundary` | `'viewport'` | Root boundary (viewport or document) |
| elementContext | `ElementContext` | `'floating'` | Element context for overflow detection |
| altBoundary | `boolean` | `false` | Use alternate element for boundary |
| padding | `Padding` | `0` | Padding from the boundary edges |

## Examples

### Basic Usage

```vue
<script setup>
import { useFloating, autoPlacement } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [autoPlacement()]
})
</script>
```

### Allowed Placements

```vue
<script setup>
import { useFloating, autoPlacement } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    autoPlacement({
      allowedPlacements: ['top', 'bottom']
    })
  ]
})
</script>
```

### With Alignment

```vue
<script setup>
import { useFloating, autoPlacement } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    autoPlacement({
      alignment: 'start',
      crossAxis: true
    })
  ]
})
</script>
```

## See Also

- [flip](/api/flip) - Alternative middleware for placement fallbacks with a preferred initial placement
- [shift](/api/shift) - Shifts element to keep it in view
