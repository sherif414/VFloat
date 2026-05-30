---
description: Learn the VFloat mental model before building your first floating surface.
---

# Introduction

VFloat is a Vue toolkit for building anchored floating interfaces.

It helps with the parts that are easy to get subtly wrong: positioning a floating element next to an anchor, keeping it in view, coordinating open state, and composing interactions such as hover, click, focus, escape key handling, and keyboard navigation.

It is not a component library. VFloat does not give you a finished dropdown, tooltip, menu, or dialog with a fixed visual design. You bring the markup, styling, and product decisions. VFloat gives you the positioning and interaction primitives.

## The Core Shape

Most VFloat examples start with two element refs.

- `anchorEl` is the element the floating surface is positioned against.
- `floatingEl` is the element that moves.

You pass both refs to [`useFloatingContext`](/api/use-floating-context):

```ts
const context = useFloatingContext(anchorEl, floatingEl);
const { styles } = usePosition(context, {
  placement: "bottom-start",
});
```

The returned `context` is the shared object for the rest of the floating behavior.

- `context.refs` keeps the registered elements.
- `context.state` owns open state.
- `styles` contains the computed CSS you bind to the floating element.

In templates, the most common binding is:

```vue
<div ref="floatingEl" :style="styles">
  Floating content
</div>
```

That style binding is what moves the floating element to its computed position.

## Middlewares Adjust Placement

The initial `placement` says where the surface should prefer to go. `middlewares` refine that result.

```ts
const context = useFloatingContext(anchorEl, floatingEl);
const { styles } = usePosition(context, {
  placement: "bottom-start",
  middlewares: [offset(8), flip(), shift()],
});
```

[`offset`](/api/offset) adds space between the anchor and the floating element. [`flip`](/api/flip) can choose the opposite side when there is not enough room. [`shift`](/api/shift) nudges the surface back into view.

You can start with only `offset`. Add more middleware when the surface needs to respond to viewport edges, arrows, available size, or hidden anchors.

## Interactions Compose Around Context

Positioning alone does not decide when a surface opens. Interaction composables use the same `context` to update open state.

```ts
const context = useFloatingContext(anchorEl, floatingEl);

useHover(context);
useEscapeKey(context);
```

That pattern lets you build the interaction model that matches the surface. A tooltip might use hover and focus. A popover might use click and escape. A menu might add list navigation and tree coordination.

## VFloat And Floating UI

VFloat is heavily inspired by Floating UI, and some names will feel familiar if you have used it before. It is still its own Vue-first library with its own public shape.

The stable root call is:

```ts
useFloatingContext(anchorEl, floatingEl, options);
```

The grouped return value uses VFloat's `refs`, `state`, and `position` vocabulary. When in doubt, follow the VFloat docs and API pages rather than copying Floating UI examples directly.

## How To Read These Docs

Use the guide when you want workflows, mental models, and examples. Use the [API Reference](/api/) when you need exact option names, defaults, signatures, and return values.

If you are new to VFloat, go to [First Tooltip](/guide/first-tooltip) next. It builds a small floating surface and shows the main pieces in one place.

If you already know what you are building, jump to the closest guide:

- Tooltip: [Build Accessible Tooltips](/guide/build-accessible-tooltips)
- Popover or dropdown: [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns)
- Context menu or cursor-following UI: [Use Virtual Anchors](/guide/use-virtual-anchors)
- Nested menu: [Build Nested Menus](/guide/build-nested-menus)
- Dialog: [Build Dialogs and Modals](/guide/build-dialogs-and-modals)
