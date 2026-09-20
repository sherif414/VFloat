---
description: Learn how placements, strategies, and middleware shape the final position.
---

# Placement and Positioning

Positioning is usually the first part of VFloat people notice, so it helps to be clear about what the library is actually doing.

VFloat computes where the floating surface should sit relative to an anchor, then refines that result with placement, strategy, transforms, middleware, and the current layout.

## Placement: the intended side and alignment

Placement is the first instruction you give the positioning engine.

Examples:

- `"top"`
- `"bottom-start"`
- `"right-end"`

The side answers where the floating surface should appear. The optional `-start` or `-end` suffix answers how it should align along that side.

## The anchor can be real or virtual

Most of the time the anchor is a real `HTMLElement`. Sometimes it is a virtual element with a `getBoundingClientRect()` method.

That matters because VFloat's positioning model is based on geometry, not on the visual appearance of a particular component type.

## Positioning is computed, not hardcoded

[`usePosition`](/api/use-position) calculates the active coordinates and styles for your floating node.

### Automatic style application by default

By default (`applyStyles: true`), `usePosition` automatically synchronizes positioning styles (`position`, `top`, `left`, `transform`, `will-change`) directly onto your floating DOM element (`node.refs.floatingEl`).

Similarly, [`useArrow`](/api/use-arrow) automatically synchronizes computed physical insets (`top`, `bottom`, `left`, `right`) directly onto your arrow DOM element (`node.refs.arrowEl`).

This means you do not need to bind `:style="styles"` or `:style="arrowStyles"` in your templates for standard floating surfaces.

### Manual control and custom applicators

When you need custom styling pipelines, transitions, or manual binding:

- **Disable automatic binding:** Pass `{ applyStyles: false }` to `usePosition` or `useArrow`. Reactive `styles` (or `arrowStyles`) remains available on the returned object to bind manually with `:style="styles"`.
- **Custom style applicators:** Pass a custom callback `applyStyles(element, styles)` to `usePosition` or `useArrow` to intercept and apply styles with custom animation libraries, CSS transforms, or cleanup routines.

When you need deeper inspection into layout math, `usePosition` also returns `placement`, `middlewareData`, `isPositioned`, and `update`.

## Positioning does not equal interaction

One of the easiest mistakes in floating UI is to blur the line between where a surface should appear and when it should exist.

VFloat keeps these separate on purpose:

- Shared refs and open state belong to `useFloatingNode()`
- Positioning belongs to `usePosition()` and middlewares
- Interaction belongs to composables like `useHover()` and `useClick()`

## Where to go next

- Read [Middleware Pipeline](/guide/middleware-pipeline) for the next layer of positioning logic.
- Read [Use Virtual Anchors](/guide/use-virtual-anchors) if your anchor is synthetic rather than a real element.
- Read [Keep Content in View](/guide/keep-content-in-view) for practical middleware stacks.
