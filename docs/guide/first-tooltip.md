---
description: Build your first floating surface — a tooltip that opens on hover and stays in view.
---

# First Tooltip

A tooltip is the smallest floating surface you can build. That's what makes it the right first example — it uses every core VFloat piece without piling on complexity.

By the end of this page you'll have a tooltip that appears above a button on hover, closes when the pointer leaves, and keeps a small gap between itself and the trigger.

::: demo src="./demos/first-tooltip-demo.vue" title="A small tooltip"
:::

## Install

```sh
vp add v-float
```

If your project doesn't use Vite+, install `v-float` with your package manager instead.

## The Complete Example

Here's the full working code. We'll take it apart after.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
const { styles } = usePosition(context, {
  placement: "top",
  middleware: { offset: 8 },
});

useHover(context);
</script>

<template>
  <button ref="anchorEl" type="button">Save changes</button>

  <div v-if="context.state.open.value" ref="floatingEl" role="tooltip" :style="styles">
    This button saves your changes.
  </div>
</template>
```

That's the whole thing. Three composables, two refs, one template. Let's walk through what each piece does.

## Two Refs Connect The DOM

```ts
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
```

VFloat needs to know about two DOM elements: the thing the surface is positioned against (the button), and the surface itself (the tooltip). These refs are the bridge between the template and the composables.

Bind them in the template with `ref="anchorEl"` and `ref="floatingEl"`, and VFloat can read their geometry once they render.

## The Context Ties Everything Together

```ts
const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
```

[`useFloatingContext`](/api/use-floating-context) creates a shared `context` object. It holds two things you'll use constantly:

- **`context.refs`** — the anchor, floating, and arrow element refs. Every other composable reads from here.
- **`context.state.open`** — a boolean ref that tracks whether the surface is currently visible. Interaction composables flip this on and off.

The context doesn't position anything. It doesn't listen for hover or click events. It's just the shared root that every other composable plugs into. Think of it as the wiring harness — nothing happens without it, but it doesn't do the work itself.

## Positioning Computes The Coordinates

```ts
const { styles } = usePosition(context, {
  placement: "top",
  middleware: { offset: 8 },
});
```

[`usePosition`](/api/use-position) reads the anchor and floating element from the context, computes where the floating element should go, and returns `styles` — a ref you bind directly to the template with `:style="styles"`.

Two options matter here:

**`placement: "top"`** puts the tooltip above the button. VFloat supports all twelve placements: `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`, and the same six for `left` and `right`.

**`middleware: { offset: 8 }`** adds an 8-pixel gap between the anchor and the tooltip. Without it, the tooltip sits flush against the button — technically correct, but visually cramped. [`offset`](/api/offset) is the simplest middleware, and the one you'll reach for most often.

Middlewares are small functions that adjust the final position. You'll add more as the surface needs to respond to viewport edges ([`flip`](/api/flip), [`shift`](/api/shift)), constrain its size ([`size`](/api/size)), or point an arrow back at the anchor ([`arrow`](/api/arrow)). For a tooltip, offset alone is enough.

## Hover Behavior Is One Line

```ts
useHover(context);
```

[`useHover`](/api/use-hover) listens for pointer enter and leave events on the anchor and updates `context.state.open` automatically. You don't write event handlers. You don't manage timeouts. The composable reads the element refs from the context and writes open state back to it.

## The Template Has Three Key Bindings

```vue
<button ref="anchorEl" type="button">Save changes</button>

<div v-if="context.state.open.value" ref="floatingEl" role="tooltip" :style="styles">
  This button saves your changes.
</div>
```

Three lines do real work:

- **`ref="anchorEl"`** and **`ref="floatingEl"`** give VFloat access to the rendered DOM nodes. Without these, the composables have nothing to position and nothing to listen to.
- **`v-if="context.state.open.value"`** mounts and unmounts the tooltip based on the shared open state. When `useHover` sets it to `true`, the tooltip appears. When it sets it to `false`, the tooltip disappears.
- **`:style="styles"`** applies the computed position. This is the output of `usePosition` — the coordinates that place the tooltip above the button with an 8-pixel gap.

The `role="tooltip"` attribute tells assistive technology what the element is. It's not required for VFloat to function, but it matters for accessibility.

## What Happens When

Tracing the full lifecycle helps the pieces click:

1. The page renders. Both refs are `null` — the tooltip isn't in the DOM yet.
2. The button renders and `anchorEl` gets a real DOM node.
3. The user hovers the button. `useHover` detects `pointerenter` and calls `context.state.setOpen(true, ...)`.
4. `context.state.open.value` becomes `true`. The `v-if` mounts the tooltip. `floatingEl` gets a real DOM node.
5. `usePosition` reads both element rects, applies `placement: "top"` and `offset: 8`, and writes the result to `styles`.
6. The tooltip appears above the button with the correct gap.
7. The pointer leaves. `useHover` calls `setOpen(false, ...)`. The `v-if` unmounts the tooltip.

That loop — hover in, open, position, hover out, close — is the same for every floating surface. The composables change; the context and the template bindings stay the same.

## Where To Go Next

This tooltip opens on hover but ignores keyboard users entirely. [Build Accessible Tooltips](/guide/build-accessible-tooltips) adds focus behavior, safe polygon support, and proper ARIA wiring.

If you want a click-driven surface instead, [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) swaps `useHover` for `useClick` and adds outside-click dismissal.

For a deeper look at the shared context, [Floating Context](/guide/floating-context) explains the `refs` and `state` groups in detail.
