---
description: What VFloat is, what problem it solves, and how the pieces fit together.
---

# Introduction

Floating elements look simple until you build one. A tooltip that sits above a button needs to flip when it hits the viewport edge. A dropdown menu needs arrow-key navigation, focus management, and Escape-to-close. A dialog needs to trap focus and return it when dismissed. Each of these is a small project on its own, and getting them all right in a consistent way is harder than it should be.

VFloat gives you composable primitives for all of it. Not components with opinions about your markup or design — just the positioning, interaction, and coordination logic that makes floating surfaces behave correctly.

## One Example, Three Layers

Every VFloat surface is built from three pieces:

**Context** — [`useFloatingContext`](/api/use-floating-context) creates a shared object that holds your element refs and open state. Everything else plugs into it.

```ts
const context = useFloatingContext({ refs: { anchorEl, floatingEl } });
```

**Positioning** — [`usePosition`](/api/use-position) reads those refs and computes where the floating element should go, returning `styles` you bind to the template.

```ts
const { styles } = usePosition(context, {
  placement: "top",
  middleware: { offset: 8 },
});
```

**Interaction** — [`useHover`](/api/use-hover) and [`useEscapeKey`](/api/use-escape-key) listen for events and call `context.state.setOpen()` with a reason. They don't know about positioning. They don't need to. They share the same context.

```ts
useHover(context);
useEscapeKey(context);
```

Put together, a tooltip is just a context, some positioning, and a few interaction composables. The [first tooltip guide](/guide/first-tooltip) walks through the full component — template, refs, and lifecycle — step by step.

## Composition Over Configuration

That three-layer split is the whole idea. You don't configure a "tooltip mode" or a "popover mode." You assemble the behavior you need from individual composables.

Swap `useHover` for [`useClick`](/api/use-click) and you've got a popover:

```ts
useClick(context);
useOutsideClick(context);
useEscapeKey(context);
```

Add [`useListNavigation`](/api/use-list-navigation) and a [`useCollection`](/api/use-collection) and you're building a keyboard-navigable menu. Add [`useFocusTrap`](/api/use-focus-trap) and you've got a dialog. The context stays the same — you just change which composables plug into it.

Middlewares work the same way. Start with [`offset`](/api/offset) for spacing. Layer in [`flip`](/api/flip) when the surface should switch sides near a viewport edge, [`shift`](/api/shift) to keep it in view, [`size`](/api/size) to constrain its dimensions, or [`arrow`](/api/arrow) to point it back at the anchor.

## What VFloat Is Not

VFloat does not ship components. There is no `<VTooltip>` or `<VDropdown>` to drop into your template. You write the markup, apply the styles, and make the design decisions. VFloat handles the logic underneath.

That means VFloat works with any visual design, any CSS framework, and any component system you already have. It also means you're responsible for the parts VFloat doesn't touch: transitions, styling, and the visual details that make the surface feel right in your product.

## Relationship To Floating UI

VFloat draws heavily from [Floating UI](https://floating-ui.com). The middleware pipeline — offset, flip, shift, size, arrow, hide, autoPlacement — follows the same model. Some composable names will look familiar.

But VFloat is its own library with its own API shape. It uses `anchorEl` and `floatingEl` instead of `reference` and `floating`. It centers everything around a shared `context` object rather than passing individual refs to each function. If you're coming from Floating UI, the concepts will transfer — the call sites won't. Follow the VFloat docs rather than copying Floating UI examples directly.

## Where To Go Next

If this is your first time with VFloat, [build a tooltip](/guide/first-tooltip) step by step. It walks through each piece in order.

If you already know what you're building, pick the closest guide:

- [Build Accessible Tooltips](/guide/build-accessible-tooltips) — hover and focus triggers, ARIA roles, delay behavior
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) — click triggers, outside click dismissal, richer content
- [Build Nested Menus](/guide/build-nested-menus) — keyboard navigation, submenus, tree coordination
- [Build Dialogs and Modals](/guide/build-dialogs-and-modals) — focus trapping, modal behavior, return focus
- [Use Virtual Anchors](/guide/use-virtual-anchors) — context menus, cursor-following surfaces, coordinate-based positioning

When you need exact signatures and defaults, the [API Reference](/api/) has every option and return value documented.
