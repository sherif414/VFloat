# useFloating

The core composable for positioning floating elements relative to anchor elements.

## Signature

```ts
function useFloating(
  anchorEl: Ref<AnchorElement>,
  floatingEl: Ref<FloatingElement>,
  options?: UseFloatingOptions
): FloatingContext
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| anchorEl | `Ref<AnchorElement>` | Yes | Reference to the anchor element |
| floatingEl | `Ref<FloatingElement>` | Yes | Reference to the floating element |
| options | `UseFloatingOptions` | No | Configuration options |

## Options

```ts
interface UseFloatingOptions {
  id?: string
  placement?: MaybeRefOrGetter<Placement>
  strategy?: MaybeRefOrGetter<Strategy>
  transform?: MaybeRefOrGetter<boolean>
  middlewares?: MaybeRefOrGetter<Middleware[]>
  autoUpdate?: boolean | AutoUpdateOptions
  open?: Ref<boolean>
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| id | `string` | `undefined` | Optional stable identifier (used by `useFloatingTree`) |
| placement | `MaybeRefOrGetter<Placement>` | `'bottom'` | Desired placement of the floating element |
| strategy | `MaybeRefOrGetter<Strategy>` | `'absolute'` | Positioning strategy (`'absolute'` or `'fixed'`) |
| transform | `MaybeRefOrGetter<boolean>` | `true` | Use CSS transform for positioning |
| middlewares | `MaybeRefOrGetter<Middleware[]>` | `[]` | Array of middleware functions |
| autoUpdate | `boolean \| AutoUpdateOptions` | `true` | Auto-update position on scroll/resize |
| open | `Ref<boolean>` | `ref(false)` | Control open/closed state |
| onOpenChange | `(open, reason, event?) => void` | `undefined` | Callback when open state changes |

## Return Value

```ts
interface FloatingContext {
  id?: string
  x: Readonly<Ref<number>>
  y: Readonly<Ref<number>>
  strategy: Readonly<Ref<Strategy>>
  placement: Readonly<Ref<Placement>>
  middlewareData: Readonly<Ref<MiddlewareData>>
  isPositioned: Readonly<Ref<boolean>>
  floatingStyles: Readonly<Ref<FloatingStyles>>
  update: () => void
  refs: {
    anchorEl: Ref<AnchorElement>
    floatingEl: Ref<FloatingElement>
    arrowEl: Ref<HTMLElement | null>
  }
  open: Readonly<Ref<boolean>>
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void
}
```

| Property | Type | Description |
|----------|------|-------------|
| id | `string \| undefined` | Stable identifier for tree-aware interactions |
| x | `Readonly<Ref<number>>` | X-coordinate of the floating element |
| y | `Readonly<Ref<number>>` | Y-coordinate of the floating element |
| strategy | `Readonly<Ref<Strategy>>` | Positioning strategy |
| placement | `Readonly<Ref<Placement>>` | Final computed placement |
| middlewareData | `Readonly<Ref<MiddlewareData>>` | Data from middleware |
| isPositioned | `Readonly<Ref<boolean>>` | Whether element has been positioned |
| floatingStyles | `Readonly<Ref<FloatingStyles>>` | CSS styles to apply |
| update | `() => void` | Manually update position |
| refs | `object` | References to anchor, floating, and arrow elements |
| open | `Readonly<Ref<boolean>>` | Open/closed state |
| setOpen | `(open, reason?, event?) => void` | Explicitly set open state with optional reason |

## Types

### AnchorElement

```ts
type AnchorElement = HTMLElement | VirtualElement | null
```

### FloatingElement

```ts
type FloatingElement = HTMLElement | null
```

### FloatingStyles

```ts
interface FloatingStyles {
  position: Strategy
  top: string
  left: string
  transform?: string
  'will-change'?: string
  [key: `--${string}`]: any  // CSS custom properties
}
```

### OpenChangeReason

```ts
type OpenChangeReason =
  | 'programmatic'
  | 'anchor-click'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'escape-key'
  | 'tree-ancestor-close'
```

Describes the reason why the open state changed:
- `'programmatic'` - Changed via `setOpen()` or `open.value = ...`
- `'anchor-click'` - Triggered by clicking the anchor element
- `'hover'` - Triggered by hovering over the anchor
- `'focus'` - Triggered by focusing the anchor
- `'blur'` - Triggered by blurring the anchor
- `'escape-key'` - Triggered by pressing the Escape key
- `'tree-ancestor-close'` - Triggered by a parent node closing in a tree hierarchy

## Examples

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'

const anchorEl = ref(null)
const floatingEl = ref(null)

const { floatingStyles } = useFloating(anchorEl, floatingEl)
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div ref="floatingEl" :style="floatingStyles">
    Floating content
  </div>
</template>
```

### With Placement

```vue
<script setup>
import { useFloating } from 'v-float'

const { floatingStyles } = useFloating(anchorEl, floatingEl, {
  placement: 'top-start'
})
</script>
```

### With Middleware

```vue
<script setup>
import { useFloating, offset, flip, shift } from 'v-float'

const { floatingStyles } = useFloating(anchorEl, floatingEl, {
  placement: 'top',
  middlewares: [
    offset(8),
    flip(),
    shift({ padding: 5 })
  ]
})
</script>
```

### Reactive Placement

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'

const placement = ref('top')

const { floatingStyles } = useFloating(anchorEl, floatingEl, {
  placement
})

// Change placement dynamically
placement.value = 'bottom'
</script>
```

### With Open State and Callback

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'

const isOpen = ref(false)

const { floatingStyles, setOpen } = useFloating(anchorEl, floatingEl, {
  open: isOpen,
  onOpenChange: (open, reason, event) => {
    console.log(`Floating element ${open ? 'opened' : 'closed'} via ${reason}`)
  }
})

// Programmatically control open state
const toggleOpen = () => {
  setOpen(!isOpen.value, 'programmatic')
}
</script>
```

## See Also

- [offset](/api/offset) - Offset the floating element
- [flip](/api/flip) - Flip to alternative placement
- [shift](/api/shift) - Shift to keep in view
- [arrow](/api/arrow) - Position an arrow element
