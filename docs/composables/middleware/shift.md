# shift

A middleware that shifts the floating element to keep it in view.

## Usage

```vue
<script setup>
import { useFloating } from 'vfloat'
import { shift } from 'vfloat/middleware'

const { x, y, strategy } = useFloating({
  middleware: [
    shift()
  ]
})
</script>
```

## Options

```ts
interface ShiftOptions {
  mainAxis?: boolean
  crossAxis?: boolean
  limiter?: {
    fn: (state: { x: number, y: number }) => { x: number, y: number }
    options?: any
  }
}
```