# `useFloating`

The `useFloating` composable provides positioning for a floating element relative to an anchor element.

This composable handles the positioning logic for floating elements (like tooltips, popovers, etc.) relative to their anchor elements. It uses Floating UI under the hood and provides reactive positioning data and styles.

## Usage

```ts
import { useFloating } from '@/composables/use-floating'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const { floatingStyles, refs } = useFloating(anchorEl, floatingEl, {
  placement: 'bottom',
  strategy: 'absolute'
})
```

## Type Definitions

### `AnchorElement`

Type for anchor element in floating UI.

```ts
type AnchorElement = HTMLElement | VirtualElement | null
```

### `FloatingElement`

Type for floating element in floating UI.

```ts
type FloatingElement = HTMLElement | null
```

### `FloatingStyles`

CSS styles for positioning floating elements.

```ts
interface FloatingStyles extends CSSProperties {
  position: Strategy
  top: string
  left: string
  transform?: string
  "will-change"?: "transform"
}
```

### `UseFloatingOptions`

Options for configuring floating element behavior.

```ts
interface UseFloatingOptions {
  /**
   * Where to place the floating element relative to its anchor element.
   * @default 'bottom'
   */
  placement?: MaybeRefOrGetter<Placement | undefined>
  /**
   * The type of CSS positioning to use.
   * @default 'absolute'
   */
  strategy?: MaybeRefOrGetter<Strategy | undefined>
  /**
   * Whether to use CSS transform instead of top/left positioning.
   * @default true
   */
  transform?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Middlewares modify the positioning coordinates in some fashion, or provide useful data for the consumer to use.
   */
  middlewares?: Middleware[]
  /**
   * Function called when both the anchor and floating elements are mounted.
   */
  whileElementsMounted?: (
    anchorEl: NonNullable<AnchorElement>,
    floatingEl: NonNullable<FloatingElement>,
    update: () => void
  ) => undefined | (() => void)
  /**
   * Whether the floating element is open.
   * @default false
   */
  open?: Ref<boolean>
  /**
   * Function called when the open state changes.
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Root context for the floating element tree.
   */
  rootContext?: Partial<FloatingContext>
}
```

### `FloatingContext`

Context object returned by useFloating containing all necessary data and methods.

```ts
interface FloatingContext {
  /**
   * The x-coordinate of the floating element
   */
  x: Readonly<Ref<number>>
  /**
   * The y-coordinate of the floating element
   */
  y: Readonly<Ref<number>>
  /**
   * The strategy used for positioning
   */
  strategy: Readonly<Ref<Strategy>>
  /**
   * The placement of the floating element
   */
  placement: Readonly<Ref<Placement>>
  /**
   * Data from middleware for additional customization
   */
  middlewareData: Readonly<Ref<MiddlewareData>>
  /**
   * Whether the floating element has been positioned
   */
  isPositioned: Readonly<Ref<boolean>>
  /**
   * Computed styles to apply to the floating element
   */
  floatingStyles: ComputedRef<FloatingStyles>
  /**
   * Function to manually update the position
   */
  update: () => void
  /**
   * The refs object containing references to anchor and floating elements
   */
  refs: {
    anchorEl: Ref<AnchorElement>
    floatingEl: Ref<FloatingElement>
  }
  /**
   * Whether the floating element is open
   */
  open: Readonly<Ref<boolean>>
  /**
   * Function to update the open state
   */
  onOpenChange: (open: boolean) => void
}
```

## Functions

### `useFloating(anchorEl, floatingEl, options)`

Composable function that provides positioning for a floating element relative to an anchor element.

```ts
function useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options: UseFloatingOptions = {}
): FloatingContext
```

#### Parameters

*   `anchorEl`: (`Ref<AnchorElement>`) The anchor element or a reactive reference to it.
*   `floatingEl`: (`Ref<FloatingElement>`) The floating element or a reactive reference to it.
*   `options`: (`UseFloatingOptions`, optional) Additional options for the floating behavior.

#### Returns

*   (`FloatingContext`) A `FloatingContext` object containing positioning data and methods.

### `autoUpdate(anchorEl, floatingEl, update, options)`

Auto-update function to use with `whileElementsMounted` option.

This function provides automatic position updates for floating elements. It's a wrapper around Floating UI's autoUpdate function.

```ts
function autoUpdate(
  anchorEl: HTMLElement,
  floatingEl: HTMLElement,
  update: () => void,
  options: AutoUpdateOptions = {}
): () => void
```

#### Parameters

*   `anchorEl`: (`HTMLElement`) The anchor element.
*   `floatingEl`: (`HTMLElement`) The floating element.
*   `update`: (`() => void`) The update function to call.
*   `options`: (`AutoUpdateOptions`, optional) Additional options for auto-updating.

#### Returns

*   (`() => void`) A cleanup function to stop auto-updating.
