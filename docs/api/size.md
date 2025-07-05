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
// SizeOptions extends DetectOverflowOptions from @floating-ui/core
interface SizeOptions {
  // apply's state combines MiddlewareState with availableWidth and availableHeight
  apply?: (state: {
    availableWidth: number
    availableHeight: number
    elements: {
      floating: HTMLElement // HTMLElement from @floating-ui/dom
      reference: Element | VirtualElement // Element | VirtualElement from @floating-ui/dom
    }
    // ... other MiddlewareState properties like rects, placement, strategy are also available
  } & any) => void // Using 'any' to represent MiddlewareState for brevity
  padding?: number | Partial<Record<string, number>> // From DetectOverflowOptions
  boundary?: 'clippingAncestors' | Element | Array<Element> // From DetectOverflowOptions
  rootBoundary?: 'document' | 'viewport' // From DetectOverflowOptions
}
```