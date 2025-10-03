# hide

A middleware that provides data to hide the floating element when it is no longer visually attached to its reference.

## Usage

```vue
<script setup>
import { useFloating } from 'v-float'
import { hide } from 'v-float'

const { x, y, strategy } = useFloating(anchorEl, floatingEl, {
  middlewares: [
    hide()
  ]
})
</script>
```

Place `hide()` toward the end of your middleware array.

To apply visibility based on the middleware data:

```ts
// Example: using middlewareData.hide to toggle visibility
// (framework-agnostic snippet for illustration)
computePosition(anchorEl, floatingEl, {
  middlewares: [hide()]
}).then(({ middlewareData }) => {
  if (middlewareData.hide) {
    floatingEl.style.visibility = middlewareData.hide.referenceHidden ? 'hidden' : 'visible'
  }
})
```

## Options

```ts
interface HideOptions {
  // Choose which strategy to use for hiding logic
  // 'referenceHidden': when the reference is fully hidden by its clipping context
  // 'escaped': when the floating element has escaped the reference clipping context
  strategy?: 'referenceHidden' | 'escaped'
  // ...plus all DetectOverflowOptions such as padding, boundary, rootBoundary, etc.
}
```
