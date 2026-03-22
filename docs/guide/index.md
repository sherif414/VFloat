# Getting Started

VFloat is a Vue 3 positioning library for building tooltips, dropdowns, popovers, and menus. It provides precise positioning and interaction handling.

## The Basics

Start by installing VFloat using your preferred package manager.

::: code-group

```bash [pnpm]
pnpm add v-float
```

```bash [npm]
npm install v-float
```

```bash [yarn]
yarn add v-float
```

:::

The most basic usage involves importing `useFloating`, defining your template refs, and passing them to the composable. VFloat will calculate the correct styles to position the floating element next to the anchor.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: 'top',
})

const toggle = () => {
  context.setOpen(!context.open.value, 'click')
}
</script>

<template>
  <button ref="anchorEl" @click="toggle">
    Toggle Tooltip
  </button>

  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    This is a positioned tooltip.
  </div>
</template>
```

::: tip
`setOpen` accepts an optional `reason` string (like `'click'` or `'hover'`) as its second argument, which is useful when coordinating complex interactions or debugging why an element opened or closed.
:::

## Deep Dive

VFloat follows Vue's composition pattern. You combine the core positioning engine (`useFloating`) with interaction composables (like `useHover` or `useClick`) to build rich behaviors without manually wiring event listeners.

When you initialize `useFloating`, it returns a `FloatingContext`. This context is the single source of truth for the `open` state and the elements' refs, and you pass it to any interaction composables you want to use.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useHover, useFocus, useEscapeKey } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

// 1. Core positioning
const context = useFloating(anchorEl, floatingEl, {
  placement: 'bottom-start',
})

// 2. Compose interactions
useHover(context, { delay: 200 })
useFocus(context)
useEscapeKey(context, {
  onEscape: () => context.setOpen(false, 'escape-key')
})
</script>

<template>
  <button ref="anchorEl">Hover or Focus me</button>
  
  <div
    v-if="context.open.value"
    ref="floatingEl"
    :style="context.floatingStyles.value"
  >
    Accessible Tooltip Content
  </div>
</template>
```

::: warning
Always remember to use `ref<HTMLElement | null>(null)` for your template refs. VFloat relies on these refs to measure and attach events to the actual DOM elements.
:::

## Further Reading

- [Core Concepts](/guide/concepts)
- [Interactions](/guide/interactions)
- [`useFloating` API](/api/use-floating)
