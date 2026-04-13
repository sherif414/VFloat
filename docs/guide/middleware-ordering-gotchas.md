---
description: Learn why middleware order matters and how it changes positioning results.
---

# Middleware Ordering Gotchas

When middleware behavior feels wrong, the problem is often not that you chose the wrong helpers. It is that the helpers are in the wrong order for the problem you are solving.

## The Core Rule

Middleware is a pipeline. Later steps receive the result of earlier steps.

So if a stack feels wrong, ask:

- What is each middleware trying to solve?
- Does that make sense in this order?

## A Sensible Baseline

Many stacks work well when they start like this:

```ts
middlewares: [offset(8), flip(), shift({ padding: 8 })];
```

That order reads naturally:

- create distance
- choose a viable side
- keep the surface visible

## Next Step

- Read [Keep Content in View](/guide/keep-content-in-view) for practical stacks.
- Read [Middleware Pipeline](/guide/middleware-pipeline) for the conceptual model behind the order.
