# autoPlacement

A middleware that automatically chooses the best placement to keep the floating element in view.

## Usage

```vue
<script setup>
import { useFloating } from 'v-float'
import { autoPlacement } from 'v-float'

const { x, y, strategy } = useFloating(anchorEl, floatingEl, {
  middlewares: [
    autoPlacement()
  ]
})
</script>
```

Note: This is an alternative to `flip()`. Use only one of them in the middleware array.

## Options

```ts
interface AutoPlacementOptions {
  // If true, placement candidates on the cross axis are also considered
  crossAxis?: boolean
  // Lock the alignment to a specific one or disable it with null
  alignment?: 'start' | 'end' | null
  // Automatically infer alignment from the preferred side
  autoAlignment?: boolean
  // Restrict the set of placements that can be chosen
  allowedPlacements?: Array<Placement>
  // ...plus all DetectOverflowOptions such as padding, boundary, rootBoundary, etc.
}
```
