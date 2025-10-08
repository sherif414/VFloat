# useClientPoint

The `useClientPoint` composable positions floating elements relative to the user's pointer by updating the floating context's anchor to a virtual element at the pointer coordinates.

## Signature

```ts
function useClientPoint(
  pointerTarget: Ref<HTMLElement | null>,
  context: UseClientPointContext,
  options?: UseClientPointOptions
): UseClientPointReturn
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pointerTarget | `Ref<HTMLElement | null>` | Yes | Element whose pointer events are tracked. `null` disables tracking. |
| context | `UseClientPointContext` | Yes | Floating context created by `useFloating`. Updates its `refs.anchorEl` to a virtual element. |
| options | `UseClientPointOptions` | No | Configuration options. |

## Options

```ts
interface UseClientPointOptions {
  enabled?: MaybeRefOrGetter<boolean>
  axis?: MaybeRefOrGetter<'x' | 'y' | 'both'>
  trackingMode?: 'follow' | 'static'
  x?: MaybeRefOrGetter<number | null>
  y?: MaybeRefOrGetter<number | null>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable pointer tracking. |
| axis | `MaybeRefOrGetter<'x' | 'y' | 'both'>` | `'both'` | Constrain movement to an axis. |
| trackingMode | `'follow' | 'static'` | `'follow'` | Follow pointer continuously or keep initial point. |
| x | `MaybeRefOrGetter<number | null>` | `null` | External X coordinate for controlled mode. |
| y | `MaybeRefOrGetter<number | null>` | `null` | External Y coordinate for controlled mode. |

## Return Value

```ts
interface UseClientPointReturn {
  coordinates: Readonly<Ref<{ x: number | null; y: number | null }>>
  updatePosition: (x: number, y: number) => void
}
```

| Property | Type | Description |
|----------|------|-------------|
| coordinates | `Readonly<Ref<{ x: number | null; y: number | null }>>` | Current pointer/controlled coordinates. |
| updatePosition | `(x: number, y: number) => void` | Programmatically update position (used in controlled mode). |

## Examples

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClientPoint, useHover } from 'v-float'

const anchor = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)
const trackingArea = ref<HTMLElement | null>(null)

const ctx = useFloating(anchor, floating)
useHover(ctx)
useClientPoint(trackingArea, ctx)
</script>
```

### Controlled Mode

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClientPoint } from 'v-float'

const area = ref<HTMLElement | null>(null)
const anchor = ref<HTMLElement | null>(null)
const el = ref<HTMLElement | null>(null)
const x = ref<number | null>(200)
const y = ref<number | null>(100)

const ctx = useFloating(anchor, el)
useClientPoint(area, ctx, { x, y })
</script>
```

## See Also

- [useFloating](/api/use-floating)
- [useHover](/api/use-hover)