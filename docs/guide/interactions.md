# Interactions

Interactions decide when `open` changes. They sit on top of `useFloating`: the context gives you position and shared state, while interaction composables decide how users open and close the surface.

## Click Based Workflows

Use `useClick` when the trigger should toggle the floating element and optionally dismiss it when the user clicks outside.

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useClick, useEscapeKey, useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)

useClick(context, { closeOnOutsideClick: true })
useEscapeKey(context)
</script>

<template>
  <button ref="anchorEl">Toggle dropdown</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Dropdown content
  </div>
</template>
```

::: tip
`useClick` handles pointer and keyboard activation on the trigger for you. If you need to close the surface from your own code, use the context setter and check the API reference for the exact visibility API.
:::

## Hover And Focus Together

Tooltips usually need pointer hover and keyboard focus to behave the same way. Compose `useHover` and `useFocus` on the same context and let the shared `open` state keep them in sync.

```vue
<script setup lang="ts">
import { ref } from "vue"
import { useFocus, useFloating, useHover } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
})

useHover(context, {
  delay: { open: 150, close: 200 },
  safePolygon: true,
})

useFocus(context)
</script>

<template>
  <button ref="anchorEl">Hover or focus me</button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Tooltip content
  </div>
</template>
```

::: warning
When you combine `useClick` with `useHover`, guard the hover path if clicking should keep the surface open. Otherwise a `mouseleave` event can close a surface that the user explicitly opened.
:::

## Modal Surfaces

Dialogs and popovers that trap focus usually combine `useClick`, `useEscapeKey`, and `useFocusTrap`. The interaction layer stays responsible for visibility, while `useFocusTrap` keeps keyboard focus where it belongs.

## Further Reading

- [`useClick` API](/api/use-click)
- [`useHover` API](/api/use-hover)
- [`useFocus` API](/api/use-focus)
- [`useEscapeKey` API](/api/use-escape-key)
- [`useFocusTrap` API](/api/use-focus-trap)
