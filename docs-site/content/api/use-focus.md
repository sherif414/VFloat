# useFocus

The `useFocus` composable attaches focus-based handlers for showing/hiding a floating element. Supports `FloatingContext` and `TreeNode<FloatingContext>` for tree-aware behavior.

## Signature

```ts
function useFocus(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseFocusOptions
): UseFocusReturn
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Floating context or tree node to control. |
| options | `UseFocusOptions` | No | Configuration options. |

## Options

```ts
interface UseFocusOptions {
  enabled?: MaybeRefOrGetter<boolean>
  requireFocusVisible?: MaybeRefOrGetter<boolean>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable focus listeners. |
| requireFocusVisible | `MaybeRefOrGetter<boolean>` | `true` | Only open on focus-visible (keyboard). |

## Return Value

```ts
type UseFocusReturn = void // listeners are attached
```

`void` — listeners are attached for you.

## Examples

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useFocus } from 'v-float'

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const ctx = useFloating(referenceRef, floatingRef)
useFocus(ctx)
</script>
```

### With Options

```vue
<script setup lang="ts">
useFocus(ctx, { requireFocusVisible: false })
</script>
```

## See Also

- [useClick](/api/use-click)
- [useHover](/api/use-hover)
- [useFloatingTree](/api/use-floating-tree)
