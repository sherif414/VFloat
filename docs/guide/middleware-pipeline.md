---
description: Understand how middleware runs and how each step affects positioning.
---

# Middleware Pipeline

Middleware is what makes VFloat feel adaptable instead of rigid.

Without middleware, you get a base placement. With middleware options, that first guess can react to spacing, collisions, size constraints, and arrow alignment.

## Base Placement Comes First

Every floating surface starts with a placement such as `"bottom"` or `"top-start"`.

That gives VFloat an initial answer to the question: where should this surface appear if nothing gets in the way?

Then VFloat turns the middleware options into a pipeline.

## Middleware Is A Pipeline, Not A Bag

The easiest mistake is to think of middleware options as a list of independent features. In practice, VFloat turns them into middleware that run in order and influence each other.

That is why the stack below is not equivalent to the same helpers in a different order.

```ts
middleware: {
  offset: 8,
  flip: true,
  shift: { padding: 8 },
};
```

is not equivalent to the same helpers in a different order.

## Common Roles In The Pipeline

VFloat's declarative `middleware` keys run in a fixed order: `inline`, `offset`, `flip`, `shift`, `matchWidth`, then `custom`.

- `inline` positions relative to individual client rects for multi-line anchors.
- `offset` adds distance from the anchor.
- `flip` changes sides when the preferred side does not fit.
- `shift` keeps the surface visible inside the clipping area.
- `matchWidth` sizes the panel to the anchor width.
- `custom` appends raw middleware after the built-ins, which is where helpers like [`size`](/api/size), [`autoPlacement`](/api/autoplacement), and [`hide`](/api/hide) belong.
- `arrow` is not a `middleware` key at all: [`useArrow`](/api/use-arrow) registers the arrow middleware by name and exposes its styles.

## A Good Mental Model

Think of middleware as successive refinements:

1. place the panel
2. add a gap
3. if there is no room, try another side
4. if it still overflows, nudge it back into view
5. if the panel should track the anchor width, apply `matchWidth`, or apply sizing constraints through `custom`
6. if an arrow exists, `useArrow` computes its placement from the final geometry

## Next Step

- Read [Keep Content in View](/guide/keep-content-in-view) for practical middleware choices.
- Read [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) for the common failure modes.
