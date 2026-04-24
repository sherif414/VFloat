---
description: Compare VFloat with Floating UI and understand how the APIs differ.
---

# VFloat and Floating UI

VFloat owes a lot to Floating UI. It helped shape how many of us think about floating surfaces, positioning, middleware, and the general problem space.

That said, VFloat is not meant to be read as a one-to-one port with renamed exports. Some ideas carry over cleanly, and some do not.

## What Carries Over

If you have used Floating UI before, several things will feel familiar:

- placement-based positioning
- middleware-driven refinement
- virtual elements
- collision handling concepts
- API names such as `useFloating`, `offset`, `flip`, and `shift`

## What Does Not Carry Over Cleanly

Familiar names do not always mean identical API shape or identical mental model.

VFloat has its own public vocabulary and its own grouping model:

- the public root is centered around `useFloating(anchorEl, floatingEl, options)`
- the return value is grouped into `refs`, `state`, and `position`
- interaction composables are designed around that grouped root
- some composition patterns are Vue-specific and intentionally tailored to this library

So the safest way to approach VFloat is this: let prior Floating UI experience help you recognize the broad ideas, but do not assume every detail maps directly.

## Next Step

- Read [Floating Context](/guide/floating-context) to understand the core VFloat model.
- Read [Middleware Pipeline](/guide/middleware-pipeline) if you want to compare the positioning flow conceptually without assuming identical APIs.
