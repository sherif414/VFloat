# flip

A middleware that provides automatic positioning to keep the floating element in view.

## Usage

```vue
<script setup>
import { useFloating } from 'vfloat'
import { flip } from 'vfloat/middleware'

const { x, y, strategy } = useFloating({
  middleware: [
    flip()
  ]
})
</script>
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