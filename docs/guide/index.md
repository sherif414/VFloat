---
description: Learn the VFloat mental model before building your first floating surface.
---

# Introduction

VFloat is a Vue toolkit for building anchored floating interfaces.

It helps with the parts that are easy to get subtly wrong: placing a floating element near an anchor, keeping it in view, coordinating open state, and composing interactions such as hover, click, focus, escape key handling, and keyboard navigation.

It is not a component library. VFloat does not give you a finished dropdown, tooltip, menu, or dialog with a fixed visual design. You bring the markup and product decisions. VFloat gives you the primitives that make those surfaces behave.

## The Mental Model

Every floating surface starts with three pieces:

- `anchorEl` is the element the floating surface is positioned against.
- `floatingEl` is the element that moves.
- `context` is the shared object that lets VFloat composables cooperate.

Create the context first:

```ts
const context = useFloatingContext(anchorEl, floatingEl);
```

[`useFloatingContext`](/api/use-floating-context) owns the shared parts of a floating surface:

- `context.refs` stores the anchor, floating, and arrow refs.
- `context.state.open` stores whether the surface is open.
- `context.state.setOpen()` updates that state with a reason and optional event.

The context does not compute coordinates. It is the shared root that positioning and interaction composables attach to.

## Add Positioning When You Need It

Most anchored surfaces need JavaScript positioning. Add [`usePosition`](/api/use-position) after creating the context:

```ts
const { styles } = usePosition(context, {
  placement: "bottom-start",
});
```

`usePosition` reads `context.refs.anchorEl` and `context.refs.floatingEl`, then returns geometry for the floating element. The field you usually bind is `styles`:

```vue
<div v-if="context.state.open.value" ref="floatingEl" :style="styles">
  Floating content
</div>
```

That separation is important:

- `useFloatingContext` owns refs and open state.
- `usePosition` owns placement, generated styles, auto-update wiring, and middlewares.
- Interaction composables own the events that open, close, or navigate the surface.

## Compose The Behavior You Want

A tooltip, popover, menu, and dialog can all share the same basic shape, but they use different behavior composables.

```ts
const context = useFloatingContext(anchorEl, floatingEl);
const { styles } = usePosition(context, {
  placement: "top",
  middleware: {
    offset: 8,
  },
});

useHover(context);
useEscapeKey(context);
```

In this example, [`useHover`](/api/use-hover) decides when the surface opens, [`useEscapeKey`](/api/use-escape-key) lets the user close it with Escape, and `usePosition` decides where it appears.

Middlewares refine the computed position. Start with [`offset`](/api/offset) for spacing. Add [`flip`](/api/flip), [`shift`](/api/shift), [`size`](/api/size), or [`arrow`](/api/arrow) when the surface needs to respond to viewport edges, available space, or an arrow element.

## VFloat And Floating UI

VFloat is heavily inspired by Floating UI, and some names will feel familiar if you have used it before. It is still its own Vue-first library with its own public shape.

When in doubt, follow the VFloat docs and API pages rather than copying Floating UI examples directly. VFloat examples use `anchorEl`, `floatingEl`, and a shared `context` object.

## How To Read These Docs

Use the guide when you want workflows, mental models, and examples. Use the [API Reference](/api/) when you need exact signatures, options, defaults, and return values.

If you are new to VFloat, go to [First Tooltip](/guide/first-tooltip) next. It builds a small floating surface and shows the main pieces in one place.

If you already know what you are building, jump to the closest guide:

- Tooltip: [Build Accessible Tooltips](/guide/build-accessible-tooltips)
- Popover or dropdown: [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
- Context menu or cursor-following UI: [Use Virtual Anchors](/guide/use-virtual-anchors)
- Nested menu: [Build Nested Menus](/guide/build-nested-menus)
- Dialog: [Build Dialogs and Modals](/guide/build-dialogs-and-modals)
