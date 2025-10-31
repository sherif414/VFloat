# useHover

A composable that enables hover-based interactions for floating elements with support for delays, rest detection, and safe polygon traversal.

## Signature

```ts
function useHover(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseHoverOptions
): void
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Context from `useFloating` or tree node |
| options | `UseHoverOptions` | No | Configuration options |

## Options

```ts
interface UseHoverOptions {
  enabled?: MaybeRef<boolean>
  delay?: MaybeRef<number | { open?: number; close?: number }>
  restMs?: MaybeRef<number>
  mouseOnly?: MaybeRef<boolean>
  safePolygon?: MaybeRef<boolean | SafePolygonOptions>
}

interface SafePolygonOptions {
  buffer?: number
  blockPointerEvents?: boolean
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRef<boolean>` | `true` | Enable/disable hover listeners |
| delay | `MaybeRef<number \| object>` | `0` | Delay before showing/hiding (ms) |
| restMs | `MaybeRef<number>` | `0` | Time pointer must rest before opening (ms) |
| mouseOnly | `MaybeRef<boolean>` | `false` | Only trigger for mouse-like pointers |
| safePolygon | `MaybeRef<boolean \| SafePolygonOptions>` | `false` | Enable safe polygon traversal |

## Examples

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useHover } from 'v-float'

const anchorEl = ref(null)
const floatingEl = ref(null)

const context = useFloating(anchorEl, floatingEl)
useHover(context)
</script>

<template>
  <button ref="anchorEl">Hover me</button>
  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
    Tooltip
  </div>
</template>
```

### With Delay

```vue
<script setup>
import { useFloating, useHover } from 'v-float'

const context = useFloating(anchorEl, floatingEl)

useHover(context, {
  delay: 300
})
</script>
```

### Different Open/Close Delays

```vue
<script setup>
import { useFloating, useHover } from 'v-float'

const context = useFloating(anchorEl, floatingEl)

useHover(context, {
  delay: {
    open: 500,
    close: 150
  }
})
</script>
```

### With Safe Polygon

```vue
<script setup>
import { useFloating, useHover } from 'v-float'

const context = useFloating(anchorEl, floatingEl, {
  placement: 'right-start'
})

useHover(context, {
  safePolygon: true
})
</script>
```

### Mouse Only

```vue
<script setup>
import { useFloating, useHover } from 'v-float'

const context = useFloating(anchorEl, floatingEl)

useHover(context, {
  mouseOnly: true
})
</script>
```

### Tree-Aware (Nested Menus)

```vue
<script setup>
import { useFloating, useFloatingTree, useHover } from 'v-float'

const tree = useFloatingTree()

const parentContext = useFloating(parentRef, parentFloatingRef)
const parentNode = tree.addNode(parentRef, parentFloatingRef)

const childContext = useFloating(childRef, childFloatingRef)
const childNode = tree.addNode(childRef, childFloatingRef, { parentId: parentNode?.id })

useHover(parentNode, {
  delay: { open: 100, close: 300 },
  safePolygon: true
})

useHover(childNode, {
  delay: { open: 200, close: 300 }
})
</script>
```

### With Rest Detection

```vue
<script setup>
import { useFloating, useHover } from 'v-float'

const context = useFloating(anchorEl, floatingEl)

useHover(context, {
  restMs: 100
})
</script>
```

## See Also

- [useFocus](/api/use-focus) - Focus-based interactions
- [useClick](/api/use-click) - Click-based interactions
- [useFloatingTree](/api/use-floating-tree) - Tree structures for nested menus
- [useFloating](/api/use-floating) - Core positioning composable
