# Start Here

This is the narrative entry point for VFloat. If you are new to the library, read this page first, then follow the reading order for the deeper workflow pages.

## What To Read Next

- [Philosophy](/guide/philosophy) for the mental model and product boundaries.
- [Reading Order](/guide/reading-order) for the shortest path through the docs.
- [Core Concepts](/guide/concepts) when you want to understand the context object.

## Your First Floating Element

Install VFloat with the package manager you already use:

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

Then wire a floating context, attach click behavior, and let VFloat handle the positioning:

```vue
<script setup lang="ts">
import { ref } from "vue"
import { offset, useClick, useEscapeKey, useFloating } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(8)],
})

useClick(context, { closeOnOutsideClick: true })
useEscapeKey(context)
</script>

<template>
  <button ref="anchorEl">Toggle tooltip</button>

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
When you open or close the context manually, keep the state transition descriptive and use the API reference when you need the exact visibility API.
:::

## How The Guide Is Organized

- [Core Concepts](/guide/concepts) explains the anchor, floating element, and context model.
- [Interactions](/guide/interactions) shows how to combine click, hover, focus, and dismissal.
- [Middleware](/guide/middleware) explains how to tune placement after the core position is computed.
- [Virtual Elements](/guide/virtual-elements), [Keyboard List Navigation](/guide/list-navigation), and [Safe Polygon](/guide/safe-polygon) cover advanced recipes.

## When You Need The Exact Contract

- [`useFloating`](/api/use-floating)
- [`useClick`](/api/use-click)
- [`useHover`](/api/use-hover)
- [`useEscapeKey`](/api/use-escape-key)
