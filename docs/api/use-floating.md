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
  placement?: MaybeRefOrGetter<Placement>
  strategy?: MaybeRefOrGetter<Strategy>
  transform?: MaybeRefOrGetter<boolean>
  middleware?: MaybeRefOrGetter<Middleware[]>
  autoUpdate?: boolean | AutoUpdateOptions
  open?: Ref<boolean>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| placement | `MaybeRefOrGetter<Placement>` | `'bottom'` | Desired placement of the floating element |
| strategy | `MaybeRefOrGetter<Strategy>` | `'absolute'` | Positioning strategy (`'absolute'` or `'fixed'`) |
| transform | `MaybeRefOrGetter<boolean>` | `true` | Use CSS transform for positioning |
| middleware | `MaybeRefOrGetter<Middleware[]>` | `[]` | Array of middleware functions |
| autoUpdate | `boolean \| AutoUpdateOptions` | `true` | Auto-update position on scroll/resize |
| open | `Ref<boolean>` | `undefined` | Control open/closed state |

## Return Value

```ts
interface FloatingContext {
  x: Readonly<Ref<number>>
  y: Readonly<Ref<number>>
  strategy: Readonly<Ref<Strategy>>
  placement: Readonly<Ref<Placement>>
  middlewareData: Readonly<Ref<MiddlewareData>>
  isPositioned: Readonly<Ref<boolean>>
  floatingStyles: ComputedRef<FloatingStyles>
  update: () => void
  refs: {
    anchorEl: Ref<AnchorElement>
    floatingEl: Ref<FloatingElement>
  }
  open: Readonly<Ref<boolean>>
}
```

| Property | Type | Description |
|----------|------|-------------|
| x | `Readonly<Ref<number>>` | X-coordinate of the floating element |
| y | `Readonly<Ref<number>>` | Y-coordinate of the floating element |
| strategy | `Readonly<Ref<Strategy>>` | Positioning strategy |
| placement | `Readonly<Ref<Placement>>` | Final computed placement |
| middlewareData | `Readonly<Ref<MiddlewareData>>` | Data from middleware |
| isPositioned | `Readonly<Ref<boolean>>` | Whether element has been positioned |
| floatingStyles | `ComputedRef<FloatingStyles>` | CSS styles to apply |
| update | `() => void` | Manually update position |
| refs | `object` | References to elements |
| open | `Readonly<Ref<boolean>>` | Open/closed state |

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
  'will-change'?: 'transform'
}
```

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
  middleware: [
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

## See Also

- [offset](/api/offset) - Offset the floating element
- [flip](/api/flip) - Flip to alternative placement
- [shift](/api/shift) - Shift to keep in view
- [arrow](/api/arrow) - Position an arrow element
