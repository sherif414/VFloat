# autoPlacement

A middleware that automatically chooses the best placement to keep the floating element in view.

## Usage

```vue
<script setup>
import { useFloating, autoPlacement } from 'v-float'

const { x, y, strategy } = useFloating(..., {
  middlewares: [
    autoPlacement()
  ]
})
</script>
```

## Why not use `autoPlacement()` and `flip()` together?

Both `autoPlacement()` and `flip()` attempt to choose a placement based on available space, but they do so using different strategies. Running both at once causes them to compete with each other on every update cycle:

- **Conflict of responsibility**: `autoPlacement()` explores and selects from all valid placements (optionally considering cross-axis and alignment) to find the best fit, while `flip()` starts from a preferred side and flips through a predefined fallback list. Using both means each middleware may override the other's decision, leading to unpredictable results.

Choose one based on your intent:
- **Use `autoPlacement()`** when you want the library to freely pick the best placement from a broad set (optionally constrained via `allowedPlacements`, `alignment`, and `crossAxis`).
- **Use `flip()`** when you have a strong preferred placement and want to try a specific, ordered set of fallbacks (e.g., start at `top`, then try `right`, then `bottom`, etc.).

## Options

```ts
/**
 * Options for the `autoPlacement()` middleware.
 */
interface AutoPlacementOptions {
  /**
   * If true, placement candidates on the cross axis are also considered.
   */
  crossAxis?: boolean

  /**
   * Lock the alignment to a specific one or disable it with null.
   */
  alignment?: 'start' | 'end' | null

  /**
   * Automatically infer alignment from the preferred side.
   */
  autoAlignment?: boolean

  /**
   * Restrict the set of placements that can be chosen.
   */
  allowedPlacements?: Array<Placement>

  /**
   * The clipping boundary to check against for overflow.
   */
  boundary?: Boundary

  /**
   * The root clipping boundary for the viewport/document.
   */
  rootBoundary?: RootBoundary

  /**
   * Which element's box to consider for overflow calculations.
   */
  elementContext?: ElementContext

  /**
   * Whether to use the alternative boundary (floating vs reference).
   */
  altBoundary?: boolean

  /**
   * Padding applied when checking for overflow.
   */
  padding?: Padding
}

