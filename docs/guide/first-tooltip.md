---
description: Build your first floating surface, a tooltip that opens on hover and stays in view.
---

# First Tooltip

A tooltip is the smallest floating surface you can build. That makes it the ideal first example because it uses every core VFloat piece without extra complexity.

By the end of this page you will have a tooltip that appears above a button on hover, closes when the pointer leaves, and keeps a small gap between itself and the trigger.

::: demo src="./demos/first-tooltip-demo.vue" title="A small tooltip"
:::

## Install

```sh
pnpm add v-float
```

## The complete example

Here is the full working code. We will take it apart section by section right after.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, {
  placement: "top",
  middlewares: { offset: 8 },
});

useHover(context);
</script>

<template>
  <button ref="anchorEl" type="button">Save changes</button>

  <div v-if="context.open.value" ref="floatingEl" role="tooltip" :style="styles">
    This button saves your changes.
  </div>
</template>
```

That is the entire component: three composables, two refs, and one template. Let us walk through what each piece does.

## Two refs connect the DOM

```ts
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
```

VFloat needs to know about two DOM elements: the thing the surface is positioned against (the button), and the surface itself (the tooltip). These refs form the bridge between your template and the composables.

Bind them in the template with `ref="anchorEl"` and `ref="floatingEl"`, and VFloat reads their geometry once they render.

## The context ties everything together

```ts
const context = useFloatingNode({ anchorEl, floatingEl });
```

[`useFloatingNode`](/api/use-floating-node) creates a shared `context` object. It is a flat object without a nested `state` wrapper, holding the pieces you will use constantly:

- **`context.refs`**: the anchor, floating, and arrow element refs. Every companion composable reads from here.
- **`context.open`**: a boolean ref that tracks whether the surface is currently visible. Interaction composables flip this on and off.
- **`context.setOpen`**: the function that changes open state. Call it directly when you need to open or close the surface yourself.

The context also exposes `lastOpenReason` and `lastOpenEvent` so you can inspect why the surface last opened.

The context does not position elements and does not bind DOM event listeners. It acts as the shared coordinator that every other composable plugs into. Nothing happens without it, but it delegates the actual work to the other composables.

## Positioning computes the coordinates

```ts
const { styles } = usePosition(context, {
  placement: "top",
  middlewares: { offset: 8 },
});
```

[`usePosition`](/api/use-position) reads the anchor and floating element from the context, computes where the floating element should go, and returns `styles`, a ref you bind directly to the template with `:style="styles"`.

Two options matter here:

**`placement: "top"`** puts the tooltip above the button. VFloat supports all twelve placements: `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`, and the corresponding six for `left` and `right`.

**`middlewares: { offset: 8 }`** adds an 8-pixel gap between the anchor and the tooltip. Without it, the tooltip sits flush against the button, which is technically correct but visually cramped. [`offset`](/api/offset) is the simplest middleware, and the one you will reach for most often.

Middlewares are small functions that adjust the final position. You will add more as the surface needs to respond to viewport edges ([`flip`](/api/flip), [`shift`](/api/shift)), constrain its size ([`size`](/api/size)), or point an arrow back at the anchor ([`arrow`](/api/arrow)). For a basic tooltip, offset alone is enough.

## Hover behavior is one line

```ts
useHover(context);
```

[`useHover`](/api/use-hover) listens for pointer enter and leave events on the anchor and updates `context.open` automatically. You do not need to write event handlers or manage timeout IDs. The composable reads the element refs from the context and writes open state back to it.

## The template has three key bindings

```vue
<button ref="anchorEl" type="button">Save changes</button>

<div v-if="context.open.value" ref="floatingEl" role="tooltip" :style="styles">
  This button saves your changes.
</div>
```

Three lines do real work:

- **`ref="anchorEl"` and `ref="floatingEl"`** give VFloat access to the rendered DOM nodes. Without these, the composables have nothing to position and nothing to listen to.
- **`v-if="context.open.value"`** mounts and unmounts the tooltip based on the shared open state. When `useHover` sets it to `true`, the tooltip appears. When it sets it to `false`, the tooltip disappears.
- **`:style="styles"`** applies the computed position. This is the output of `usePosition`: the coordinates that place the tooltip above the button with an 8-pixel gap.

The `role="tooltip"` attribute tells assistive technology what the element is. It is not required for VFloat to function, but it matters for accessibility.

## What happens at runtime

Tracing the full lifecycle clarifies how the pieces fit together:

1. The page renders. Both refs are `null` because the tooltip is not in the DOM yet.
2. The button renders and `anchorEl` receives a real DOM node.
3. The user hovers over the button. `useHover` detects `pointerenter` and calls `context.setOpen(true, "hover", event)`.
4. `context.open.value` becomes `true`. The `v-if` mounts the tooltip. `floatingEl` receives a real DOM node.
5. `usePosition` reads both element rects, applies `placement: "top"` and `offset: 8`, and writes the result to `styles`.
6. The tooltip appears above the button with the correct gap.
7. The pointer leaves. `useHover` calls `setOpen(false, "hover", event)`. The `v-if` unmounts the tooltip.

That loop (hover in, open, position, hover out, close) is the same for every floating surface. The interaction composables change; the context and the template bindings stay the same.

## Where to go next

This tooltip opens on hover but ignores keyboard users entirely. [Build Accessible Tooltips](/guide/build-accessible-tooltips) adds focus behavior, safe polygon support, and proper ARIA wiring.

If you want a click-driven surface instead, [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) swaps `useHover` for `useClick` and adds outside-click dismissal.

For a deeper look at the shared context, [Floating Context](/guide/floating-context) explains the flat node shape (`refs`, `open`, and `setOpen`) in detail.
