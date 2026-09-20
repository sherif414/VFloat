---
description: Understand how middleware runs and how each step affects positioning.
---

# Middleware Pipeline

Middleware is what makes VFloat feel adaptable instead of rigid.

Without middleware, you get a base placement. With middleware options, that first guess can react to spacing, collisions, size constraints, and arrow alignment.

## Base placement comes first

Every floating surface starts with a placement such as `"bottom"` or `"top-start"`.

That gives VFloat an initial answer to the question: where should this surface appear if nothing gets in the way?

Then VFloat turns the middleware options into a pipeline.

## Middleware is a pipeline, not an unordered bag

The easiest mistake is to think of middleware options as a list of independent features. In practice, VFloat turns them into a sequential pipeline where each middleware receives the coordinates computed by earlier steps and refines them.

For example, this stack:

```ts
middlewares: {
  offset: 8,
  flip: true,
  shift: { padding: 8 },
}
```

runs `offset` first (adding the 8px margin), then `flip` (evaluating whether the offset panel fits or needs opposite placement), and finally `shift` (sliding the panel along the viewport edge if needed).

## Canonical pipeline sequence

When you pass an object to `middlewares`, VFloat runs the built-in middlewares in a deterministic, optimal order:

1. **`inline`.** Positions relative to individual client rects for multi-line text anchors.
2. **`offset`.** Creates space between the anchor and the floating element before checking collisions.
3. **`flip`.** Evaluates fallback sides when the preferred side runs out of space.
4. **`autoPlacement`.** Alternative to `flip` that picks the roomiest side dynamically.
5. **`shift`.** Keeps the surface inside visible viewport boundaries along the cross-axis.
6. **`matchWidth`.** Locks the floating panel's width to match the anchor element's width.
7. **`size`.** Resizes or constrains the floating element based on available space.
8. **`hide`.** Computes visibility metadata when the anchor or floating panel is clipped or escaped.
9. **`arrow`.** Aligns an arrow element against the final, stabilized panel geometry.
10. **`custom`.** Appends arbitrary custom middleware functions after built-ins.

If you need a non-standard pipeline sequence, pass an array of middlewares directly:

```ts
middlewares: [offset(12), shift({ padding: 16 }), flip()];
```

## Mental model: successive refinement

Think of middleware as a sequence of geometric refinements:

1. **Initial placement.** Calculate the unconstrained position for the preferred side.
2. **Distance.** Push the floating surface away by the specified offset.
3. **Side selection.** Flip or auto-place to a side with sufficient space.
4. **Boundary retention.** Nudge the surface back inside the viewport boundaries.
5. **Dimension constraints.** Apply anchor width matching or maximum height constraints.
6. **Indicator alignment.** Position an arrow element pointed back at the trigger.

## Where to go next

- Read [Keep Content in View](/guide/keep-content-in-view) for practical middleware choices.
- Read [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) for subtle collision gotchas.
