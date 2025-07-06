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
    // state: MiddlewareState from @floating-ui/dom
    // returns: Coords from @floating-ui/dom ({ x: number, y: number })
    fn: (state: any) => { x: number, y: number }
    options?: any
  }
}
```