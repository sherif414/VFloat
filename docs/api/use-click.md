# useClick

Enables click interactions for opening, toggling, and optionally closing a floating element when clicking outside.

## Type

```ts
function useClick(
  context: UseClickContext,
  options?: UseClickOptions
): void

interface UseClickContext {
  refs: { anchorEl: Ref<HTMLElement | null>; floatingEl: Ref<HTMLElement | null> }
  open: Ref<boolean>
  setOpen: (open: boolean, reason?: string, event?: Event) => void
}

interface UseClickOptions {
  // Inside click options
  enabled?: MaybeRefOrGetter<boolean>
  event?: MaybeRefOrGetter<'click' | 'mousedown'>
  toggle?: MaybeRefOrGetter<boolean>
  ignoreMouse?: MaybeRefOrGetter<boolean>
  ignoreKeyboard?: MaybeRefOrGetter<boolean>
  ignoreTouch?: MaybeRefOrGetter<boolean>

  // Outside click options
  closeOnOutsideClick?: MaybeRefOrGetter<boolean>
  outsideClickEvent?: MaybeRefOrGetter<'pointerdown' | 'mousedown' | 'click'>
  outsideCapture?: MaybeRefOrGetter<boolean>
  onOutsideClick?: (event: MouseEvent) => void
  ignoreScrollbar?: MaybeRefOrGetter<boolean>
  ignoreDrag?: MaybeRefOrGetter<boolean>
}
```

## Details

This composable attaches event listeners to the anchor element for click-based interactions. It handles:

- **Inside clicks**: Opens or toggles the floating element when clicking the anchor
- **Keyboard activation**: Supports `Enter` and `Space` keys for accessibility
- **Outside clicks**: Optionally closes when clicking outside both anchor and floating elements

**Option defaults:**

- `enabled`: `true`
- `event`: `'click'`
- `toggle`: `true`
- `ignoreMouse`: `false`
- `ignoreKeyboard`: `false`
- `ignoreTouch`: `false`
- `closeOnOutsideClick`: `false`
- `outsideClickEvent`: `'pointerdown'`
- `outsideCapture`: `true`
- `ignoreScrollbar`: `true`
- `ignoreDrag`: `true`

::: tip
All options accept reactive values (`Ref`, `ComputedRef`, or getter functions) for dynamic control.
:::

## Example

### Basic Toggle

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)
useClick(context) // [!code focus]
</script>

<template>
  <button ref="anchorEl">Click Me</button>
  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Floating content
  </div>
</template>
```

### With Outside Click

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)
useClick(context, {
  closeOnOutsideClick: true, // [!code focus]
  outsideClickEvent: 'pointerdown' // [!code focus]
})
</script>

<template>
  <button ref="anchorEl">Click Me</button>
  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Click outside to close
  </div>
</template>
```

### Custom Outside Click Handler

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)
useClick(context, {
  closeOnOutsideClick: true,
  onOutsideClick: (event) => { // [!code focus]
    console.log('Outside click:', event.target) // [!code focus]
    context.setOpen(false, 'custom-dismiss', event) // [!code focus]
  } // [!code focus]
})
</script>
```

### Open Only (No Toggle)

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick, useEscapeKey } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)

// Click only opens, use other means to close
useClick(context, { toggle: false }) // [!code focus]
useEscapeKey(context)
</script>
```

### Mousedown Trigger

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, useClick } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)
useClick(context, { event: 'mousedown' }) // More responsive // [!code focus]
</script>
```

## See Also

- [Interactions Guide](/guide/interactions) - Composing multiple interactions
- [`useHover`](/api/use-hover) - Hover-based interactions
- [`useFocus`](/api/use-focus) - Focus-based interactions
- [`useEscapeKey`](/api/use-escape-key) - Keyboard dismissal
- [`useFocusTrap`](/api/use-focus-trap) - Focus management for modals
