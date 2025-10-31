# offset

A middleware that offsets the floating element from its reference element.

## Signature

```ts
function offset(
  value?: OffsetValue | OffsetFunction
): Middleware

type OffsetValue = number | OffsetOptions
type OffsetFunction = (args: OffsetFunctionArgs) => OffsetValue

interface OffsetOptions {
  mainAxis?: number
  crossAxis?: number
  alignmentAxis?: number | null
}

interface OffsetFunctionArgs {
  placement: Placement
  rects: ElementRects
  elements: Elements
}
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| value | `number | OffsetOptions | OffsetFunction` | Offset value, options object, or function returning either |

### OffsetOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| mainAxis | `number` | `0` | Offset along the placement direction |
| crossAxis | `number` | `0` | Offset perpendicular to placement direction |
| alignmentAxis | `number | null` | `null` | Offset for aligned placements (overrides crossAxis) |

### Axis Directions

- Main axis: Direction of the placement (e.g., vertical for `top`/`bottom`)
- Cross axis: Perpendicular to the placement direction
- Alignment axis: Used for aligned placements like `top-start`, `bottom-end`

## Examples

### Numeric Offset

```vue
<script setup>
import { useFloating, offset } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [offset(10)]
})
</script>
```

### Object Form

```vue
<script setup>
import { useFloating, offset } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [
    offset({ 
      mainAxis: 8,
      crossAxis: 4
    })
  ]
})
</script>
```

### Alignment Axis

```vue
<script setup>
import { useFloating, offset } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  placement: 'top-start',
  middlewares: [
    offset({ 
      mainAxis: 8,
      alignmentAxis: 12
    })
  ]
})
</script>
```

### Dynamic Offset

```vue
<script setup>
import { useFloating, offset } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [
    offset(({ placement, rects }) => {
      if (placement.startsWith('top')) {
        return 8
      }
      return { 
        mainAxis: rects.reference.height / 2,
        crossAxis: 4
      }
    })
  ]
})
</script>
```

## See Also

- [arrow](/api/arrow) - Often used with offset for arrow positioning
- [flip](/api/flip) - Flips placement when out of view
- [shift](/api/shift) - Shifts element to keep it in view
