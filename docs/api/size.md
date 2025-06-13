# size

A middleware that controls the size of the floating element.

## Usage

```vue
<script setup>
import { useFloating } from 'vfloat'
import { size } from 'vfloat/middleware'

const { x, y, strategy } = useFloating({
  middleware: [
    size({
      apply({ availableWidth, availableHeight, elements }) {
        // Set the width and height
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

## Options

```ts
interface SizeOptions {
  apply: (state: {
    availableWidth: number
    availableHeight: number
    elements: {
      floating: HTMLElement
      reference: HTMLElement
    }
  }) => void
  padding?: number | Partial<Record<string, number>>
  boundary?: 'clippingAncestors' | Element | Array<Element>
  rootBoundary?: 'document' | 'viewport'
}
```