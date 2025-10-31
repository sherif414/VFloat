# useEscapeKey

The `useEscapeKey` composable attaches a keydown listener for Escape to close a floating element. Supports `FloatingContext` and `TreeNode<FloatingContext>` for tree-aware dismissal.

## Signature

```ts
function useEscapeKey(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseEscapeKeyOptions
): void
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Floating context or tree node to control. |
| options | `UseEscapeKeyOptions` | No | Configuration options. |

## Options

```ts
interface UseEscapeKeyOptions {
  enabled?: MaybeRefOrGetter<boolean>
  capture?: boolean
  onEscape?: (event: KeyboardEvent) => void
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable the escape listener. |
| capture | `boolean` | `false` | Use capture phase for keydown listener. |
| onEscape | `(event: KeyboardEvent) => void` | — | Custom handler; overrides default close. |

## Return Value

`void` — a keydown listener is attached for you.

## Examples

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useEscapeKey } from 'v-float'

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const ctx = useFloating(referenceRef, floatingRef)
useEscapeKey(ctx)
</script>
```

### With Options

```vue
<script setup lang="ts">
useEscapeKey(ctx, { capture: true, onEscape: () => ctx.setOpen(false) })
</script>
```

## See Also

- [useClick](/api/use-click)
- [useFocus](/api/use-focus)
- [useFloatingTree](/api/use-floating-tree)
