# offset

A middleware that offsets the floating element from its reference element.

## Usage

```vue
<script setup>
import { useFloating } from 'vfloat'
import { offset } from 'vfloat/middleware'

const { x, y, strategy } = useFloating({
  middleware: [
    offset(10) // 10px offset
  ]
})
</script>
```

## Options

```ts
type OffsetValue = number | { mainAxis?: number; crossAxis?: number }

interface OffsetOptions {
  mainAxis?: number
  crossAxis?: number
  alignmentAxis?: number | null
}
```