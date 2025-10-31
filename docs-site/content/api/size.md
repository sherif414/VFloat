# size

A middleware that provides available size data and allows resizing the floating element to fit within boundaries.

## Signature

```ts
function size(options?: SizeOptions): Middleware
```

## Options

```ts
interface SizeOptions {
  apply?: (state: SizeState) => void
  padding?: Padding
  boundary?: Boundary
  rootBoundary?: RootBoundary
  elementContext?: ElementContext
  altBoundary?: boolean
}

interface SizeState extends MiddlewareState {
  availableWidth: number
  availableHeight: number
  elements: {
    floating: HTMLElement
    reference: Element | VirtualElement
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| apply | `(state: SizeState) => void` | `undefined` | Callback to apply size constraints |
| padding | `Padding` | `0` | Padding from the boundary edges |
| boundary | `Boundary` | `'clippingAncestors'` | Clipping boundary |
| rootBoundary | `RootBoundary` | `'viewport'` | Root boundary (viewport or document) |
| elementContext | `ElementContext` | `'floating'` | Element context for overflow detection |
| altBoundary | `boolean` | `false` | Use alternate element for boundary |

## Examples

### Basic Usage

```vue
<script setup>
import { useFloating, size } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [
    size({
      apply({ availableWidth, availableHeight, elements }) {
        Object.assign(elements.floating.style, {
          maxWidth: `${availableWidth}px`,
          maxHeight: `${availableHeight}px`
        })
      }
    })
  ]
})
</script>
```

### Match Reference Width

```vue
<script setup>
import { useFloating, size } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  middlewares: [
    size({
      apply({ rects, elements }) {
        Object.assign(elements.floating.style, {
          width: `${rects.reference.width}px`
        })
      }
    })
  ]
})
</script>
```

## See Also

- [shift](/api/shift) - Shifts the floating element to keep it in view
- [flip](/api/flip) - Flips the floating element to an alternative placement
