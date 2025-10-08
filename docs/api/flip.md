# flip

A middleware that flips the floating element to an alternative placement to keep it in view.

## Signature

```ts
function flip(options?: FlipOptions): Middleware
```

## Options

```ts
interface FlipOptions {
  mainAxis?: boolean
  crossAxis?: boolean | 'alignment'
  fallbackAxisSideDirection?: 'none' | 'start' | 'end'
  flipAlignment?: boolean
  fallbackPlacements?: Array<Placement>
  fallbackStrategy?: 'bestFit' | 'initialPlacement'
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| mainAxis | `boolean` | `true` | Whether to flip on the main axis |
| crossAxis | `boolean \| 'alignment'` | `true` | Whether to flip on the cross axis |
| fallbackAxisSideDirection | `'none' \| 'start' \| 'end'` | `'none'` | Direction to try when both axes fail |
| flipAlignment | `boolean` | `true` | Whether to flip alignment (e.g., start to end) |
| fallbackPlacements | `Array<Placement>` | `[]` | Custom fallback placements to try |
| fallbackStrategy | `'bestFit' \| 'initialPlacement'` | `'bestFit'` | Strategy when all placements fail |

## Examples

### Basic Usage

```vue
<script setup>
import { useFloating, flip } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [flip()]
})
</script>
```

### Custom Fallback Placements

```vue
<script setup>
import { useFloating, flip } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middleware: [
    flip({
      fallbackPlacements: ['top', 'right', 'bottom']
    })
  ]
})
</script>
```

## See Also

- [autoPlacement](/api/autoplacement) - Alternative middleware for automatic placement selection
- [shift](/api/shift) - Shifts the floating element to keep it in view
- [offset](/api/offset) - Offsets the floating element from its anchor