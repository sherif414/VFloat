# Middleware Pipeline

Middleware is what makes VFloat feel adaptable instead of rigid.

Without middleware, you get a base placement. With middleware, that base placement becomes a workflow that can react to spacing, collisions, size constraints, and arrow alignment.

## Base Placement Comes First

Every floating surface starts with a placement such as `"bottom"` or `"top-start"`.

That gives VFloat an initial answer to the question: where should this surface appear if nothing gets in the way?

Then middleware runs.

## Middleware Is A Pipeline, Not A Bag

The easiest mistake is to think of middleware as a list of independent features. In practice, they run in order and influence each other.

That is why this:

```ts
middlewares: [offset(8), flip(), shift({ padding: 8 })];
```

is not equivalent to the same helpers in a different order.

## Common Roles In The Pipeline

- `offset` adds distance from the anchor.
- `flip` changes sides when the preferred side does not fit.
- `shift` keeps the surface visible inside the clipping area.
- `size` applies width and height constraints.
- `autoPlacement` chooses the side with the most room.
- `arrow` exposes the data needed to position an arrow element correctly.
- `hide` exposes visibility state for clipped or escaped conditions.

## A Good Mental Model

Think of middleware as successive refinements:

1. place the panel
2. add a gap
3. if there is no room, try another side
4. if it still overflows, nudge it back into view
5. if the panel should resize, apply those constraints
6. if an arrow exists, compute its placement from the final geometry

## Next Step

- Read [Keep Content in View](/guide/keep-content-in-view) for practical middleware choices.
- Read [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) for the common failure modes.
