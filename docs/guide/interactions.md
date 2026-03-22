# Interactions

Interactions in VFloat are declarative composables that manage the visibility state (`open`) of your floating elements based on user input, such as clicks, hovers, and keyboard events.

## The Basics

Every interaction composable requires a `FloatingContext` (returned by `useFloating`) as its first argument. The context provides the shared `open` state and the `setOpen` method, allowing multiple interactions to coordinate seamlessly.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClick, useEscapeKey } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl)

// Open/close on click, and close when clicking outside
useClick(context, { closeOnOutsideClick: true })

// Close when the Escape key is pressed
useEscapeKey(context, {
  onEscape: () => context.setOpen(false, 'escape-key')
})
</script>

<template>
  <button ref="anchorEl">Toggle Dropdown</button>
  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Dropdown Content
  </div>
</template>
```

::: tip
Interaction composables automatically handle attaching and cleaning up event listeners on the `anchorEl` and `floatingEl`.
:::

## Deep Dive

You can stack multiple interactions to create accessible, robust components like tooltips or complex menus. Because they all share the same `FloatingContext`, they won't conflict.

### Combining Hover and Focus

A common pattern for tooltips is to show them on both mouse hover and keyboard focus.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useHover, useFocus } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: 'top'
})

// Add hover with a slight delay
useHover(context, { 
  delay: { open: 150, close: 200 } 
})

// Ensure keyboard accessibility
useFocus(context)
</script>

<template>
  <button ref="anchorEl">Hover or Tab to me</button>
  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    Tooltip Content
  </div>
</template>
```

### Conditionally Enabling Interactions

Sometimes interactions can clash logically. For example, if you have an element that opens on click, but you *also* want to let users hover to preview it, you might accidentally close a clicked-open element when the mouse leaves. 

You can solve this by using the `enabled` option to conditionally disable an interaction.

```ts
import { computed } from 'vue'

// Only allow hover to open the popover if it isn't already open
useHover(context, { 
  enabled: computed(() => !context.open.value) 
})

// Click always works and takes precedence
useClick(context)
```

::: warning
When using `useClick` and `useHover` together, always consider how state transitions happen. If `useHover` isn't conditionally disabled, a `mouseleave` event will fire and call `context.setOpen(false, 'hover')`, even if the user explicitly clicked to keep the menu open.
:::

## Further Reading

- [`useClick` API](/api/use-click)
- [`useHover` API](/api/use-hover)
- [`useFocus` API](/api/use-focus)
- [`useEscapeKey` API](/api/use-escape-key)
