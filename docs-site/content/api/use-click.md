# useClick

The `useClick` composable attaches click handlers for opening/toggling a floating element and optional outside-click dismissal. Works with either a `FloatingContext` or a `TreeNode<FloatingContext>` for tree-aware behavior.

## Signature

```ts
function useClick(
  context: FloatingContext | TreeNode<FloatingContext>,
  options?: UseClickOptions
): void
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| context | `FloatingContext \| TreeNode<FloatingContext>` | Yes | Floating context or tree node to control. |
| options | `UseClickOptions` | No | Configuration options. |

## Options

```ts
interface UseClickOptions {
  enabled?: MaybeRefOrGetter<boolean>
  event?: MaybeRefOrGetter<'click' | 'mousedown'>
  toggle?: MaybeRefOrGetter<boolean>
  ignoreMouse?: MaybeRefOrGetter<boolean>
  ignoreKeyboard?: MaybeRefOrGetter<boolean>
  ignoreTouch?: MaybeRefOrGetter<boolean>
  outsideClick?: MaybeRefOrGetter<boolean>
  outsideEvent?: MaybeRefOrGetter<'pointerdown' | 'mousedown' | 'click'>
  outsideCapture?: MaybeRefOrGetter<boolean>
  onOutsideClick?: (event: MouseEvent, context: FloatingContext) => void
  preventScrollbarClick?: MaybeRefOrGetter<boolean>
  handleDragEvents?: MaybeRefOrGetter<boolean>
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | `MaybeRefOrGetter<boolean>` | `true` | Enable/disable click interaction. |
| event | `MaybeRefOrGetter<'click' \| 'mousedown'>` | `'click'` | Inside click trigger event. |
| toggle | `MaybeRefOrGetter<boolean>` | `true` | Toggle open state on reference click. |
| ignoreMouse | `MaybeRefOrGetter<boolean>` | `false` | Ignore mouse events. |
| ignoreKeyboard | `MaybeRefOrGetter<boolean>` | `false` | Ignore Enter/Space keyboard activation. |
| ignoreTouch | `MaybeRefOrGetter<boolean>` | `false` | Ignore touch events. |
| outsideClick | `MaybeRefOrGetter<boolean>` | `false` | Enable outside-click dismissal. |
| outsideEvent | `MaybeRefOrGetter<'pointerdown' \| 'mousedown' \| 'click'>` | `'pointerdown'` | Event used for outside detection. |
| outsideCapture | `MaybeRefOrGetter<boolean>` | `true` | Use capture phase for outside listener. |
| onOutsideClick | `(event, context) => void` | `undefined` | Custom outside-click handler. |
| preventScrollbarClick | `MaybeRefOrGetter<boolean>` | `true` | Ignore scrollbar clicks. |
| handleDragEvents | `MaybeRefOrGetter<boolean>` | `true` | Handle drag-in/out sequences. |

## Return Value

`void` — listeners are attached for you.

## Examples

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClick } from 'v-float'

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const ctx = useFloating(referenceRef, floatingRef)
useClick(ctx)
</script>
```

### With Outside Click

```vue
<script setup lang="ts">
useClick(ctx, { outsideClick: true, outsideEvent: 'pointerdown' })
</script>
```

## See Also

- [useEscapeKey](/api/use-escape-key)
- [useFocus](/api/use-focus)
- [useFloatingTree](/api/use-floating-tree)
